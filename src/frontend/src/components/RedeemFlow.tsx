/**
 * ALGO Redeem Flow Component
 * Allows users to burn ckALGO tokens and receive native ALGO
 */

import React, { useState, useEffect } from 'react';
import { useAlgorandIdentity } from '../hooks/useAlgorandIdentity';
import { ckAlgoCanister } from '../services/ckAlgoCanister';
import sipparAPI from '../services/SipparAPIService';

interface RedeemStep {
  step: number;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed';
}

const RedeemFlow: React.FC = () => {
  const { user, credentials } = useAlgorandIdentity();
  const [redeemAmount, setRedeemAmount] = useState<string>('');
  const [destinationAddress, setDestinationAddress] = useState<string>('');
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [ckAlgoBalance, setCkAlgoBalance] = useState<number>(0);
  const [balanceLoading, setBalanceLoading] = useState<boolean>(false);
  const [processingTimeLeft, setProcessingTimeLeft] = useState<number>(60); // 1 minute for redemption
  const [transactionResult, setTransactionResult] = useState<any>(null);

  const steps: RedeemStep[] = [
    {
      step: 1,
      title: 'Enter Details',
      description: 'Specify amount and destination address for ALGO redemption',
      status: currentStep === 1 ? 'active' : currentStep > 1 ? 'completed' : 'pending'
    },
    {
      step: 2,
      title: 'Confirm Transaction',
      description: 'Review and confirm your ckALGO redemption details',
      status: currentStep === 2 ? 'active' : currentStep > 2 ? 'completed' : 'pending'
    },
    {
      step: 3,
      title: 'Process Redemption',
      description: 'Burn ckALGO tokens and initiate ALGO transfer',
      status: currentStep === 3 ? 'active' : currentStep > 3 ? 'completed' : 'pending'
    },
    {
      step: 4,
      title: 'Receive ALGO',
      description: 'Native ALGO transferred to your specified address',
      status: currentStep === 4 ? 'active' : currentStep > 4 ? 'completed' : 'pending'
    }
  ];

  useEffect(() => {
    if (user?.principal) {
      // Load user's ckALGO balance
      loadCkAlgoBalance();
    }
  }, [user]);

  useEffect(() => {
    if (credentials?.algorandAddress && !destinationAddress) {
      // Pre-fill with user's own address by default
      setDestinationAddress(credentials.algorandAddress);
    }
  }, [credentials, destinationAddress]);

  const loadCkAlgoBalance = async () => {
    if (user?.principal) {
      setBalanceLoading(true);
      try {
        // Load real ckALGO balance from canister
        console.log('🪙 Loading ckALGO balance from canister for principal:', user.principal);
        
        const response = await fetch(`https://nuru.network/api/sippar/ck-algo/balance/${user.principal}`);
        const balanceData = await response.json();
        
        if (response.ok && balanceData.ck_algo_balance !== undefined) {
          setCkAlgoBalance(balanceData.ck_algo_balance);
          console.log('✅ Loaded real ckALGO balance:', balanceData.ck_algo_balance);
        } else {
          console.error('❌ Failed to load balance:', balanceData);
          setCkAlgoBalance(0); // Show 0 balance on error instead of fake placeholder
        }
      } catch (error) {
        console.error('❌ Failed to load ckALGO balance:', error);
        setCkAlgoBalance(0); // Show 0 balance on error instead of fake placeholder
      } finally {
        setBalanceLoading(false);
      }
    }
  };

  const handleStartRedeem = () => {
    if (!redeemAmount || parseFloat(redeemAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    
    if (parseFloat(redeemAmount) > ckAlgoBalance) {
      alert('Insufficient ckALGO balance');
      return;
    }
    
    if (!destinationAddress || !isValidAlgorandAddress(destinationAddress)) {
      alert('Please enter a valid Algorand address');
      return;
    }
    
    setCurrentStep(2);
  };

  const handleConfirmRedeem = async () => {
    setCurrentStep(3);
    setIsProcessing(true);
    setProcessingTimeLeft(60); // Reset timer
    
    try {
      if (user?.principal) {
        console.log('💸 Starting real ckALGO redemption (Phase 3)...');
        
        // Phase 3: Real redemption via confirmed endpoint
        const response = await fetch('https://nuru.network/api/sippar/ck-algo/redeem-confirmed', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: parseFloat(redeemAmount),
            targetAddress: destinationAddress,
            userPrincipal: user.principal
          })
        });
        
        const redeemResult = await response.json();
        
        if (redeemResult.success) {
          console.log('✅ ALGO redeemed successfully (Phase 3):', redeemResult);
          setTransactionResult(redeemResult);
          setCurrentStep(4); // Success
          setIsProcessing(false);
          // Refresh balance after successful redemption
          loadCkAlgoBalance();
        } else {
          throw new Error(redeemResult.error || 'Redemption failed');
        }
      }
    } catch (error) {
      console.error('❌ Real redemption failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`Redemption failed: ${errorMessage}`);
      setIsProcessing(false);
      setCurrentStep(2); // Go back to confirmation
    }
  };

  // startRedemptionProcessing function removed - now using real redemption endpoint

  const isValidAlgorandAddress = (address: string): boolean => {
    // Basic Algorand address validation
    return /^[A-Z2-7]{58}$/.test(address);
  };

  const StepIndicator = ({ step }: { step: RedeemStep }) => (
    <div className="flex items-center mb-4">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
        step.status === 'completed' ? 'bg-green-500' :
        step.status === 'active' ? 'bg-red-500' : 'bg-gray-400'
      }`}>
        {step.status === 'completed' ? '✓' : step.step}
      </div>
      <div>
        <div className={`font-medium ${
          step.status === 'active' ? 'text-red-400' : 'text-gray-300'
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
        <p className="text-gray-400">Please log in to use the redeem flow</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">
          💸 Redeem ALGO Tokens
        </h2>
        <p className="text-gray-400">
          Convert your ckALGO tokens back to native ALGO on Algorand
        </p>
      </div>
      
      {/* Real Integration Notice */}
      <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="text-green-400 text-xl">✅</div>
          <div className="text-green-200 text-sm">
            <strong>Live Integration:</strong> This redemption flow uses real blockchain integration. 
            ckALGO tokens are burned via our deployed canister and ALGO is transferred using threshold signatures.
          </div>
        </div>
      </div>

      {/* Balance Display */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-2">Your Balance</h3>
        <div className="flex justify-between items-center">
          <span className="text-gray-300">Available ckALGO:</span>
          {balanceLoading ? (
            <span className="text-xl font-mono text-yellow-400">Loading...</span>
          ) : (
            <span className="text-xl font-mono text-green-400">{ckAlgoBalance.toFixed(6)} ckALGO</span>
          )}
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Redemption Process</h3>
        {steps.map((step) => (
          <StepIndicator key={step.step} step={step} />
        ))}
      </div>

      {/* Step 1: Enter Details */}
      {currentStep === 1 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">
            Step 1: Enter Redemption Details
          </h3>
          
          <div className="space-y-4">
            {/* Amount Input */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                ckALGO Amount to Redeem
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max={ckAlgoBalance}
                  step="0.000001"
                  placeholder="0.000000"
                  value={redeemAmount}
                  onChange={(e) => setRedeemAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <span className="text-gray-400">ckALGO</span>
                </div>
              </div>
              <div className="flex justify-between text-sm text-gray-400 mt-1">
                <span>Available: {ckAlgoBalance.toFixed(6)} ckALGO</span>
                <button
                  onClick={() => setRedeemAmount(ckAlgoBalance.toString())}
                  className="text-red-400 hover:text-red-300"
                >
                  Max
                </button>
              </div>
            </div>

            {/* Destination Address */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Destination Algorand Address
              </label>
              <input
                type="text"
                placeholder="Enter Algorand address (58 characters)"
                value={destinationAddress}
                onChange={(e) => setDestinationAddress(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-red-500 focus:ring-1 focus:ring-red-500 font-mono text-sm"
              />
              <div className="text-xs text-gray-400 mt-1">
                ALGO will be sent to this address. Double-check for accuracy.
              </div>
            </div>

            {/* Preview */}
            {redeemAmount && parseFloat(redeemAmount) > 0 && isValidAlgorandAddress(destinationAddress) && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                <div className="text-sm text-red-300 space-y-1">
                  <div className="flex justify-between">
                    <span>You will burn:</span>
                    <span className="font-mono">{redeemAmount} ckALGO</span>
                  </div>
                  <div className="flex justify-between">
                    <span>You will receive:</span>
                    <span className="font-mono">{redeemAmount} ALGO</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Network fees:</span>
                    <span>~0.001 ALGO</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Net ALGO received:</span>
                    <span className="font-mono">{(parseFloat(redeemAmount) - 0.001).toFixed(6)} ALGO</span>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleStartRedeem}
              disabled={
                !redeemAmount || 
                parseFloat(redeemAmount) <= 0 || 
                parseFloat(redeemAmount) > ckAlgoBalance ||
                !isValidAlgorandAddress(destinationAddress)
              }
              className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              Continue to Confirmation
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Confirmation */}
      {currentStep === 2 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">
            Step 2: Confirm Redemption
          </h3>
          
          <div className="space-y-4">
            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="text-yellow-400 text-xl">⚠️</div>
                <div className="text-yellow-200 text-sm">
                  <strong>Important:</strong> This action cannot be undone. Your ckALGO tokens will be permanently burned.
                </div>
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-600 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-white mb-3">Transaction Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Burn ckALGO:</span>
                  <span className="font-mono text-white">{redeemAmount} ckALGO</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Destination:</span>
                  <span className="font-mono text-white text-xs break-all">{destinationAddress}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Network fee:</span>
                  <span className="font-mono text-white">~0.001 ALGO</span>
                </div>
                <hr className="border-gray-600" />
                <div className="flex justify-between font-semibold">
                  <span className="text-gray-300">You will receive:</span>
                  <span className="font-mono text-green-400">{(parseFloat(redeemAmount) - 0.001).toFixed(6)} ALGO</span>
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
                onClick={handleConfirmRedeem}
                className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
              >
                Confirm Redemption →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Processing */}
      {currentStep === 3 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">
            Step 3: Processing Redemption
          </h3>
          
          <div className="text-center space-y-4">
            {isProcessing && (
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
              </div>
            )}
            
            <div className="text-white">
              {isProcessing ? 'Burning ckALGO and sending ALGO...' : 'Redemption completed!'}
            </div>
            
            <div className="text-gray-400 text-sm">
              {isProcessing 
                ? `Processing redemption (${Math.floor(processingTimeLeft / 60)}:${(processingTimeLeft % 60).toString().padStart(2, '0')} remaining)`
                : 'ALGO has been sent to your specified address'
              }
            </div>

            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
              <div className="text-sm text-red-300">
                <div>Burning: <code className="text-xs">{redeemAmount} ckALGO</code></div>
                <div>Sending to: <code className="text-xs break-all">{destinationAddress}</code></div>
                <div>Amount: {(parseFloat(redeemAmount) - 0.001).toFixed(6)} ALGO</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Success */}
      {currentStep === 4 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">
            Step 4: Redemption Complete! 🎉
          </h3>
          
          <div className="text-center space-y-4">
            <div className="text-6xl mb-4">✅</div>
            
            <div className="text-xl text-green-400 font-semibold">
              Successfully redeemed {redeemAmount} ckALGO for ALGO!
            </div>
            
            <div className="text-gray-400">
              Native ALGO has been sent to your specified address and should arrive within a few minutes.
            </div>

            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
              <div className="text-sm text-green-300 space-y-1">
                <div className="flex justify-between">
                  <span>ckALGO Burned:</span>
                  <span className="font-mono">{redeemAmount} ckALGO</span>
                </div>
                <div className="flex justify-between">
                  <span>ALGO Sent:</span>
                  <span className="font-mono">{transactionResult?.algoAmount || redeemAmount} ALGO</span>
                </div>
                <div className="flex justify-between">
                  <span>Destination:</span>
                  <span className="font-mono text-xs break-all">{transactionResult?.targetAddress || destinationAddress}</span>
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
                setRedeemAmount('');
                setDestinationAddress(credentials?.algorandAddress || '');
                setIsProcessing(false);
                setTransactionResult(null);
                loadCkAlgoBalance(); // Refresh balance
              }}
              className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
            >
              Redeem More ALGO
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RedeemFlow;