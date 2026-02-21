/**
 * ckETH Deposit Service - Deposit-Based Swap for Autonomous Agents
 *
 * Enables fully autonomous ckETH to ckALGO swaps:
 * 1. Agent transfers ckETH to their custody subaccount
 * 2. Agent calls POST /swap/execute with tx_id (block index)
 * 3. Service verifies the ACTUAL transaction on-chain, triggers swap
 *
 * Security: Verifies tx_id corresponds to real ckETH transfer to custody
 * No TOCTOU: Uses immutable transaction data, not mutable balance
 *
 * Created: 2026-02-21
 * Updated: 2026-02-21 - Added ICRC-3 transaction verification (P0/P1 fixes)
 */

import { HttpAgent, Actor } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { simplifiedBridgeService, SwapResult, SwapConfig } from './simplifiedBridgeService.js';

// Canister IDs
const CKETH_CANISTER_ID = 'ss2fx-dyaaa-aaaar-qacoq-cai';
const SIMPLIFIED_BRIDGE_CANISTER_ID = 'hldvt-2yaaa-aaaak-qulxa-cai';

// ICRC-1 + ICRC-3 IDL for ckETH queries and transaction verification
const ckethIdl = ({ IDL }: any) => {
  const Account = IDL.Record({
    'owner': IDL.Principal,
    'subaccount': IDL.Opt(IDL.Vec(IDL.Nat8)),
  });

  // ICRC-3 Transaction types
  const Value = IDL.Rec();
  Value.fill(IDL.Variant({
    'Int': IDL.Int,
    'Map': IDL.Vec(IDL.Tuple(IDL.Text, Value)),
    'Nat': IDL.Nat,
    'Blob': IDL.Vec(IDL.Nat8),
    'Text': IDL.Text,
    'Array': IDL.Vec(Value),
  }));

  const GetTransactionsRequest = IDL.Record({
    'start': IDL.Nat,
    'length': IDL.Nat,
  });

  const Transaction = IDL.Record({
    'kind': IDL.Text,
    'mint': IDL.Opt(IDL.Record({
      'to': Account,
      'memo': IDL.Opt(IDL.Vec(IDL.Nat8)),
      'created_at_time': IDL.Opt(IDL.Nat64),
      'amount': IDL.Nat,
    })),
    'burn': IDL.Opt(IDL.Record({
      'from': Account,
      'memo': IDL.Opt(IDL.Vec(IDL.Nat8)),
      'created_at_time': IDL.Opt(IDL.Nat64),
      'amount': IDL.Nat,
      'spender': IDL.Opt(Account),
    })),
    'transfer': IDL.Opt(IDL.Record({
      'to': Account,
      'fee': IDL.Opt(IDL.Nat),
      'from': Account,
      'memo': IDL.Opt(IDL.Vec(IDL.Nat8)),
      'created_at_time': IDL.Opt(IDL.Nat64),
      'amount': IDL.Nat,
      'spender': IDL.Opt(Account),
    })),
    'approve': IDL.Opt(IDL.Record({
      'fee': IDL.Opt(IDL.Nat),
      'from': Account,
      'memo': IDL.Opt(IDL.Vec(IDL.Nat8)),
      'created_at_time': IDL.Opt(IDL.Nat64),
      'amount': IDL.Nat,
      'expected_allowance': IDL.Opt(IDL.Nat),
      'expires_at': IDL.Opt(IDL.Nat64),
      'spender': Account,
    })),
    'timestamp': IDL.Nat64,
  });

  const ArchivedRange = IDL.Record({
    'callback': IDL.Func([GetTransactionsRequest], [IDL.Record({ 'transactions': IDL.Vec(Transaction) })], ['query']),
    'start': IDL.Nat,
    'length': IDL.Nat,
  });

  const GetTransactionsResponse = IDL.Record({
    'first_index': IDL.Nat,
    'log_length': IDL.Nat,
    'transactions': IDL.Vec(Transaction),
    'archived_transactions': IDL.Vec(ArchivedRange),
  });

  return IDL.Service({
    'icrc1_balance_of': IDL.Func([Account], [IDL.Nat], ['query']),
    'get_transactions': IDL.Func([GetTransactionsRequest], [GetTransactionsResponse], ['query']),
  });
};

// Transaction verification result
interface TransactionVerification {
  verified: boolean;
  error?: string;
  amount?: bigint;
  from?: { owner: string; subaccount?: number[] };
  to?: { owner: string; subaccount?: number[] };
  timestamp?: bigint;
}

// Deposit tracking
interface PendingSwapDeposit {
  agentPrincipal: string;
  ckethTxId: string;
  amount: bigint;
  detectedAt: number;
  status: 'pending' | 'verified' | 'swapped' | 'failed';
  error?: string;
}

interface CustodyBalance {
  principal: string;
  subaccount: Uint8Array;
  balance: bigint;
  lastUpdated: number;
}

interface SwapDepositResult {
  success: boolean;
  swapResult?: SwapResult;
  error?: string;
  custodyInfo?: {
    owner: string;
    subaccount: string;
    instructions: string;
  };
}

class CkethDepositService {
  private agent: HttpAgent;
  private ckethActor: any;

  // Track processed deposits locally (canister is source of truth for anti-replay)
  private localDepositCache: Map<string, PendingSwapDeposit> = new Map();

  // Cache subaccount queries from canister (P1 fix: use canister as source of truth)
  private subaccountCache: Map<string, Uint8Array> = new Map();

  constructor() {
    this.agent = new HttpAgent({
      host: 'https://ic0.app',
      verifyQuerySignatures: false
    });

    // Fetch root key - log warning on failure for debugging
    this.agent.fetchRootKey().catch((err) => {
      console.warn('Failed to fetch root key (expected on mainnet):', err?.message || err);
    });

    this.ckethActor = Actor.createActor(ckethIdl, {
      agent: this.agent,
      canisterId: CKETH_CANISTER_ID
    });

    console.log('CkethDepositService initialized with ICRC-3 transaction verification');
  }

  /**
   * Get custody subaccount from canister (P1 fix: single source of truth)
   * Caches result to avoid repeated canister calls
   */
  async getCustodySubaccount(agentPrincipal: string): Promise<Uint8Array> {
    // Check cache first
    const cached = this.subaccountCache.get(agentPrincipal);
    if (cached) {
      return cached;
    }

    // Query canister for authoritative subaccount
    const subaccountBytes = await simplifiedBridgeService.getSwapCustodySubaccount(
      Principal.fromText(agentPrincipal)
    );

    const subaccount = new Uint8Array(subaccountBytes);
    this.subaccountCache.set(agentPrincipal, subaccount);

    return subaccount;
  }

  /**
   * Get agent's custody account info for ckETH deposits
   * Uses canister query for subaccount derivation (P1 fix)
   */
  async getCustodyAccountInfo(agentPrincipal: string): Promise<{
    owner: string;
    subaccount: string;
    subaccountBytes: Uint8Array;
    instructions: string;
  }> {
    const subaccount = await this.getCustodySubaccount(agentPrincipal);
    const subaccountHex = Buffer.from(subaccount).toString('hex');

    return {
      owner: SIMPLIFIED_BRIDGE_CANISTER_ID,
      subaccount: subaccountHex,
      subaccountBytes: subaccount,
      instructions: `Transfer ckETH to Account { owner: "${SIMPLIFIED_BRIDGE_CANISTER_ID}", subaccount: Some([${Array.from(subaccount).join(', ')}]) }. Then call POST /swap/execute with your principal and the transaction block index.`
    };
  }

  /**
   * Verify ckETH transaction on-chain (P0/P1 fix: eliminates TOCTOU)
   * Queries the actual transaction at block index to verify:
   * 1. Transaction exists
   * 2. It's a transfer (not mint/burn/approve)
   * 3. Recipient is the correct custody subaccount
   * 4. Returns the actual transfer amount (not user-provided)
   */
  async verifyTransaction(
    agentPrincipal: string,
    blockIndex: bigint
  ): Promise<TransactionVerification> {
    try {
      // Get expected custody subaccount from canister
      const expectedSubaccount = await this.getCustodySubaccount(agentPrincipal);

      // Query ckETH canister for the transaction at this block index
      const response = await this.ckethActor.get_transactions({
        start: blockIndex,
        length: BigInt(1)
      });

      // Check if transaction exists in response
      if (!response.transactions || response.transactions.length === 0) {
        // Transaction might be in archive
        if (response.archived_transactions && response.archived_transactions.length > 0) {
          return {
            verified: false,
            error: `Transaction ${blockIndex} is archived. Please use a more recent transaction.`
          };
        }
        return {
          verified: false,
          error: `Transaction ${blockIndex} not found on ckETH canister`
        };
      }

      const tx = response.transactions[0];

      // Verify it's a transfer (not mint, burn, or approve)
      if (tx.kind !== 'transfer' || !tx.transfer || tx.transfer.length === 0) {
        return {
          verified: false,
          error: `Transaction ${blockIndex} is not a transfer (kind: ${tx.kind})`
        };
      }

      const transfer = tx.transfer[0];

      // Verify recipient is the bridge canister
      const toOwner = transfer.to.owner.toString();
      if (toOwner !== SIMPLIFIED_BRIDGE_CANISTER_ID) {
        return {
          verified: false,
          error: `Transaction ${blockIndex} recipient is ${toOwner}, expected ${SIMPLIFIED_BRIDGE_CANISTER_ID}`
        };
      }

      // Verify recipient subaccount matches agent's custody subaccount
      const toSubaccount = transfer.to.subaccount && transfer.to.subaccount.length > 0
        ? transfer.to.subaccount[0]
        : null;

      if (!toSubaccount) {
        return {
          verified: false,
          error: `Transaction ${blockIndex} has no subaccount (must transfer to custody subaccount)`
        };
      }

      // Compare subaccounts byte by byte
      const toSubaccountArray = Array.isArray(toSubaccount) ? toSubaccount : Array.from(toSubaccount);
      const expectedArray = Array.from(expectedSubaccount);

      if (toSubaccountArray.length !== expectedArray.length) {
        return {
          verified: false,
          error: `Subaccount length mismatch: got ${toSubaccountArray.length}, expected ${expectedArray.length}`
        };
      }

      for (let i = 0; i < expectedArray.length; i++) {
        if (toSubaccountArray[i] !== expectedArray[i]) {
          return {
            verified: false,
            error: `Transaction ${blockIndex} sent to wrong subaccount (byte ${i}: got ${toSubaccountArray[i]}, expected ${expectedArray[i]})`
          };
        }
      }

      // Extract actual amount from transaction (not user-provided!)
      const actualAmount = BigInt(transfer.amount.toString());

      console.log(`✅ Transaction ${blockIndex} verified: ${actualAmount} ckETH to custody for ${agentPrincipal}`);

      return {
        verified: true,
        amount: actualAmount,
        from: {
          owner: transfer.from.owner.toString(),
          subaccount: transfer.from.subaccount?.[0] ? Array.from(transfer.from.subaccount[0]) : undefined
        },
        to: {
          owner: toOwner,
          subaccount: toSubaccountArray
        },
        timestamp: BigInt(tx.timestamp.toString())
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`Transaction verification failed for block ${blockIndex}:`, errorMsg);
      return {
        verified: false,
        error: `Failed to verify transaction: ${errorMsg}`
      };
    }
  }

  /**
   * Get agent's custody balance on ckETH canister
   */
  async getCustodyBalance(agentPrincipal: string): Promise<CustodyBalance> {
    const subaccount = await this.getCustodySubaccount(agentPrincipal);

    const balance = await this.ckethActor.icrc1_balance_of({
      owner: Principal.fromText(SIMPLIFIED_BRIDGE_CANISTER_ID),
      subaccount: [Array.from(subaccount)]
    });

    const balanceBigInt = BigInt(balance.toString());

    return {
      principal: agentPrincipal,
      subaccount,
      balance: balanceBigInt,
      lastUpdated: Date.now()
    };
  }

  /**
   * Verify ckETH deposit from agent (P0/P1 fix: transaction-based verification)
   *
   * SECURITY: This method verifies the ACTUAL on-chain transaction, not just balance.
   * This eliminates TOCTOU race conditions and prevents amount manipulation.
   *
   * Checks:
   * 1. tx_id not already processed on canister (anti-replay)
   * 2. Transaction exists on ckETH canister
   * 3. Transaction is a transfer to the correct custody subaccount
   * 4. Returns the ACTUAL transfer amount from the transaction
   */
  async verifyDeposit(
    agentPrincipal: string,
    ckethTxId: string,
    _claimedAmount: bigint  // Ignored! We use on-chain amount instead
  ): Promise<{
    verified: boolean;
    error?: string;
    actualAmount?: bigint;  // Changed from actualBalance to actualAmount
    transactionDetails?: TransactionVerification;
  }> {
    // 1. Check if already processed on canister (source of truth)
    const alreadyProcessed = await simplifiedBridgeService.isSwapDepositProcessed(ckethTxId);
    if (alreadyProcessed) {
      return { verified: false, error: `Deposit ${ckethTxId} already processed` };
    }

    // 2. Parse tx_id as block index
    let blockIndex: bigint;
    try {
      blockIndex = BigInt(ckethTxId);
    } catch {
      return { verified: false, error: `Invalid tx_id format: ${ckethTxId}. Expected block index (number).` };
    }

    // 3. Verify the actual on-chain transaction (P0/P1 fix)
    const txVerification = await this.verifyTransaction(agentPrincipal, blockIndex);

    if (!txVerification.verified) {
      return {
        verified: false,
        error: txVerification.error,
        transactionDetails: txVerification
      };
    }

    // 4. Return verified with ACTUAL amount from transaction
    return {
      verified: true,
      actualAmount: txVerification.amount,
      transactionDetails: txVerification
    };
  }

  /**
   * Execute swap after verifying deposit (P0/P1 fix: uses on-chain amount)
   *
   * SECURITY: The ckethAmount parameter is IGNORED for the actual swap.
   * We use the verified on-chain transaction amount instead to prevent manipulation.
   * The ckethAmount parameter is only kept for backwards compatibility logging.
   */
  async executeDepositSwap(
    agentPrincipal: string,
    _ckethAmount: bigint,  // IGNORED! We use verified on-chain amount
    ckethTxId: string,
    minCkalgoOut?: bigint
  ): Promise<SwapDepositResult> {
    const startTime = Date.now();

    // Input validation
    if (!agentPrincipal || agentPrincipal.trim() === '') {
      return { success: false, error: 'Agent principal is required' };
    }
    if (!ckethTxId || ckethTxId.trim() === '') {
      return { success: false, error: 'Transaction ID is required' };
    }

    try {
      // 1. Verify the deposit ON-CHAIN (P0/P1 fix)
      // This returns the ACTUAL amount from the blockchain, not user-provided
      const verification = await this.verifyDeposit(agentPrincipal, ckethTxId, 0n);

      if (!verification.verified || !verification.actualAmount) {
        const custodyInfo = await this.getCustodyAccountInfo(agentPrincipal);
        return {
          success: false,
          error: verification.error || 'Verification failed',
          custodyInfo
        };
      }

      // Use the VERIFIED on-chain amount, not user-provided
      const verifiedAmount = verification.actualAmount;

      console.log(`🔐 Using verified on-chain amount: ${verifiedAmount} ckETH (tx: ${ckethTxId})`);

      // 2. Get swap config to validate
      const config = await simplifiedBridgeService.getSwapConfig();

      if (!config.enabled) {
        return { success: false, error: 'Swaps are currently disabled' };
      }

      if (verifiedAmount < config.min_cketh) {
        return {
          success: false,
          error: `Verified amount ${verifiedAmount} below minimum ${config.min_cketh}`
        };
      }

      if (verifiedAmount > config.max_cketh) {
        return {
          success: false,
          error: `Verified amount ${verifiedAmount} exceeds maximum ${config.max_cketh}`
        };
      }

      // 3. Call canister to execute swap with VERIFIED amount
      const agent = Principal.fromText(agentPrincipal);
      const swapResult = await simplifiedBridgeService.swapCkethForCkalgoDeposit(
        agent,
        verifiedAmount,  // Use verified amount, not user input
        ckethTxId,
        minCkalgoOut
      );

      // 4. Cache locally for tracking
      this.localDepositCache.set(ckethTxId, {
        agentPrincipal,
        ckethTxId,
        amount: verifiedAmount,  // Store verified amount
        detectedAt: startTime,
        status: 'swapped'
      });

      const duration = Date.now() - startTime;
      console.log(`✅ Deposit swap executed in ${duration}ms: ${verifiedAmount} ckETH -> ${swapResult.ckalgo_out} ckALGO`);

      return {
        success: true,
        swapResult
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Deposit swap failed:', errorMsg);

      // Cache failure (use 0n since we don't have verified amount on failure)
      this.localDepositCache.set(ckethTxId, {
        agentPrincipal,
        ckethTxId,
        amount: 0n,
        detectedAt: startTime,
        status: 'failed',
        error: errorMsg
      });

      return {
        success: false,
        error: errorMsg
      };
    }
  }

  /**
   * Get deposit status from local cache
   */
  getDepositStatus(ckethTxId: string): PendingSwapDeposit | undefined {
    return this.localDepositCache.get(ckethTxId);
  }

  /**
   * Get all deposits for an agent from local cache
   */
  getDepositsForAgent(agentPrincipal: string): PendingSwapDeposit[] {
    return Array.from(this.localDepositCache.values())
      .filter(d => d.agentPrincipal === agentPrincipal);
  }

  /**
   * Get service metrics
   */
  getMetrics(): {
    totalDepositsProcessed: number;
    swappedDeposits: number;
    failedDeposits: number;
    totalCkethProcessed: bigint;
  } {
    const deposits = Array.from(this.localDepositCache.values());

    return {
      totalDepositsProcessed: deposits.length,
      swappedDeposits: deposits.filter(d => d.status === 'swapped').length,
      failedDeposits: deposits.filter(d => d.status === 'failed').length,
      totalCkethProcessed: deposits
        .filter(d => d.status === 'swapped')
        .reduce((sum, d) => sum + d.amount, 0n)
    };
  }
}

export const ckethDepositService = new CkethDepositService();
