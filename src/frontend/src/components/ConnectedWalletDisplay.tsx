/**
 * Connected Wallet Display Component
 * Shows connected wallet information and provides disconnect option
 */

import React, { useState } from 'react';
import { useAlgorandWallet } from '../hooks/useAlgorandWallet';

interface ConnectedWalletDisplayProps {
  showBalance?: boolean;
  showDisconnect?: boolean;
  compact?: boolean;
}

const ConnectedWalletDisplay: React.FC<ConnectedWalletDisplayProps> = ({
  showBalance = true,
  showDisconnect = true,
  compact = false
}) => {
  const { isConnected, wallet, disconnectWallet, refreshBalance } = useAlgorandWallet();
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  if (!isConnected || !wallet) {
    return null;
  }

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    await disconnectWallet();
    setIsDisconnecting(false);
  };

  const formatAddress = (address: string): string => {
    if (compact) {
      return `${address.slice(0, 8)}...${address.slice(-8)}`;
    }
    return `${address.slice(0, 12)}...${address.slice(-12)}`;
  };

  const formatBalance = (balance: number): string => {
    return balance.toFixed(6);
  };

  const getWalletIcon = (type: string): string => {
    switch (type) {
      case 'pera': return '🟣';
      case 'myalgo': return '🔷';
      case 'defly': return '🦋';
      default: return '👛';
    }
  };

  const getWalletName = (type: string): string => {
    switch (type) {
      case 'pera': return 'Pera Wallet';
      case 'myalgo': return 'MyAlgo';
      case 'defly': return 'Defly Wallet';
      default: return 'Wallet';
    }
  };

  if (compact) {
    return (
      <div className="flex items-center space-x-2 bg-gray-800 rounded-lg px-2 sm:px-3 py-2 border border-gray-700">
        <div className="text-base sm:text-lg">{getWalletIcon(wallet.type)}</div>
        <div className="min-w-0 flex-1">
          <div className="text-xs sm:text-sm font-medium text-white truncate">
            {formatAddress(wallet.address)}
          </div>
          {showBalance && wallet.balance !== undefined && (
            <div className="text-xs text-green-400">
              {formatBalance(wallet.balance)} ALGO
            </div>
          )}
        </div>
        {showDisconnect && (
          <button
            onClick={handleDisconnect}
            disabled={isDisconnecting}
            className="p-1 text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50 touch-manipulation"
            title="Disconnect wallet"
          >
            {isDisconnecting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400"></div>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-700">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2 sm:gap-0">
        <h3 className="text-base sm:text-lg font-semibold text-white flex items-center space-x-2">
          <span>{getWalletIcon(wallet.type)}</span>
          <span className="truncate">
            <span className="hidden sm:inline">Connected to {getWalletName(wallet.type)}</span>
            <span className="sm:hidden">{getWalletName(wallet.type)}</span>
          </span>
        </h3>
        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
          <span className="text-xs text-green-400">Connected</span>
        </div>
      </div>

      {/* Wallet Address */}
      <div className="space-y-2">
        <div>
          <label className="text-sm text-gray-400">Wallet Address</label>
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 mt-1">
            <div className="flex-1 p-2 bg-gray-900 border border-gray-600 rounded text-xs sm:text-sm font-mono text-green-400 break-all">
              {wallet.address}
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(wallet.address)}
              className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors touch-manipulation self-start sm:self-auto"
              title="Copy address"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Wallet Balance */}
        {showBalance && (
          <div>
            <label className="text-sm text-gray-400">ALGO Balance</label>
            <div className="flex items-center space-x-2 mt-1">
              <div className="flex-1 p-2 bg-gray-900 border border-gray-600 rounded text-sm">
                <span className="text-white font-mono">
                  {wallet.balance !== undefined ? formatBalance(wallet.balance) : 'Loading...'}
                </span>
                <span className="text-gray-400 ml-1">ALGO</span>
              </div>
              <button
                onClick={refreshBalance}
                className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                title="Refresh balance"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Disconnect Button */}
      {showDisconnect && (
        <div className="mt-4 pt-3 border-t border-gray-700">
          <button
            onClick={handleDisconnect}
            disabled={isDisconnecting}
            className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 disabled:bg-red-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            {isDisconnecting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Disconnecting...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Disconnect Wallet</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Wallet Links */}
      <div className="mt-3 flex items-center justify-center space-x-4 text-sm">
        <a
          href={`https://allo.info/account/${wallet.address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 transition-colors"
        >
          View on Explorer →
        </a>
      </div>
    </div>
  );
};

export default ConnectedWalletDisplay;