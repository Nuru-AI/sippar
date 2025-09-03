/**
 * Wallet Connection Modal Component
 * Modal for selecting and connecting to Algorand wallets
 */

import React, { useState } from 'react';
import { useAlgorandWallet } from '../hooks/useAlgorandWallet';
import type { WalletType, WalletInfo } from '../types/wallet';

interface WalletConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWalletConnected?: (walletType: WalletType) => void;
}

const WalletConnectionModal: React.FC<WalletConnectionModalProps> = ({
  isOpen,
  onClose,
  onWalletConnected
}) => {
  const {
    isConnecting,
    error,
    availableWallets,
    connectWallet,
    clearError
  } = useAlgorandWallet();

  const [selectedWallet, setSelectedWallet] = useState<WalletType | null>(null);

  const handleWalletSelect = async (walletType: WalletType) => {
    setSelectedWallet(walletType);
    clearError();

    const success = await connectWallet(walletType);
    if (success) {
      onWalletConnected?.(walletType);
      onClose();
    }
    
    setSelectedWallet(null);
  };

  const handleClose = () => {
    if (!isConnecting) {
      clearError();
      onClose();
    }
  };

  const WalletOption = ({ wallet }: { wallet: WalletInfo }) => (
    <button
      onClick={() => handleWalletSelect(wallet.type)}
      disabled={isConnecting || !wallet.isInstalled}
      className={`w-full p-3 sm:p-4 rounded-lg border transition-all text-left touch-manipulation ${
        wallet.isInstalled
          ? 'border-gray-600 hover:border-blue-500 hover:bg-gray-700/50 cursor-pointer active:bg-gray-700/70'
          : 'border-gray-700 bg-gray-800/50 cursor-not-allowed opacity-60'
      } ${
        selectedWallet === wallet.type ? 'border-blue-500 bg-blue-900/20' : ''
      }`}
    >
      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Wallet Icon */}
        <div className="text-2xl sm:text-3xl flex-shrink-0">{wallet.icon}</div>
        
        {/* Wallet Info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <h3 className="font-semibold text-white text-sm sm:text-base truncate">{wallet.name}</h3>
            {!wallet.isInstalled && (
              <span className="text-xs bg-yellow-900/50 text-yellow-300 px-2 py-1 rounded self-start">
                Not Installed
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-gray-400 mt-1 line-clamp-2 sm:line-clamp-none">
            {wallet.description}
          </p>
          
          {/* Capabilities */}
          <div className="flex items-center space-x-2 mt-2">
            {wallet.capabilities.canSign && (
              <span className="text-xs bg-green-900/50 text-green-300 px-2 py-1 rounded">
                Signing
              </span>
            )}
            {wallet.capabilities.supportsAssets && (
              <span className="text-xs bg-blue-900/50 text-blue-300 px-2 py-1 rounded">
                Assets
              </span>
            )}
          </div>
        </div>

        {/* Connection Status */}
        <div className="flex-shrink-0">
          {selectedWallet === wallet.type && isConnecting ? (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          ) : wallet.isInstalled ? (
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          ) : (
            <a
              href={wallet.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              Install
            </a>
          )}
        </div>
      </div>
    </button>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-gray-800 rounded-lg max-w-md w-full mx-2 sm:mx-0 border border-gray-700 max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-700">
          <h2 className="text-lg sm:text-xl font-bold text-white">Connect Wallet</h2>
          <button
            onClick={handleClose}
            disabled={isConnecting}
            className="text-gray-400 hover:text-white transition-colors disabled:opacity-50 touch-manipulation"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          <p className="text-sm sm:text-base text-gray-300 mb-4 sm:mb-6">
            <span className="hidden sm:inline">Choose a wallet to connect with. You'll be able to send ALGO directly from your wallet to mint ckALGO tokens.</span>
            <span className="sm:hidden">Connect your Algorand wallet to send ALGO and mint ckALGO tokens.</span>
          </p>

          {/* Error Display */}
          {error && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <div className="text-red-400 text-xl">⚠️</div>
                <div>
                  <h4 className="text-red-400 font-medium">Connection Failed</h4>
                  <p className="text-red-300 text-sm mt-1">{error}</p>
                  <button
                    onClick={clearError}
                    className="text-red-400 hover:text-red-300 text-sm mt-2 underline"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Wallet Options */}
          <div className="space-y-3">
            {availableWallets.map((wallet) => (
              <WalletOption key={wallet.type} wallet={wallet} />
            ))}
          </div>

          {/* Security Notice */}
          <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
            <div className="flex items-start space-x-3">
              <div className="text-blue-400 text-xl">🔒</div>
              <div className="text-blue-200 text-sm">
                <strong>Secure Connection:</strong> Sippar never sees or stores your private keys. 
                All transactions are signed directly in your wallet.
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-700">
          <button
            onClick={handleClose}
            disabled={isConnecting}
            className="w-full py-2 px-4 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            {isConnecting ? 'Connecting...' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WalletConnectionModal;