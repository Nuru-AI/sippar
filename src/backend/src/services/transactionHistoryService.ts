/**
 * Transaction History Service - Sprint 012.5
 * Comprehensive tracking for all ckALGO operations with full audit trails
 */

import { ProductionMonitoringService } from './productionMonitoringService.js';

export interface TransactionRecord {
  id: string;
  userPrincipal: string;
  type: 'mint' | 'redeem' | 'transfer' | 'deposit_detected' | 'withdrawal' | 'balance_sync';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  amount: number;
  currency: 'ALGO' | 'ckALGO';
  timestamp: Date;
  blockchainTxId?: string;
  algorandTxId?: string;
  icpTxId?: string;
  custodyAddress?: string;
  destinationAddress?: string;
  fee?: number;
  confirmations?: number;
  requiredConfirmations?: number;
  error?: string;
  metadata: {
    source: string; // Which service initiated this transaction
    method: string; // Specific method or endpoint
    sessionId?: string;
    userAgent?: string;
    ipAddress?: string;
    [key: string]: any;
  };
  relatedTransactions?: string[]; // IDs of related transactions
  auditTrail: AuditEntry[];
}

export interface AuditEntry {
  timestamp: Date;
  action: string;
  status: string;
  details?: any;
  actor: 'system' | 'user' | 'admin';
  actorId?: string;
}

export interface TransactionSummary {
  totalTransactions: number;
  totalAmount: number;
  transactionsByType: Record<string, number>;
  transactionsByStatus: Record<string, number>;
  averageAmount: number;
  averageProcessingTime: number;
  successRate: number;
}

export interface TransactionFilter {
  userPrincipal?: string;
  type?: TransactionRecord['type'];
  status?: TransactionRecord['status'];
  currency?: TransactionRecord['currency'];
  minAmount?: number;
  maxAmount?: number;
  startDate?: Date;
  endDate?: Date;
  custodyAddress?: string;
  destinationAddress?: string;
  limit?: number;
  offset?: number;
}

export class TransactionHistoryService {
  private transactions: Map<string, TransactionRecord> = new Map();
  private userTransactions: Map<string, Set<string>> = new Map();
  private monitoringService?: ProductionMonitoringService;

  private readonly config = {
    maxTransactions: 100000, // Keep last 100k transactions
    maxUserTransactions: 1000, // Keep last 1k transactions per user
    compressionThreshold: 10000, // Compress old transactions after 10k
    archiveAfterDays: 90, // Archive transactions older than 90 days
  };

  constructor(monitoringService?: ProductionMonitoringService) {
    this.monitoringService = monitoringService;
    console.log('📚 TransactionHistoryService initialized');
  }

  /**
   * Record a new transaction
   */
  recordTransaction(
    userPrincipal: string,
    type: TransactionRecord['type'],
    amount: number,
    currency: TransactionRecord['currency'],
    metadata: TransactionRecord['metadata']
  ): string {
    const txId = this.generateTransactionId(type);

    const transaction: TransactionRecord = {
      id: txId,
      userPrincipal,
      type,
      status: 'pending',
      amount,
      currency,
      timestamp: new Date(),
      metadata,
      auditTrail: [{
        timestamp: new Date(),
        action: 'transaction_created',
        status: 'pending',
        actor: 'system',
        details: { type, amount, currency }
      }]
    };

    this.transactions.set(txId, transaction);

    // Add to user's transaction index
    if (!this.userTransactions.has(userPrincipal)) {
      this.userTransactions.set(userPrincipal, new Set());
    }
    this.userTransactions.get(userPrincipal)!.add(txId);

    console.log(`📝 Recorded transaction: ${txId} (${type}) for ${userPrincipal}: ${amount} ${currency}`);

    return txId;
  }

  /**
   * Update transaction status
   */
  updateTransactionStatus(
    txId: string,
    status: TransactionRecord['status'],
    details?: any,
    actor: AuditEntry['actor'] = 'system',
    actorId?: string
  ): boolean {
    const transaction = this.transactions.get(txId);

    if (!transaction) {
      console.warn(`⚠️ Transaction not found: ${txId}`);
      return false;
    }

    const previousStatus = transaction.status;
    transaction.status = status;

    // Add audit entry
    transaction.auditTrail.push({
      timestamp: new Date(),
      action: `status_changed_${previousStatus}_to_${status}`,
      status,
      details,
      actor,
      actorId
    });

    console.log(`📝 Updated transaction ${txId}: ${previousStatus} → ${status}`);

    return true;
  }

  /**
   * Add blockchain transaction IDs
   */
  addBlockchainTxId(
    txId: string,
    algorandTxId?: string,
    icpTxId?: string,
    blockchainTxId?: string
  ): boolean {
    const transaction = this.transactions.get(txId);

    if (!transaction) {
      console.warn(`⚠️ Transaction not found: ${txId}`);
      return false;
    }

    if (algorandTxId) transaction.algorandTxId = algorandTxId;
    if (icpTxId) transaction.icpTxId = icpTxId;
    if (blockchainTxId) transaction.blockchainTxId = blockchainTxId;

    // Add audit entry
    transaction.auditTrail.push({
      timestamp: new Date(),
      action: 'blockchain_tx_added',
      status: transaction.status,
      details: { algorandTxId, icpTxId, blockchainTxId },
      actor: 'system'
    });

    console.log(`📝 Added blockchain TX IDs to ${txId}: ALGO=${algorandTxId}, ICP=${icpTxId}`);

    return true;
  }

  /**
   * Add addresses to transaction
   */
  addAddresses(
    txId: string,
    custodyAddress?: string,
    destinationAddress?: string
  ): boolean {
    const transaction = this.transactions.get(txId);

    if (!transaction) {
      console.warn(`⚠️ Transaction not found: ${txId}`);
      return false;
    }

    if (custodyAddress) transaction.custodyAddress = custodyAddress;
    if (destinationAddress) transaction.destinationAddress = destinationAddress;

    // Add audit entry
    transaction.auditTrail.push({
      timestamp: new Date(),
      action: 'addresses_added',
      status: transaction.status,
      details: { custodyAddress, destinationAddress },
      actor: 'system'
    });

    return true;
  }

  /**
   * Add confirmation information
   */
  addConfirmations(
    txId: string,
    confirmations: number,
    requiredConfirmations: number
  ): boolean {
    const transaction = this.transactions.get(txId);

    if (!transaction) {
      console.warn(`⚠️ Transaction not found: ${txId}`);
      return false;
    }

    transaction.confirmations = confirmations;
    transaction.requiredConfirmations = requiredConfirmations;

    // Add audit entry
    transaction.auditTrail.push({
      timestamp: new Date(),
      action: 'confirmations_updated',
      status: transaction.status,
      details: { confirmations, requiredConfirmations, confirmed: confirmations >= requiredConfirmations },
      actor: 'system'
    });

    return true;
  }

  /**
   * Set transaction error
   */
  setTransactionError(
    txId: string,
    error: string,
    actor: AuditEntry['actor'] = 'system'
  ): boolean {
    const transaction = this.transactions.get(txId);

    if (!transaction) {
      console.warn(`⚠️ Transaction not found: ${txId}`);
      return false;
    }

    transaction.error = error;
    transaction.status = 'failed';

    // Add audit entry
    transaction.auditTrail.push({
      timestamp: new Date(),
      action: 'error_occurred',
      status: 'failed',
      details: { error },
      actor
    });

    console.log(`❌ Transaction ${txId} failed: ${error}`);

    return true;
  }

  /**
   * Link related transactions
   */
  linkTransactions(txId: string, relatedTxIds: string[]): boolean {
    const transaction = this.transactions.get(txId);

    if (!transaction) {
      console.warn(`⚠️ Transaction not found: ${txId}`);
      return false;
    }

    if (!transaction.relatedTransactions) {
      transaction.relatedTransactions = [];
    }

    transaction.relatedTransactions.push(...relatedTxIds);

    // Add audit entry
    transaction.auditTrail.push({
      timestamp: new Date(),
      action: 'transactions_linked',
      status: transaction.status,
      details: { relatedTxIds },
      actor: 'system'
    });

    return true;
  }

  /**
   * Get transaction by ID
   */
  getTransaction(txId: string): TransactionRecord | null {
    return this.transactions.get(txId) || null;
  }

  /**
   * Get transactions for a user
   */
  getUserTransactions(
    userPrincipal: string,
    filter?: Omit<TransactionFilter, 'userPrincipal'>
  ): TransactionRecord[] {
    const userTxIds = this.userTransactions.get(userPrincipal);

    if (!userTxIds) {
      return [];
    }

    let transactions = Array.from(userTxIds)
      .map(txId => this.transactions.get(txId))
      .filter((tx): tx is TransactionRecord => tx !== undefined);

    return this.applyFilter(transactions, { ...filter, userPrincipal });
  }

  /**
   * Search transactions with filters
   */
  searchTransactions(filter: TransactionFilter): TransactionRecord[] {
    let transactions = Array.from(this.transactions.values());

    return this.applyFilter(transactions, filter);
  }

  /**
   * Apply filters to transaction list
   */
  private applyFilter(transactions: TransactionRecord[], filter: TransactionFilter): TransactionRecord[] {
    let filtered = transactions;

    if (filter.userPrincipal) {
      filtered = filtered.filter(tx => tx.userPrincipal === filter.userPrincipal);
    }

    if (filter.type) {
      filtered = filtered.filter(tx => tx.type === filter.type);
    }

    if (filter.status) {
      filtered = filtered.filter(tx => tx.status === filter.status);
    }

    if (filter.currency) {
      filtered = filtered.filter(tx => tx.currency === filter.currency);
    }

    if (filter.minAmount !== undefined) {
      filtered = filtered.filter(tx => tx.amount >= filter.minAmount!);
    }

    if (filter.maxAmount !== undefined) {
      filtered = filtered.filter(tx => tx.amount <= filter.maxAmount!);
    }

    if (filter.startDate) {
      filtered = filtered.filter(tx => tx.timestamp >= filter.startDate!);
    }

    if (filter.endDate) {
      filtered = filtered.filter(tx => tx.timestamp <= filter.endDate!);
    }

    if (filter.custodyAddress) {
      filtered = filtered.filter(tx => tx.custodyAddress === filter.custodyAddress);
    }

    if (filter.destinationAddress) {
      filtered = filtered.filter(tx => tx.destinationAddress === filter.destinationAddress);
    }

    // Sort by timestamp descending (newest first)
    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    if (filter.offset !== undefined || filter.limit !== undefined) {
      const offset = filter.offset || 0;
      const limit = filter.limit || 100;
      filtered = filtered.slice(offset, offset + limit);
    }

    return filtered;
  }

  /**
   * Get transaction summary statistics
   */
  getTransactionSummary(filter?: TransactionFilter): TransactionSummary {
    const transactions = filter ? this.searchTransactions(filter) : Array.from(this.transactions.values());

    const totalTransactions = transactions.length;
    const totalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0);

    const transactionsByType: Record<string, number> = {};
    const transactionsByStatus: Record<string, number> = {};

    for (const tx of transactions) {
      transactionsByType[tx.type] = (transactionsByType[tx.type] || 0) + 1;
      transactionsByStatus[tx.status] = (transactionsByStatus[tx.status] || 0) + 1;
    }

    const averageAmount = totalTransactions > 0 ? totalAmount / totalTransactions : 0;

    // Calculate average processing time for completed transactions
    const completedTransactions = transactions.filter(tx => tx.status === 'completed');
    const totalProcessingTime = completedTransactions.reduce((sum, tx) => {
      const created = tx.auditTrail[0]?.timestamp || tx.timestamp;
      const completed = tx.auditTrail.find(entry => entry.status === 'completed')?.timestamp || tx.timestamp;
      return sum + (completed.getTime() - created.getTime());
    }, 0);

    const averageProcessingTime = completedTransactions.length > 0
      ? totalProcessingTime / completedTransactions.length
      : 0;

    const successRate = totalTransactions > 0
      ? (completedTransactions.length / totalTransactions) * 100
      : 0;

    return {
      totalTransactions,
      totalAmount,
      transactionsByType,
      transactionsByStatus,
      averageAmount,
      averageProcessingTime,
      successRate
    };
  }

  /**
   * Clean up old transactions
   */
  cleanupOldTransactions(): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.archiveAfterDays);

    let cleanedCount = 0;

    for (const [txId, transaction] of this.transactions) {
      if (transaction.timestamp < cutoffDate && transaction.status !== 'pending' && transaction.status !== 'processing') {
        this.transactions.delete(txId);

        // Remove from user index
        const userTxIds = this.userTransactions.get(transaction.userPrincipal);
        if (userTxIds) {
          userTxIds.delete(txId);
        }

        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} old transactions`);
    }

    return cleanedCount;
  }

  /**
   * Get service statistics
   */
  getServiceStats() {
    return {
      totalTransactions: this.transactions.size,
      totalUsers: this.userTransactions.size,
      memoryUsageMB: Math.round((JSON.stringify(Array.from(this.transactions.values())).length) / (1024 * 1024)),
      oldestTransaction: Array.from(this.transactions.values())
        .reduce((oldest, tx) => !oldest || tx.timestamp < oldest.timestamp ? tx : oldest, null as TransactionRecord | null)?.timestamp,
      newestTransaction: Array.from(this.transactions.values())
        .reduce((newest, tx) => !newest || tx.timestamp > newest.timestamp ? tx : newest, null as TransactionRecord | null)?.timestamp
    };
  }

  /**
   * Generate unique transaction ID
   */
  private generateTransactionId(type: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${type}-${timestamp}-${random}`;
  }
}