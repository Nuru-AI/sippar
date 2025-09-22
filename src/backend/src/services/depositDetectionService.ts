/**
 * Deposit Detection Service - Sprint X Week 2 Phase 2.1
 * Real-time monitoring of ALGO deposits to custody addresses
 */

import { AlgorandService, AlgorandTransaction } from './algorandService.js';
import { SimplifiedBridgeService } from './simplifiedBridgeService.js';

export interface PendingDeposit {
  txId: string;
  userPrincipal: string;
  custodyAddress: string;
  amount: number;
  sender: string;
  round: number;
  timestamp: number;
  confirmations: number;
  requiredConfirmations: number;
  status: 'pending' | 'confirmed' | 'failed';
  detectedAt: number;
}

export interface DepositDetectionConfig {
  mainnetConfirmations: number;
  testnetConfirmations: number;
  pollingIntervalMs: number;
  maxPendingDeposits: number;
}

export interface AddressMapping {
  custodyAddress: string;
  userPrincipal: string;
  createdAt: number;
  lastCheckedRound: number;
}

export class DepositDetectionService {
  private algorandService: AlgorandService;
  private simplifiedBridgeService: SimplifiedBridgeService;
  private config: DepositDetectionConfig;
  private addressMappings: Map<string, AddressMapping> = new Map();
  private pendingDeposits: Map<string, PendingDeposit> = new Map();
  private isRunning: boolean = false;
  private pollingInterval: NodeJS.Timeout | null = null;

  constructor(algorandService: AlgorandService, simplifiedBridgeService: SimplifiedBridgeService, config?: Partial<DepositDetectionConfig>) {
    this.algorandService = algorandService;
    this.simplifiedBridgeService = simplifiedBridgeService;
    this.config = {
      mainnetConfirmations: 6,
      testnetConfirmations: 3,
      pollingIntervalMs: 30000, // 30 seconds
      maxPendingDeposits: 1000,
      ...config
    };
  }

  /**
   * Register a custody address for monitoring
   */
  async registerCustodyAddress(custodyAddress: string, userPrincipal: string): Promise<void> {
    console.log(`🏦 Registering custody address ${custodyAddress} for user ${userPrincipal}`);
    
    // Get current network round for starting point
    const networkStatus = await this.algorandService.getNetworkStatus();
    
    this.addressMappings.set(custodyAddress, {
      custodyAddress,
      userPrincipal,
      createdAt: Date.now(),
      lastCheckedRound: networkStatus.round
    });

    console.log(`✅ Registered address mapping: ${custodyAddress} → ${userPrincipal}`);
  }

  /**
   * Start monitoring registered addresses for deposits
   */
  async startMonitoring(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Deposit monitoring already running');
      return;
    }

    console.log(`🔍 Starting deposit monitoring (polling every ${this.config.pollingIntervalMs}ms)`);
    this.isRunning = true;

    this.pollingInterval = setInterval(async () => {
      await this.checkForDeposits();
    }, this.config.pollingIntervalMs);

    // Initial check
    await this.checkForDeposits();
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isRunning = false;
    console.log('🛑 Stopped deposit monitoring');
  }

  /**
   * Check all registered addresses for new deposits
   */
  private async checkForDeposits(): Promise<void> {
    console.log(`🔍 Checking ${this.addressMappings.size} addresses for deposits...`);

    for (const [address, mapping] of this.addressMappings) {
      try {
        await this.checkAddressForDeposits(address, mapping);
      } catch (error) {
        console.error(`❌ Error checking address ${address}:`, error);
      }
    }

    // Update confirmation status for pending deposits
    await this.updatePendingDeposits();
  }

  /**
   * Check specific address for new deposits AND existing balance
   */
  private async checkAddressForDeposits(address: string, mapping: AddressMapping): Promise<void> {
    // Check for new transaction-based deposits
    const deposits = await this.algorandService.monitorDeposits(address, mapping.lastCheckedRound);

    if (deposits.length > 0) {
      console.log(`💰 Found ${deposits.length} new deposits for ${address}`);

      for (const deposit of deposits) {
        await this.processNewDeposit(deposit, mapping);
      }

      // Update last checked round
      const latestRound = Math.max(...deposits.map(d => d.round));
      mapping.lastCheckedRound = latestRound;
    }

    // SPRINT X FIX: Also check for historical deposits that were made before monitoring started
    try {
      console.log(`🔍 Checking for historical deposits to ${address}...`);

      // Use monitorDeposits with round 0 to get ALL historical transactions
      const historicalDeposits = await this.algorandService.monitorDeposits(address, 0);

      if (historicalDeposits.length > 0) {
        console.log(`💰 Found ${historicalDeposits.length} historical deposits for ${address}`);

        // Process all historical deposits as confirmed (they're already on blockchain)
        for (const deposit of historicalDeposits) {
          // Check if we've already processed this deposit
          if (!this.pendingDeposits.has(deposit.id)) {
            console.log(`📥 Processing historical deposit: ${deposit.id} for ${deposit.amount} ALGO`);

            // Historical deposits are automatically confirmed since they're already on blockchain
            const confirmedDeposit: PendingDeposit = {
              txId: deposit.id,
              userPrincipal: mapping.userPrincipal,
              custodyAddress: mapping.custodyAddress,
              amount: deposit.amount,
              sender: deposit.sender,
              round: deposit.round,
              timestamp: deposit.timestamp,
              confirmations: 999, // Historical deposits are already confirmed
              requiredConfirmations: 1,
              status: 'confirmed',
              detectedAt: Date.now()
            };

            this.pendingDeposits.set(deposit.id, confirmedDeposit);

            // Immediately trigger automatic minting for historical deposit
            await this.handleConfirmedDeposit(confirmedDeposit);
          }
        }
      }
    } catch (error) {
      // Don't fail if historical deposit check fails, just log and continue
      console.log(`ℹ️ Could not check historical deposits for ${address}: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Process a newly detected deposit
   */
  private async processNewDeposit(deposit: AlgorandTransaction, mapping: AddressMapping): Promise<void> {
    console.log(`📥 Processing new deposit: ${deposit.id} for ${deposit.amount} ALGO`);

    // Check for minimum deposit amount
    const MIN_DEPOSIT = 0.1; // 0.1 ALGO minimum
    if (deposit.amount < MIN_DEPOSIT) {
      console.log(`⚠️ Deposit ${deposit.id} below minimum (${deposit.amount} < ${MIN_DEPOSIT} ALGO)`);
      return;
    }

    // Get network status to determine required confirmations
    const networkStatus = await this.algorandService.getNetworkStatus();
    const requiredConfirmations = networkStatus.network === 'mainnet' 
      ? this.config.mainnetConfirmations 
      : this.config.testnetConfirmations;

    const currentConfirmations = networkStatus.round - deposit.round;

    const pendingDeposit: PendingDeposit = {
      txId: deposit.id,
      userPrincipal: mapping.userPrincipal,
      custodyAddress: mapping.custodyAddress,
      amount: deposit.amount,
      sender: deposit.sender,
      round: deposit.round,
      timestamp: deposit.timestamp,
      confirmations: currentConfirmations,
      requiredConfirmations,
      status: currentConfirmations >= requiredConfirmations ? 'confirmed' : 'pending',
      detectedAt: Date.now()
    };

    this.pendingDeposits.set(deposit.id, pendingDeposit);

    if (pendingDeposit.status === 'confirmed') {
      await this.handleConfirmedDeposit(pendingDeposit);
    } else {
      console.log(`⏳ Deposit ${deposit.id} pending: ${currentConfirmations}/${requiredConfirmations} confirmations`);
    }
  }

  /**
   * Update confirmation status for all pending deposits
   */
  private async updatePendingDeposits(): Promise<void> {
    if (this.pendingDeposits.size === 0) return;

    const networkStatus = await this.algorandService.getNetworkStatus();
    const currentRound = networkStatus.round;

    for (const [txId, deposit] of this.pendingDeposits) {
      if (deposit.status !== 'pending') continue;

      const currentConfirmations = currentRound - deposit.round;
      deposit.confirmations = currentConfirmations;

      if (currentConfirmations >= deposit.requiredConfirmations) {
        deposit.status = 'confirmed';
        console.log(`✅ Deposit ${txId} confirmed: ${currentConfirmations}/${deposit.requiredConfirmations} confirmations`);
        await this.handleConfirmedDeposit(deposit);
      } else {
        console.log(`⏳ Deposit ${txId} pending: ${currentConfirmations}/${deposit.requiredConfirmations} confirmations`);
      }
    }
  }

  /**
   * Handle a confirmed deposit - trigger ckALGO minting
   */
  private async handleConfirmedDeposit(deposit: PendingDeposit): Promise<void> {
    console.log(`🎉 Handling confirmed deposit: ${deposit.txId} for ${deposit.amount} ALGO`);

    try {
      console.log(`📢 DEPOSIT CONFIRMED EVENT:`, {
        txId: deposit.txId,
        userPrincipal: deposit.userPrincipal,
        amount: deposit.amount,
        confirmations: deposit.confirmations,
        custodyAddress: deposit.custodyAddress
      });

      // Automatically trigger ckALGO minting for confirmed deposit
      console.log(`🔄 Automatically minting ckALGO for confirmed deposit ${deposit.txId}`);

      try {
        // Call simplified bridge canister to mint ckALGO tokens
        const mintResult = await this.simplifiedBridgeService.mintAfterDepositConfirmed(deposit.txId);

        console.log(`✅ Successfully auto-minted ${deposit.amount} ckALGO for deposit ${deposit.txId}:`, mintResult);

        // Mark deposit as processed (remove from pending)
        this.pendingDeposits.delete(deposit.txId);

        console.log(`🎉 AUTOMATIC MINTING COMPLETE: ${deposit.amount} ckALGO minted for user ${deposit.userPrincipal}`);

      } catch (mintError) {
        console.error(`❌ Automatic minting failed for deposit ${deposit.txId}:`, mintError);
        // Keep deposit in pending state for manual processing if automatic minting fails
        console.log(`⚠️ Deposit ${deposit.txId} remains available for manual minting`);
      }

    } catch (error) {
      console.error(`❌ Error handling confirmed deposit ${deposit.txId}:`, error);
      deposit.status = 'failed';
    }
  }

  /**
   * Process a confirmed deposit for minting (called by mint endpoint)
   */
  async processConfirmedDepositForMinting(txId: string): Promise<PendingDeposit | null> {
    const deposit = this.pendingDeposits.get(txId);
    
    if (!deposit) {
      console.log(`❌ Deposit ${txId} not found`);
      return null;
    }
    
    if (deposit.status !== 'confirmed') {
      console.log(`❌ Deposit ${txId} not confirmed (status: ${deposit.status})`);
      return null;
    }
    
    // Remove from pending deposits as it's now being minted
    this.pendingDeposits.delete(txId);
    console.log(`🔄 Processing deposit ${txId} for minting`);
    
    return deposit;
  }

  /**
   * Get pending deposits for a user
   */
  getPendingDepositsForUser(userPrincipal: string): PendingDeposit[] {
    return Array.from(this.pendingDeposits.values())
      .filter(deposit => deposit.userPrincipal === userPrincipal);
  }

  /**
   * Get confirmed deposits for a user
   */
  getConfirmedDepositsForUser(userPrincipal: string): PendingDeposit[] {
    return Array.from(this.pendingDeposits.values())
      .filter(deposit => 
        deposit.userPrincipal === userPrincipal && 
        deposit.status === 'confirmed'
      );
  }

  /**
   * Get custody address for a user
   */
  getCustodyAddressForUser(userPrincipal: string): string | null {
    for (const mapping of this.addressMappings.values()) {
      if (mapping.userPrincipal === userPrincipal) {
        return mapping.custodyAddress;
      }
    }
    return null;
  }

  /**
   * Get monitoring statistics
   */
  getMonitoringStats() {
    const pendingCount = Array.from(this.pendingDeposits.values())
      .filter(d => d.status === 'pending').length;
    const confirmedCount = Array.from(this.pendingDeposits.values())
      .filter(d => d.status === 'confirmed').length;
    const failedCount = Array.from(this.pendingDeposits.values())
      .filter(d => d.status === 'failed').length;

    return {
      isRunning: this.isRunning,
      pollingIntervalMs: this.config.pollingIntervalMs,
      registeredAddresses: this.addressMappings.size,
      pendingDeposits: pendingCount,
      confirmedDeposits: confirmedCount,
      failedDeposits: failedCount,
      totalDeposits: this.pendingDeposits.size,
      config: this.config
    };
  }

  /**
   * Restore a deposit to pending status (for error recovery)
   */
  restoreDeposit(deposit: PendingDeposit): void {
    this.pendingDeposits.set(deposit.txId, deposit);
  }

  /**
   * Clean up old deposits (confirmed or failed)
   */
  cleanupOldDeposits(maxAgeMs: number = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAgeMs;
    let cleanedCount = 0;

    for (const [txId, deposit] of this.pendingDeposits) {
      if (deposit.status !== 'pending' && deposit.detectedAt < cutoff) {
        this.pendingDeposits.delete(txId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} old deposits`);
    }
  }
}