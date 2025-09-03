/**
 * Algorand Wallet Hook
 * React hook for managing Algorand wallet state and operations
 */

import { useState, useEffect, useCallback } from 'react';
import { walletManager } from '../services/AlgorandWalletManager';
import type {
  WalletType,
  ConnectedWallet,
  WalletConnectionState,
  AlgorandTransaction,
  TransactionResult,
  WalletInfo,
  WalletErrorInfo
} from '../types/wallet';

export const useAlgorandWallet = () => {
  const [connectionState, setConnectionState] = useState<WalletConnectionState>({
    isConnected: false,
    isConnecting: false,
    wallet: null,
    error: null
  });

  const [availableWallets, setAvailableWallets] = useState<WalletInfo[]>([]);

  // Initialize wallet manager and restore connection
  useEffect(() => {
    const initializeWallets = async () => {
      try {
        // Get available wallets
        const wallets = walletManager.getAvailableWallets();
        setAvailableWallets(wallets);

        // Try to restore previous connection
        const restoredWallet = await walletManager.restoreConnection();
        if (restoredWallet) {
          setConnectionState({
            isConnected: true,
            isConnecting: false,
            wallet: restoredWallet,
            error: null
          });
        }
      } catch (error) {
        console.error('❌ Failed to initialize wallets:', error);
      }
    };

    initializeWallets();
  }, []);

  /**
   * Connect to a specific wallet
   */
  const connectWallet = useCallback(async (walletType: WalletType): Promise<boolean> => {
    setConnectionState(prev => ({
      ...prev,
      isConnecting: true,
      error: null
    }));

    try {
      let wallet: ConnectedWallet;

      switch (walletType) {
        case 'pera':
          wallet = await walletManager.connectPera();
          break;
        case 'myalgo':
          wallet = await walletManager.connectMyAlgo();
          break;
        case 'defly':
          wallet = await walletManager.connectDefly();
          break;
        default:
          throw new Error(`Unsupported wallet type: ${walletType}`);
      }

      setConnectionState({
        isConnected: true,
        isConnecting: false,
        wallet,
        error: null
      });

      console.log('✅ Wallet connected:', wallet);
      return true;

    } catch (error) {
      const walletError = error as WalletErrorInfo;
      
      setConnectionState({
        isConnected: false,
        isConnecting: false,
        wallet: null,
        error: walletError.message
      });

      console.error('❌ Wallet connection failed:', walletError);
      return false;
    }
  }, []);

  /**
   * Disconnect current wallet
   */
  const disconnectWallet = useCallback(async (): Promise<void> => {
    try {
      await walletManager.disconnect();
      
      setConnectionState({
        isConnected: false,
        isConnecting: false,
        wallet: null,
        error: null
      });

      console.log('✅ Wallet disconnected');
    } catch (error) {
      console.error('❌ Wallet disconnect failed:', error);
    }
  }, []);

  /**
   * Send ALGO transaction through connected wallet
   */
  const sendTransaction = useCallback(async (transaction: AlgorandTransaction): Promise<TransactionResult> => {
    if (!connectionState.isConnected || !connectionState.wallet) {
      return {
        success: false,
        error: 'No wallet connected'
      };
    }

    try {
      const result = await walletManager.sendTransaction(transaction);
      
      // Refresh wallet balance after successful transaction
      if (result.success && connectionState.wallet) {
        // Note: In a full implementation, we'd refresh the balance here
        console.log('✅ Transaction sent successfully:', result.txId);
      }

      return result;
    } catch (error) {
      console.error('❌ Transaction failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transaction failed'
      };
    }
  }, [connectionState.isConnected, connectionState.wallet]);

  /**
   * Refresh wallet balance
   */
  const refreshBalance = useCallback(async (): Promise<void> => {
    if (!connectionState.wallet) return;

    try {
      // Get fresh wallet info
      const currentWallet = walletManager.getConnectedWallet();
      if (currentWallet) {
        setConnectionState(prev => ({
          ...prev,
          wallet: currentWallet
        }));
      }
    } catch (error) {
      console.error('❌ Failed to refresh wallet balance:', error);
    }
  }, [connectionState.wallet]);

  /**
   * Clear error state
   */
  const clearError = useCallback((): void => {
    setConnectionState(prev => ({
      ...prev,
      error: null
    }));
  }, []);

  /**
   * Check if specific wallet type is available
   */
  const isWalletAvailable = useCallback((walletType: WalletType): boolean => {
    const wallet = availableWallets.find(w => w.type === walletType);
    return wallet?.isInstalled ?? false;
  }, [availableWallets]);

  /**
   * Get wallet info by type
   */
  const getWalletInfo = useCallback((walletType: WalletType): WalletInfo | undefined => {
    return availableWallets.find(w => w.type === walletType);
  }, [availableWallets]);

  return {
    // Connection state
    isConnected: connectionState.isConnected,
    isConnecting: connectionState.isConnecting,
    wallet: connectionState.wallet,
    error: connectionState.error,

    // Available wallets
    availableWallets,

    // Actions
    connectWallet,
    disconnectWallet,
    sendTransaction,
    refreshBalance,
    clearError,

    // Utilities
    isWalletAvailable,
    getWalletInfo
  };
};