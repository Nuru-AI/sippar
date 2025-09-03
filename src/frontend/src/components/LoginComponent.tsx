/**
 * Sippar Login Component
 * Internet Identity authentication with Algorand branding
 */

import React from 'react';
import { useAlgorandIdentity } from '../hooks/useAlgorandIdentity';

const LoginComponent: React.FC = () => {
  const { login, isLoading, error } = useAlgorandIdentity();

  const handleLogin = async () => {
    await login();
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-gray-800 rounded-lg shadow-xl p-8 border border-gray-700">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl">🌉</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Welcome to Sippar
          </h2>
          <p className="text-gray-400">
            Algorand Chain Fusion Bridge
          </p>
        </div>

        {/* Phase 1 Info */}
        <div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-400">Phase 1: Foundation</h3>
              <div className="mt-1 text-sm text-blue-300">
                Internet Identity authentication with automatic Algorand credential derivation
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center text-sm text-gray-300">
            <svg className="h-4 w-4 text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Zero Web3 complexity - no wallets or seed phrases
          </div>
          <div className="flex items-center text-sm text-gray-300">
            <svg className="h-4 w-4 text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Biometric authentication via Internet Identity
          </div>
          <div className="flex items-center text-sm text-gray-300">
            <svg className="h-4 w-4 text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Automatic Algorand address generation
          </div>
          <div className="flex items-center text-sm text-gray-300">
            <svg className="h-4 w-4 text-blue-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Trustless bridge using threshold signatures
          </div>
        </div>

        {/* Error Display */}
        {error && error.code !== 'CHAIN_FUSION_NOT_READY' && (
          <div className="mb-6 bg-red-900/50 border border-red-600 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-400">
                  Authentication Error
                </h3>
                <div className="mt-2 text-sm text-red-300">
                  {error.message}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Login Button */}
        <button
          onClick={handleLogin}
          disabled={isLoading}
          className="w-full flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Connecting to Internet Identity...
            </>
          ) : (
            <>
              <svg className="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
              Login with Internet Identity
            </>
          )}
        </button>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-400">
          <p>Secure • Trustless • Decentralized</p>
          <p className="mt-1">
            Powered by{' '}
            <span className="text-blue-400 font-medium">Internet Computer</span>
            {' '}and{' '}
            <span className="text-green-400 font-medium">Algorand</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginComponent;