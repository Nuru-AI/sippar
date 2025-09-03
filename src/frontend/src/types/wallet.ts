/**
 * Wallet Integration Types
 * Type definitions for Algorand wallet integration
 */

export type WalletType = 'pera' | 'myalgo' | 'defly';

export interface ConnectedWallet {
  type: WalletType;
  address: string;
  name?: string;
  balance?: number;
}

export interface WalletConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  wallet: ConnectedWallet | null;
  error: string | null;
}

export interface AlgorandTransaction {
  to: string;
  amount: number; // in microALGO
  note?: string;
  fee?: number;
}

export interface SignedTransaction {
  txId: string;
  blob: Uint8Array;
}

export interface TransactionResult {
  success: boolean;
  txId?: string;
  error?: string;
}

export interface WalletCapabilities {
  canSign: boolean;
  canSendTransaction: boolean;
  supportsNote: boolean;
  supportsAssets: boolean;
}

export interface WalletInfo {
  type: WalletType;
  name: string;
  description: string;
  icon: string;
  downloadUrl: string;
  isInstalled: boolean;
  capabilities: WalletCapabilities;
}

// Wallet SDK specific types
export interface PeraWalletAccount {
  address: string;
  name?: string;
}

export interface MyAlgoAccount {
  address: string;
  name?: string;
}

export interface DeflyAccount {
  address: string;
  name?: string;
}

// Error types
export type WalletError = 
  | 'WALLET_NOT_INSTALLED'
  | 'CONNECTION_REJECTED' 
  | 'TRANSACTION_REJECTED'
  | 'INSUFFICIENT_BALANCE'
  | 'NETWORK_MISMATCH'
  | 'UNKNOWN_ERROR';

export interface WalletErrorInfo {
  code: WalletError;
  message: string;
  details?: any;
}