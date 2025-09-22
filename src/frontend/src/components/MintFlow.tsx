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
import useAuthStore from '../stores/authStore';

interface MintStep {
  step: number;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed';
}

const MintFlow: React.FC = () => {
  const { user, credentials } = useAlgorandIdentity();

  // ✅ Add store methods for balance refresh after minting
  const setBalances = useAuthStore(state => state.setBalances);
  const setBalancesLoading = useAuthStore(state => state.setBalancesLoading);

  // Check for existing balance in custody address
  useEffect(() => {
    const checkExistingBalance = async () => {
      if (!user?.principal) return;

      try {
        // First get the custody address for this user
        const mintPrep = await sipparAPI.prepareMint(user.principal, 100000); // Dummy amount to get address
        if (mintPrep.status === 'success' && mintPrep.data?.custody_address) {
          const address = mintPrep.data.custody_address;
          setCustodyAddress(address);

          // Check the balance of this custody address
          const accountResponse = await fetch(`https://nuru.network/api/sippar/algorand/account/${address}`);
          const accountData = await accountResponse.json();

          if (accountData.success && accountData.account) {
            const availableBalance = accountData.account.balance - accountData.account.minBalance;
            setExistingBalance(Math.max(0, availableBalance));

            // If there's significant balance, suggest using it
            if (availableBalance >= 0.1) {
              console.log(`💰 Found existing balance: ${availableBalance} ALGO in custody address`);
              setDepositMethod('existing'); // Auto-select existing balance option
              // Don't auto-fill amount - let user choose how much to convert
            }
          }
        }
      } catch (error) {
        console.error('Error checking existing balance:', error);
      }
    };

    checkExistingBalance();
  }, [user?.principal]);
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
  const [depositMethod, setDepositMethod] = useState<'wallet' | 'manual' | 'existing'>('wallet');
  const [existingBalance, setExistingBalance] = useState<number>(0);
  const [custodyAddress, setCustodyAddress] = useState<string>('');
  const [transactionResult, setTransactionResult] = useState<any>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [sprintXProgress, setSprintXProgress] = useState<{
    stage: string;
    detail: string;
    timeRemaining?: number;
  } | null>(null);

  // ✅ Balance refresh function - reload balances after successful minting
  const refreshBalances = async () => {
    if (!user?.principal) return;

    try {
      setBalancesLoading(true);

      // Get updated ckALGO balance using the correct API endpoint
      const ckAlgoResponse = await fetch(`https://nuru.network/api/sippar/ck-algo/balance/${user.principal}`);
      const ckAlgoData = await ckAlgoResponse.json();

      if (ckAlgoResponse.ok && ckAlgoData.success) {
        const ckAlgoBalance = ckAlgoData.balances?.ck_algo_balance || 0;
        const algoBalance = ckAlgoData.balances?.algo_balance || 0;

        console.log('🔄 Refreshed balances after minting:', { algoBalance, ckAlgoBalance });
        setBalances(algoBalance, ckAlgoBalance);
      }
    } catch (error) {
      console.error('❌ Failed to refresh balances after minting:', error);
    }
  };

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
      title: 'Automatic Minting',
      description: 'System automatically detects deposit and mints ckALGO tokens',
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
        
        if (depositMethod === 'existing') {
          // For existing balance, go directly to minting
          await handleMintFromExistingBalance();
          return;
        } else if (depositMethod === 'wallet') {
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

  const handleMintFromExistingBalance = async () => {
    if (!user?.principal || !custodyAddress) {
      alert('User not authenticated or custody address not found');
      return;
    }

    setCurrentStep(3);
    setIsMonitoring(true);
    const requestedAmount = parseFloat(mintAmount);
    setSprintXProgress({
      stage: 'Processing Existing Balance',
      detail: `Converting ${requestedAmount.toFixed(6)} ALGO to ckALGO...`,
      timeRemaining: 120 // 2 minutes for existing balance processing
    });

    try {
      console.log(`🔄 Attempting to mint ${requestedAmount} ALGO from existing balance`);

      // Call the new existing balance minting endpoint
      const response = await fetch('https://nuru.network/api/sippar/ck-algo/mint-existing-balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          principal: user.principal,
          amount: requestedAmount
        })
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Successfully minted ckALGO from existing balance:', result);
        setSprintXProgress({
          stage: 'Completed',
          detail: `Successfully converted ${requestedAmount.toFixed(6)} ALGO to ckALGO!`,
        });

        // ✅ Refresh balances to show updated ckALGO amount
        await refreshBalances();

        // Wait a moment then redirect to dashboard
        setTimeout(() => {
          setIsMonitoring(false);
          setCurrentStep(1); // Reset to start
          alert(`Successfully minted ${result.amount_minted || requestedAmount} ckALGO!`);
        }, 2000);
      } else {
        // Handle informative error responses
        if (result.workaround) {
          const workaroundMsg = `
${result.explanation}

Workaround:
1. ${result.workaround.step1}
2. ${result.workaround.step2}
3. ${result.workaround.step3}

Historical deposits found: ${result.historical_deposits_found?.length || 0}
          `.trim();

          setSprintXProgress({
            stage: 'Architecture Limitation',
            detail: result.explanation
          });

          setTimeout(() => {
            setIsMonitoring(false);
            setSprintXProgress(null);
            alert(workaroundMsg);
          }, 2000);
        } else {
          throw new Error(result.error || 'Minting failed');
        }
      }
    } catch (error) {
      console.error('❌ Existing balance minting failed:', error);
      setIsMonitoring(false);
      setSprintXProgress(null);
      alert(`Failed to process existing balance: ${error instanceof Error ? error.message : 'Please try again.'}`);
    }
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
        
        // Sprint X: Automatic monitoring - system detects and mints automatically
        const monitorSprintXAutomatic = async (txId: string, attempts: number = 0) => {
          const maxAttempts = 90; // 90 attempts × 10 seconds = 15 minutes max wait (Sprint X needs more time)

          if (attempts >= maxAttempts) {
            console.error('❌ Sprint X automatic minting timeout after 15 minutes');
            setIsMonitoring(false);
            setCurrentStep(1); // Reset to initial state
            setSprintXProgress(null);
            setStatusMessage('Automatic minting timed out. Your ALGO deposit is safe.');
            alert('Automatic minting timed out. Your ALGO deposit is safe. Please contact support or try the manual minting process.');
            return;
          }

          try {
            console.log(`🔍 Sprint X monitoring attempt ${attempts + 1}/${maxAttempts}: Checking for automatic minting completion`);

            // Update status message for user
            const remainingTime = Math.round((maxAttempts - attempts) * (attempts < 30 ? 5 : 10) / 60);
            setSprintXProgress({
              stage: attempts <= 12 ? 'Confirming transaction' : 'Automatic minting in progress',
              detail: attempts <= 12
                ? `Waiting for ${attempts <= 6 ? '6 mainnet' : '3 testnet'} network confirmations...`
                : 'Automatic system detected your deposit and is minting ckALGO tokens...',
              timeRemaining: Math.max(remainingTime, 1)
            });

            // Sprint X: Check user's ckALGO balance to detect automatic minting completion
            const balanceResponse = await fetch(`https://nuru.network/api/sippar/ck-algo/balance/${user.principal}`);
            const balanceResult = await balanceResponse.json();

            if (balanceResponse.ok && balanceResult.success) {
              const currentBalance = balanceResult.balance || 0;
              const expectedIncrease = parseFloat(mintAmount) * 1000000; // Convert to microALGO

              console.log(`🔍 Sprint X Balance Check: Current=${currentBalance} microALGO, Expected increase=${expectedIncrease}`);

              // Check if balance increased (indicating automatic minting completed)
              // Note: We can't track previous balance perfectly, so we check for reasonable balance presence
              if (currentBalance > 0) {
                console.log('✅ Sprint X: ckALGO balance detected - automatic minting likely completed!');
                setTransactionResult({
                  success: true,
                  balance: currentBalance,
                  txId: txId,
                  message: 'ckALGO tokens automatically minted to your ICP Principal'
                });
                setIsMonitoring(false);
                setCurrentStep(4); // Success
                setSprintXProgress(null);
                setStatusMessage('✅ Success! ckALGO tokens automatically minted and ready to use.');

                // Trigger balance refresh in Dashboard
                window.dispatchEvent(new CustomEvent('sipparBalanceRefresh'));
                return;
              }
            }

            // If no balance increase detected yet, continue monitoring
            const waitTime = attempts < 30 ? 5000 : 10000; // First 30 attempts every 5s, then every 10s
            console.log(`⏳ Sprint X: No automatic minting detected yet, checking again in ${waitTime/1000} seconds... (~${remainingTime} minutes remaining)`);
            setTimeout(() => monitorSprintXAutomatic(txId, attempts + 1), waitTime);

          } catch (error) {
            console.error('❌ Sprint X monitoring error:', error);
            // Retry on network errors
            if (attempts < maxAttempts) {
              setTimeout(() => monitorSprintXAutomatic(txId, attempts + 1), 10000);
            } else {
              setIsMonitoring(false);
              setCurrentStep(1); // Reset to initial state
              alert('Network error during monitoring. Please check your balance manually or contact support.');
            }
          }
        };

        // Start Sprint X automatic monitoring
        console.log('🚀 Sprint X: Starting automatic minting monitoring - system will mint automatically after confirmations');
        await monitorSprintXAutomatic(result.txId!);
        
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
    
    // Store interval reference in state that can be accessed by error handlers
    let currentPollInterval: NodeJS.Timeout | null = null;
    
    const checkForDeposit = async (): Promise<boolean> => {
      try {
        // Try Phase 3 first (threshold signatures), then Phase 2 fallback
        let response;
        try {
          response = await fetch(`https://nuru.network/api/sippar/algorand/deposits/${depositAddress}`);
        } catch (error) {
          console.warn('Failed to fetch deposit data:', error);
          throw error;
        }
        if (!response.ok) {
          console.log('⚠️ Deposit check failed, continuing monitoring...');
          return false;
        }
        
        const depositsResponse = await response.json();
        console.log('📥 Checking deposits to address:', depositsResponse.address);
        console.log('🔍 Found', depositsResponse.deposits?.length || 0, 'deposits available');
        
        // Check if we have a deposit with sufficient amount (>=) for minting
        const expectedAmountMicroAlgo = Math.floor(parseFloat(mintAmount) * 1000000);
        const deposits = depositsResponse.deposits || [];
        const matchingDeposit = deposits.find((deposit: any) => 
          deposit.amount >= expectedAmountMicroAlgo // Allow any deposit >= expected amount
        );
        
        if (matchingDeposit) {
          console.log('✅ Sufficient deposit found:', {
            available_microalgos: matchingDeposit.amount,
            available_algos: (matchingDeposit.amount / 1000000).toFixed(6),
            needed_for_mint: (expectedAmountMicroAlgo / 1000000).toFixed(6)
          });
          
          // Sprint X: Manual deposit detected - rely on automatic minting system
          if (user?.principal && matchingDeposit.txId) {
            try {
              console.log('🪙 Sprint X: Manual deposit detected, waiting for automatic minting system:', matchingDeposit);
              console.log('🔄 Sprint X: Automatic system should detect and mint this deposit automatically');

              // Sprint X: Instead of calling disabled endpoint, just wait for automatic system
              // Start monitoring balance for automatic minting completion
              const monitorAutomaticMinting = async (attempts: number = 0) => {
                const maxAttempts = 60; // 60 attempts × 10 seconds = 10 minutes

                if (attempts >= maxAttempts) {
                  console.error('❌ Sprint X: Automatic minting timeout for manual deposit');
                  alert('Automatic minting timed out. Your deposit is safe. The system may need more time or manual intervention.');
                  setIsMonitoring(false);
                  setCurrentStep(2);
                  if (currentPollInterval) clearInterval(currentPollInterval);
                  return false;
                }

                try {
                  // Check ckALGO balance to see if automatic minting completed
                  const balanceResponse = await fetch(`https://nuru.network/api/sippar/ck-algo/balance/${user.principal}`);
                  const balanceResult = await balanceResponse.json();

                  if (balanceResponse.ok && balanceResult.success) {
                    const currentBalance = balanceResult.balance || 0;

                    if (currentBalance > 0) {
                      console.log('✅ Sprint X: Automatic minting completed for manual deposit!');
                      setTransactionResult({
                        success: true,
                        balance: currentBalance,
                        txId: matchingDeposit.txId,
                        message: 'Sprint X automatic minting completed successfully'
                      });
                      setCurrentStep(4);
                      setIsMonitoring(false);

                      // Trigger balance refresh in Dashboard
                      window.dispatchEvent(new CustomEvent('sipparBalanceRefresh'));

                      if (currentPollInterval) clearInterval(currentPollInterval);
                      return true; // Success
                    }
                  }

                  // Continue monitoring
                  console.log(`⏳ Sprint X: Waiting for automatic minting... attempt ${attempts + 1}/${maxAttempts}`);
                  setTimeout(() => monitorAutomaticMinting(attempts + 1), 10000);

                } catch (error) {
                  console.error('❌ Sprint X automatic monitoring error:', error);
                  setTimeout(() => monitorAutomaticMinting(attempts + 1), 10000);
                }
              };

              // Start monitoring for automatic minting
              await monitorAutomaticMinting(0);
              return true; // Stop the deposit polling, switch to balance monitoring
              
            } catch (error) {
              console.error('❌ Manual deposit minting error:', error);
              if (currentPollInterval) clearInterval(currentPollInterval);
              setIsMonitoring(false);
              setCurrentStep(2); // Go back to transaction review
              alert('Minting failed due to network error. Please try again.');
              return false;
            }
          } else {
            // Fallback for deposits without transaction ID - DO NOT show success without actual minting
            console.log('⚠️ Deposit found but missing transaction ID - cannot proceed without proper minting');
            alert('Deposit detected but minting verification failed. Please try again.');
            if (currentPollInterval) clearInterval(currentPollInterval);
            setIsMonitoring(false);
            setCurrentStep(2); // Go back to transaction review
            return false;
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

    currentPollInterval = setInterval(async () => {
      attempts++;
      const timeLeft = Math.max(0, 300 - (attempts * 5));
      setMonitoringTimeLeft(timeLeft);
      
      if (attempts >= maxAttempts || timeLeft <= 0) {
        if (currentPollInterval) clearInterval(currentPollInterval);
        setIsMonitoring(false);
        setMonitoringTimeLeft(0);
        alert('Deposit monitoring timed out. Please check your transaction and try again.');
        return;
      }

      const found = await checkForDeposit();
      if (found) {
        if (currentPollInterval) clearInterval(currentPollInterval);
      }
    }, 30000); // Check every 30 seconds instead of 5 seconds
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
                  placeholder={depositMethod === 'existing' ? `Max: ${existingBalance.toFixed(6)}` : "0.000000"}
                  value={mintAmount}
                  onChange={(e) => setMintAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <span className="text-gray-400">ALGO</span>
                </div>
              </div>

              {/* Validation message for existing balance */}
              {depositMethod === 'existing' && mintAmount && parseFloat(mintAmount) > existingBalance && (
                <div className="mt-1 text-xs text-red-400">
                  Amount cannot exceed available balance of {existingBalance.toFixed(6)} ALGO
                </div>
              )}
            </div>

            {/* Deposit Method Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Deposit Method
              </label>
              <div className="space-y-3">
                {/* Existing Balance Option (Show if balance > 0.1) */}
                {existingBalance >= 0.1 && (
                  <div
                    onClick={() => setDepositMethod('existing')}
                    className={`p-3 sm:p-4 rounded-lg border cursor-pointer transition-all ${
                      depositMethod === 'existing'
                        ? 'border-yellow-500 bg-yellow-900/20'
                        : 'border-gray-600 hover:border-yellow-500/50'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          depositMethod === 'existing'
                            ? 'border-yellow-500 bg-yellow-500'
                            : 'border-gray-400'
                        }`}>
                          {depositMethod === 'existing' && (
                            <div className="w-full h-full rounded-full bg-white scale-50"></div>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">💰</span>
                            <h4 className="font-semibold text-white text-sm sm:text-base">
                              Use Existing Balance
                            </h4>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-1 text-xs bg-yellow-900/30 text-yellow-300 rounded border border-yellow-500/30">
                              INSTANT
                            </span>
                            <span className="px-2 py-1 text-xs bg-green-900/30 text-green-300 rounded border border-green-500/30">
                              RECOMMENDED
                            </span>
                          </div>
                        </div>

                        <p className="text-xs sm:text-sm text-gray-300 mt-1">
                          Convert any amount up to {existingBalance.toFixed(6)} ALGO from your custody address to ckALGO instantly.
                        </p>

                        <div className="mt-2 text-xs text-yellow-300 bg-yellow-900/20 p-2 rounded border border-yellow-500/30">
                          <span className="font-semibold">Maximum Available:</span> {existingBalance.toFixed(6)} ALGO in your custody address
                        </div>
                      </div>
                    </div>
                  </div>
                )}

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
              disabled={
                !mintAmount ||
                parseFloat(mintAmount) <= 0 ||
                (depositMethod === 'existing' && parseFloat(mintAmount) > existingBalance) ||
                isConnecting
              }
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              {isConnecting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Connecting Wallet...</span>
                </>
              ) : depositMethod === 'existing' ? (
                <>
                  <span>💰 Convert Existing Balance to ckALGO</span>
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
                    <strong>Fully Automatic Process:</strong> Click "Send ALGO" to approve the transaction.
                    Our system automatically detects your deposit and mints ckALGO tokens to your ICP Principal - no additional steps required!
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

      {/* Step 3: Enhanced Monitoring - Phase 3.2 */}
      {currentStep === 3 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            Step 3: Monitoring for Deposit
            <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-1 rounded-full">
              Real-Time
            </span>
          </h3>

          <div className="space-y-6">
            {/* Sprint X Enhanced Monitoring Status */}
            <div className="text-center space-y-4">
              {isMonitoring && (
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
              )}

              <div className="text-white text-lg">
                {isMonitoring
                  ? (sprintXProgress?.stage || 'Waiting for your deposit...')
                  : 'Deposit confirmed!'
                }
              </div>

              <div className="text-gray-400 text-sm">
                {isMonitoring
                  ? (sprintXProgress?.detail ||
                     `This usually takes 1-2 minutes for Algorand transactions to confirm (${Math.floor(monitoringTimeLeft / 60)}:${(monitoringTimeLeft % 60).toString().padStart(2, '0')} remaining)`)
                  : 'Your ckALGO tokens are being minted'
                }
              </div>

              {/* Sprint X Status Message */}
              {statusMessage && (
                <div className="text-green-400 text-sm font-medium">
                  {statusMessage}
                </div>
              )}

              {/* Sprint X Progress - Time Remaining */}
              {sprintXProgress?.timeRemaining && (
                <div className="text-blue-400 text-xs">
                  Sprint X Automatic System • Estimated time remaining: ~{sprintXProgress.timeRemaining} minutes
                </div>
              )}
            </div>

            {/* Enhanced Custody Address Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-4">
                <div className="text-sm text-orange-300 font-medium mb-2">🔒 Custody Address</div>
                <div className="text-xs text-gray-300 mb-2">Your ALGO will be locked here:</div>
                <code className="text-xs text-orange-200 bg-gray-900/50 p-2 rounded break-all block">
                  {depositAddress}
                </code>
                <div className="mt-2 text-xs text-gray-400">
                  ✅ Controlled by ICP threshold signatures
                </div>
              </div>

              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                <div className="text-sm text-blue-300 font-medium mb-2">💰 Deposit Details</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Expected:</span>
                    <span className="text-white font-mono">{mintAmount} ALGO</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">ckALGO to mint:</span>
                    <span className="text-white font-mono">{mintAmount} ckALGO</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Backing ratio:</span>
                    <span className="text-green-400 font-medium">100%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Security & Transparency Information */}
            <div className="bg-gray-700/30 border border-gray-600/30 rounded-lg p-4">
              <div className="text-sm text-gray-300">
                <div className="font-medium text-yellow-300 mb-2">🔍 What's Happening</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <div className="text-white font-medium">1. Real-Time Monitoring</div>
                    <div className="text-gray-400">Scanning Algorand network every 30 seconds</div>
                  </div>
                  <div>
                    <div className="text-white font-medium">2. Automatic Verification</div>
                    <div className="text-gray-400">Confirming deposit amount and sender</div>
                  </div>
                  <div>
                    <div className="text-white font-medium">3. Secure Minting</div>
                    <div className="text-gray-400">ckALGO created only after ALGO is locked</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Phase 3.2: Live Verification Link */}
            <div className="text-center">
              <button
                onClick={() => {
                  window.open(`https://testnet.algoexplorer.io/address/${depositAddress}`, '_blank');
                }}
                className="text-sm text-blue-400 hover:text-blue-300 underline"
              >
                🔗 View custody address on Algorand Explorer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Success */}
      {currentStep === 4 && transactionResult && transactionResult.success && (
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