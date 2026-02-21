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

  // Swap types (ckETH -> ckALGO)
  const SwapRecord = IDL.Record({
    'user': IDL.Principal,
    'cketh_in': IDL.Nat,
    'ckalgo_out': IDL.Nat,
    'rate_used': IDL.Float64,
    'fee_collected': IDL.Nat,
    'timestamp': IDL.Nat64,
    'tx_id': IDL.Text,
  });

  const SwapConfig = IDL.Record({
    'enabled': IDL.Bool,
    'fee_bps': IDL.Nat64,
    'min_cketh': IDL.Nat,
    'max_cketh': IDL.Nat,
    'cketh_backed_ckalgo': IDL.Nat,
    'total_cketh_received': IDL.Nat,
  });

  const SwapResult = IDL.Record({
    'cketh_in': IDL.Nat,
    'ckalgo_out': IDL.Nat,
    'rate_used': IDL.Float64,
    'cketh_block_index': IDL.Nat,
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
    // REMOVED: generate_deposit_address — use threshold_signer for real addresses
    'register_custody_address': IDL.Func([IDL.Text, IDL.Principal], [IDL.Variant({ 'Ok': IDL.Text, 'Err': IDL.Text })], []),
    'register_pending_deposit': IDL.Func([IDL.Principal, IDL.Text, IDL.Nat, IDL.Text, IDL.Nat8], [IDL.Variant({ 'Ok': IDL.Text, 'Err': IDL.Text })], []),
    'update_deposit_confirmations': IDL.Func([IDL.Text, IDL.Nat8], [IDL.Variant({ 'Ok': IDL.Text, 'Err': IDL.Text })], []),
    'mint_after_deposit_confirmed': IDL.Func([IDL.Text], [IDL.Variant({ 'Ok': IDL.Nat, 'Err': IDL.Text })], []),
    'redeem_ck_algo': IDL.Func([IDL.Nat, IDL.Text], [IDL.Variant({ 'Ok': IDL.Text, 'Err': IDL.Text })], []),
    'admin_redeem_ck_algo': IDL.Func([IDL.Principal, IDL.Nat, IDL.Text], [IDL.Variant({ 'Ok': IDL.Text, 'Err': IDL.Text })], []),
    'admin_transfer_ck_algo': IDL.Func([IDL.Principal, IDL.Principal, IDL.Nat], [IDL.Variant({ 'Ok': IDL.Nat, 'Err': IDL.Text })], []),
    'get_reserve_ratio': IDL.Func([], [ReserveStatus], ['query']),
    'get_user_deposits': IDL.Func([IDL.Principal], [IDL.Vec(DepositRecord)], ['query']),

    // Admin Functions
    'update_reserve_health': IDL.Func([IDL.Bool], [IDL.Variant({ 'Ok': IDL.Text, 'Err': IDL.Text })], []),
    'get_canister_status': IDL.Func([], [IDL.Text], ['query']),

    // Swap Functions (ckETH -> ckALGO)
    'swap_cketh_to_ckalgo': IDL.Func(
      [IDL.Principal, IDL.Nat, IDL.Opt(IDL.Nat)],
      [IDL.Variant({ 'Ok': SwapResult, 'Err': IDL.Text })],
      []
    ),
    'get_current_eth_algo_rate': IDL.Func(
      [],
      [IDL.Variant({ 'Ok': IDL.Float64, 'Err': IDL.Text })],
      []
    ),
    'set_swap_enabled': IDL.Func([IDL.Bool], [IDL.Variant({ 'Ok': IDL.Text, 'Err': IDL.Text })], []),
    'set_swap_fee_bps': IDL.Func([IDL.Nat64], [IDL.Variant({ 'Ok': IDL.Text, 'Err': IDL.Text })], []),
    'set_swap_limits': IDL.Func([IDL.Nat, IDL.Nat], [IDL.Variant({ 'Ok': IDL.Text, 'Err': IDL.Text })], []),
    'get_swap_config': IDL.Func([], [SwapConfig], ['query']),
    'get_swap_records': IDL.Func([IDL.Opt(IDL.Nat32)], [IDL.Vec(SwapRecord)], ['query']),

    // Deposit-Based Swap Functions (Autonomous Agent Flow)
    'get_swap_custody_subaccount': IDL.Func([IDL.Principal], [IDL.Vec(IDL.Nat8)], ['query']),
    'is_swap_deposit_processed': IDL.Func([IDL.Text], [IDL.Bool], ['query']),
    'get_processed_swap_deposits': IDL.Func([IDL.Opt(IDL.Nat32)], [IDL.Vec(IDL.Text)], ['query']),
    'swap_cketh_for_ckalgo_deposit': IDL.Func(
      [IDL.Principal, IDL.Nat, IDL.Text, IDL.Opt(IDL.Nat)],
      [IDL.Variant({ 'Ok': SwapResult, 'Err': IDL.Text })],
      []
    ),
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

export interface SwapConfig {
  enabled: boolean;
  fee_bps: bigint;
  min_cketh: bigint;
  max_cketh: bigint;
  cketh_backed_ckalgo: bigint;
  total_cketh_received: bigint;
}

export interface SwapResult {
  cketh_in: bigint;
  ckalgo_out: bigint;
  rate_used: number;
  cketh_block_index: bigint;
}

export interface SwapRecord {
  user: Principal;
  cketh_in: bigint;
  ckalgo_out: bigint;
  rate_used: number;
  fee_collected: bigint;
  timestamp: bigint;
  tx_id: string;
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

        // Non-retryable errors — bail immediately
        const isNonRetryable = lastError.message.includes('already processed') ||
                               lastError.message.includes('already exists') ||
                               lastError.message.includes('Minimum deposit') ||
                               lastError.message.includes('not found in pending');

        console.warn(`⚠️ ${operationName} failed on attempt ${attempt}/${this.maxRetries}:`, lastError.message);

        if (isNonRetryable || attempt === this.maxRetries) {
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

  // REMOVED: generateDepositAddress — canister no longer has this function.
  // Real custody addresses come from threshold_signer canister via icpCanisterService.
  // Use registerCustodyAddress() to register a threshold-derived address with the bridge.

  async registerCustodyAddress(custodyAddress: string, user: Principal): Promise<string> {
    return this.retryOperation(async () => {
      const result = await this.actor.register_custody_address(custodyAddress, user);
      if ('Ok' in result) {
        console.log(`✅ Registered custody address ${custodyAddress} for ${user.toString()}`);
        return result.Ok;
      } else {
        throw new Error(`Register custody address failed: ${result.Err}`);
      }
    }, `registerCustodyAddress(${custodyAddress}, ${user.toString()})`);
  }

  async registerPendingDeposit(
    userPrincipal: Principal,
    txId: string,
    amount: bigint,
    custodyAddress: string,
    requiredConfirmations: number
  ): Promise<string> {
    return this.retryOperation(async () => {
      const result = await this.actor.register_pending_deposit(
        userPrincipal,
        txId,
        amount,
        custodyAddress,
        requiredConfirmations
      );
      if ('Ok' in result) {
        console.log(`✅ Registered pending deposit in canister: ${result.Ok}`);
        return result.Ok;
      } else {
        throw new Error(`Register pending deposit failed: ${result.Err}`);
      }
    }, `registerPendingDeposit(${txId} for ${userPrincipal.toString()})`);
  }

  /**
   * TEMPORARY ARCHITECTURE: Update deposit confirmations
   * Phase 2 will replace with canister-side HTTP outcalls
   */
  async updateDepositConfirmations(
    txId: string,
    confirmations: number
  ): Promise<string> {
    return this.retryOperation(async () => {
      const result = await this.actor.update_deposit_confirmations(
        txId,
        confirmations
      );
      if ('Ok' in result) {
        console.log(`✅ Updated deposit ${txId} confirmations: ${result.Ok}`);
        return result.Ok;
      } else {
        throw new Error(`Update confirmations failed: ${result.Err}`);
      }
    }, `updateDepositConfirmations(${txId}, ${confirmations})`);
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

  /**
   * Admin function: redeem ckALGO on behalf of a user
   * Used by backend to process redemption requests (burns user's tokens)
   */
  async adminRedeemCkAlgo(user: Principal, amount: bigint, destination: string): Promise<string> {
    return this.retryOperation(async () => {
      const result = await this.actor.admin_redeem_ck_algo(user, amount, destination);
      if ('Ok' in result) {
        console.log(`✅ Admin redeemed ${amount} ckALGO from ${user.toString()} to ${destination}`);
        return result.Ok;
      } else {
        throw new Error(`Admin redeem failed: ${result.Err}`);
      }
    }, `adminRedeemCkAlgo(${user.toString()}, ${amount}, ${destination})`);
  }

  /**
   * Admin function: transfer ckALGO from one principal to another
   * Used by X402 payment system to move tokens from payer to treasury
   */
  async adminTransferCkAlgo(from: Principal, to: Principal, amount: bigint): Promise<bigint> {
    return this.retryOperation(async () => {
      const result = await this.actor.admin_transfer_ck_algo(from, to, amount);
      if ('Ok' in result) {
        console.log(`✅ Transfer ${amount} ckALGO: ${from.toString()} → ${to.toString()}`);
        return BigInt(result.Ok.toString());
      } else {
        throw new Error(`Admin transfer failed: ${result.Err}`);
      }
    }, `adminTransferCkAlgo(${from.toString()}, ${to.toString()}, ${amount})`);
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
  // Swap Functions (ckETH -> ckALGO)
  // ============================================================================

  /**
   * Get swap configuration
   */
  async getSwapConfig(): Promise<SwapConfig> {
    return this.retryOperation(async () => {
      const result = await this.actor.get_swap_config();
      return {
        enabled: Boolean(result.enabled),
        fee_bps: BigInt(result.fee_bps.toString()),
        min_cketh: BigInt(result.min_cketh.toString()),
        max_cketh: BigInt(result.max_cketh.toString()),
        cketh_backed_ckalgo: BigInt(result.cketh_backed_ckalgo.toString()),
        total_cketh_received: BigInt(result.total_cketh_received.toString()),
      };
    }, 'getSwapConfig');
  }

  /**
   * Get current ETH/ALGO exchange rate from XRC
   */
  async getCurrentEthAlgoRate(): Promise<number> {
    return this.retryOperation(async () => {
      const result = await this.actor.get_current_eth_algo_rate();
      if ('Ok' in result) {
        return Number(result.Ok);
      } else {
        throw new Error(`Failed to get exchange rate: ${result.Err}`);
      }
    }, 'getCurrentEthAlgoRate');
  }

  /**
   * Get swap history records
   */
  async getSwapRecords(limit?: number): Promise<SwapRecord[]> {
    return this.retryOperation(async () => {
      const limitOpt = limit !== undefined ? [limit] : [];
      const result = await this.actor.get_swap_records(limitOpt);
      return result.map((r: any) => ({
        user: r.user,
        cketh_in: BigInt(r.cketh_in.toString()),
        ckalgo_out: BigInt(r.ckalgo_out.toString()),
        rate_used: Number(r.rate_used),
        fee_collected: BigInt(r.fee_collected.toString()),
        timestamp: BigInt(r.timestamp.toString()),
        tx_id: r.tx_id,
      }));
    }, `getSwapRecords(${limit})`);
  }

  // ============================================================================
  // Deposit-Based Swap Functions (Autonomous Agent Flow)
  // ============================================================================

  /**
   * Get custody subaccount for ckETH deposits
   * Returns 32-byte subaccount that agent should deposit to
   */
  async getSwapCustodySubaccount(principal: Principal): Promise<Uint8Array> {
    return this.retryOperation(async () => {
      const result = await this.actor.get_swap_custody_subaccount(principal);
      return new Uint8Array(result);
    }, `getSwapCustodySubaccount(${principal.toString()})`);
  }

  /**
   * Check if a swap deposit tx_id was already processed
   */
  async isSwapDepositProcessed(txId: string): Promise<boolean> {
    return this.retryOperation(async () => {
      return await this.actor.is_swap_deposit_processed(txId);
    }, `isSwapDepositProcessed(${txId})`);
  }

  /**
   * Get list of processed swap deposit tx_ids
   */
  async getProcessedSwapDeposits(limit?: number): Promise<string[]> {
    return this.retryOperation(async () => {
      const limitOpt = limit !== undefined ? [limit] : [];
      return await this.actor.get_processed_swap_deposits(limitOpt);
    }, `getProcessedSwapDeposits(${limit})`);
  }

  /**
   * Execute ckETH to ckALGO swap (deposit-based, autonomous agent flow)
   * Backend calls this AFTER verifying ckETH deposit in custody
   *
   * @param agentPrincipal - Principal to receive ckALGO
   * @param ckethAmount - Amount of ckETH deposited (in wei)
   * @param ckethTxId - ICRC-1 block index from ckETH transfer
   * @param minCkalgoOut - Optional slippage protection
   */
  async swapCkethForCkalgoDeposit(
    agentPrincipal: Principal,
    ckethAmount: bigint,
    ckethTxId: string,
    minCkalgoOut?: bigint
  ): Promise<SwapResult> {
    return this.retryOperation(async () => {
      const minOutOpt = minCkalgoOut !== undefined ? [minCkalgoOut] : [];
      const result = await this.actor.swap_cketh_for_ckalgo_deposit(
        agentPrincipal,
        ckethAmount,
        ckethTxId,
        minOutOpt
      );
      if ('Ok' in result) {
        const swap = result.Ok;
        console.log(`✅ Deposit swap: ${swap.cketh_in} ckETH → ${swap.ckalgo_out} ckALGO @ ${swap.rate_used}`);
        return {
          cketh_in: BigInt(swap.cketh_in.toString()),
          ckalgo_out: BigInt(swap.ckalgo_out.toString()),
          rate_used: Number(swap.rate_used),
          cketh_block_index: BigInt(swap.cketh_block_index.toString()),
        };
      } else {
        throw new Error(`Deposit swap failed: ${result.Err}`);
      }
    }, `swapCkethForCkalgoDeposit(${agentPrincipal.toString()}, ${ckethAmount}, ${ckethTxId})`);
  }

  // ============================================================================
  // Swap Admin Functions
  // ============================================================================

  async setSwapEnabled(enabled: boolean): Promise<string> {
    return this.retryOperation(async () => {
      const result = await this.actor.set_swap_enabled(enabled);
      if ('Ok' in result) {
        return result.Ok;
      }
      throw new Error(`Set swap enabled failed: ${result.Err}`);
    }, `setSwapEnabled(${enabled})`);
  }

  async setSwapFeeBps(feeBps: bigint): Promise<string> {
    return this.retryOperation(async () => {
      const result = await this.actor.set_swap_fee_bps(feeBps);
      if ('Ok' in result) {
        return result.Ok;
      }
      throw new Error(`Set swap fee failed: ${result.Err}`);
    }, `setSwapFeeBps(${feeBps})`);
  }

  async setSwapLimits(minCketh: bigint, maxCketh: bigint): Promise<string> {
    return this.retryOperation(async () => {
      const result = await this.actor.set_swap_limits(minCketh, maxCketh);
      if ('Ok' in result) {
        return result.Ok;
      }
      throw new Error(`Set swap limits failed: ${result.Err}`);
    }, `setSwapLimits(${minCketh}, ${maxCketh})`);
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