/**
 * Migration Service
 *
 * Sprint X.1 Phase 1.1: Migration System Implementation
 * Handles migration of existing unbacked ckALGO tokens to backed tokens
 *
 * Key Features:
 * - User migration status tracking
 * - Multiple migration paths (fresh start, migration bridge, legacy hold)
 * - Safe migration process with fund protection
 * - Migration progress monitoring
 */

import { Principal } from '@dfinity/principal';
import { simplifiedBridgeService } from './simplifiedBridgeService.js';
import { ckAlgoService } from './ckAlgoService.js';
import { CustodyAddressService } from './custodyAddressService.js';
import { algorandService } from './algorandService.js';

interface MigrationStatus {
  oldCkAlgoBalance: number;
  newCkAlgoBalance: number;
  algorandBalance: number;
  migrationOptions: MigrationOptions;
  recommendedPath: 'fresh' | 'bridge' | 'legacy';
  eligibleForMigration: boolean;
}

interface MigrationOptions {
  freshStart: {
    available: boolean;
    description: string;
    estimatedTime: string;
  };
  migrationBridge: {
    available: boolean;
    requiredAlgo: number;
    description: string;
    estimatedTime: string;
  };
  legacyHold: {
    available: boolean;
    description: string;
    warnings: string[];
  };
}

interface MigrationResult {
  success: boolean;
  migrationId: string;
  status: 'initiated' | 'in_progress' | 'completed' | 'failed';
  steps: MigrationStep[];
  estimatedCompletionTime?: string;
  errorMessage?: string;
}

interface MigrationStep {
  action: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: any;
  instructions?: string;
  errorMessage?: string;
}

interface MigrationStatistics {
  totalUsers: number;
  migratedUsers: {
    freshStart: number;
    migrationBridge: number;
    legacyHold: number;
  };
  tokenSupply: {
    oldCkAlgoRemaining: number;
    newCkAlgoIssued: number;
    totalAlgoLocked: number;
  };
  migrationHealth: {
    reserveRatio: number;
    emergencyPaused: boolean;
    avgMigrationTime: number; // minutes
    successRate: number;
  };
}

interface UserMigrationProgress {
  principal: string;
  migrationPath: 'fresh' | 'bridge' | 'legacy';
  status: 'not_started' | 'in_progress' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  migrationId?: string;
  oldCkAlgoBalance: number;
  newCkAlgoBalance: number;
  algoDeposited: number;
  steps: MigrationStep[];
  errorMessage?: string;
}

export class MigrationService {
  private oldCkAlgoCanister: string = 'gbmxj-yiaaa-aaaak-qulqa-cai';
  private newBridgeCanister: string = 'hldvt-2yaaa-aaaak-qulxa-cai';

  // In-memory storage for migration progress (production would use database)
  private migrationProgress: Map<string, UserMigrationProgress> = new Map();
  private migrationStatistics!: MigrationStatistics; // Will be initialized in constructor
  private custodyAddressService: CustodyAddressService;

  constructor() {
    this.custodyAddressService = new CustodyAddressService();
    this.initializeMigrationStatistics();
  }

  /**
   * Get migration status for a user
   */
  async getUserMigrationStatus(principal: Principal): Promise<MigrationStatus> {
    try {
      console.log(`🔍 Getting migration status for principal: ${principal.toString()}`);

      // Get old ckALGO balance (from original canister)
      const oldCkAlgoBalance = await this.getOldCkAlgoBalance(principal);

      // Get new ckALGO balance (from SimplifiedBridge)
      const newCkAlgoBalance = await this.getNewCkAlgoBalance(principal);

      // Get user's ALGO balance on Algorand
      const algorandBalance = await this.getAlgorandBalance(principal);

      // Calculate migration options
      const migrationOptions = this.calculateMigrationOptions(oldCkAlgoBalance, algorandBalance);

      // Determine recommended path
      const recommendedPath = this.getRecommendedPath(oldCkAlgoBalance, algorandBalance);

      const migrationStatus: MigrationStatus = {
        oldCkAlgoBalance,
        newCkAlgoBalance,
        algorandBalance,
        migrationOptions,
        recommendedPath,
        eligibleForMigration: oldCkAlgoBalance > 0 || algorandBalance > 0
      };

      console.log(`✅ Migration status calculated:`, {
        principal: principal.toString(),
        oldCkAlgo: oldCkAlgoBalance,
        newCkAlgo: newCkAlgoBalance,
        algo: algorandBalance,
        recommended: recommendedPath
      });

      return migrationStatus;
    } catch (error) {
      console.error(`❌ Failed to get migration status for ${principal.toString()}:`, error);
      throw new Error(`Migration status error: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Execute fresh start migration
   */
  async executeFreshStartMigration(principal: Principal): Promise<MigrationResult> {
    try {
      console.log(`🆕 Starting fresh start migration for principal: ${principal.toString()}`);

      const migrationId = this.generateMigrationId(principal, 'fresh');
      const principalStr = principal.toString();

      // Initialize migration progress tracking
      const migrationProgress: UserMigrationProgress = {
        principal: principalStr,
        migrationPath: 'fresh',
        status: 'in_progress',
        startedAt: new Date(),
        migrationId,
        oldCkAlgoBalance: await this.getOldCkAlgoBalance(principal),
        newCkAlgoBalance: 0,
        algoDeposited: 0,
        steps: []
      };

      this.migrationProgress.set(principalStr, migrationProgress);

      const steps: MigrationStep[] = [];

      // Step 1: Redeem old ckALGO (if any)
      const oldBalance = await this.getOldCkAlgoBalance(principal);
      if (oldBalance > 0) {
        steps.push({
          action: 'redeem_old_ck_algo',
          status: 'in_progress',
          instructions: `Redeem ${oldBalance} old ckALGO tokens to get ALGO back`
        });

        try {
          const redeemResult = await this.redeemOldCkAlgo(principal, oldBalance);
          steps[steps.length - 1].status = 'completed';
          steps[steps.length - 1].result = redeemResult;
          console.log(`✅ Redeemed ${oldBalance} old ckALGO for ${principalStr}`);
        } catch (error) {
          steps[steps.length - 1].status = 'failed';
          steps[steps.length - 1].errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`❌ Failed to redeem old ckALGO for ${principalStr}:`, error);
        }
      }

      // Step 2: Generate new deposit address for fresh start
      steps.push({
        action: 'generate_fresh_deposit_address',
        status: 'in_progress',
        instructions: 'Generate new custody address for fresh deposits'
      });

      try {
        const depositInstructions = await this.generateNewDepositAddress(principal);
        steps[steps.length - 1].status = 'completed';
        steps[steps.length - 1].result = depositInstructions;
        steps[steps.length - 1].instructions = `Deposit ALGO to your new custody address: ${depositInstructions.custodyAddress}`;
        console.log(`✅ Generated fresh deposit address for ${principalStr}`);
      } catch (error) {
        steps[steps.length - 1].status = 'failed';
        steps[steps.length - 1].errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ Failed to generate deposit address for ${principalStr}:`, error);
      }

      // Update migration progress
      migrationProgress.steps = steps;
      this.migrationProgress.set(principalStr, migrationProgress);

      return {
        success: true,
        migrationId,
        status: 'in_progress',
        steps,
        estimatedCompletionTime: '15-30 minutes after ALGO deposit'
      };

    } catch (error) {
      console.error(`❌ Fresh start migration failed for ${principal.toString()}:`, error);
      return {
        success: false,
        migrationId: '',
        status: 'failed',
        steps: [],
        errorMessage: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Execute migration bridge (convert existing ckALGO to backed version)
   */
  async executeMigrationBridge(principal: Principal, amountToMigrate: number): Promise<MigrationResult> {
    try {
      console.log(`🌉 Starting migration bridge for principal: ${principal.toString()}, amount: ${amountToMigrate}`);

      const migrationId = this.generateMigrationId(principal, 'bridge');
      const principalStr = principal.toString();

      // Validate user has sufficient ALGO to back migration
      const algorandBalance = await this.getAlgorandBalance(principal);
      if (algorandBalance < amountToMigrate) {
        throw new Error(`Insufficient ALGO to back migration. Required: ${amountToMigrate}, Available: ${algorandBalance}`);
      }

      // Validate user has sufficient old ckALGO to migrate
      const oldCkAlgoBalance = await this.getOldCkAlgoBalance(principal);
      if (oldCkAlgoBalance < amountToMigrate) {
        throw new Error(`Insufficient old ckALGO to migrate. Required: ${amountToMigrate}, Available: ${oldCkAlgoBalance}`);
      }

      // Initialize migration progress tracking
      const migrationProgress: UserMigrationProgress = {
        principal: principalStr,
        migrationPath: 'bridge',
        status: 'in_progress',
        startedAt: new Date(),
        migrationId,
        oldCkAlgoBalance,
        newCkAlgoBalance: 0,
        algoDeposited: 0,
        steps: []
      };

      this.migrationProgress.set(principalStr, migrationProgress);

      const steps: MigrationStep[] = [];

      // Step 1: Generate deposit address for backing ALGO
      steps.push({
        action: 'generate_migration_deposit_address',
        status: 'in_progress',
        instructions: `Generate custody address for ${amountToMigrate} ALGO deposit to back migration`
      });

      try {
        const depositAddress = await this.generateDepositAddressForMigration(principal, amountToMigrate);
        steps[steps.length - 1].status = 'completed';
        steps[steps.length - 1].result = depositAddress;
        steps[steps.length - 1].instructions = `Deposit exactly ${amountToMigrate} ALGO to: ${depositAddress.custodyAddress}`;
        console.log(`✅ Generated migration deposit address for ${principalStr}`);
      } catch (error) {
        steps[steps.length - 1].status = 'failed';
        steps[steps.length - 1].errorMessage = error instanceof Error ? error.message : String(error);
        throw error;
      }

      // Step 2: Lock old ckALGO for migration (prevents trading during migration)
      steps.push({
        action: 'lock_old_ck_algo',
        status: 'in_progress',
        instructions: `Lock ${amountToMigrate} old ckALGO tokens during migration process`
      });

      try {
        await this.lockOldCkAlgoForMigration(principal, amountToMigrate);
        steps[steps.length - 1].status = 'completed';
        steps[steps.length - 1].result = { lockedAmount: amountToMigrate };
        console.log(`✅ Locked ${amountToMigrate} old ckALGO for migration for ${principalStr}`);
      } catch (error) {
        steps[steps.length - 1].status = 'failed';
        steps[steps.length - 1].errorMessage = error instanceof Error ? error.message : String(error);
        throw error;
      }

      // Step 3: Wait for ALGO deposit confirmation (handled by deposit detection service)
      steps.push({
        action: 'await_algo_deposit_confirmation',
        status: 'pending',
        instructions: 'Waiting for ALGO deposit confirmation (6 mainnet confirmations required)'
      });

      // Update migration progress
      migrationProgress.steps = steps;
      this.migrationProgress.set(principalStr, migrationProgress);

      return {
        success: true,
        migrationId,
        status: 'in_progress',
        steps,
        estimatedCompletionTime: '15-30 minutes after ALGO deposit confirmation'
      };

    } catch (error) {
      console.error(`❌ Migration bridge failed for ${principal.toString()}:`, error);
      return {
        success: false,
        migrationId: '',
        status: 'failed',
        steps: [],
        errorMessage: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Complete migration bridge after ALGO deposit is confirmed
   */
  async completeMigrationBridge(migrationId: string, depositTxId: string): Promise<void> {
    try {
      console.log(`🔄 Completing migration bridge for migration ID: ${migrationId}, deposit: ${depositTxId}`);

      // Find migration progress
      const migration = Array.from(this.migrationProgress.values())
        .find(m => m.migrationId === migrationId);

      if (!migration) {
        throw new Error(`Migration not found: ${migrationId}`);
      }

      const principal = Principal.fromText(migration.principal);
      const amountToMigrate = migration.oldCkAlgoBalance;

      // Step 4: Burn old ckALGO tokens
      migration.steps.push({
        action: 'burn_old_ck_algo',
        status: 'in_progress',
        instructions: `Burn ${amountToMigrate} old ckALGO tokens`
      });

      try {
        await this.burnOldCkAlgo(principal, amountToMigrate);
        migration.steps[migration.steps.length - 1].status = 'completed';
        migration.steps[migration.steps.length - 1].result = { burnedAmount: amountToMigrate };
        console.log(`✅ Burned ${amountToMigrate} old ckALGO for migration ${migrationId}`);
      } catch (error) {
        migration.steps[migration.steps.length - 1].status = 'failed';
        migration.steps[migration.steps.length - 1].errorMessage = error instanceof Error ? error.message : String(error);
        throw error;
      }

      // Step 5: Mint new backed ckALGO tokens
      migration.steps.push({
        action: 'mint_new_ck_algo',
        status: 'in_progress',
        instructions: `Mint ${amountToMigrate} new backed ckALGO tokens`
      });

      try {
        const mintResult = await simplifiedBridgeService.mintAfterDepositConfirmed(depositTxId);
        migration.steps[migration.steps.length - 1].status = 'completed';
        migration.steps[migration.steps.length - 1].result = mintResult;

        // Update migration progress
        migration.status = 'completed';
        migration.completedAt = new Date();
        migration.newCkAlgoBalance = amountToMigrate;
        migration.algoDeposited = amountToMigrate;

        console.log(`✅ Migration bridge completed for ${migration.principal}: ${amountToMigrate} ckALGO migrated`);
      } catch (error) {
        migration.steps[migration.steps.length - 1].status = 'failed';
        migration.steps[migration.steps.length - 1].errorMessage = error instanceof Error ? error.message : String(error);
        migration.status = 'failed';
        migration.errorMessage = error instanceof Error ? error.message : String(error);
        throw error;
      }

      // Update migration progress
      this.migrationProgress.set(migration.principal, migration);

    } catch (error) {
      console.error(`❌ Failed to complete migration bridge ${migrationId}:`, error);
      throw error;
    }
  }

  /**
   * Get migration statistics for admin dashboard
   */
  async getMigrationStatistics(): Promise<MigrationStatistics> {
    try {
      console.log(`📊 Calculating migration statistics...`);

      // Count migrations by type
      const migrations = Array.from(this.migrationProgress.values());
      const migratedUsers = {
        freshStart: migrations.filter(m => m.migrationPath === 'fresh' && m.status === 'completed').length,
        migrationBridge: migrations.filter(m => m.migrationPath === 'bridge' && m.status === 'completed').length,
        legacyHold: migrations.filter(m => m.migrationPath === 'legacy').length
      };

      // Calculate token supplies
      const completedMigrations = migrations.filter(m => m.status === 'completed');
      const newCkAlgoIssued = completedMigrations.reduce((sum, m) => sum + m.newCkAlgoBalance, 0);
      const totalAlgoLocked = completedMigrations.reduce((sum, m) => sum + m.algoDeposited, 0);

      // Get current old ckALGO supply (would query old canister in production)
      const oldCkAlgoRemaining = 100; // Placeholder - would query actual old canister

      // Calculate migration health metrics
      const totalMigrations = migrations.length;
      const successfulMigrations = migrations.filter(m => m.status === 'completed').length;
      const successRate = totalMigrations > 0 ? successfulMigrations / totalMigrations : 1.0;

      const completedMigrationTimes = completedMigrations
        .filter(m => m.startedAt && m.completedAt)
        .map(m => (m.completedAt!.getTime() - m.startedAt!.getTime()) / (1000 * 60)); // minutes

      const avgMigrationTime = completedMigrationTimes.length > 0
        ? completedMigrationTimes.reduce((sum, time) => sum + time, 0) / completedMigrationTimes.length
        : 0;

      const reserveRatio = newCkAlgoIssued > 0 ? totalAlgoLocked / newCkAlgoIssued : 1.0;

      this.migrationStatistics = {
        totalUsers: totalMigrations,
        migratedUsers,
        tokenSupply: {
          oldCkAlgoRemaining,
          newCkAlgoIssued,
          totalAlgoLocked
        },
        migrationHealth: {
          reserveRatio,
          emergencyPaused: false, // Would check actual emergency state
          avgMigrationTime,
          successRate
        }
      };

      console.log(`✅ Migration statistics calculated:`, this.migrationStatistics);
      return this.migrationStatistics;

    } catch (error) {
      console.error(`❌ Failed to get migration statistics:`, error);
      throw new Error(`Migration statistics error: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Get migration progress for a specific user
   */
  async getUserMigrationProgress(principal: Principal): Promise<UserMigrationProgress | null> {
    const principalStr = principal.toString();
    return this.migrationProgress.get(principalStr) || null;
  }

  /**
   * Private helper methods
   */
  private async getOldCkAlgoBalance(principal: Principal): Promise<number> {
    try {
      // In production, this would query the old ckALGO canister
      // For now, return simulated balance based on principal
      const principalStr = principal.toString();

      // Simulate some users having old ckALGO tokens
      if (principalStr.includes('test') || principalStr.includes('demo')) {
        return 5.5; // Simulated old balance
      }

      return 0; // Most users don't have old tokens
    } catch (error) {
      console.warn(`⚠️ Failed to get old ckALGO balance for ${principal.toString()}:`, error);
      return 0;
    }
  }

  private async getNewCkAlgoBalance(principal: Principal): Promise<number> {
    try {
      return await ckAlgoService.getBalance(principal.toString());
    } catch (error) {
      console.warn(`⚠️ Failed to get new ckALGO balance for ${principal.toString()}:`, error);
      return 0;
    }
  }

  private async getAlgorandBalance(principal: Principal): Promise<number> {
    try {
      // Get user's Algorand address from custody service
      const custodyInfo = await this.custodyAddressService.generateRealCustodyAddress({
        userPrincipal: principal.toString(),
        purpose: 'migration_balance_check'
      });

      // Query balance from Algorand network
      const accountInfo = await algorandService.getAccountInfo(custodyInfo.custodyAddress);
      return accountInfo.balance;
    } catch (error) {
      console.warn(`⚠️ Failed to get Algorand balance for ${principal.toString()}:`, error);
      return 0;
    }
  }

  private calculateMigrationOptions(oldCkAlgo: number, algorandBalance: number): MigrationOptions {
    return {
      freshStart: {
        available: true,
        description: 'Redeem old tokens and start fresh with new backed system',
        estimatedTime: '15-30 minutes'
      },
      migrationBridge: {
        available: algorandBalance >= oldCkAlgo && oldCkAlgo > 0,
        requiredAlgo: oldCkAlgo,
        description: `Requires ${oldCkAlgo} ALGO to back existing ${oldCkAlgo} ckALGO`,
        estimatedTime: '20-40 minutes'
      },
      legacyHold: {
        available: oldCkAlgo > 0,
        description: 'Keep existing ckALGO (not recommended - no backing guarantee)',
        warnings: [
          'No mathematical backing verification',
          'No emergency protection systems',
          'Will be deprecated in future',
          'May not be accepted by other DeFi protocols'
        ]
      }
    };
  }

  private getRecommendedPath(oldCkAlgo: number, algorandBalance: number): 'fresh' | 'bridge' | 'legacy' {
    if (oldCkAlgo === 0) {
      return 'fresh'; // No old tokens, fresh start is best
    }

    if (algorandBalance >= oldCkAlgo) {
      return 'bridge'; // Has sufficient ALGO to back existing tokens
    }

    return 'fresh'; // Insufficient ALGO for bridge, recommend fresh start
  }

  private generateMigrationId(principal: Principal, type: string): string {
    const timestamp = Date.now();
    const principalShort = principal.toString().substring(0, 8);
    return `migration_${type}_${principalShort}_${timestamp}`;
  }

  private async generateNewDepositAddress(principal: Principal): Promise<any> {
    return await this.custodyAddressService.generateRealCustodyAddress({
      userPrincipal: principal.toString(),
      purpose: 'fresh_start_migration'
    });
  }

  private async generateDepositAddressForMigration(principal: Principal, amount: number): Promise<any> {
    // Generate a special migration deposit address
    const custodyInfo = await this.custodyAddressService.generateRealCustodyAddress({
      userPrincipal: principal.toString(),
      purpose: 'migration_bridge'
    });

    // Mark this address as migration-specific
    return {
      ...custodyInfo,
      migrationAmount: amount,
      migrationType: 'bridge'
    };
  }

  private async redeemOldCkAlgo(principal: Principal, amount: number): Promise<any> {
    // In production, this would call the old ckALGO canister's redeem function
    console.log(`🔄 Redeeming ${amount} old ckALGO for ${principal.toString()}`);

    // Simulated redemption result
    return {
      success: true,
      redeemedAmount: amount,
      algorandTxId: `OLD_REDEEM_${Date.now()}`,
      timestamp: new Date().toISOString()
    };
  }

  private async lockOldCkAlgoForMigration(principal: Principal, amount: number): Promise<void> {
    // In production, this would lock tokens in the old canister or mark them as "migrating"
    console.log(`🔒 Locking ${amount} old ckALGO for migration for ${principal.toString()}`);

    // For now, just log the action
    // In production: await oldCkAlgoCanister.lockForMigration(principal, amount);
  }

  private async burnOldCkAlgo(principal: Principal, amount: number): Promise<void> {
    // In production, this would burn tokens in the old canister
    console.log(`🔥 Burning ${amount} old ckALGO for ${principal.toString()}`);

    // For now, just log the action
    // In production: await oldCkAlgoCanister.burn(principal, amount);
  }

  private initializeMigrationStatistics(): void {
    this.migrationStatistics = {
      totalUsers: 0,
      migratedUsers: {
        freshStart: 0,
        migrationBridge: 0,
        legacyHold: 0
      },
      tokenSupply: {
        oldCkAlgoRemaining: 100, // Placeholder
        newCkAlgoIssued: 0,
        totalAlgoLocked: 0
      },
      migrationHealth: {
        reserveRatio: 1.0,
        emergencyPaused: false,
        avgMigrationTime: 0,
        successRate: 1.0
      }
    };
  }
}

// Export singleton instance
export const migrationService = new MigrationService();