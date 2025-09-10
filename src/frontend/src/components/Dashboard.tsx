/**
 * Sippar Dashboard Component
 * Main authenticated user interface for Phase 1
 */

import React, { useState, useEffect } from 'react';
import { useAlgorandIdentity } from '../hooks/useAlgorandIdentity';
import { useAuthStore } from '../stores/authStore'; // ✅ ADDED: Direct store access for balance management
import ChainFusionExplanation from './ChainFusionExplanation';
import MintFlow from './MintFlow';
import RedeemFlow from './RedeemFlow';
import TransactionHistory from './TransactionHistory';
import AIChat from './ai/AIChat';
import AIOracle from './ai/AIOracle';
import sipparAPI from '../services/SipparAPIService';

const Dashboard: React.FC = () => {
  const { user, credentials, logout } = useAlgorandIdentity();
  
  // ✅ MIGRATED: Use store for balance management instead of local state
  const algoBalance = useAuthStore(state => state.algoBalance);
  const ckAlgoBalance = useAuthStore(state => state.ckAlgoBalance);
  const setBalances = useAuthStore(state => state.setBalances);
  const setBalancesLoading = useAuthStore(state => state.setBalancesLoading);
  
  const [showChainFusionExplanation, setShowChainFusionExplanation] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'mint' | 'redeem' | 'history' | 'ai-oracle'>('overview');

  useEffect(() => {
    if (user?.principal) {
      loadBalances();
    }
  }, [user]);

  // Listen for balance refresh events (triggered after successful minting/redeeming)
  useEffect(() => {
    const handleBalanceRefresh = () => {
      console.log('🔄 Refreshing balances after transaction...');
      loadBalances();
    };

    window.addEventListener('sipparBalanceRefresh', handleBalanceRefresh);
    return () => window.removeEventListener('sipparBalanceRefresh', handleBalanceRefresh);
  }, [user]);

  const loadBalances = async () => {
    if (!user?.principal) return;
    
    try {
      // ✅ MIGRATED: Use store loading state
      setBalancesLoading(true);
      
      // Get system status to verify API connectivity
      const statusResponse = await sipparAPI.getSystemStatus();
      
      if (statusResponse.status === 'success') {
        console.log('✅ Sippar API connected:', statusResponse.data?.canister_id);
        
        // Get user's derived Algorand address if available
        if (credentials?.algorandAddress) {
          try {
            // Query real ALGO balance from balance monitor endpoint
            const balanceResponse = await fetch(`https://nuru.network/api/sippar/balance-monitor/${credentials.algorandAddress}`);
            
            // Query real ckALGO balance from ckALGO balance endpoint
            const ckAlgoResponse = await fetch(`https://nuru.network/api/sippar/ck-algo/balance/${user.principal}`);
            
            if (balanceResponse.ok && ckAlgoResponse.ok) {
              const balanceData = await balanceResponse.json();
              const ckAlgoData = await ckAlgoResponse.json();
              
              if (balanceData.success && ckAlgoData.success) {
                console.log('✅ Real balances loaded:', balanceData.balance_algo, 'ALGO,', ckAlgoData.balances.ck_algo_balance, 'ckALGO');
                // Set real balances for both ALGO and ckALGO
                setBalances(balanceData.balance_algo, ckAlgoData.balances.ck_algo_balance);
                return;
              }
            }
          } catch (balanceError) {
            console.warn('⚠️ Failed to load real balance, showing zero values:', balanceError);
          }
        }
        
        // Show zero balances if real balance loading fails
        setBalances(0.0, 0.0);
      } else {
        throw new Error(statusResponse.error || 'API connection failed');
      }
    } catch (error) {
      console.error('❌ Failed to load balances:', error);
      // Show zero balances on error
      setBalances(0.0, 0.0);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="space-y-8">
      {/* Header with User Info */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Welcome to Sippar! 🎉
            </h2>
            <p className="text-gray-400">
              Your Internet Identity is successfully connected to the Algorand ecosystem
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm font-medium text-red-300 hover:text-red-200 border border-red-600 hover:border-red-500 rounded-md transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-800 rounded-lg p-1 border border-gray-700">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            activeTab === 'overview'
              ? 'bg-blue-600 text-white'
              : 'text-gray-300 hover:text-white hover:bg-gray-700'
          }`}
        >
          📊 Overview
        </button>
        <button
          onClick={() => setActiveTab('mint')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            activeTab === 'mint'
              ? 'bg-green-600 text-white'
              : 'text-gray-300 hover:text-white hover:bg-gray-700'
          }`}
        >
          🪙 Mint ckALGO
        </button>
        <button
          onClick={() => setActiveTab('redeem')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            activeTab === 'redeem'
              ? 'bg-red-600 text-white'
              : 'text-gray-300 hover:text-white hover:bg-gray-700'
          }`}
        >
          💸 Redeem ALGO
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            activeTab === 'history'
              ? 'bg-purple-600 text-white'
              : 'text-gray-300 hover:text-white hover:bg-gray-700'
          }`}
        >
          📊 History
        </button>
        <button
          onClick={() => setActiveTab('ai-oracle')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            activeTab === 'ai-oracle'
              ? 'bg-orange-600 text-white'
              : 'text-gray-300 hover:text-white hover:bg-gray-700'
          }`}
        >
          🤖 AI Oracle
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Identity Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Internet Identity Card */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center mb-4">
            <div className="h-10 w-10 bg-blue-500 rounded-full flex items-center justify-center mr-3">
              <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 8A8 8 0 11-2 8a8 8 0 0118 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 9z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Internet Identity</h3>
              <p className="text-sm text-gray-400">Your ICP Principal</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-400">Principal ID</label>
              <div className="mt-1 p-3 bg-gray-900 rounded border border-gray-600">
                <code className="text-sm text-green-400 break-all">
                  {user?.principal || 'Loading...'}
                </code>
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-400">Account ID</label>
              <div className="mt-1 p-3 bg-gray-900 rounded border border-gray-600">
                <code className="text-sm text-blue-400">
                  {user?.accountId || 'Loading...'}
                </code>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Status</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900 text-green-200">
                <svg className="w-2 h-2 mr-1" fill="currentColor" viewBox="0 0 8 8">
                  <circle cx="4" cy="4" r="3" />
                </svg>
                Authenticated
              </span>
            </div>
          </div>
        </div>

        {/* Algorand Credentials Card */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center mb-4">
            <div className="h-10 w-10 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center mr-3">
              <span className="text-white font-bold text-sm">AL</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Algorand Credentials</h3>
              <p className="text-sm text-gray-400">Chain Fusion Derived</p>
            </div>
          </div>
          <div className="space-y-3">
            {credentials?.algorandAddress ? (
              <>
                <div>
                  <label className="text-sm text-gray-400">Algorand Address</label>
                  <div className="mt-1 p-3 bg-gray-900 rounded border border-gray-600">
                    <div className="flex items-center justify-between">
                      <code className="text-sm text-green-400 break-all flex-1 mr-3">
                        {credentials.algorandAddress}
                      </code>
                      <div className="flex space-x-1">
                        <a
                          href={`https://allo.info/account/${credentials.algorandAddress}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 inline-flex items-center px-2 py-1 text-xs font-medium text-blue-300 bg-blue-900/50 border border-blue-600/50 rounded hover:bg-blue-800/50 hover:border-blue-500 transition-colors"
                          title="View on Allo.info"
                        >
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z" clipRule="evenodd" />
                            <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z" clipRule="evenodd" />
                          </svg>
                          Allo
                        </a>
                        <a
                          href={`https://explorer.perawallet.app/address/${credentials.algorandAddress}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 inline-flex items-center px-2 py-1 text-xs font-medium text-purple-300 bg-purple-900/50 border border-purple-600/50 rounded hover:bg-purple-800/50 hover:border-purple-500 transition-colors"
                          title="View on Pera Explorer"
                        >
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z" clipRule="evenodd" />
                            <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z" clipRule="evenodd" />
                          </svg>
                          Pera
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
                {credentials.ethereumAddress && (
                  <div>
                    <label className="text-sm text-gray-400">Ethereum Address (Milkomeda)</label>
                    <div className="mt-1 p-3 bg-gray-900 rounded border border-gray-600">
                      <code className="text-sm text-purple-400 break-all">
                        {credentials.ethereumAddress}
                      </code>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Derived</span>
                  <span className="text-green-400">
                    {new Date(credentials.timestamp).toLocaleString()}
                  </span>
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <div className="h-12 w-12 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="h-6 w-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-yellow-400 font-medium">Phase 1 Mode</p>
                <p className="text-sm text-gray-400 mt-1">
                  Algorand credentials will be available when Chain Fusion backend is deployed
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Phase 1 Status */}
      <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 border border-blue-600/50 rounded-lg p-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-8 w-8 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-4 flex-1">
            <h3 className="text-lg font-semibold text-white mb-2">
              Phase 2: Chain Fusion Complete! ✅
            </h3>
            <p className="text-blue-200 mb-4">
              ckALGO tokens are deployed and functional. You can now mint and redeem ALGO through our trustless Chain Fusion bridge.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">✓</div>
                <div className="text-sm text-gray-300">Authentication</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">✓</div>
                <div className="text-sm text-gray-300">Chain Fusion</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">✓</div>
                <div className="text-sm text-gray-300">ckALGO Tokens</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">✓</div>
                <div className="text-sm text-gray-300">AI Oracle</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">⏳</div>
                <div className="text-sm text-gray-300">Trading AI</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Balance Display */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            💰 Your Balances
            <button 
              onClick={loadBalances}
              className="ml-auto text-sm text-blue-400 hover:text-blue-300"
            >
              🔄 Refresh
            </button>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="text-center p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
              <div className="text-2xl font-bold text-green-400 mb-1">
                {Math.max(0, algoBalance - ckAlgoBalance).toFixed(6)}
              </div>
              <div className="text-sm text-green-300">Available ALGO</div>
              <div className="text-xs text-gray-400 mt-1">Free to spend</div>
            </div>
            <div className="text-center p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
              <div className="text-2xl font-bold text-blue-400 mb-1">
                {ckAlgoBalance.toFixed(6)}
              </div>
              <div className="text-sm text-blue-300">Chain-Key ALGO</div>
              <div className="text-xs text-gray-400 mt-1">Internet Computer</div>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-gray-800/30 border border-gray-600/30 rounded-lg">
            <div className="text-xs text-gray-300 text-center">
              <div className="font-medium text-yellow-300 mb-1">🔗 Chain Fusion Bridge</div>
              <div>Available = Wallet Balance - ckALGO • ckALGO = Tradeable on ICP (1:1 backed)</div>
              {ckAlgoBalance > 0 && (
                <div className="mt-2 text-xs text-yellow-200">
                  {ckAlgoBalance.toFixed(6)} ALGO from your wallet is locked backing ckALGO (redeem to unlock)
                </div>
              )}
            </div>
          </div>
          
          {(algoBalance > 0 || ckAlgoBalance > 0) && (
            <div className="mt-4 text-center">
              <div className="text-sm text-gray-400">
                Total Portfolio Value: <span className="text-white font-mono">{algoBalance.toFixed(6)} ALGO</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cross-Chain Trading Explanation */}
      <div className="bg-gradient-to-br from-green-900/30 to-blue-900/30 rounded-lg p-6 border border-green-500/30">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          🔄 How Cross-Chain Trading Works
        </h3>
        
        <div className="grid md:grid-cols-3 gap-4 mb-4">
          <div className="text-center p-4 bg-gray-800/50 rounded-lg">
            <div className="text-2xl mb-2">🪙</div>
            <div className="font-semibold text-green-400">1. Mint ckALGO</div>
            <div className="text-sm text-gray-300">Deposit ALGO → Get ckALGO tokens (1:1)</div>
          </div>
          <div className="text-center p-4 bg-gray-800/50 rounded-lg">
            <div className="text-2xl mb-2">💱</div>
            <div className="font-semibold text-blue-400">2. Trade on ICP</div>
            <div className="text-sm text-gray-300">ckALGO ↔ ckBTC, ckETH, ICP on DEXs</div>
          </div>
          <div className="text-center p-4 bg-gray-800/50 rounded-lg">
            <div className="text-2xl mb-2">💸</div>
            <div className="font-semibold text-red-400">3. Redeem Assets</div>
            <div className="text-sm text-gray-300">Convert back to native tokens anytime</div>
          </div>
        </div>
        
        <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
          <h4 className="font-semibold text-green-300 mb-2">✨ Key Benefits:</h4>
          <ul className="text-sm text-green-200 space-y-1">
            <li>• <strong>1:1 Backing:</strong> Every ckALGO backed by real ALGO in custody</li>
            <li>• <strong>Zero Bridge Risk:</strong> Direct cryptographic control via threshold signatures</li>
            <li>• <strong>Access ICP DeFi:</strong> Trade on ICPSwap, Sonic, and other ICP protocols</li>
            <li>• <strong>Cross-Chain Arbitrage:</strong> Profit from price differences between networks</li>
          </ul>
        </div>
      </div>

      {/* Roadmap */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Development Roadmap</h3>
        <div className="space-y-3">
          <div className="flex items-center text-sm opacity-60">
            <div className="h-8 w-8 bg-green-500 rounded-full flex items-center justify-center mr-3">
              <span className="text-white font-bold text-xs">✓</span>
            </div>
            <div>
              <div className="font-medium text-white line-through">Phase 1: Internet Identity Foundation</div>
              <div className="text-gray-400">Completed - Authentication and address derivation working</div>
            </div>
          </div>
          <div className="flex items-center text-sm opacity-60">
            <div className="h-8 w-8 bg-green-500 rounded-full flex items-center justify-center mr-3">
              <span className="text-white font-bold text-xs">✓</span>
            </div>
            <div>
              <div className="font-medium text-white line-through">Phase 2: ckALGO Chain Fusion</div>
              <div className="text-gray-400">Completed - Mint/redeem flows functional</div>
            </div>
          </div>
          <div className="flex items-center text-sm opacity-60">
            <div className="h-8 w-8 bg-green-500 rounded-full flex items-center justify-center mr-3">
              <span className="text-white font-bold text-xs">✓</span>
            </div>
            <div>
              <div className="font-medium text-white line-through">Sprint 009: ICP Backend Integration</div>
              <div className="text-gray-400">Completed - Live Oracle monitoring with 56ms AI responses</div>
            </div>
          </div>
          <div className="flex items-center text-sm opacity-60">
            <div className="h-8 w-8 bg-green-500 rounded-full flex items-center justify-center mr-3">
              <span className="text-white font-bold text-xs">✓</span>
            </div>
            <div>
              <div className="font-medium text-white line-through">Sprint 010: Frontend State Management</div>
              <div className="text-gray-400">Completed - Zustand store with comprehensive testing deployed</div>
            </div>
          </div>
          <div className="flex items-center text-sm opacity-60">
            <div className="h-8 w-8 bg-yellow-500 rounded-full flex items-center justify-center mr-3">
              <span className="text-white font-bold text-xs">🎉</span>
            </div>
            <div>
              <div className="font-medium text-white line-through">Sprint 011: HISTORIC BREAKTHROUGH</div>
              <div className="text-gray-400">Completed - World-first ICP-Algorand Chain Fusion with real transactions</div>
            </div>
          </div>
          <div className="flex items-center text-sm">
            <div className="h-8 w-8 bg-red-500 rounded-full flex items-center justify-center mr-3">
              <span className="text-white font-bold text-xs">🔥</span>
            </div>
            <div>
              <div className="font-medium text-white">Sprint 011.5: Breakthrough Documentation</div>
              <div className="text-gray-400">URGENT - Strategic marketing & technical documentation</div>
            </div>
          </div>
          <div className="flex items-center text-sm">
            <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
              <span className="text-white font-bold text-xs">🛡️</span>
            </div>
            <div>
              <div className="font-medium text-white">Sprint 012: Security Audit & Production</div>
              <div className="text-gray-400">Security hardening for mainnet Chain Fusion</div>
            </div>
          </div>
          <div className="flex items-center text-sm">
            <div className="h-8 w-8 bg-purple-500 rounded-full flex items-center justify-center mr-3">
              <span className="text-white font-bold text-xs">🪙</span>
            </div>
            <div>
              <div className="font-medium text-white">Sprint 012.5: ckALGO Smart Contract Enhancement</div>
              <div className="text-gray-400">Transform ckALGO into intelligent automation asset</div>
            </div>
          </div>
          <div className="flex items-center text-sm">
            <div className="h-8 w-8 bg-green-500 rounded-full flex items-center justify-center mr-3">
              <span className="text-white font-bold text-xs">🌐</span>
            </div>
            <div>
              <div className="font-medium text-white">Sprint 015: Multi-Chain AI Oracle</div>
              <div className="text-gray-400">Ethereum + Solana AI Oracle expansion</div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-gradient-to-r from-yellow-900/30 to-red-900/30 border border-yellow-500/30 rounded-lg">
          <div className="flex items-center mb-2">
            <div className="h-6 w-6 bg-yellow-500 rounded-full flex items-center justify-center mr-2">
              <span className="text-white font-bold text-xs">🎉</span>
            </div>
            <h4 className="font-semibold text-yellow-300">Historic Achievement: World-First Chain Fusion</h4>
          </div>
          <p className="text-xs text-yellow-200 mb-2">
            September 8, 2025: Sippar achieved the first successful ICP-to-Algorand Chain Fusion transactions on both testnet and mainnet using mathematical threshold signatures.
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-2 py-1 bg-green-900/50 border border-green-500/30 rounded text-green-300">
              Testnet TX: 3RU7HQ...F3NUQ
            </span>
            <span className="px-2 py-1 bg-blue-900/50 border border-blue-500/30 rounded text-blue-300">
              Mainnet TX: QODAHW...4QTQA
            </span>
          </div>
        </div>
      </div>

      {/* Chain Fusion Explanation Section */}
      <div className="bg-gradient-to-br from-blue-900 to-purple-900 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-white mb-2">
              🌉 How Does Chain Fusion Work?
            </h3>
            <p className="text-gray-300">
              Learn how Sippar enables trustless cross-chain integration between ICP and Algorand
            </p>
          </div>
          <button
            onClick={() => setShowChainFusionExplanation(!showChainFusionExplanation)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            {showChainFusionExplanation ? 'Hide Details' : 'Learn More'}
          </button>
        </div>
        
        {showChainFusionExplanation && (
          <div className="mt-6">
            <ChainFusionExplanation />
          </div>
        )}
      </div>

      {/* AI Chat Interface */}
      <div className="mt-6">
        <AIChat /> {/* ✅ REMOVED: Props drilling - AIChat will access store directly */}
      </div>
        </div>
      )}

      {/* Mint Flow Tab */}
      {activeTab === 'mint' && (
        <MintFlow />
      )}

      {/* Redeem Flow Tab */}
      {activeTab === 'redeem' && <RedeemFlow />}

      {/* Transaction History Tab */}
      {activeTab === 'history' && <TransactionHistory />}

      {/* AI Oracle Tab */}
      {activeTab === 'ai-oracle' && (
        <div className="space-y-8">
          {/* AI Oracle Header */}
          <div className="bg-gradient-to-r from-orange-900/50 to-red-900/50 border border-orange-600/50 rounded-lg p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2 flex items-center">
                  🤖 Sippar AI Oracle
                  <span className="ml-3 inline-flex items-center px-3 py-1 text-xs font-medium text-green-200 bg-green-900 rounded-full">
                    ✅ LIVE ON TESTNET
                  </span>
                </h2>
                <p className="text-orange-200 mb-4">
                  The first AI oracle for Algorand smart contracts is now live! Access 4 AI models directly from your smart contracts.
                </p>
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center text-green-300">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    App ID: 745336634
                  </div>
                  <div className="flex items-center text-blue-300">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    Algorand Testnet
                  </div>
                  <div className="flex items-center text-purple-300">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 2L3 7v11c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V7l-7-5zM10 12a2 2 0 110-4 2 2 0 010 4z" clipRule="evenodd" />
                    </svg>
                    Sprint 008 Complete
                  </div>
                </div>
              </div>
              <a
                href="https://testnet.explorer.perawallet.app/application/745336634"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors inline-flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z" clipRule="evenodd" />
                  <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z" clipRule="evenodd" />
                </svg>
                View on Explorer
              </a>
            </div>
          </div>

          {/* AI Models Available */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              🧠 Available AI Models
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                <div className="text-lg font-semibold text-blue-400 mb-2">qwen2.5</div>
                <div className="text-sm text-gray-300 mb-2">General Purpose</div>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• Market analysis</li>
                  <li>• Sentiment analysis</li>
                  <li>• Price prediction</li>
                </ul>
              </div>
              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                <div className="text-lg font-semibold text-green-400 mb-2">deepseek-r1</div>
                <div className="text-sm text-gray-300 mb-2">Code & Math</div>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• Financial calculations</li>
                  <li>• Code analysis</li>
                  <li>• Risk assessment</li>
                </ul>
              </div>
              <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                <div className="text-lg font-semibold text-purple-400 mb-2">phi-3</div>
                <div className="text-sm text-gray-300 mb-2">Lightweight & Fast</div>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• Security analysis</li>
                  <li>• Code review</li>
                  <li>• Anomaly detection</li>
                </ul>
              </div>
              <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
                <div className="text-lg font-semibold text-yellow-400 mb-2">mistral</div>
                <div className="text-sm text-gray-300 mb-2">Multilingual</div>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• International markets</li>
                  <li>• Multi-language content</li>
                  <li>• Global trading</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Integration Examples */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              💡 Use Case Examples
            </h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-green-900/30 to-blue-900/30 rounded-lg p-4 border border-green-500/30">
                <div className="text-lg font-semibold text-green-400 mb-2">🏦 DeFi Risk Analysis</div>
                <p className="text-sm text-gray-300 mb-3">
                  Smart contracts can request AI-powered risk assessment for lending, yield farming, and portfolio management.
                </p>
                <div className="bg-gray-900/50 rounded p-2 text-xs font-mono text-green-300">
                  request_ai_analysis(<br/>
                  &nbsp;&nbsp;"Analyze lending risk for 1000 ALGO",<br/>
                  &nbsp;&nbsp;"deepseek-r1"<br/>
                  )
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-lg p-4 border border-purple-500/30">
                <div className="text-lg font-semibold text-purple-400 mb-2">🎨 NFT Market Analysis</div>
                <p className="text-sm text-gray-300 mb-3">
                  AI-powered NFT valuation and market trend analysis for dynamic pricing and investment decisions.
                </p>
                <div className="bg-gray-900/50 rounded p-2 text-xs font-mono text-purple-300">
                  request_ai_analysis(<br/>
                  &nbsp;&nbsp;"Predict NFT collection value",<br/>
                  &nbsp;&nbsp;"qwen2.5"<br/>
                  )
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-900/30 to-orange-900/30 rounded-lg p-4 border border-red-500/30">
                <div className="text-lg font-semibold text-red-400 mb-2">🔒 Security Audits</div>
                <p className="text-sm text-gray-300 mb-3">
                  Automated smart contract security analysis and vulnerability detection using AI.
                </p>
                <div className="bg-gray-900/50 rounded p-2 text-xs font-mono text-red-300">
                  request_ai_analysis(<br/>
                  &nbsp;&nbsp;"Audit contract for vulnerabilities",<br/>
                  &nbsp;&nbsp;"phi-3"<br/>
                  )
                </div>
              </div>
            </div>
          </div>

          {/* Technical Specs */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                ⚡ Performance Specs
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">AI Response Time</span>
                  <span className="text-green-400 font-mono">120ms avg</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Oracle Processing</span>
                  <span className="text-blue-400 font-mono">&lt; 2 seconds</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">End-to-End Latency</span>
                  <span className="text-purple-400 font-mono">&lt; 5 seconds</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Network Throughput</span>
                  <span className="text-yellow-400 font-mono">1000+ TPS</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                💰 Pricing & Costs
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Credit Price</span>
                  <span className="text-green-400 font-mono">0.01 ALGO</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Transaction Fees</span>
                  <span className="text-blue-400 font-mono">~0.001 ALGO</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Total per Query</span>
                  <span className="text-purple-400 font-mono">~0.012 ALGO</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Bulk Discount</span>
                  <span className="text-yellow-400 font-mono">Available</span>
                </div>
              </div>
            </div>
          </div>

          {/* Integration Guide */}
          <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 rounded-lg p-6 border border-blue-500/30">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              📚 Developer Integration
            </h3>
            <p className="text-blue-200 mb-4">
              Ready to integrate AI capabilities into your Algorand smart contracts? Our oracle is live and ready for development.
            </p>
            
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h4 className="font-semibold text-blue-300 mb-2">Quick Start</h4>
                <div className="bg-gray-900 rounded p-3 text-xs font-mono text-green-300 mb-2">
                  python3 test_oracle.py \<br/>
                  &nbsp;&nbsp;--oracle-app-id 745336634 \<br/>
                  &nbsp;&nbsp;--credit-amount 0.05
                </div>
                <p className="text-xs text-gray-400">Test the live oracle with your testnet account</p>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-4">
                <h4 className="font-semibold text-purple-300 mb-2">Integration Steps</h4>
                <ul className="text-xs text-gray-300 space-y-1">
                  <li>1. Opt into oracle contract</li>
                  <li>2. Purchase AI credits (atomic transfer)</li>
                  <li>3. Submit AI analysis requests</li>
                  <li>4. Receive responses via callback</li>
                </ul>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="https://github.com/your-repo/sippar-ai-oracle"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors inline-flex items-center text-sm"
              >
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Integration Guide
              </a>
              <a
                href="https://testnet.explorer.perawallet.app/tx/ZY26ALTNRA3S7CINGW2QYLGIKO4CJ3ZXOMTY7TPUNI6DGEHVC7RA"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors inline-flex items-center text-sm"
              >
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Example Transaction
              </a>
              <a
                href="https://docs.sippar.network/ai-oracle"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors inline-flex items-center text-sm"
              >
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                Documentation
              </a>
            </div>
          </div>

          {/* Live Stats */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              📊 Live Oracle Stats
              <span className="ml-2 h-2 w-2 bg-green-500 rounded-full animate-pulse"></span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">745336634</div>
                <div className="text-sm text-gray-400">App ID</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">4</div>
                <div className="text-sm text-gray-400">AI Models</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">✅</div>
                <div className="text-sm text-gray-400">Status</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">Sept 4</div>
                <div className="text-sm text-gray-400">Deployed</div>
              </div>
            </div>
          </div>

          {/* Interactive Oracle Testing */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              🧪 Test the Live Oracle
            </h3>
            <AIOracle />
          </div>

          {/* What's Next */}
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              🎯 Current Status: Production Ready
            </h3>
            <p className="text-gray-300 mb-4">
              Sprint 009 & 010 complete! Oracle system is live with 56ms AI responses. Frontend uses Zustand state management. Ready for advanced integrations.
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-blue-900/20 border border-blue-500/30 rounded p-3">
                <div className="font-semibold text-blue-400 mb-1">Indexer Integration</div>
                <div className="text-sm text-gray-400">Real-time transaction monitoring</div>
              </div>
              <div className="bg-green-900/20 border border-green-500/30 rounded p-3">
                <div className="font-semibold text-green-400 mb-1">AI Processing</div>
                <div className="text-sm text-gray-400">Connect XNode2 AI service</div>
              </div>
              <div className="bg-purple-900/20 border border-purple-500/30 rounded p-3">
                <div className="font-semibold text-purple-400 mb-1">Callback System</div>
                <div className="text-sm text-gray-400">Automated response delivery</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;