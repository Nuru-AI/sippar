/**
 * Algorand Wallet Manager Service
 * Centralized service for managing all Algorand wallet connections and transactions
 */

import algosdk from 'algosdk';
import { PeraWalletConnect } from '@perawallet/connect';
import MyAlgoConnect from '@randlabs/myalgo-connect';
import { DeflyWalletConnect } from '@blockshake/defly-connect';

import type {
  WalletType,
  ConnectedWallet,
  AlgorandTransaction,
  SignedTransaction,
  TransactionResult,
  WalletInfo,
  WalletError,
  WalletErrorInfo,
  PeraWalletAccount,
  MyAlgoAccount,
  DeflyAccount
} from '../types/wallet';

// Algorand network configuration
const ALGORAND_CONFIG = {
  // Use Algonode for reliable access
  algod: {
    server: 'https://testnet-api.algonode.cloud',
    port: '',
    token: ''
  },
  network: 'testnet' as const
};

export class AlgorandWalletManager {
  private peraWallet: PeraWalletConnect;
  private myAlgoWallet: MyAlgoConnect;
  private deflyWallet: DeflyWalletConnect;
  private algodClient: algosdk.Algodv2;
  private connectedWallet: ConnectedWallet | null = null;

  constructor() {
    // Initialize wallet SDKs
    this.peraWallet = new PeraWalletConnect({
      chainId: 416002, // Algorand testnet
      shouldShowSignTxnToast: true
    });

    this.myAlgoWallet = new MyAlgoConnect({
      shouldSelectOneAccount: true,
      openManager: false
    });

    this.deflyWallet = new DeflyWalletConnect({
      chainId: 416002,
      shouldShowSignTxnToast: true
    });

    // Initialize Algorand client
    this.algodClient = new algosdk.Algodv2(
      ALGORAND_CONFIG.algod.token,
      ALGORAND_CONFIG.algod.server,
      ALGORAND_CONFIG.algod.port
    );

    // Set up wallet event listeners
    this.setupEventListeners();
  }

  /**
   * Get information about available wallets
   */
  public getAvailableWallets(): WalletInfo[] {
    return [
      {
        type: 'pera',
        name: 'Pera Wallet',
        description: 'Most popular Algorand wallet with mobile and web support',
        icon: '🟣', // We'll replace with proper icons later
        downloadUrl: 'https://perawallet.app/',
        isInstalled: this.isPeraWalletInstalled(),
        capabilities: {
          canSign: true,
          canSendTransaction: true,
          supportsNote: true,
          supportsAssets: true
        }
      },
      {
        type: 'myalgo',
        name: 'MyAlgo Wallet',
        description: 'Web-based Algorand wallet with browser extension',
        icon: '🔷',
        downloadUrl: 'https://wallet.myalgo.com/',
        isInstalled: this.isMyAlgoWalletInstalled(),
        capabilities: {
          canSign: true,
          canSendTransaction: true,
          supportsNote: true,
          supportsAssets: true
        }
      },
      {
        type: 'defly',
        name: 'Defly Wallet',
        description: 'Modern mobile-first Algorand wallet',
        icon: '🦋',
        downloadUrl: 'https://defly.app/',
        isInstalled: this.isDeflyWalletInstalled(),
        capabilities: {
          canSign: true,
          canSendTransaction: true,
          supportsNote: true,
          supportsAssets: true
        }
      }
    ];
  }

  /**
   * Connect to Pera Wallet
   */
  public async connectPera(): Promise<ConnectedWallet> {
    try {
      const accounts = await this.peraWallet.connect();
      
      if (!accounts || accounts.length === 0) {
        throw this.createWalletError('CONNECTION_REJECTED', 'No accounts available');
      }

      const address = accounts[0];
      const balance = await this.getAccountBalance(address);

      const wallet: ConnectedWallet = {
        type: 'pera',
        address,
        name: 'Pera Wallet Account',
        balance
      };

      this.connectedWallet = wallet;
      this.persistWalletConnection(wallet);
      
      return wallet;
    } catch (error) {
      console.error('❌ Pera Wallet connection failed:', error);
      throw this.handleWalletError(error);
    }
  }

  /**
   * Connect to MyAlgo Wallet
   */
  public async connectMyAlgo(): Promise<ConnectedWallet> {
    try {
      const accounts: MyAlgoAccount[] = await this.myAlgoWallet.connect();
      
      if (!accounts || accounts.length === 0) {
        throw this.createWalletError('CONNECTION_REJECTED', 'No accounts available');
      }

      const account = accounts[0];
      const balance = await this.getAccountBalance(account.address);

      const wallet: ConnectedWallet = {
        type: 'myalgo',
        address: account.address,
        name: account.name || 'MyAlgo Account',
        balance
      };

      this.connectedWallet = wallet;
      this.persistWalletConnection(wallet);
      
      return wallet;
    } catch (error) {
      console.error('❌ MyAlgo Wallet connection failed:', error);
      throw this.handleWalletError(error);
    }
  }

  /**
   * Connect to Defly Wallet
   */
  public async connectDefly(): Promise<ConnectedWallet> {
    try {
      const accounts = await this.deflyWallet.connect();
      
      if (!accounts || accounts.length === 0) {
        throw this.createWalletError('CONNECTION_REJECTED', 'No accounts available');
      }

      const address = accounts[0];
      const balance = await this.getAccountBalance(address);

      const wallet: ConnectedWallet = {
        type: 'defly',
        address,
        name: 'Defly Wallet Account',
        balance
      };

      this.connectedWallet = wallet;
      this.persistWalletConnection(wallet);
      
      return wallet;
    } catch (error) {
      console.error('❌ Defly Wallet connection failed:', error);
      throw this.handleWalletError(error);
    }
  }

  /**
   * Send transaction through connected wallet
   */
  public async sendTransaction(transaction: AlgorandTransaction): Promise<TransactionResult> {
    if (!this.connectedWallet) {
      throw this.createWalletError('CONNECTION_REJECTED', 'No wallet connected');
    }

    try {
      // Get suggested transaction parameters
      const suggestedParams = await this.algodClient.getTransactionParams().do();

      // Create transaction
      const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: this.connectedWallet.address,
        to: transaction.to,
        amount: transaction.amount,
        suggestedParams,
        note: transaction.note ? new TextEncoder().encode(transaction.note) : undefined
      });

      // Sign transaction based on wallet type
      let signedTxn: Uint8Array;

      switch (this.connectedWallet.type) {
        case 'pera':
          const peraSignedTxns = await this.peraWallet.signTransaction([{ txn }]);
          signedTxn = peraSignedTxns[0];
          break;

        case 'myalgo':
          const myAlgoSignedTxn = await this.myAlgoWallet.signTransaction(txn);
          signedTxn = myAlgoSignedTxn.blob;
          break;

        case 'defly':
          const deflySignedTxns = await this.deflyWallet.signTransaction([{ txn }]);
          signedTxn = deflySignedTxns[0];
          break;

        default:
          throw this.createWalletError('UNKNOWN_ERROR', 'Unsupported wallet type');
      }

      // Submit transaction to network
      const response = await this.algodClient.sendRawTransaction(signedTxn).do();
      const txId = response.txId;

      console.log('✅ Transaction sent successfully:', txId);

      return {
        success: true,
        txId
      };

    } catch (error) {
      console.error('❌ Transaction failed:', error);
      return {
        success: false,
        error: this.handleWalletError(error).message
      };
    }
  }

  /**
   * Disconnect current wallet
   */
  public async disconnect(): Promise<void> {
    if (!this.connectedWallet) return;

    try {
      switch (this.connectedWallet.type) {
        case 'pera':
          await this.peraWallet.disconnect();
          break;
        case 'myalgo':
          // MyAlgo doesn't have explicit disconnect
          break;
        case 'defly':
          await this.deflyWallet.disconnect();
          break;
      }

      this.connectedWallet = null;
      this.clearWalletConnection();
      
      console.log('✅ Wallet disconnected');
    } catch (error) {
      console.error('❌ Wallet disconnect failed:', error);
    }
  }

  /**
   * Get connected wallet info
   */
  public getConnectedWallet(): ConnectedWallet | null {
    return this.connectedWallet;
  }

  /**
   * Check if wallet is connected
   */
  public isConnected(): boolean {
    return this.connectedWallet !== null;
  }

  /**
   * Get account balance in ALGO
   */
  private async getAccountBalance(address: string): Promise<number> {
    try {
      const accountInfo = await this.algodClient.accountInformation(address).do();
      return accountInfo.amount / 1000000; // Convert microALGO to ALGO
    } catch (error) {
      console.error('❌ Failed to get account balance:', error);
      return 0;
    }
  }

  /**
   * Check if wallets are installed
   */
  private isPeraWalletInstalled(): boolean {
    return typeof window !== 'undefined' && window.PeraWalletConnect !== undefined;
  }

  private isMyAlgoWalletInstalled(): boolean {
    return typeof window !== 'undefined';
  }

  private isDeflyWalletInstalled(): boolean {
    return typeof window !== 'undefined' && window.DeflyWalletConnect !== undefined;
  }

  /**
   * Set up wallet event listeners
   */
  private setupEventListeners(): void {
    // Pera Wallet events
    this.peraWallet.connector?.on('disconnect', () => {
      console.log('🔌 Pera Wallet disconnected');
      if (this.connectedWallet?.type === 'pera') {
        this.connectedWallet = null;
        this.clearWalletConnection();
      }
    });

    // Defly Wallet events
    this.deflyWallet.connector?.on('disconnect', () => {
      console.log('🔌 Defly Wallet disconnected');
      if (this.connectedWallet?.type === 'defly') {
        this.connectedWallet = null;
        this.clearWalletConnection();
      }
    });
  }

  /**
   * Persist wallet connection to localStorage
   */
  private persistWalletConnection(wallet: ConnectedWallet): void {
    try {
      localStorage.setItem('sippar-connected-wallet', JSON.stringify({
        type: wallet.type,
        address: wallet.address,
        name: wallet.name
      }));
    } catch (error) {
      console.warn('Failed to persist wallet connection:', error);
    }
  }

  /**
   * Clear persisted wallet connection
   */
  private clearWalletConnection(): void {
    try {
      localStorage.removeItem('sippar-connected-wallet');
    } catch (error) {
      console.warn('Failed to clear wallet connection:', error);
    }
  }

  /**
   * Restore wallet connection from localStorage
   */
  public async restoreConnection(): Promise<ConnectedWallet | null> {
    try {
      const stored = localStorage.getItem('sippar-connected-wallet');
      if (!stored) return null;

      const walletData = JSON.parse(stored);
      
      // Attempt to reconnect based on stored wallet type
      switch (walletData.type) {
        case 'pera':
          // Check if Pera Wallet is still connected
          if (this.peraWallet.isConnected) {
            const balance = await this.getAccountBalance(walletData.address);
            this.connectedWallet = {
              ...walletData,
              balance
            };
            return this.connectedWallet;
          }
          break;
        // MyAlgo and Defly don't persist connections
      }

      this.clearWalletConnection();
      return null;
    } catch (error) {
      console.error('Failed to restore wallet connection:', error);
      this.clearWalletConnection();
      return null;
    }
  }

  /**
   * Create standardized wallet error
   */
  private createWalletError(code: WalletError, message: string, details?: any): WalletErrorInfo {
    return { code, message, details };
  }

  /**
   * Handle and standardize wallet errors
   */
  private handleWalletError(error: any): WalletErrorInfo {
    if (error.code) {
      return error; // Already a WalletErrorInfo
    }

    // Map common error patterns
    if (error.message?.includes('User rejected')) {
      return this.createWalletError('CONNECTION_REJECTED', 'User rejected wallet connection');
    }

    if (error.message?.includes('insufficient')) {
      return this.createWalletError('INSUFFICIENT_BALANCE', 'Insufficient balance for transaction');
    }

    // Default unknown error
    return this.createWalletError('UNKNOWN_ERROR', error.message || 'An unknown error occurred', error);
  }
}

// Singleton instance
export const walletManager = new AlgorandWalletManager();