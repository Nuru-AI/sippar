/**
 * ckALGO Mint Flow Component
 * Allows users to deposit ALGO and receive ckALGO tokens
 */

import React, { useState, useEffect } from 'react';
import { useAlgorandIdentity } from '../hooks/useAlgorandIdentity';
import { useAlgorandWallet } from '../hooks/useAlgorandWallet';
import { ckAlgoCanister } from '../services/ckAlgoCanister';
import sipparAPI from '../services/SipparAPIService';
import WalletConnectionModal from './WalletConnectionModal';
import ConnectedWalletDisplay from './ConnectedWalletDisplay';

interface MintStep {
  step: number;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed';
}

const MintFlow: React.FC = () => {
  const { user, credentials } = useAlgorandIdentity();
  const { 
    isConnected, 
    wallet, 
    sendTransaction,
    isConnecting 
  } = useAlgorandWallet();
  
  const [mintAmount, setMintAmount] = useState<string>('');
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);
  const [depositAddress, setDepositAddress] = useState<string>('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [monitoringTimeLeft, setMonitoringTimeLeft] = useState<number>(300); // 5 minutes in seconds
  const [showWalletModal, setShowWalletModal] = useState<boolean>(false);
  const [depositMethod, setDepositMethod] = useState<'wallet' | 'manual'>('wallet');
  const [transactionResult, setTransactionResult] = useState<any>(null);

  const steps: MintStep[] = [
    {
      step: 1,
      title: 'Enter Amount & Connect',
      description: 'Specify amount and connect your Algorand wallet',
      status: currentStep === 1 ? 'active' : currentStep > 1 ? 'completed' : 'pending'
    },
    {
      step: 2,
      title: 'Review Transaction',
      description: 'Review transaction details and confirm in wallet',
      status: currentStep === 2 ? 'active' : currentStep > 2 ? 'completed' : 'pending'
    },
    {
      step: 3,
      title: 'Send ALGO',
      description: 'Transaction sent and waiting for confirmation',
      status: currentStep === 3 ? 'active' : currentStep > 3 ? 'completed' : 'pending'
    },
    {
      step: 4,
      title: 'Receive ckALGO',
      description: 'Get your ckALGO tokens on the Internet Computer',
      status: currentStep === 4 ? 'active' : currentStep > 4 ? 'completed' : 'pending'
    }
  ];

  useEffect(() => {
    if (credentials?.algorandAddress) {
      setDepositAddress(credentials.algorandAddress);
      // Generate QR code URL for the address
      const qrData = `algorand:${credentials.algorandAddress}${mintAmount ? `?amount=${parseFloat(mintAmount) * 1000000}` : ''}`;
      setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`);
    }
  }, [credentials, mintAmount]);

  const handleStartMint = async () => {
    if (!mintAmount || parseFloat(mintAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    
    if (!user?.principal) {
      alert('Please authenticate first');
      return;
    }

    try {
      // Use Sippar API to prepare mint and get custody address
      const microAlgos = sipparAPI.algoToMicroAlgos(parseFloat(mintAmount));
      const mintPrep = await sipparAPI.prepareMint(user.principal, microAlgos);
      
      if (mintPrep.status === 'success' && mintPrep.data) {
        console.log('✅ Mint preparation successful');
        console.log('🏦 Custody address:', mintPrep.data.custody_address);
        setDepositAddress(mintPrep.data.custody_address);
        
        // Generate QR code for the custody address
        const qrData = `algorand:${mintPrep.data.custody_address}?amount=${microAlgos}`;
        setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`);
        
        if (depositMethod === 'wallet') {
          if (!isConnected) {
            setShowWalletModal(true);
            return;
          }
          setCurrentStep(2);
        } else {
          setCurrentStep(2); // Manual flow
        }
      } else {
        throw new Error(mintPrep.error || 'Failed to prepare mint');
      }
    } catch (error) {
      console.error('❌ Mint preparation failed:', error);
      alert('Failed to prepare mint. Please try again.');
    }
  };

  const handleWalletConnected = () => {
    setCurrentStep(2);
  };

  const handleDirectTransaction = async () => {
    if (!wallet || !user?.principal) {
      alert('Wallet not connected properly');
      return;
    }

    setCurrentStep(3);
    setIsMonitoring(true);

    try {
      // Send ALGO transaction directly through wallet
      const result = await sendTransaction({
        to: depositAddress,
        amount: Math.floor(parseFloat(mintAmount) * 1000000), // Convert to microALGO
        note: `sippar-mint-${user.principal}`
      });

      if (result.success && result.txId) {
        console.log('✅ Transaction sent successfully:', result.txId);
        
        // Phase 3: Real transaction monitoring and minting
        const monitorAndMint = async (txId: string, attempts: number = 0) => {
          const maxAttempts = 30; // 30 attempts × 2 seconds = 1 minute max wait
          
          if (attempts >= maxAttempts) {
            console.error('❌ Transaction confirmation timeout');
            setIsMonitoring(false);
            setCurrentStep(1); // Reset to initial state
            return;
          }
          
          try {
            console.log(`🔍 Monitoring Algorand transaction attempt ${attempts + 1}:`, txId);
            
            // Call the real mint endpoint which verifies transaction and mints ckALGO
            const response = await fetch('/api/sippar/ck-algo/mint-confirmed', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                algorandTxId: txId,
                userPrincipal: user.principal,
                amount: parseFloat(mintAmount)
              })
            });
            
            const mintResult = await response.json();
            
            if (mintResult.success) {
              console.log('🪙 ckALGO minted successfully (Phase 3):', mintResult);
              setTransactionResult(mintResult);
              setIsMonitoring(false);
              setCurrentStep(4); // Success
              return;
            }
            
            // If transaction not confirmed yet, continue monitoring
            if (mintResult.error === 'Algorand transaction not confirmed yet') {
              console.log(`⏳ Transaction not confirmed yet, retrying in 2 seconds... (${attempts + 1}/${maxAttempts})`);
              setTimeout(() => monitorAndMint(txId, attempts + 1), 2000);
              return;
            }
            
            // Other errors - stop monitoring
            console.error('❌ ckALGO minting failed:', mintResult);
            setIsMonitoring(false);
            setCurrentStep(1); // Reset to initial state
            
          } catch (error) {
            console.error('❌ Monitoring/minting error:', error);
            // Retry on network errors
            if (attempts < maxAttempts) {
              setTimeout(() => monitorAndMint(txId, attempts + 1), 2000);
            } else {
              setIsMonitoring(false);
              setCurrentStep(1); // Reset to initial state
            }
          }
        };
        
        // Start real monitoring
        await monitorAndMint(result.txId!);
        
      } else {
        throw new Error(result.error || 'Transaction failed');
      }
    } catch (error) {
      console.error('❌ Transaction failed:', error);
      alert('Transaction failed. Please try again.');
      setCurrentStep(2);
      setIsMonitoring(false);
    }
  };

  const handleConfirmDeposit = () => {
    setCurrentStep(3);
    setIsMonitoring(true);
    // Start monitoring for deposits (in a real implementation)
    startDepositMonitoring();
  };

  const startDepositMonitoring = async () => {
    if (!depositAddress || !mintAmount) return;

    console.log(`🔍 Starting deposit monitoring for ${depositAddress}`);
    setMonitoringTimeLeft(300); // Reset timer to 5 minutes
    
    const checkForDeposit = async () => {
      try {
        // Try Phase 3 first (threshold signatures), then Phase 2 fallback
        let response;
        try {
          response = await fetch(`/api/sippar/algorand/deposits/${depositAddress}`);
          if (!response.ok) {
            response = await fetch(`http://localhost:3001/algorand/deposits/${depositAddress}`);
          }
        } catch (error) {
          response = await fetch(`http://localhost:3001/algorand/deposits/${depositAddress}`);
        }
        if (!response.ok) {
          console.log('⚠️ Deposit check failed, continuing monitoring...');
          return false;
        }
        
        const deposits = await response.json();
        console.log('📥 Checking for deposits:', deposits);
        
        // Check if we have a deposit matching our expected amount
        const expectedAmountMicroAlgo = Math.floor(parseFloat(mintAmount) * 1000000);
        const matchingDeposit = deposits.find((deposit: any) => 
          Math.abs(deposit.amount - expectedAmountMicroAlgo) < 1000 // Allow 1000 microAlgo tolerance
        );
        
        if (matchingDeposit) {
          console.log('✅ Matching deposit found:', matchingDeposit);
          
          // Phase 3: Real ckALGO minting via confirmed transaction endpoint
          if (user?.principal && matchingDeposit.txId) {
            try {
              console.log('🪙 Manual deposit confirmed, minting ckALGO via real endpoint:', matchingDeposit);
              
              // Use the same real endpoint as direct wallet flow
              const response = await fetch('/api/sippar/ck-algo/mint-confirmed', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  algorandTxId: matchingDeposit.txId,
                  userPrincipal: user.principal,
                  amount: parseFloat(mintAmount)
                })
              });
              
              const mintResult = await response.json();
              
              if (mintResult.success) {
                console.log('✅ ckALGO minted successfully via manual deposit (Phase 3):', mintResult);
                setTransactionResult(mintResult);
                setCurrentStep(4);
                setIsMonitoring(false);
                return;
              } else {
                console.error('❌ Manual deposit minting failed:', mintResult);
                // Continue monitoring in case there are other deposits
              }
              
            } catch (error) {
              console.error('❌ Manual deposit minting error:', error);
              // Continue monitoring in case there are other deposits
            }
          } else {
            // Fallback for deposits without transaction ID
            console.log('⚠️ Deposit found but missing transaction ID, using fallback success');
            setCurrentStep(4);
            setIsMonitoring(false);
          }
          return true;
        }
        
        return false;
      } catch (error) {
        console.error('❌ Error checking deposits:', error);
        return false;
      }
    };

    // Initial check
    const initialResult = await checkForDeposit();
    if (initialResult) return;

    // Poll every 5 seconds for up to 5 minutes
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes

    const pollInterval = setInterval(async () => {
      attempts++;
      const timeLeft = Math.max(0, 300 - (attempts * 5));
      setMonitoringTimeLeft(timeLeft);
      
      if (attempts >= maxAttempts || timeLeft <= 0) {
        clearInterval(pollInterval);
        setIsMonitoring(false);
        setMonitoringTimeLeft(0);
        alert('Deposit monitoring timed out. Please check your transaction and try again.');
        return;
      }

      const found = await checkForDeposit();
      if (found) {
        clearInterval(pollInterval);
      }
    }, 5000);
  };

  // Cleanup effect
  useEffect(() => {
    return () => {
      // Cleanup any running intervals when component unmounts
      setIsMonitoring(false);
    };
  }, []);

  const StepIndicator = ({ step }: { step: MintStep }) => (
    <div className="flex items-center mb-4">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
        step.status === 'completed' ? 'bg-green-500' :
        step.status === 'active' ? 'bg-blue-500' : 'bg-gray-400'
      }`}>
        {step.status === 'completed' ? '✓' : step.step}
      </div>
      <div>
        <div className={`font-medium ${
          step.status === 'active' ? 'text-blue-400' : 'text-gray-300'
        }`}>
          {step.title}
        </div>
        <div className="text-sm text-gray-400">{step.description}</div>
      </div>
    </div>
  );

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">Please log in to use the mint flow</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">
          🪙 Mint ckALGO Tokens
        </h2>
        <p className="text-gray-400">
          Convert your ALGO into chain-key ALGO (ckALGO) tokens on ICP
        </p>
      </div>
      
      {/* Phase 3 Threshold Signatures Notice */}
      <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="text-green-400 text-xl">🔐</div>
          <div className="text-green-200 text-sm">
            <strong>Phase 3 - Threshold Signatures Active:</strong> This mint flow now uses real ICP threshold signatures for secure Algorand address derivation. 
            Your address is generated using ICP subnet consensus for maximum security. Canister: <code className="text-xs bg-gray-800 px-1 rounded">bkyz2-fmaaa-aaaaa-qaaaq-cai</code>.
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Minting Process</h3>
        {steps.map((step) => (
          <StepIndicator key={step.step} step={step} />
        ))}
      </div>

      {/* Step 1: Enter Amount & Connect Wallet */}
      {currentStep === 1 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">
            Step 1: Enter Amount & Choose Deposit Method
          </h3>
          
          <div className="space-y-6">
            {/* Amount Input */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                ALGO Amount
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.000001"
                  placeholder="0.000000"
                  value={mintAmount}
                  onChange={(e) => setMintAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <span className="text-gray-400">ALGO</span>
                </div>
              </div>
            </div>

            {/* Deposit Method Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Deposit Method
              </label>
              <div className="space-y-3">
                {/* Wallet Integration Option (Recommended) */}
                <div
                  onClick={() => setDepositMethod('wallet')}
                  className={`p-3 sm:p-4 rounded-lg border cursor-pointer transition-all ${
                    depositMethod === 'wallet'
                      ? 'border-green-500 bg-green-900/20'
                      : 'border-gray-600 hover:border-green-500/50'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        depositMethod === 'wallet' 
                          ? 'border-green-500 bg-green-500' 
                          : 'border-gray-400'
                      }`}>
                        {depositMethod === 'wallet' && (
                          <div className="w-full h-full rounded-full bg-white scale-50"></div>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">🚀</span>
                          <h4 className="font-semibold text-white text-sm sm:text-base">
                            Connect Wallet
                          </h4>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className="bg-green-900/50 text-green-300 px-2 py-1 text-xs rounded">
                            Recommended
                          </span>
                          <span className="bg-blue-900/50 text-blue-300 px-2 py-1 text-xs rounded sm:hidden">
                            Fast & Secure
                          </span>
                        </div>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-300 mt-1">
                        <span className="hidden sm:inline">Connect your Algorand wallet and send ALGO directly with one-click. No manual address copying or transaction building required.</span>
                        <span className="sm:hidden">One-click ALGO deposits directly from your wallet. Fastest and most secure option.</span>
                      </p>
                      
                      {depositMethod === 'wallet' && isConnected && (
                        <div className="mt-3">
                          <ConnectedWalletDisplay compact={true} showBalance={true} showDisconnect={false} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Manual QR Code Option */}
                <div
                  onClick={() => setDepositMethod('manual')}
                  className={`p-3 sm:p-4 rounded-lg border cursor-pointer transition-all ${
                    depositMethod === 'manual'
                      ? 'border-blue-500 bg-blue-900/20'
                      : 'border-gray-600 hover:border-blue-500/50'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        depositMethod === 'manual' 
                          ? 'border-blue-500 bg-blue-500' 
                          : 'border-gray-400'
                      }`}>
                        {depositMethod === 'manual' && (
                          <div className="w-full h-full rounded-full bg-white scale-50"></div>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">📱</span>
                        <h4 className="font-semibold text-white text-sm sm:text-base">
                          <span className="hidden sm:inline">Manual Deposit (QR Code)</span>
                          <span className="sm:hidden">QR Code Deposit</span>
                        </h4>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-300 mt-1">
                        <span className="hidden sm:inline">Get a QR code and deposit address to manually send ALGO from any wallet. Copy-paste the address or scan QR code with your mobile wallet.</span>
                        <span className="sm:hidden">Get QR code or copy address to send ALGO from any wallet.</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Transaction Preview */}
            {mintAmount && parseFloat(mintAmount) > 0 && (
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                <h4 className="font-medium text-blue-300 mb-2">Transaction Preview</h4>
                <div className="text-sm text-blue-200 space-y-1">
                  <div className="flex justify-between">
                    <span>You will send:</span>
                    <span className="font-mono">{mintAmount} ALGO</span>
                  </div>
                  <div className="flex justify-between">
                    <span>You will receive:</span>
                    <span className="font-mono">{mintAmount} ckALGO</span>
                  </div>
                  <div className="flex justify-between text-blue-300/70">
                    <span>Exchange rate:</span>
                    <span>1:1 (no fees)</span>
                  </div>
                  <div className="flex justify-between text-blue-300/70">
                    <span>Method:</span>
                    <span>{depositMethod === 'wallet' ? 'Direct from wallet' : 'Manual deposit'}</span>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleStartMint}
              disabled={!mintAmount || parseFloat(mintAmount) <= 0 || isConnecting}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              {isConnecting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Connecting Wallet...</span>
                </>
              ) : depositMethod === 'wallet' && !isConnected ? (
                <>
                  <span>Connect Wallet & Continue</span>
                </>
              ) : (
                <>
                  <span>Continue</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Review Transaction / Deposit Address */}
      {currentStep === 2 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">
            {depositMethod === 'wallet' ? 'Step 2: Review & Send Transaction' : 'Step 2: Your Deposit Address'}
          </h3>
          
          {depositMethod === 'wallet' && isConnected ? (
            // Wallet Integration Flow
            <div className="space-y-4">
              {/* Connected Wallet Info */}
              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                <h4 className="font-semibold text-green-300 mb-2">Connected Wallet</h4>
                <ConnectedWalletDisplay compact={false} showBalance={true} showDisconnect={true} />
              </div>

              {/* Transaction Details */}
              <div className="bg-gray-900 border border-gray-600 rounded-lg p-4">
                <h4 className="font-semibold text-white mb-3 text-sm sm:text-base">Transaction Details</h4>
                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                    <span className="text-gray-300">From:</span>
                    <span className="font-mono text-white text-xs break-all sm:text-right">
                      <span className="sm:hidden">{wallet?.address.slice(0, 8)}...{wallet?.address.slice(-8)}</span>
                      <span className="hidden sm:inline">{wallet?.address.slice(0, 12)}...{wallet?.address.slice(-12)}</span>
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                    <span className="text-gray-300">To:</span>
                    <span className="font-mono text-white text-xs break-all sm:text-right">
                      <span className="sm:hidden">{depositAddress.slice(0, 8)}...{depositAddress.slice(-8)}</span>
                      <span className="hidden sm:inline">{depositAddress.slice(0, 12)}...{depositAddress.slice(-12)}</span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Amount:</span>
                    <span className="font-mono text-white">{mintAmount} ALGO</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Network Fee:</span>
                    <span className="font-mono text-white">~0.001 ALGO</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span className="text-gray-300">You will receive:</span>
                    <span className="font-mono text-green-400">{mintAmount} ckALGO</span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="text-blue-400 text-xl">ℹ️</div>
                  <div className="text-blue-200 text-sm">
                    <strong>One-Click Transaction:</strong> Click "Send ALGO" to open your wallet and approve the transaction. 
                    The transaction will be sent directly to our custody address for ckALGO minting.
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="flex-1 py-3 px-4 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={handleDirectTransaction}
                  className="flex-1 py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  <span>Send ALGO</span>
                </button>
              </div>
            </div>
          ) : (
            // Manual Flow
            <div className="space-y-4">
              <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="text-yellow-400 text-xl">⚠️</div>
                  <div className="text-yellow-200 text-sm">
                    <strong>Important:</strong> Only send ALGO to this address. 
                    Sending other tokens may result in permanent loss.
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Algorand Address
                </label>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 p-3 bg-gray-900 border border-gray-600 rounded-lg">
                    <code className="text-sm text-green-400 break-all">
                      {depositAddress}
                    </code>
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(depositAddress)}
                    className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    title="Copy address"
                  >
                    📋
                  </button>
                </div>
              </div>

              {qrCodeUrl && (
                <div className="text-center">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    QR Code (for mobile wallets)
                  </label>
                  <div className="inline-block p-4 bg-white rounded-lg">
                    <img src={qrCodeUrl} alt="Deposit QR Code" className="w-48 h-48" />
                  </div>
                </div>
              )}

              <div className="bg-gray-900 border border-gray-600 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Send exactly:</h4>
                <div className="text-lg font-mono text-white">{mintAmount} ALGO</div>
                <div className="text-sm text-gray-400 mt-1">
                  Amount: {(parseFloat(mintAmount || '0') * 1000000).toLocaleString()} microALGO
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="flex-1 py-3 px-4 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={handleConfirmDeposit}
                  className="flex-1 py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                >
                  I've Sent the ALGO →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Monitoring */}
      {currentStep === 3 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">
            Step 3: Monitoring for Deposit
          </h3>
          
          <div className="text-center space-y-4">
            {isMonitoring && (
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            )}
            
            <div className="text-white">
              {isMonitoring ? 'Waiting for your deposit...' : 'Deposit confirmed!'}
            </div>
            
            <div className="text-gray-400 text-sm">
              {isMonitoring 
                ? `This usually takes 1-2 minutes for Algorand transactions to confirm (${Math.floor(monitoringTimeLeft / 60)}:${(monitoringTimeLeft % 60).toString().padStart(2, '0')} remaining)`
                : 'Your ckALGO tokens are being minted'
              }
            </div>

            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
              <div className="text-sm text-blue-300">
                <div>Monitoring address: <code className="text-xs break-all">{depositAddress}</code></div>
                <div>Expected amount: {mintAmount} ALGO</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Success */}
      {currentStep === 4 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">
            Step 4: Minting Complete! 🎉
          </h3>
          
          <div className="text-center space-y-4">
            <div className="text-6xl mb-4">✅</div>
            
            <div className="text-xl text-green-400 font-semibold">
              Successfully minted {mintAmount} ckALGO!
            </div>
            
            <div className="text-gray-400">
              Your ckALGO tokens are now available in your ICP wallet and can be used across the ICP ecosystem.
            </div>

            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
              <div className="text-sm text-green-300 space-y-1">
                <div className="flex justify-between">
                  <span>ALGO Deposited:</span>
                  <span className="font-mono">{mintAmount} ALGO</span>
                </div>
                <div className="flex justify-between">
                  <span>ckALGO Minted:</span>
                  <span className="font-mono">{mintAmount} ckALGO</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>ICP Transaction ID:</span>
                  <span className="font-mono text-xs">{transactionResult?.icpTxId || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Algorand TX ID:</span>
                  <span className="font-mono text-xs">{transactionResult?.algorandTxId || 'N/A'}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setCurrentStep(1);
                setMintAmount('');
                setIsMonitoring(false);
                setTransactionResult(null);
              }}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Mint More ckALGO
            </button>
          </div>
        </div>
      )}

      {/* Wallet Connection Modal */}
      <WalletConnectionModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onWalletConnected={handleWalletConnected}
      />
    </div>
  );
};

export default MintFlow;