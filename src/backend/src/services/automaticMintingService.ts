/**
 * Automatic ckALGO Minting Service - Sprint 012.5
 * Enhanced automatic minting system with robust error handling and retry logic
 */

import { DepositDetectionService, PendingDeposit } from './depositDetectionService.js';
import { SimplifiedBridgeService } from './simplifiedBridgeService.js';
import { CkAlgoService } from './ckAlgoService.js';
import { ProductionMonitoringService, Alert } from './productionMonitoringService.js';
import { AlertManager } from './alertManager.js';

export interface MintingJob {
  id: string;
  deposit: PendingDeposit;
  attempts: number;
  maxRetries: number;
  nextRetryAt: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
  error?: string;
}

export interface MintingStats {
  totalJobs: number;
  pendingJobs: number;
  processingJobs: number;
  completedJobs: number;
  failedJobs: number;
  successRate: number;
  totalAmountMinted: number;
  averageProcessingTime: number;
}

export class AutomaticMintingService {
  private mintingQueue: Map<string, MintingJob> = new Map();
  private isProcessing: boolean = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private depositDetectionService: DepositDetectionService;
  private simplifiedBridgeService: SimplifiedBridgeService;
  private ckAlgoService: CkAlgoService;
  private monitoringService?: ProductionMonitoringService;
  private alertManager?: AlertManager;

  private readonly config = {
    processingIntervalMs: 15000, // Process queue every 15 seconds
    maxRetries: 5,
    baseRetryDelayMs: 30000, // 30 seconds base delay
    maxRetryDelayMs: 300000, // 5 minutes max delay
    batchSize: 5, // Process up to 5 jobs concurrently
  };

  constructor(
    depositDetectionService: DepositDetectionService,
    simplifiedBridgeService: SimplifiedBridgeService,
    ckAlgoService: CkAlgoService,
    monitoringService?: ProductionMonitoringService,
    alertManager?: AlertManager
  ) {
    this.depositDetectionService = depositDetectionService;
    this.simplifiedBridgeService = simplifiedBridgeService;
    this.ckAlgoService = ckAlgoService;
    this.monitoringService = monitoringService;
    this.alertManager = alertManager;
  }

  /**
   * Start the automatic minting service
   */
  async startService(): Promise<void> {
    if (this.isProcessing) {
      console.log('⚠️ Automatic minting service already running');
      return;
    }

    console.log('🚀 Starting automatic ckALGO minting service...');
    this.isProcessing = true;

    // Start processing queue
    this.processingInterval = setInterval(async () => {
      await this.processQueue();
    }, this.config.processingIntervalMs);

    // Initial queue processing
    await this.processQueue();

    console.log(`✅ Automatic minting service started (processing every ${this.config.processingIntervalMs}ms)`);
  }

  /**
   * Stop the automatic minting service
   */
  stopService(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    this.isProcessing = false;
    console.log('🛑 Automatic minting service stopped');
  }

  /**
   * Add a confirmed deposit to the minting queue
   */
  async queueDepositForMinting(deposit: PendingDeposit): Promise<string> {
    const jobId = `mint-${deposit.txId}-${Date.now()}`;

    const job: MintingJob = {
      id: jobId,
      deposit,
      attempts: 0,
      maxRetries: this.config.maxRetries,
      nextRetryAt: new Date(),
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.mintingQueue.set(jobId, job);

    console.log(`📋 Queued deposit ${deposit.txId} for automatic minting (${deposit.amount} ALGO)`);

    // Note: Monitoring service integration can be added later with proper interface

    return jobId;
  }

  /**
   * Process the minting queue
   */
  private async processQueue(): Promise<void> {
    const pendingJobs = Array.from(this.mintingQueue.values())
      .filter(job => job.status === 'pending' && job.nextRetryAt <= new Date())
      .slice(0, this.config.batchSize);

    if (pendingJobs.length === 0) {
      return;
    }

    console.log(`🔄 Processing ${pendingJobs.length} minting jobs...`);

    // Process jobs concurrently
    const promises = pendingJobs.map(job => this.processJob(job));
    await Promise.allSettled(promises);
  }

  /**
   * Process a single minting job
   */
  private async processJob(job: MintingJob): Promise<void> {
    try {
      job.status = 'processing';
      job.attempts++;
      job.updatedAt = new Date();

      console.log(`🔄 Processing minting job ${job.id} (attempt ${job.attempts}/${job.maxRetries})`);

      const startTime = Date.now();

      // Attempt to mint using simplified bridge service
      try {
        const mintResult = await this.simplifiedBridgeService.mintAfterDepositConfirmed(job.deposit.txId);

        const processingTime = Date.now() - startTime;

        job.status = 'completed';
        job.updatedAt = new Date();

        console.log(`✅ Successfully minted ${job.deposit.amount} ckALGO for deposit ${job.deposit.txId} (${processingTime}ms)`);

        // Success logged via console output for now

        return;

      } catch (mintError) {
        console.error(`❌ Minting failed for job ${job.id}:`, mintError);
        throw mintError;
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      job.error = errorMessage;
      job.updatedAt = new Date();

      // Determine if we should retry
      if (job.attempts < job.maxRetries) {
        job.status = 'pending';

        // Calculate exponential backoff delay
        const delay = Math.min(
          this.config.baseRetryDelayMs * Math.pow(2, job.attempts - 1),
          this.config.maxRetryDelayMs
        );

        job.nextRetryAt = new Date(Date.now() + delay);

        console.log(`⏳ Minting job ${job.id} will retry in ${delay}ms (attempt ${job.attempts}/${job.maxRetries})`);

      } else {
        job.status = 'failed';

        console.error(`❌ Minting job ${job.id} failed permanently after ${job.attempts} attempts`);

        // Send alert for failed minting
        if (this.alertManager) {
          const alert: Alert = {
            id: `minting-failed-${job.id}`,
            type: 'minting_failed',
            severity: 'HIGH',
            message: `Automatic Minting Failed: ${job.deposit.amount} ALGO for user ${job.deposit.userPrincipal}`,
            details: {
              job_id: job.id,
              deposit_tx_id: job.deposit.txId,
              error: errorMessage,
              attempts: job.attempts
            },
            timestamp: new Date().toISOString(),
            actionRequired: 'Manual investigation required for failed minting job'
          };
          await this.alertManager.triggerAlert(alert);
        }

        // Failure logged via console output and alert system
      }
    }
  }

  /**
   * Get minting job status
   */
  getMintingJob(jobId: string): MintingJob | null {
    return this.mintingQueue.get(jobId) || null;
  }

  /**
   * Get jobs for a specific user
   */
  getUserMintingJobs(userPrincipal: string): MintingJob[] {
    return Array.from(this.mintingQueue.values())
      .filter(job => job.deposit.userPrincipal === userPrincipal);
  }

  /**
   * Get minting statistics
   */
  getMintingStats(): MintingStats {
    const jobs = Array.from(this.mintingQueue.values());

    const totalJobs = jobs.length;
    const pendingJobs = jobs.filter(j => j.status === 'pending').length;
    const processingJobs = jobs.filter(j => j.status === 'processing').length;
    const completedJobs = jobs.filter(j => j.status === 'completed').length;
    const failedJobs = jobs.filter(j => j.status === 'failed').length;

    const successRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;

    const completedJobsData = jobs.filter(j => j.status === 'completed');
    const totalAmountMinted = completedJobsData.reduce((sum, job) => sum + job.deposit.amount, 0);

    const avgProcessingTime = completedJobsData.length > 0
      ? completedJobsData.reduce((sum, job) => {
          const processingTime = job.updatedAt.getTime() - job.createdAt.getTime();
          return sum + processingTime;
        }, 0) / completedJobsData.length
      : 0;

    return {
      totalJobs,
      pendingJobs,
      processingJobs,
      completedJobs,
      failedJobs,
      successRate,
      totalAmountMinted,
      averageProcessingTime: avgProcessingTime
    };
  }

  /**
   * Clean up old completed/failed jobs
   */
  cleanupOldJobs(maxAgeMs: number = 24 * 60 * 60 * 1000): number {
    const cutoff = Date.now() - maxAgeMs;
    let cleanedCount = 0;

    for (const [jobId, job] of this.mintingQueue) {
      if (
        (job.status === 'completed' || job.status === 'failed') &&
        job.updatedAt.getTime() < cutoff
      ) {
        this.mintingQueue.delete(jobId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} old minting jobs`);
    }

    return cleanedCount;
  }

  /**
   * Cancel a pending minting job
   */
  cancelMintingJob(jobId: string): boolean {
    const job = this.mintingQueue.get(jobId);

    if (!job) {
      return false;
    }

    if (job.status === 'pending') {
      job.status = 'cancelled';
      job.updatedAt = new Date();
      console.log(`🚫 Cancelled minting job ${jobId}`);
      return true;
    }

    return false;
  }

  /**
   * Retry a failed minting job
   */
  retryMintingJob(jobId: string): boolean {
    const job = this.mintingQueue.get(jobId);

    if (!job || job.status !== 'failed') {
      return false;
    }

    job.status = 'pending';
    job.attempts = 0;
    job.nextRetryAt = new Date();
    job.error = undefined;
    job.updatedAt = new Date();

    console.log(`🔄 Retrying failed minting job ${jobId}`);
    return true;
  }

  /**
   * Force immediate processing of queue (for testing/debugging)
   */
  async forceProcessQueue(): Promise<void> {
    console.log('🔧 Force processing minting queue...');
    await this.processQueue();
  }
}