/**
 * Algorand Network Service
 * Handles real Algorand network connections and operations
 */

import algosdk from 'algosdk';

// Algorand network configuration
export interface AlgorandConfig {
  server: string;
  port: number;
  token: string;
  network: 'mainnet' | 'testnet' | 'betanet';
}

export interface AlgorandAccount {
  address: string;
  balance: number;
  minBalance: number;
  min_balance: number; // Alternative name used in some places
  amountWithoutPendingRewards: number;
  pendingRewards: number;
  rewards: number;
  round: number;
  status: string;
  assets?: any[]; // Optional assets array for ASA holdings
}

export interface AlgorandTransaction {
  id: string;
  sender: string;
  receiver: string;
  amount: number;
  fee: number;
  round: number;
  timestamp: number;
  type: string;
}

export class AlgorandService {
  private algodClient: algosdk.Algodv2;
  private indexerClient: algosdk.Indexer;
  private config: AlgorandConfig;

  constructor(config?: Partial<AlgorandConfig>) {
    // Default to Algorand testnet with public nodes
    this.config = {
      server: 'https://testnet-api.algonode.cloud',
      port: 443,
      token: '',
      network: 'testnet',
      ...config
    };

    // Initialize Algod client (for transactions)
    this.algodClient = new algosdk.Algodv2(
      this.config.token,
      this.config.server,
      this.config.port
    );

    // Initialize Indexer client (for queries)
    const indexerServer = this.config.server.replace('-api.', '-idx.');
    this.indexerClient = new algosdk.Indexer(
      this.config.token,
      indexerServer,
      this.config.port
    );
  }

  /**
   * Get network status and health
   */
  async getNetworkStatus(): Promise<any> {
    try {
      const status = await this.algodClient.status().do();
      return {
        network: this.config.network,
        round: status['last-round'],
        time: status['last-round-time-stamp'],
        catchupTime: status['catchup-time'],
        hasSyncedSinceStartup: status['has-synced-since-startup'],
        stoppedAtUnsupportedRound: status['stopped-at-unsupported-round'],
        server: this.config.server
      };
    } catch (error) {
      console.error('Error getting Algorand network status:', error);
      throw error;
    }
  }

  /**
   * Get account information including balance
   */
  async getAccountInfo(address: string): Promise<AlgorandAccount> {
    try {
      const accountInfo = await this.algodClient.accountInformation(address).do();
      
      return {
        address: accountInfo.address,
        balance: accountInfo.amount / 1000000, // Convert microAlgos to Algos
        minBalance: accountInfo['min-balance'] / 1000000,
        min_balance: accountInfo['min-balance'] / 1000000, // Alternative name
        amountWithoutPendingRewards: accountInfo['amount-without-pending-rewards'] / 1000000,
        pendingRewards: accountInfo['pending-rewards'] / 1000000,
        rewards: accountInfo.rewards / 1000000,
        round: accountInfo.round,
        status: accountInfo.status,
        assets: accountInfo.assets || []
      };
    } catch (error: any) {
      if (error?.status === 404) {
        // Account doesn't exist yet (zero balance)
        return {
          address,
          balance: 0,
          minBalance: 0.1, // Minimum balance in Algos
          min_balance: 0.1, // Alternative name
          amountWithoutPendingRewards: 0,
          pendingRewards: 0,
          rewards: 0,
          round: 0,
          status: 'Offline',
          assets: []
        };
      }
      console.error('Error getting Algorand account info:', error);
      throw error;
    }
  }

  /**
   * Get recent transactions for an account
   */
  async getAccountTransactions(address: string, limit: number = 10): Promise<AlgorandTransaction[]> {
    try {
      const response = await this.indexerClient
        .lookupAccountTransactions(address)
        .limit(limit)
        .do();

      return response.transactions.map((tx: any) => ({
        id: tx.id,
        sender: tx.sender,
        receiver: tx['payment-transaction']?.receiver || '',
        amount: (tx['payment-transaction']?.amount || 0) / 1000000,
        fee: tx.fee / 1000000,
        round: tx['confirmed-round'],
        timestamp: tx['round-time'],
        type: tx['tx-type']
      }));
    } catch (error) {
      console.error('Error getting account transactions:', error);
      return [];
    }
  }

  /**
   * Monitor address for incoming deposits
   */
  async monitorDeposits(address: string, lastKnownRound: number = 0): Promise<AlgorandTransaction[]> {
    try {
      const response = await this.indexerClient
        .lookupAccountTransactions(address)
        .minRound(lastKnownRound + 1)
        .txType('pay')
        .do();

      const deposits = response.transactions
        .filter((tx: any) => 
          tx['payment-transaction']?.receiver === address &&
          tx['confirmed-round'] > lastKnownRound
        )
        .map((tx: any) => ({
          id: tx.id,
          sender: tx.sender,
          receiver: tx['payment-transaction'].receiver,
          amount: tx['payment-transaction'].amount / 1000000,
          fee: tx.fee / 1000000,
          round: tx['confirmed-round'],
          timestamp: tx['round-time'],
          type: tx['tx-type']
        }));

      return deposits;
    } catch (error) {
      console.error('Error monitoring deposits:', error);
      return [];
    }
  }

  /**
   * Validate Algorand address format
   */
  isValidAddress(address: string): boolean {
    try {
      return algosdk.isValidAddress(address);
    } catch {
      return false;
    }
  }

  /**
   * Generate new Algorand account (for testing)
   */
  generateAccount(): { address: string; privateKey: string; mnemonic: string } {
    const account = algosdk.generateAccount();
    const mnemonic = algosdk.secretKeyToMnemonic(account.sk);
    
    return {
      address: account.addr,
      privateKey: Buffer.from(account.sk).toString('hex'),
      mnemonic
    };
  }

  /**
   * Get suggested transaction parameters
   */
  async getSuggestedParams(): Promise<any> {
    try {
      return await this.algodClient.getTransactionParams().do();
    } catch (error) {
      console.error('Error getting suggested params:', error);
      throw error;
    }
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(txId: string): Promise<any> {
    try {
      const txInfo = await this.algodClient.pendingTransactionInformation(txId).do();
      return txInfo;
    } catch (error) {
      console.error(`Error getting transaction ${txId}:`, error);
      throw error;
    }
  }

  /**
   * Get recent deposits for an address (placeholder implementation)
   */
  async getRecentDeposits(address: string): Promise<any[]> {
    try {
      // Placeholder implementation - in a real system this would query
      // transaction history and filter for incoming transactions
      console.log(`Getting recent deposits for ${address}`);
      return [];
    } catch (error) {
      console.error(`Error getting recent deposits for ${address}:`, error);
      throw error;
    }
  }
}

// Default service instance for testnet
export const algorandService = new AlgorandService();

// Mainnet service instance
export const algorandMainnet = new AlgorandService({
  server: 'https://mainnet-api.algonode.cloud',
  network: 'mainnet'
});