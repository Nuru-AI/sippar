/**
 * Balance Synchronization Service - Sprint 012.5
 * Real-time balance synchronization between Algorand and ICP ckALGO
 */

import { algorandService } from './algorandService.js';
import { ckAlgoService } from './ckAlgoService.js';
import { icpCanisterService } from './icpCanisterService.js';
import { simplifiedBridgeService } from './simplifiedBridgeService.js';
import { ProductionMonitoringService, Alert } from './productionMonitoringService.js';
import { AlertManager } from './alertManager.js';

export interface BalanceSnapshot {
  userPrincipal: string;
  custodyAddress: string;
  algorandBalance: number;
  ckAlgoBalance: number;
  totalReserved: number;
  balanceRatio: number;
  lastUpdated: Date;
  discrepancy?: {
    amount: number;
    percentage: number;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };
}

export interface SyncStats {
  totalUsers: number;
  successfulSyncs: number;
  failedSyncs: number;
  discrepanciesFound: number;
  averageSyncTime: number;
  lastSyncTime: Date | null;
  nextSyncTime: Date | null;
}

export interface SyncJob {
  id: string;
  userPrincipal: string;
  custodyAddress: string;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
  startTime?: Date;
  endTime?: Date;
  error?: string;
  balanceSnapshot?: BalanceSnapshot;
}

export class BalanceSynchronizationService {
  private userBalances: Map<string, BalanceSnapshot> = new Map();
  private syncJobs: Map<string, SyncJob> = new Map();
  private isRunning: boolean = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private monitoringService?: ProductionMonitoringService;
  private alertManager?: AlertManager;
  private registeredUsers: Set<string> = new Set();

  private readonly config = {
    syncIntervalMs: 30000, // Sync every 30 seconds
    discrepancyThreshold: 0.01, // 0.01 ALGO threshold for alerts
    criticalDiscrepancyThreshold: 1.0, // 1 ALGO for critical alerts
    maxConcurrentSyncs: 10,
    syncTimeoutMs: 15000, // 15 second timeout per sync
    balanceHistoryLimit: 100, // Keep last 100 snapshots per user
  };

  constructor(
    monitoringService?: ProductionMonitoringService,
    alertManager?: AlertManager
  ) {
    this.monitoringService = monitoringService;
    this.alertManager = alertManager;
  }

  /**
   * Start the balance synchronization service
   */
  async startService(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Balance synchronization service already running');
      return;
    }

    console.log('🚀 Starting balance synchronization service...');
    this.isRunning = true;

    // Start sync interval
    this.syncInterval = setInterval(async () => {
      await this.performSyncCycle();
    }, this.config.syncIntervalMs);

    // Initial sync
    await this.performSyncCycle();

    console.log(`✅ Balance synchronization service started (syncing every ${this.config.syncIntervalMs}ms)`);
  }

  /**
   * Stop the balance synchronization service
   */
  stopService(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.isRunning = false;
    console.log('🛑 Balance synchronization service stopped');
  }

  /**
   * Register a user for balance synchronization
   */
  async registerUser(userPrincipal: string): Promise<void> {
    console.log(`📝 Registering user for balance sync: ${userPrincipal}`);

    try {
      // Get user's custody address
      const custodyInfo = await icpCanisterService.deriveAlgorandAddress(userPrincipal);

      this.registeredUsers.add(userPrincipal);

      // Perform initial sync for this user
      await this.syncUserBalance(userPrincipal, custodyInfo.address);

      console.log(`✅ User registered for balance sync: ${userPrincipal}`);

    } catch (error) {
      console.error(`❌ Failed to register user for balance sync ${userPrincipal}:`, error);
      throw error;
    }
  }

  /**
   * Unregister a user from balance synchronization
   */
  unregisterUser(userPrincipal: string): void {
    this.registeredUsers.delete(userPrincipal);
    this.userBalances.delete(userPrincipal);
    console.log(`📝 Unregistered user from balance sync: ${userPrincipal}`);
  }

  /**
   * Perform a sync cycle for all registered users
   */
  private async performSyncCycle(): Promise<void> {
    if (this.registeredUsers.size === 0) {
      return;
    }

    console.log(`🔄 Starting balance sync cycle for ${this.registeredUsers.size} users...`);

    const startTime = Date.now();
    const users = Array.from(this.registeredUsers);

    // Process users in batches to avoid overwhelming the system
    const batchSize = this.config.maxConcurrentSyncs;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);

      const promises = batch.map(async (userPrincipal) => {
        try {
          const custodyInfo = await icpCanisterService.deriveAlgorandAddress(userPrincipal);
          return this.syncUserBalance(userPrincipal, custodyInfo.address);
        } catch (error) {
          console.error(`❌ Sync failed for user ${userPrincipal}:`, error);
          return null;
        }
      });

      await Promise.allSettled(promises);
    }

    const syncTime = Date.now() - startTime;
    console.log(`✅ Balance sync cycle completed in ${syncTime}ms`);
  }

  /**
   * Sync balance for a specific user
   */
  async syncUserBalance(userPrincipal: string, custodyAddress: string): Promise<BalanceSnapshot> {
    const jobId = `sync-${userPrincipal}-${Date.now()}`;

    const job: SyncJob = {
      id: jobId,
      userPrincipal,
      custodyAddress,
      status: 'pending',
    };

    this.syncJobs.set(jobId, job);

    try {
      job.status = 'syncing';
      job.startTime = new Date();

      // Fetch balances from both networks
      const [algorandBalance, ckAlgoBalance] = await Promise.all([
        this.getAlgorandBalance(custodyAddress),
        this.getCkAlgoBalance(userPrincipal)
      ]);

      // Get reserve info for total calculations
      const reserveInfo = await simplifiedBridgeService.getReserveStatus();
      const totalReserved = Number(reserveInfo.locked_algo_reserves) / 1_000_000;

      // Calculate balance ratio and detect discrepancies
      const balanceRatio = algorandBalance > 0 ? ckAlgoBalance / algorandBalance : 0;
      const discrepancyAmount = Math.abs(algorandBalance - ckAlgoBalance);

      let discrepancy: BalanceSnapshot['discrepancy'] | undefined;

      if (discrepancyAmount > this.config.discrepancyThreshold) {
        const percentage = algorandBalance > 0 ? (discrepancyAmount / algorandBalance) * 100 : 0;

        let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';

        if (discrepancyAmount > this.config.criticalDiscrepancyThreshold) {
          severity = 'CRITICAL';
        } else if (percentage > 10) {
          severity = 'HIGH';
        } else if (percentage > 5) {
          severity = 'MEDIUM';
        }

        discrepancy = {
          amount: discrepancyAmount,
          percentage,
          severity
        };

        // Send alert for significant discrepancies
        if (severity === 'HIGH' || severity === 'CRITICAL') {
          await this.sendDiscrepancyAlert(userPrincipal, discrepancy, algorandBalance, ckAlgoBalance);
        }
      }

      // Create balance snapshot
      const snapshot: BalanceSnapshot = {
        userPrincipal,
        custodyAddress,
        algorandBalance,
        ckAlgoBalance,
        totalReserved,
        balanceRatio,
        lastUpdated: new Date(),
        discrepancy
      };

      this.userBalances.set(userPrincipal, snapshot);

      job.status = 'completed';
      job.endTime = new Date();
      job.balanceSnapshot = snapshot;

      console.log(`✅ Synced balance for ${userPrincipal}: ALGO=${algorandBalance}, ckALGO=${ckAlgoBalance}`);

      return snapshot;

    } catch (error) {
      job.status = 'failed';
      job.endTime = new Date();
      job.error = error instanceof Error ? error.message : String(error);

      console.error(`❌ Balance sync failed for ${userPrincipal}:`, error);
      throw error;
    }
  }

  /**
   * Get Algorand balance for custody address
   */
  private async getAlgorandBalance(custodyAddress: string): Promise<number> {
    try {
      const accountInfo = await algorandService.getAccountInfo(custodyAddress);
      return accountInfo.balance; // Already in ALGO units
    } catch (error) {
      console.warn(`⚠️ Could not fetch Algorand balance for ${custodyAddress}:`, error);
      return 0; // Return 0 for non-existent accounts
    }
  }

  /**
   * Get ckALGO balance for user principal
   */
  private async getCkAlgoBalance(userPrincipal: string): Promise<number> {
    try {
      return await ckAlgoService.getBalance(userPrincipal);
    } catch (error) {
      console.warn(`⚠️ Could not fetch ckALGO balance for ${userPrincipal}:`, error);
      return 0;
    }
  }

  /**
   * Send alert for balance discrepancy
   */
  private async sendDiscrepancyAlert(
    userPrincipal: string,
    discrepancy: NonNullable<BalanceSnapshot['discrepancy']>,
    algorandBalance: number,
    ckAlgoBalance: number
  ): Promise<void> {
    if (!this.alertManager) {
      return;
    }

    const alert: Alert = {
      id: `balance-discrepancy-${userPrincipal}-${Date.now()}`,
      type: 'balance_discrepancy',
      severity: discrepancy.severity,
      message: `Balance Discrepancy Detected: User ${userPrincipal}`,
      details: {
        user_principal: userPrincipal,
        algorand_balance: algorandBalance,
        ck_algo_balance: ckAlgoBalance,
        discrepancy_amount: discrepancy.amount,
        discrepancy_percentage: discrepancy.percentage
      },
      timestamp: new Date().toISOString(),
      actionRequired: discrepancy.severity === 'CRITICAL'
        ? 'URGENT: Manual investigation required for critical balance discrepancy'
        : 'Investigation recommended for balance discrepancy'
    };

    await this.alertManager.triggerAlert(alert);
  }

  /**
   * Get balance snapshot for a user
   */
  getUserBalance(userPrincipal: string): BalanceSnapshot | null {
    return this.userBalances.get(userPrincipal) || null;
  }

  /**
   * Get all user balances
   */
  getAllBalances(): BalanceSnapshot[] {
    return Array.from(this.userBalances.values());
  }

  /**
   * Get users with balance discrepancies
   */
  getDiscrepancies(): BalanceSnapshot[] {
    return Array.from(this.userBalances.values())
      .filter(snapshot => snapshot.discrepancy);
  }

  /**
   * Get sync statistics
   */
  getSyncStats(): SyncStats {
    const jobs = Array.from(this.syncJobs.values());
    const recentJobs = jobs.filter(job => {
      const age = Date.now() - (job.startTime?.getTime() || 0);
      return age < 60 * 60 * 1000; // Last hour
    });

    const successfulSyncs = recentJobs.filter(job => job.status === 'completed').length;
    const failedSyncs = recentJobs.filter(job => job.status === 'failed').length;

    const avgSyncTime = successfulSyncs > 0
      ? recentJobs
          .filter(job => job.status === 'completed' && job.startTime && job.endTime)
          .reduce((sum, job) => {
            const duration = job.endTime!.getTime() - job.startTime!.getTime();
            return sum + duration;
          }, 0) / successfulSyncs
      : 0;

    const discrepanciesFound = Array.from(this.userBalances.values())
      .filter(snapshot => snapshot.discrepancy).length;

    const lastSyncTime = recentJobs.length > 0
      ? new Date(Math.max(...recentJobs.map(job => job.startTime?.getTime() || 0)))
      : null;

    const nextSyncTime = this.isRunning
      ? new Date(Date.now() + this.config.syncIntervalMs)
      : null;

    return {
      totalUsers: this.registeredUsers.size,
      successfulSyncs,
      failedSyncs,
      discrepanciesFound,
      averageSyncTime: avgSyncTime,
      lastSyncTime,
      nextSyncTime
    };
  }

  /**
   * Force sync for a specific user
   */
  async forceSyncUser(userPrincipal: string): Promise<BalanceSnapshot> {
    console.log(`🔧 Force syncing balance for user: ${userPrincipal}`);

    const custodyInfo = await icpCanisterService.deriveAlgorandAddress(userPrincipal);
    return this.syncUserBalance(userPrincipal, custodyInfo.address);
  }

  /**
   * Force sync for all users
   */
  async forceSyncAll(): Promise<void> {
    console.log('🔧 Force syncing all user balances...');
    await this.performSyncCycle();
  }

  /**
   * Clean up old sync jobs
   */
  cleanupOldJobs(maxAgeMs: number = 24 * 60 * 60 * 1000): number {
    const cutoff = Date.now() - maxAgeMs;
    let cleanedCount = 0;

    for (const [jobId, job] of this.syncJobs) {
      const jobTime = job.endTime?.getTime() || job.startTime?.getTime() || 0;

      if (jobTime < cutoff) {
        this.syncJobs.delete(jobId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} old balance sync jobs`);
    }

    return cleanedCount;
  }
}