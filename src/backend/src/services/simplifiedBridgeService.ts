/**
 * Simplified Bridge Service - Sprint X Architecture Fix
 * Connects backend to deployed simplified bridge canister with proper error handling
 * Phase A.1: Backend-Canister Integration Implementation
 */

import { HttpAgent, Actor } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';

// Simplified Bridge IDL matching the deployed canister
const simplifiedBridgeIdl = ({ IDL }: any) => {
  const ReserveStatus = IDL.Record({
    'locked_algo_reserves': IDL.Nat,
    'total_ck_algo_supply': IDL.Nat,
    'reserve_ratio': IDL.Float64,
    'is_healthy': IDL.Bool,
    'last_verification': IDL.Nat64,
  });

  const DepositRecord = IDL.Record({
    'deposit_id': IDL.Text,
    'user': IDL.Principal,
    'custody_address': IDL.Text,
    'amount': IDL.Nat,
    'algorand_tx_id': IDL.Text,
    'confirmed_at': IDL.Nat64,
    'minted_ck_algo': IDL.Nat,
  });

  return IDL.Service({
    // ICRC-1 Standard Methods
    'icrc1_name': IDL.Func([], [IDL.Text], ['query']),
    'icrc1_symbol': IDL.Func([], [IDL.Text], ['query']),
    'icrc1_decimals': IDL.Func([], [IDL.Nat8], ['query']),
    'icrc1_total_supply': IDL.Func([], [IDL.Nat], ['query']),
    'icrc1_balance_of': IDL.Func([IDL.Principal], [IDL.Nat], ['query']),
    'icrc1_fee': IDL.Func([], [IDL.Nat], ['query']),
    'icrc1_transfer': IDL.Func([IDL.Principal, IDL.Nat], [IDL.Variant({ 'Ok': IDL.Nat, 'Err': IDL.Text })], []),
    'icrc1_supported_standards': IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text))], ['query']),

    // Bridge Core Functions
    'generate_deposit_address': IDL.Func([IDL.Principal], [IDL.Variant({ 'Ok': IDL.Text, 'Err': IDL.Text })], []),
    'mint_after_deposit_confirmed': IDL.Func([IDL.Text], [IDL.Variant({ 'Ok': IDL.Nat, 'Err': IDL.Text })], []),
    'redeem_ck_algo': IDL.Func([IDL.Nat, IDL.Text], [IDL.Variant({ 'Ok': IDL.Text, 'Err': IDL.Text })], []),
    'get_reserve_ratio': IDL.Func([], [ReserveStatus], ['query']),
    'get_user_deposits': IDL.Func([IDL.Principal], [IDL.Vec(DepositRecord)], ['query']),

    // Admin Functions
    'update_reserve_health': IDL.Func([IDL.Bool], [IDL.Variant({ 'Ok': IDL.Text, 'Err': IDL.Text })], []),
    'get_canister_status': IDL.Func([], [IDL.Text], ['query']),
  });
};

export interface ReserveStatus {
  locked_algo_reserves: bigint;
  total_ck_algo_supply: bigint;
  reserve_ratio: number;
  is_healthy: boolean;
  last_verification: bigint;
}

export interface DepositRecord {
  deposit_id: string;
  user: Principal;
  custody_address: string;
  amount: bigint;
  algorand_tx_id: string;
  confirmed_at: bigint;
  minted_ck_algo: bigint;
}

export class SimplifiedBridgeService {
  private agent!: HttpAgent; // Definite assignment assertion since initialized in constructor
  private actor: any;
  private canisterId: string;
  private maxRetries: number = 5;
  private baseTimeout: number = 10000; // 10 seconds

  constructor() {
    // NEW simplified bridge canister ID from Sprint X
    this.canisterId = 'hldvt-2yaaa-aaaak-qulxa-cai';

    console.log(`🔗 Initializing SimplifiedBridgeService with canister: ${this.canisterId}`);
    this.initializeAgent();
  }

  private initializeAgent(): void {
    try {
      // Create HTTP agent for mainnet with proper configuration
      this.agent = new HttpAgent({
        host: 'https://ic0.app',
        verifyQuerySignatures: false // Required for anonymous calls in production
      });

      // Fetch root key for certificate validation (required for mainnet)
      this.agent.fetchRootKey().catch(err => {
        console.warn('⚠️ Failed to fetch root key (normal in production):', err.message);
      });

      // Create actor using the simplified bridge canister ID and IDL
      this.actor = Actor.createActor(simplifiedBridgeIdl, {
        agent: this.agent,
        canisterId: this.canisterId
      });

      console.log('✅ SimplifiedBridgeService initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize SimplifiedBridgeService:', error);
      throw new Error(`SimplifiedBridgeService initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retry wrapper with exponential backoff for canister operations
   */
  private async retryOperation<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`🔄 ${operationName} - attempt ${attempt}/${this.maxRetries}`);

        // Add timeout to the operation
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Operation timeout')), this.baseTimeout)
        );

        const result = await Promise.race([operation(), timeoutPromise]);

        if (attempt > 1) {
          console.log(`✅ ${operationName} succeeded on attempt ${attempt} (recovery)`);
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(`Unknown error: ${error}`);

        const isNetworkError = lastError.message.includes('Couldn\'t send message') ||
                              lastError.message.includes('Code: 2') ||
                              lastError.message.includes('network') ||
                              lastError.message.includes('timeout') ||
                              lastError.message.includes('fetch');

        console.warn(`⚠️ ${operationName} failed on attempt ${attempt}/${this.maxRetries}:`, lastError.message);

        if (attempt === this.maxRetries) {
          break;
        }

        // Exponential backoff with jitter
        const baseDelay = isNetworkError ? 2000 : 1000;
        const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
        const jitter = Math.random() * 1000; // Add randomness to avoid thundering herd
        const delay = Math.min(exponentialDelay + jitter, 10000); // Cap at 10 seconds

        console.log(`⏳ Retrying ${operationName} in ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error(`${operationName} failed after ${this.maxRetries} attempts: ${lastError?.message}`);
  }

  // ============================================================================
  // ICRC-1 Standard Methods
  // ============================================================================

  async getTokenName(): Promise<string> {
    return this.retryOperation(async () => {
      const result = await this.actor.icrc1_name();
      return result;
    }, 'getTokenName');
  }

  async getTokenSymbol(): Promise<string> {
    return this.retryOperation(async () => {
      const result = await this.actor.icrc1_symbol();
      return result;
    }, 'getTokenSymbol');
  }

  async getDecimals(): Promise<number> {
    return this.retryOperation(async () => {
      const result = await this.actor.icrc1_decimals();
      return Number(result);
    }, 'getDecimals');
  }

  async getTotalSupply(): Promise<bigint> {
    return this.retryOperation(async () => {
      const result = await this.actor.icrc1_total_supply();
      return BigInt(result.toString());
    }, 'getTotalSupply');
  }

  async getBalance(principal: Principal): Promise<bigint> {
    return this.retryOperation(async () => {
      const result = await this.actor.icrc1_balance_of(principal);
      return BigInt(result.toString());
    }, `getBalance(${principal.toString()})`);
  }

  async getFee(): Promise<bigint> {
    return this.retryOperation(async () => {
      const result = await this.actor.icrc1_fee();
      return BigInt(result.toString());
    }, 'getFee');
  }

  async transfer(to: Principal, amount: bigint): Promise<bigint> {
    return this.retryOperation(async () => {
      const result = await this.actor.icrc1_transfer(to, amount);
      if ('Ok' in result) {
        return BigInt(result.Ok.toString());
      } else {
        throw new Error(`Transfer failed: ${result.Err}`);
      }
    }, `transfer(${amount} to ${to.toString()})`);
  }

  // ============================================================================
  // Bridge Core Functions
  // ============================================================================

  async generateDepositAddress(user: Principal): Promise<string> {
    return this.retryOperation(async () => {
      const result = await this.actor.generate_deposit_address(user);
      if ('Ok' in result) {
        return result.Ok;
      } else {
        throw new Error(`Generate deposit address failed: ${result.Err}`);
      }
    }, `generateDepositAddress(${user.toString()})`);
  }

  async mintAfterDepositConfirmed(depositTxId: string): Promise<bigint> {
    return this.retryOperation(async () => {
      const result = await this.actor.mint_after_deposit_confirmed(depositTxId);
      if ('Ok' in result) {
        return BigInt(result.Ok.toString());
      } else {
        throw new Error(`Mint failed: ${result.Err}`);
      }
    }, `mintAfterDepositConfirmed(${depositTxId})`);
  }

  async redeemCkAlgo(amount: bigint, destination: string): Promise<string> {
    return this.retryOperation(async () => {
      const result = await this.actor.redeem_ck_algo(amount, destination);
      if ('Ok' in result) {
        return result.Ok;
      } else {
        throw new Error(`Redeem failed: ${result.Err}`);
      }
    }, `redeemCkAlgo(${amount} to ${destination})`);
  }

  async getReserveStatus(): Promise<ReserveStatus> {
    return this.retryOperation(async () => {
      const result = await this.actor.get_reserve_ratio();
      return {
        locked_algo_reserves: BigInt(result.locked_algo_reserves.toString()),
        total_ck_algo_supply: BigInt(result.total_ck_algo_supply.toString()),
        reserve_ratio: Number(result.reserve_ratio),
        is_healthy: Boolean(result.is_healthy),
        last_verification: BigInt(result.last_verification.toString())
      };
    }, 'getReserveStatus');
  }

  async getUserDeposits(user: Principal): Promise<DepositRecord[]> {
    return this.retryOperation(async () => {
      const result = await this.actor.get_user_deposits(user);
      return result.map((deposit: any) => ({
        deposit_id: deposit.deposit_id,
        user: deposit.user,
        custody_address: deposit.custody_address,
        amount: BigInt(deposit.amount.toString()),
        algorand_tx_id: deposit.algorand_tx_id,
        confirmed_at: BigInt(deposit.confirmed_at.toString()),
        minted_ck_algo: BigInt(deposit.minted_ck_algo.toString())
      }));
    }, `getUserDeposits(${user.toString()})`);
  }

  async getCanisterStatus(): Promise<string> {
    return this.retryOperation(async () => {
      const result = await this.actor.get_canister_status();
      return result;
    }, 'getCanisterStatus');
  }

  // ============================================================================
  // Health Check Methods
  // ============================================================================

  async healthCheck(): Promise<{
    canisterId: string;
    connected: boolean;
    tokenInfo: { name: string; symbol: string; decimals: number } | null;
    totalSupply: string | null;
    reserveStatus: ReserveStatus | null;
    error: string | null;
  }> {
    try {
      const [tokenName, tokenSymbol, decimals, totalSupply, reserveStatus] = await Promise.all([
        this.getTokenName().catch(e => null),
        this.getTokenSymbol().catch(e => null),
        this.getDecimals().catch(e => null),
        this.getTotalSupply().catch(e => null),
        this.getReserveStatus().catch(e => null)
      ]);

      const connected = tokenName !== null && tokenSymbol !== null;

      return {
        canisterId: this.canisterId,
        connected,
        tokenInfo: connected ? {
          name: tokenName!,
          symbol: tokenSymbol!,
          decimals: decimals!
        } : null,
        totalSupply: totalSupply?.toString() || null,
        reserveStatus,
        error: null
      };
    } catch (error) {
      return {
        canisterId: this.canisterId,
        connected: false,
        tokenInfo: null,
        totalSupply: null,
        reserveStatus: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const simplifiedBridgeService = new SimplifiedBridgeService();