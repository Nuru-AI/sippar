/**
 * Automatic Redemption Service - Sprint 012.5
 * Enhanced automatic redemption system with threshold signature ALGO withdrawal
 */

import { SimplifiedBridgeService } from './simplifiedBridgeService.js';
import { icpCanisterService } from './icpCanisterService.js';
import { algorandService, algorandMainnet } from './algorandService.js';
import { ProductionMonitoringService, Alert } from './productionMonitoringService.js';
import { AlertManager } from './alertManager.js';
import { Principal } from '@dfinity/principal';
import algosdk from 'algosdk';

export interface RedemptionJob {
  id: string;
  userPrincipal: string;
  amount: number;
  destinationAddress: string;
  ckAlgoBurned: boolean;
  algoTransactionId?: string;
  attempts: number;
  maxRetries: number;
  nextRetryAt: Date;
  status: 'pending' | 'burning' | 'withdrawing' | 'completed' | 'failed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
  error?: string;
  custodyAddress?: string;
  burnResult?: any;
}

export interface RedemptionStats {
  totalJobs: number;
  pendingJobs: number;
  burningJobs: number;
  withdrawingJobs: number;
  completedJobs: number;
  failedJobs: number;
  successRate: number;
  totalAmountRedeemed: number;
  averageProcessingTime: number;
}

export class AutomaticRedemptionService {
  private redemptionQueue: Map<string, RedemptionJob> = new Map();
  private isProcessing: boolean = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private simplifiedBridgeService: SimplifiedBridgeService;
  private monitoringService?: ProductionMonitoringService;
  private alertManager?: AlertManager;

  private readonly config = {
    processingIntervalMs: 20000, // Process queue every 20 seconds
    maxRetries: 3, // Lower retries for redemptions (financial transactions)
    baseRetryDelayMs: 60000, // 1 minute base delay
    maxRetryDelayMs: 600000, // 10 minutes max delay
    batchSize: 3, // Process up to 3 redemptions concurrently
    maxRedemptionAmount: 10.0, // 10 ALGO max per transaction
    minRedemptionAmount: 0.01, // 0.01 ALGO minimum
  };

  constructor(
    simplifiedBridgeService: SimplifiedBridgeService,
    monitoringService?: ProductionMonitoringService,
    alertManager?: AlertManager
  ) {
    this.simplifiedBridgeService = simplifiedBridgeService;
    this.monitoringService = monitoringService;
    this.alertManager = alertManager;
  }

  /**
   * Start the automatic redemption service
   */
  async startService(): Promise<void> {
    if (this.isProcessing) {
      console.log('⚠️ Automatic redemption service already running');
      return;
    }

    console.log('🚀 Starting automatic ckALGO redemption service...');
    this.isProcessing = true;

    // Start processing queue
    this.processingInterval = setInterval(async () => {
      await this.processQueue();
    }, this.config.processingIntervalMs);

    // Initial queue processing
    await this.processQueue();

    console.log(`✅ Automatic redemption service started (processing every ${this.config.processingIntervalMs}ms)`);
  }

  /**
   * Stop the automatic redemption service
   */
  stopService(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    this.isProcessing = false;
    console.log('🛑 Automatic redemption service stopped');
  }

  /**
   * Queue a redemption request
   */
  async queueRedemption(
    userPrincipal: string,
    amount: number,
    destinationAddress: string
  ): Promise<string> {
    // Validation
    if (amount > this.config.maxRedemptionAmount) {
      throw new Error(`Maximum redemption amount is ${this.config.maxRedemptionAmount} ALGO`);
    }

    if (amount < this.config.minRedemptionAmount) {
      throw new Error(`Minimum redemption amount is ${this.config.minRedemptionAmount} ALGO`);
    }

    // TODO: Add address validation when needed
    // if (!algosdk.isValidAddress(destinationAddress)) {
    //   throw new Error('Invalid Algorand destination address');
    // }

    const jobId = `redeem-${userPrincipal.slice(-8)}-${Date.now()}`;

    const job: RedemptionJob = {
      id: jobId,
      userPrincipal,
      amount,
      destinationAddress,
      ckAlgoBurned: false,
      attempts: 0,
      maxRetries: this.config.maxRetries,
      nextRetryAt: new Date(),
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.redemptionQueue.set(jobId, job);

    console.log(`📋 Queued redemption ${jobId}: ${amount} ckALGO → ${destinationAddress}`);

    return jobId;
  }

  /**
   * Process the redemption queue
   */
  private async processQueue(): Promise<void> {
    const pendingJobs = Array.from(this.redemptionQueue.values())
      .filter(job => (job.status === 'pending' || job.status === 'burning' || job.status === 'withdrawing')
                     && job.nextRetryAt <= new Date())
      .slice(0, this.config.batchSize);

    if (pendingJobs.length === 0) {
      return;
    }

    console.log(`🔄 Processing ${pendingJobs.length} redemption jobs...`);

    // Process jobs concurrently
    const promises = pendingJobs.map(job => this.processJob(job));
    await Promise.allSettled(promises);
  }

  /**
   * Process a single redemption job
   */
  private async processJob(job: RedemptionJob): Promise<void> {
    try {
      job.attempts++;
      job.updatedAt = new Date();

      console.log(`🔄 Processing redemption job ${job.id} (attempt ${job.attempts}/${job.maxRetries})`);

      const startTime = Date.now();

      // Step 1: Burn ckALGO tokens if not already done
      if (!job.ckAlgoBurned) {
        job.status = 'burning';
        console.log(`🔥 Burning ${job.amount} ckALGO tokens for ${job.userPrincipal}...`);

        const ckAlgoMicroUnits = BigInt(Math.floor(job.amount * 1_000_000));
        const userPrincipal = Principal.fromText(job.userPrincipal);

        // Use simplified_bridge canister's admin_redeem_ck_algo function
        const burnResult = await this.simplifiedBridgeService.adminRedeemCkAlgo(
          userPrincipal,
          ckAlgoMicroUnits,
          job.destinationAddress
        );

        job.ckAlgoBurned = true;
        job.burnResult = { redemption_id: burnResult };
        console.log(`✅ Successfully burned ${job.amount} ckALGO for job ${job.id} (redemption: ${burnResult})`);
      }

      // Step 2: Withdraw ALGO using threshold signatures
      if (job.ckAlgoBurned && !job.algoTransactionId) {
        job.status = 'withdrawing';
        console.log(`💸 Withdrawing ${job.amount} ALGO to ${job.destinationAddress}...`);

        // Get user's custody address for threshold signing
        if (!job.custodyAddress) {
          const custodyInfo = await icpCanisterService.deriveAlgorandAddress(job.userPrincipal);
          job.custodyAddress = custodyInfo.address;
        }

        // Create ALGO withdrawal transaction
        const suggestedParams = await algorandMainnet.getSuggestedParams();
        const microAlgos = Math.floor(job.amount * 1_000_000);

        const withdrawalTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          from: job.custodyAddress,
          to: job.destinationAddress,
          amount: microAlgos,
          note: new Uint8Array(Buffer.from(`ckALGO redemption: Unlocking ${job.amount} ALGO`)),
          suggestedParams: suggestedParams,
        });

        // Get transaction bytes to sign with threshold signatures
        const txnBytesToSign = withdrawalTxn.bytesToSign();

        // Sign with threshold signature
        const signedWithdrawal = await icpCanisterService.signAlgorandTransaction(
          job.userPrincipal,
          new Uint8Array(txnBytesToSign)
        );

        // Submit threshold-signed transaction to Algorand mainnet
        const signedTxnData = {
          sig: new Uint8Array(signedWithdrawal.signature),
          txn: withdrawalTxn.get_obj_for_encoding()
        };
        const encodedSignedTxn = algosdk.encodeObj(signedTxnData);
        const submissionResult = await algorandMainnet.submitTransaction(new Uint8Array(encodedSignedTxn));
        job.algoTransactionId = submissionResult.txId;

        console.log(`✅ ALGO withdrawal submitted to Algorand mainnet: ${job.algoTransactionId} (round ${submissionResult.confirmedRound})`);
      }

      // Step 3: Mark as completed
      if (job.ckAlgoBurned && job.algoTransactionId) {
        const processingTime = Date.now() - startTime;
        job.status = 'completed';
        job.updatedAt = new Date();

        console.log(`✅ Redemption job ${job.id} completed: ${job.amount} ALGO redeemed (${processingTime}ms)`);
        return;
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      job.error = errorMessage;
      job.updatedAt = new Date();

      console.error(`❌ Redemption job ${job.id} failed:`, errorMessage);

      // Determine if we should retry
      if (job.attempts < job.maxRetries) {
        // Reset to pending for retry, but keep progress (ckAlgoBurned status)
        job.status = job.ckAlgoBurned ? 'withdrawing' : 'pending';

        // Calculate exponential backoff delay
        const delay = Math.min(
          this.config.baseRetryDelayMs * Math.pow(2, job.attempts - 1),
          this.config.maxRetryDelayMs
        );

        job.nextRetryAt = new Date(Date.now() + delay);

        console.log(`⏳ Redemption job ${job.id} will retry in ${delay}ms (attempt ${job.attempts}/${job.maxRetries})`);

      } else {
        job.status = 'failed';

        console.error(`❌ Redemption job ${job.id} failed permanently after ${job.attempts} attempts`);

        // Send alert for failed redemption
        if (this.alertManager) {
          const alert: Alert = {
            id: `redemption-failed-${job.id}`,
            type: 'redemption_failed',
            severity: 'HIGH',
            message: `Automatic Redemption Failed: ${job.amount} ALGO for user ${job.userPrincipal}`,
            details: {
              job_id: job.id,
              amount: job.amount,
              destination: job.destinationAddress,
              ck_algo_burned: job.ckAlgoBurned,
              error: errorMessage,
              attempts: job.attempts
            },
            timestamp: new Date().toISOString(),
            actionRequired: 'Manual investigation required for failed redemption - user funds may be locked'
          };
          await this.alertManager.triggerAlert(alert);
        }
      }
    }
  }

  /**
   * Get redemption job status
   */
  getRedemptionJob(jobId: string): RedemptionJob | null {
    return this.redemptionQueue.get(jobId) || null;
  }

  /**
   * Get jobs for a specific user
   */
  getUserRedemptionJobs(userPrincipal: string): RedemptionJob[] {
    return Array.from(this.redemptionQueue.values())
      .filter(job => job.userPrincipal === userPrincipal);
  }

  /**
   * Get redemption statistics
   */
  getRedemptionStats(): RedemptionStats {
    const jobs = Array.from(this.redemptionQueue.values());

    const totalJobs = jobs.length;
    const pendingJobs = jobs.filter(j => j.status === 'pending').length;
    const burningJobs = jobs.filter(j => j.status === 'burning').length;
    const withdrawingJobs = jobs.filter(j => j.status === 'withdrawing').length;
    const completedJobs = jobs.filter(j => j.status === 'completed').length;
    const failedJobs = jobs.filter(j => j.status === 'failed').length;

    const successRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;

    const completedJobsData = jobs.filter(j => j.status === 'completed');
    const totalAmountRedeemed = completedJobsData.reduce((sum, job) => sum + job.amount, 0);

    const avgProcessingTime = completedJobsData.length > 0
      ? completedJobsData.reduce((sum, job) => {
          const processingTime = job.updatedAt.getTime() - job.createdAt.getTime();
          return sum + processingTime;
        }, 0) / completedJobsData.length
      : 0;

    return {
      totalJobs,
      pendingJobs,
      burningJobs,
      withdrawingJobs,
      completedJobs,
      failedJobs,
      successRate,
      totalAmountRedeemed,
      averageProcessingTime: avgProcessingTime
    };
  }

  /**
   * Cancel a pending redemption job
   */
  cancelRedemptionJob(jobId: string): boolean {
    const job = this.redemptionQueue.get(jobId);

    if (!job) {
      return false;
    }

    // Can only cancel if not yet processed
    if (job.status === 'pending' || (job.status === 'burning' && !job.ckAlgoBurned)) {
      job.status = 'cancelled';
      job.updatedAt = new Date();
      console.log(`🚫 Cancelled redemption job ${jobId}`);
      return true;
    }

    return false;
  }

  /**
   * Retry a failed redemption job
   */
  retryRedemptionJob(jobId: string): boolean {
    const job = this.redemptionQueue.get(jobId);

    if (!job || job.status !== 'failed') {
      return false;
    }

    job.status = job.ckAlgoBurned ? 'withdrawing' : 'pending';
    job.attempts = 0;
    job.nextRetryAt = new Date();
    job.error = undefined;
    job.updatedAt = new Date();

    console.log(`🔄 Retrying failed redemption job ${jobId}`);
    return true;
  }

  /**
   * Clean up old completed/failed jobs
   */
  cleanupOldJobs(maxAgeMs: number = 24 * 60 * 60 * 1000): number {
    const cutoff = Date.now() - maxAgeMs;
    let cleanedCount = 0;

    for (const [jobId, job] of this.redemptionQueue) {
      if (
        (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') &&
        job.updatedAt.getTime() < cutoff
      ) {
        this.redemptionQueue.delete(jobId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} old redemption jobs`);
    }

    return cleanedCount;
  }

  /**
   * Force immediate processing of queue (for testing/debugging)
   */
  async forceProcessQueue(): Promise<void> {
    console.log('🔧 Force processing redemption queue...');
    await this.processQueue();
  }
}