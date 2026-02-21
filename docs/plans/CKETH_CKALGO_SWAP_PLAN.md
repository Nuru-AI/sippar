# ckETH to ckALGO Direct Swap Implementation Plan

**Created**: 2026-02-20
**Updated**: 2026-02-21
**Status**: ✅ PHASE 3 COMPLETE — First real swap executed on mainnet
**Goal**: Enable fully autonomous ckETH to ckALGO swaps without human-in-the-loop

**Commits**:
- `d91bce9` feat: implement ckETH to ckALGO swap in simplified_bridge canister (ICRC-2 version)
- `d99ec9c` fix: XRC integration - add cycles and missing error variants
- `7240852` feat: Phase 3 deposit-based ckETH→ckALGO swap with security fixes
- `7ab2c52` feat: add admin_sweep_cketh_to_custody + first real swap success
- `00e8789` docs: update STATUS with VPS deployment + swap endpoints live

**COMPLETED (2026-02-21)**: Phase 3 deposit-based swap fully implemented and tested on mainnet.
- **First real swap**: 0.000248 ETH → 5.405549 ckALGO (block 935652)
- **VPS deployment**: All endpoints live on 74.50.113.152:3004
- **Security fixes**: TOCTOU via ICRC-3, amount verification from on-chain data

---

## Executive Summary

### The Problem with ICRC-2

The initial implementation (Phases 1-2) used ICRC-2 `approve`/`transfer_from` pattern:
```
Agent calls icrc2_approve(spender=simplified_bridge, amount=X) -> FAILS
Why? Backend uses anonymous principal (2vxsx-fae), cannot sign on behalf of user
```

**This breaks autonomous operation** - the core value proposition of Sippar.

### The Solution: Deposit-Based Swap

Mirror the proven ALGO deposit flow that works today:

```
ALGO Deposit (WORKING TODAY):
1. User sends ALGO to custody address (standard Algorand transfer)
2. Backend detects deposit via polling AlgoNode
3. Backend calls canister to register deposit
4. Canister mints ckALGO to user's principal

ckETH Swap (NEW DESIGN):
1. Agent sends ckETH to Sippar custody account (standard ICRC-1 transfer)
2. Backend detects deposit via polling ckETH ledger
3. Agent calls POST /swap/execute with proof of deposit
4. Backend verifies ckETH received, calls canister
5. Canister mints ckALGO to agent's principal
```

**Key insight**: ICRC-1 `transfer` (not `transfer_from`) requires NO approval - the token owner signs the transaction directly. Agents can do this autonomously.

---

## Architecture Overview

### Current State (Phases 1-2 Deployed)

```
┌─────────────────────────────────────────────────────────────────┐
│                    ICRC-2 Flow (BROKEN FOR AGENTS)              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Agent ──[1. icrc2_approve]──> ckETH Canister                   │
│    │                              │                             │
│    │     ❌ FAILS: Agent cannot sign approval                   │
│    │        Backend uses anonymous principal                    │
│    │                                                            │
│  Agent ──[2. POST /swap/execute]──> Backend                     │
│    │                                    │                       │
│    └────────────────────────────────────┼───────────────────────│
│                                         │                       │
│  Backend ──[3. swap_cketh_to_ckalgo]──> simplified_bridge       │
│                      │                                          │
│                      └──[4. icrc2_transfer_from]──> ckETH       │
│                              │                                  │
│                              ❌ InsufficientAllowance           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### New Design: Deposit-Based Swap

```
┌─────────────────────────────────────────────────────────────────┐
│                DEPOSIT-BASED FLOW (AUTONOMOUS)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Agent ──[1. icrc1_transfer]──> ckETH Canister                  │
│    │         (to: Sippar custody subaccount)                    │
│    │         ✅ Agent signs directly, NO approval needed        │
│    │                                                            │
│  Agent ──[2. POST /swap/execute]──> Backend                     │
│    │         { principal, ckethTxId, expectedAmount }           │
│    │                                                            │
│  Backend ──[3. Verify deposit]──> ckETH Canister                │
│    │         (query icrc1_balance_of or transaction history)    │
│    │         ✅ Confirms ckETH received in custody              │
│    │                                                            │
│  Backend ──[4. swap_cketh_for_ckalgo_deposit]──> simplified_bridge
│    │         (new function - mint based on verified deposit)    │
│    │                                                            │
│  Canister ──[5. Mint ckALGO]──> Agent's principal               │
│              ✅ No ICRC-2 transfer_from needed                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Design Decisions

### Decision 1: Shared Custody vs Per-Principal Subaccounts

**Options**:
1. **Shared custody address**: All agents send to same account, backend tracks by tx_id
2. **Per-principal subaccounts**: Each agent gets unique subaccount derived from principal

**Decision**: **Per-principal subaccounts**

**Rationale**:
- Prevents race conditions (agent A's deposit credited to agent B)
- Enables deterministic deposit verification (balance check vs tx history search)
- Matches ICRC-1 best practices for account identification
- Subaccount = SHA256(agent_principal)[0:32]

**Implementation**:
```rust
// Derive custody subaccount for agent
fn get_custody_subaccount_for_principal(principal: &Principal) -> [u8; 32] {
    use sha2::{Sha256, Digest};
    let mut hasher = Sha256::new();
    hasher.update(principal.as_slice());
    hasher.finalize().into()
}

// Agent's custody account on ckETH ledger
Account {
    owner: simplified_bridge_canister_id,  // hldvt-2yaaa-aaaak-qulxa-cai
    subaccount: Some(get_custody_subaccount_for_principal(&agent_principal))
}
```

### Decision 2: Deposit Detection Method

**Options**:
1. **Poll ckETH canister balance**: Simple but may miss deposits if multiple pending
2. **Query ckETH transaction history**: Comprehensive but requires index canister
3. **Trust agent-provided tx_id**: Simple but vulnerable to replay attacks
4. **Balance delta verification**: Check balance before/after window

**Decision**: **Balance verification with tx_id confirmation**

**Rationale**:
- Balance check is atomic and reliable
- tx_id prevents replay (mark deposits as processed)
- No dependency on index canister
- Simpler than full tx history parsing

**Implementation**:
```typescript
async verifyDeposit(principal: string, expectedAmount: bigint, txId: string): Promise<boolean> {
    // 1. Check if txId already processed
    if (processedSwapDeposits.has(txId)) return false;

    // 2. Get agent's custody subaccount balance
    const subaccount = deriveCustodySubaccount(principal);
    const balance = await ckethCanister.icrc1_balance_of({
        owner: SIMPLIFIED_BRIDGE_CANISTER_ID,
        subaccount: [subaccount]
    });

    // 3. Check unprocessed balance >= expected amount
    const unprocessedBalance = balance - getProcessedTotal(principal);
    if (unprocessedBalance < expectedAmount) return false;

    // 4. Mark as processing (atomic)
    processedSwapDeposits.set(txId, { principal, amount: expectedAmount, timestamp: Date.now() });

    return true;
}
```

### Decision 3: How to Link Deposit to Swap Request

**Options**:
1. **Memo field**: Agent includes swap request ID in transfer memo
2. **tx_id lookup**: Agent provides ICRC-1 block index in swap request
3. **Balance accounting**: Track per-principal balances, deduct on swap
4. **Time window**: Accept deposits within N seconds of swap request

**Decision**: **Balance accounting with tx_id tracking**

**Rationale**:
- Agent provides tx_id (block index from icrc1_transfer response)
- Backend verifies tx_id not already processed
- Backend confirms deposit amount matches
- Deducts from agent's pending balance on successful swap
- Handles out-of-order requests gracefully

### Decision 4: Canister Changes Required

**Remove**: ICRC-2 `transfer_from` call (lines 1150-1173 in lib.rs)
**Add**: New `swap_cketh_for_ckalgo_deposit` function that trusts backend verification

**Security model**: Backend is already trusted (same as ALGO deposits). Backend verifies ckETH receipt BEFORE calling canister. Canister mints based on backend's verification.

---

## Implementation Plan

### Phase 3.1: Canister Changes (1-2 days)

**File**: `src/canisters/simplified_bridge/src/lib.rs`

#### 3.1.1 Add New Swap Function (Deposit-Based)

```rust
/// Swap ckETH for ckALGO - Deposit-Based (No ICRC-2 Required)
///
/// SECURITY: Only callable by authorized principals (backend, controllers)
/// Backend MUST verify ckETH deposit BEFORE calling this function
///
/// Flow:
/// 1. Verify caller is authorized
/// 2. Verify swap is enabled and amount within limits
/// 3. Get current ETH/ALGO rate from XRC
/// 4. Calculate ckALGO output (minus fee)
/// 5. Mint ckALGO to agent's principal
/// 6. Record swap, update ckETH-backed reserves
///
/// NOTE: This function does NOT call ckETH canister. Backend must verify
/// ckETH deposit receipt before calling.
#[update]
async fn swap_cketh_for_ckalgo_deposit(
    agent_principal: Principal,
    cketh_amount: Nat,
    cketh_tx_id: String,         // Block index from agent's icrc1_transfer
    min_ckalgo_out: Option<Nat>  // Slippage protection
) -> Result<SwapResult, String> {
    // Authorization check
    let caller_principal = caller();
    let is_authorized = AUTHORIZED_MINTERS.with(|m| m.borrow().contains(&caller_principal));
    let is_controller = ic_cdk::api::is_controller(&caller_principal);

    if !is_authorized && !is_controller {
        return Err(format!(
            "Unauthorized: only authorized principals can execute deposit swaps. Caller: {}",
            caller_principal
        ));
    }

    // Check swap enabled
    let enabled = SWAP_ENABLED.with(|e| *e.borrow());
    if !enabled {
        return Err("Swaps are currently disabled".to_string());
    }

    // Check for duplicate tx_id (replay protection)
    let is_duplicate = PROCESSED_SWAP_DEPOSITS.with(|deposits| {
        deposits.borrow().contains(&cketh_tx_id)
    });
    if is_duplicate {
        return Err(format!("Deposit {} already processed", cketh_tx_id));
    }

    // Validate amount within limits
    let min_swap = MIN_SWAP_CKETH.with(|m| m.borrow().clone());
    let max_swap = MAX_SWAP_CKETH.with(|m| m.borrow().clone());

    if cketh_amount < min_swap {
        return Err(format!(
            "Swap amount {} below minimum {} (0.0001 ETH)",
            cketh_amount, min_swap
        ));
    }
    if cketh_amount > max_swap {
        return Err(format!(
            "Swap amount {} exceeds maximum {} (1 ETH)",
            cketh_amount, max_swap
        ));
    }

    // Get exchange rate from XRC (NO FALLBACK - reject if unavailable)
    let rate = get_eth_algo_rate().await?;

    // Calculate output (same logic as ICRC-2 version)
    let cketh_as_f64 = nat_to_f64(&cketh_amount);
    let eth_amount = cketh_as_f64 / 1e18;  // Convert wei to ETH
    let algo_amount = eth_amount * rate;    // ETH to ALGO
    let micro_algo = algo_amount * 1e6;     // ALGO to microALGO

    // Apply fee
    let fee_bps = SWAP_FEE_BPS.with(|f| *f.borrow());
    let fee_amount = micro_algo * (fee_bps as f64 / 10_000.0);
    let net_micro_algo = micro_algo - fee_amount;

    if net_micro_algo <= 0.0 {
        return Err("Output amount too small after fee".to_string());
    }

    let ckalgo_out = Nat::from(net_micro_algo as u64);
    let fee_nat = Nat::from(fee_amount as u64);

    // Slippage check
    if let Some(min_out) = min_ckalgo_out {
        if ckalgo_out < min_out {
            return Err(format!(
                "Slippage exceeded: output {} < minimum {}",
                ckalgo_out, min_out
            ));
        }
    }

    // Mark deposit as processed (BEFORE minting to prevent double-processing)
    PROCESSED_SWAP_DEPOSITS.with(|deposits| {
        deposits.borrow_mut().insert(cketh_tx_id.clone());
    });

    // Mint ckALGO to agent
    let agent_str = agent_principal.to_text();

    BALANCES.with(|balances| {
        let mut balances_map = balances.borrow_mut();
        let current = balances_map.get(&agent_str).unwrap_or(&Nat::from(0u64)).clone();
        balances_map.insert(agent_str.clone(), current + ckalgo_out.clone());
    });

    // Update total supply
    TOTAL_SUPPLY.with(|supply| {
        let mut total = supply.borrow_mut();
        *total = total.clone() + ckalgo_out.clone();
    });

    // Track ckETH-backed ckALGO separately (NOT backed by ALGO reserves)
    CKETH_BACKED_CKALGO.with(|backed| {
        let mut total = backed.borrow_mut();
        *total = total.clone() + ckalgo_out.clone();
    });

    // Track total ckETH received
    TOTAL_CKETH_RECEIVED.with(|received| {
        let mut total = received.borrow_mut();
        *total = total.clone() + cketh_amount.clone();
    });

    // Record swap for audit trail
    let record = SwapRecord {
        user: agent_principal,
        cketh_in: cketh_amount.clone(),
        ckalgo_out: ckalgo_out.clone(),
        rate_used: rate,
        fee_collected: fee_nat,
        timestamp: time(),
        tx_id: format!("DEPOSIT_SWAP_{}", cketh_tx_id),
    };

    SWAP_RECORDS.with(|records| records.borrow_mut().push(record));

    Ok(SwapResult {
        cketh_in: cketh_amount,
        ckalgo_out,
        rate_used: rate,
        cketh_block_index: Nat::from(0u64), // Not applicable for deposit-based
    })
}
```

#### 3.1.2 Add Processed Deposits Tracking

```rust
// Add to thread_local! block:
static PROCESSED_SWAP_DEPOSITS: RefCell<std::collections::HashSet<String>> = RefCell::new(std::collections::HashSet::new());
```

#### 3.1.3 Add Custody Subaccount Query

```rust
/// Get custody subaccount for a principal (for ckETH deposits)
/// Agent should transfer ckETH to:
///   Account { owner: simplified_bridge_canister, subaccount: Some(result) }
#[query]
fn get_swap_custody_subaccount(principal: Principal) -> Vec<u8> {
    use sha2::{Sha256, Digest};
    let mut hasher = Sha256::new();
    hasher.update(principal.as_slice());
    let result: [u8; 32] = hasher.finalize().into();
    result.to_vec()
}
```

#### 3.1.4 Update Stable Storage

```rust
// Add to StableStorage struct:
pub processed_swap_deposits: Option<Vec<String>>,

// Add to pre_upgrade:
processed_swap_deposits: Some(PROCESSED_SWAP_DEPOSITS.with(|d| d.borrow().iter().cloned().collect())),

// Add to post_upgrade:
if let Some(deposits) = stable_data.processed_swap_deposits {
    PROCESSED_SWAP_DEPOSITS.with(|d| {
        let mut set = d.borrow_mut();
        for tx_id in deposits {
            set.insert(tx_id);
        }
    });
}
```

#### 3.1.5 Update Candid Interface

Add to `simplified_bridge.did`:
```candid
// Deposit-based swap (autonomous agent flow)
swap_cketh_for_ckalgo_deposit : (principal, nat, text, opt nat) -> (variant { Ok : SwapResult; Err : text });

// Get custody subaccount for ckETH deposits
get_swap_custody_subaccount : (principal) -> (vec nat8) query;
```

---

### Phase 3.2: Backend Service - ckethDepositService.ts (2-3 days)

**New file**: `src/backend/src/services/ckethDepositService.ts`

```typescript
/**
 * ckETH Deposit Service - Deposit-Based Swap for Autonomous Agents
 *
 * Enables fully autonomous ckETH to ckALGO swaps:
 * 1. Agent transfers ckETH to their custody subaccount
 * 2. Agent calls POST /swap/execute with tx_id
 * 3. Service verifies deposit, triggers swap
 *
 * Created: 2026-02-21
 */

import { HttpAgent, Actor } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { createHash } from 'crypto';
import { simplifiedBridgeService, SwapResult } from './simplifiedBridgeService.js';

// Canister IDs
const CKETH_CANISTER_ID = 'ss2fx-dyaaa-aaaar-qacoq-cai';
const SIMPLIFIED_BRIDGE_CANISTER_ID = 'hldvt-2yaaa-aaaak-qulxa-cai';

// ICRC-1 IDL for ckETH queries
const ckethIdl = ({ IDL }: any) => {
  const Account = IDL.Record({
    'owner': IDL.Principal,
    'subaccount': IDL.Opt(IDL.Vec(IDL.Nat8)),
  });

  return IDL.Service({
    'icrc1_balance_of': IDL.Func([Account], [IDL.Nat], ['query']),
    'icrc1_transfer': IDL.Func(
      [IDL.Record({
        'to': Account,
        'fee': IDL.Opt(IDL.Nat),
        'memo': IDL.Opt(IDL.Vec(IDL.Nat8)),
        'from_subaccount': IDL.Opt(IDL.Vec(IDL.Nat8)),
        'created_at_time': IDL.Opt(IDL.Nat64),
        'amount': IDL.Nat,
      })],
      [IDL.Variant({ 'Ok': IDL.Nat, 'Err': IDL.Variant({
        'GenericError': IDL.Record({ 'message': IDL.Text, 'error_code': IDL.Nat }),
        'TemporarilyUnavailable': IDL.Null,
        'BadBurn': IDL.Record({ 'min_burn_amount': IDL.Nat }),
        'Duplicate': IDL.Record({ 'duplicate_of': IDL.Nat }),
        'BadFee': IDL.Record({ 'expected_fee': IDL.Nat }),
        'CreatedInFuture': IDL.Record({ 'ledger_time': IDL.Nat64 }),
        'TooOld': IDL.Null,
        'InsufficientFunds': IDL.Record({ 'balance': IDL.Nat }),
      })})],
      []
    ),
  });
};

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
  processedTotal: bigint;
  unprocessedBalance: bigint;
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

  // Track processed deposits (persistent in production via canister)
  private processedDeposits: Map<string, PendingSwapDeposit> = new Map();

  // Track per-principal processed totals
  private processedTotals: Map<string, bigint> = new Map();

  constructor() {
    this.agent = new HttpAgent({
      host: 'https://ic0.app',
      verifyQuerySignatures: false
    });

    this.ckethActor = Actor.createActor(ckethIdl, {
      agent: this.agent,
      canisterId: CKETH_CANISTER_ID
    });

    console.log('CkethDepositService initialized');
  }

  /**
   * Derive custody subaccount for a principal
   * Must match canister's get_swap_custody_subaccount()
   */
  deriveCustodySubaccount(principal: string): Uint8Array {
    const principalObj = Principal.fromText(principal);
    const hash = createHash('sha256')
      .update(Buffer.from(principalObj.toUint8Array()))
      .digest();
    return new Uint8Array(hash);
  }

  /**
   * Get agent's custody account info for ckETH deposits
   */
  getCustodyAccountInfo(agentPrincipal: string): {
    owner: string;
    subaccount: string;
    subaccountBytes: Uint8Array;
    instructions: string;
  } {
    const subaccount = this.deriveCustodySubaccount(agentPrincipal);
    const subaccountHex = Buffer.from(subaccount).toString('hex');

    return {
      owner: SIMPLIFIED_BRIDGE_CANISTER_ID,
      subaccount: subaccountHex,
      subaccountBytes: subaccount,
      instructions: `Transfer ckETH to Account { owner: "${SIMPLIFIED_BRIDGE_CANISTER_ID}", subaccount: Some([${Array.from(subaccount).join(', ')}]) }. Then call POST /swap/execute with your principal and the transaction block index.`
    };
  }

  /**
   * Get agent's custody balance on ckETH canister
   */
  async getCustodyBalance(agentPrincipal: string): Promise<CustodyBalance> {
    const subaccount = this.deriveCustodySubaccount(agentPrincipal);

    const balance = await this.ckethActor.icrc1_balance_of({
      owner: Principal.fromText(SIMPLIFIED_BRIDGE_CANISTER_ID),
      subaccount: [Array.from(subaccount)]
    });

    const balanceBigInt = BigInt(balance.toString());
    const processedTotal = this.processedTotals.get(agentPrincipal) || 0n;

    return {
      principal: agentPrincipal,
      subaccount,
      balance: balanceBigInt,
      processedTotal,
      unprocessedBalance: balanceBigInt - processedTotal,
      lastUpdated: Date.now()
    };
  }

  /**
   * Verify ckETH deposit from agent
   */
  async verifyDeposit(
    agentPrincipal: string,
    ckethTxId: string,
    expectedAmount: bigint
  ): Promise<{
    verified: boolean;
    error?: string;
    actualBalance?: bigint;
    unprocessedBalance?: bigint;
  }> {
    // Check if already processed (replay protection)
    if (this.processedDeposits.has(ckethTxId)) {
      const existing = this.processedDeposits.get(ckethTxId)!;
      if (existing.status === 'swapped') {
        return { verified: false, error: `Deposit ${ckethTxId} already swapped` };
      }
    }

    // Get custody balance
    const custodyBalance = await this.getCustodyBalance(agentPrincipal);

    // Verify sufficient unprocessed balance
    if (custodyBalance.unprocessedBalance < expectedAmount) {
      return {
        verified: false,
        error: `Insufficient unprocessed balance. Have: ${custodyBalance.unprocessedBalance}, Need: ${expectedAmount}`,
        actualBalance: custodyBalance.balance,
        unprocessedBalance: custodyBalance.unprocessedBalance
      };
    }

    // Mark as verified (not yet swapped)
    this.processedDeposits.set(ckethTxId, {
      agentPrincipal,
      ckethTxId,
      amount: expectedAmount,
      detectedAt: Date.now(),
      status: 'verified'
    });

    return {
      verified: true,
      actualBalance: custodyBalance.balance,
      unprocessedBalance: custodyBalance.unprocessedBalance
    };
  }

  /**
   * Execute swap after verifying deposit
   */
  async executeDepositSwap(
    agentPrincipal: string,
    ckethAmount: bigint,
    ckethTxId: string,
    minCkalgoOut?: bigint
  ): Promise<SwapDepositResult> {
    const startTime = Date.now();

    try {
      // 1. Verify the deposit
      const verification = await this.verifyDeposit(agentPrincipal, ckethTxId, ckethAmount);

      if (!verification.verified) {
        return {
          success: false,
          error: verification.error,
          custodyInfo: this.getCustodyAccountInfo(agentPrincipal)
        };
      }

      // 2. Get swap config to validate
      const config = await simplifiedBridgeService.getSwapConfig();

      if (!config.enabled) {
        this.rollbackDeposit(ckethTxId);
        return { success: false, error: 'Swaps are currently disabled' };
      }

      if (ckethAmount < config.min_cketh) {
        this.rollbackDeposit(ckethTxId);
        return {
          success: false,
          error: `Amount ${ckethAmount} below minimum ${config.min_cketh}`
        };
      }

      if (ckethAmount > config.max_cketh) {
        this.rollbackDeposit(ckethTxId);
        return {
          success: false,
          error: `Amount ${ckethAmount} exceeds maximum ${config.max_cketh}`
        };
      }

      // 3. Call canister to execute swap
      const agent = Principal.fromText(agentPrincipal);
      const swapResult = await simplifiedBridgeService.swapCkethForCkalgoDeposit(
        agent,
        ckethAmount,
        ckethTxId,
        minCkalgoOut
      );

      // 4. Update processed totals
      const currentTotal = this.processedTotals.get(agentPrincipal) || 0n;
      this.processedTotals.set(agentPrincipal, currentTotal + ckethAmount);

      // 5. Mark deposit as swapped
      const deposit = this.processedDeposits.get(ckethTxId);
      if (deposit) {
        deposit.status = 'swapped';
      }

      const duration = Date.now() - startTime;
      console.log(`Deposit swap executed in ${duration}ms: ${ckethAmount} ckETH -> ${swapResult.ckalgo_out} ckALGO`);

      return {
        success: true,
        swapResult
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Deposit swap failed:', errorMsg);

      // Mark as failed (can retry)
      const deposit = this.processedDeposits.get(ckethTxId);
      if (deposit) {
        deposit.status = 'failed';
        deposit.error = errorMsg;
      }

      return {
        success: false,
        error: errorMsg
      };
    }
  }

  /**
   * Rollback a deposit verification (e.g., if swap fails validation)
   */
  private rollbackDeposit(ckethTxId: string): void {
    this.processedDeposits.delete(ckethTxId);
  }

  /**
   * Get deposit status
   */
  getDepositStatus(ckethTxId: string): PendingSwapDeposit | undefined {
    return this.processedDeposits.get(ckethTxId);
  }

  /**
   * Get all deposits for an agent
   */
  getDepositsForAgent(agentPrincipal: string): PendingSwapDeposit[] {
    return Array.from(this.processedDeposits.values())
      .filter(d => d.agentPrincipal === agentPrincipal);
  }

  /**
   * Get service metrics
   */
  getMetrics(): {
    totalDepositsProcessed: number;
    pendingDeposits: number;
    swappedDeposits: number;
    failedDeposits: number;
    totalCkethProcessed: bigint;
  } {
    const deposits = Array.from(this.processedDeposits.values());

    return {
      totalDepositsProcessed: deposits.length,
      pendingDeposits: deposits.filter(d => d.status === 'pending' || d.status === 'verified').length,
      swappedDeposits: deposits.filter(d => d.status === 'swapped').length,
      failedDeposits: deposits.filter(d => d.status === 'failed').length,
      totalCkethProcessed: deposits
        .filter(d => d.status === 'swapped')
        .reduce((sum, d) => sum + d.amount, 0n)
    };
  }
}

export const ckethDepositService = new CkethDepositService();
```

---

### Phase 3.3: Update simplifiedBridgeService.ts (1 day)

Add to `src/backend/src/services/simplifiedBridgeService.ts`:

```typescript
// Add to IDL Service definition:
'swap_cketh_for_ckalgo_deposit': IDL.Func(
  [IDL.Principal, IDL.Nat, IDL.Text, IDL.Opt(IDL.Nat)],
  [IDL.Variant({ 'Ok': SwapResult, 'Err': IDL.Text })],
  []
),
'get_swap_custody_subaccount': IDL.Func(
  [IDL.Principal],
  [IDL.Vec(IDL.Nat8)],
  ['query']
),

// Add to SimplifiedBridgeService class:

/**
 * Execute ckETH to ckALGO swap (deposit-based, autonomous)
 * Backend calls this AFTER verifying ckETH deposit
 */
async swapCkethForCkalgoDeposit(
  agentPrincipal: Principal,
  ckethAmount: bigint,
  ckethTxId: string,
  minCkalgoOut?: bigint
): Promise<SwapResult> {
  return this.retryOperation(async () => {
    const result = await this.actor.swap_cketh_for_ckalgo_deposit(
      agentPrincipal,
      ckethAmount,
      ckethTxId,
      minCkalgoOut ? [minCkalgoOut] : []
    );
    if ('Ok' in result) {
      const swap = result.Ok;
      console.log(`Deposit swap executed: ${swap.cketh_in} ckETH -> ${swap.ckalgo_out} ckALGO @ ${swap.rate_used}`);
      return {
        cketh_in: BigInt(swap.cketh_in.toString()),
        ckalgo_out: BigInt(swap.ckalgo_out.toString()),
        rate_used: Number(swap.rate_used),
        cketh_block_index: BigInt(swap.cketh_block_index.toString())
      };
    } else {
      throw new Error(`Deposit swap failed: ${result.Err}`);
    }
  }, `swapCkethForCkalgoDeposit(${agentPrincipal.toString()}, ${ckethAmount}, ${ckethTxId})`);
}

/**
 * Get custody subaccount for ckETH deposits
 */
async getSwapCustodySubaccount(principal: Principal): Promise<Uint8Array> {
  return this.retryOperation(async () => {
    const result = await this.actor.get_swap_custody_subaccount(principal);
    return new Uint8Array(result);
  }, `getSwapCustodySubaccount(${principal.toString()})`);
}
```

---

### Phase 3.4: API Endpoints (1 day)

Add to `src/backend/src/server.ts`:

```typescript
import { ckethDepositService } from './services/ckethDepositService.js';

// ============================================================================
// ckETH Deposit-Based Swap Endpoints (Autonomous Agent Flow)
// ============================================================================

/**
 * GET /swap/custody-account/:principal
 * Get custody account info for ckETH deposits
 * Agent uses this to know WHERE to send ckETH
 */
app.get('/swap/custody-account/:principal', async (req, res) => {
  const startTime = Date.now();
  try {
    const { principal } = req.params;

    // Validate principal
    try {
      Principal.fromText(principal);
    } catch {
      return res.status(400).json({
        success: false,
        error: 'Invalid principal format'
      });
    }

    const custodyInfo = ckethDepositService.getCustodyAccountInfo(principal);

    res.json({
      success: true,
      custodyAccount: {
        owner: custodyInfo.owner,
        subaccount: custodyInfo.subaccount,
        subaccountArray: Array.from(custodyInfo.subaccountBytes),
        ckethCanister: CKETH_CANISTER_ID,
        instructions: custodyInfo.instructions
      },
      agentPrincipal: principal,
      timestamp: new Date().toISOString()
    });

    logOperation('swap-custody-account', true, Date.now() - startTime);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logOperation('swap-custody-account', false, Date.now() - startTime, undefined, errorMessage);
    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
});

/**
 * GET /swap/custody-balance/:principal
 * Get agent's custody balance (ckETH deposited but not yet swapped)
 */
app.get('/swap/custody-balance/:principal', async (req, res) => {
  const startTime = Date.now();
  try {
    const { principal } = req.params;
    const balance = await ckethDepositService.getCustodyBalance(principal);

    res.json({
      success: true,
      balance: {
        total: balance.balance.toString(),
        totalFormatted: `${Number(balance.balance) / 1e18} ETH`,
        processedTotal: balance.processedTotal.toString(),
        unprocessedBalance: balance.unprocessedBalance.toString(),
        unprocessedFormatted: `${Number(balance.unprocessedBalance) / 1e18} ETH`,
        lastUpdated: new Date(balance.lastUpdated).toISOString()
      },
      principal,
      timestamp: new Date().toISOString()
    });

    logOperation('swap-custody-balance', true, Date.now() - startTime);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logOperation('swap-custody-balance', false, Date.now() - startTime, undefined, errorMessage);
    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
});

/**
 * POST /swap/execute
 * Execute ckETH to ckALGO swap (deposit-based, autonomous)
 *
 * FLOW:
 * 1. Agent transfers ckETH to custody account (GET /swap/custody-account first)
 * 2. Agent calls this endpoint with tx_id from transfer
 * 3. Backend verifies deposit, executes swap
 */
app.post('/swap/execute', async (req, res) => {
  const startTime = Date.now();
  try {
    const { principal, ckethAmount, ckethTxId, minCkalgoOut } = z.object({
      principal: z.string().min(1),
      ckethAmount: z.string().min(1),      // Amount in wei (string for bigint)
      ckethTxId: z.string().min(1),        // Block index from icrc1_transfer
      minCkalgoOut: z.string().optional()  // Slippage protection
    }).parse(req.body);

    const amount = BigInt(ckethAmount);
    const minOut = minCkalgoOut ? BigInt(minCkalgoOut) : undefined;

    console.log(`Deposit swap request: ${principal} swapping ${amount} ckETH (tx: ${ckethTxId})`);

    const result = await ckethDepositService.executeDepositSwap(
      principal,
      amount,
      ckethTxId,
      minOut
    );

    if (result.success && result.swapResult) {
      res.json({
        success: true,
        swap: {
          ckethIn: result.swapResult.cketh_in.toString(),
          ckethInFormatted: `${Number(result.swapResult.cketh_in) / 1e18} ETH`,
          ckalgoOut: result.swapResult.ckalgo_out.toString(),
          ckalgoOutFormatted: `${Number(result.swapResult.ckalgo_out) / 1e6} ALGO`,
          rateUsed: result.swapResult.rate_used,
          ckethTxId
        },
        principal,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      });

      logOperation('swap-execute', true, Date.now() - startTime, amount.toString());
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        custodyInfo: result.custodyInfo,
        timestamp: new Date().toISOString()
      });

      logOperation('swap-execute', false, Date.now() - startTime, undefined, result.error);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logOperation('swap-execute', false, Date.now() - startTime, undefined, errorMessage);
    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
});

/**
 * GET /swap/deposit-status/:txId
 * Get status of a specific deposit
 */
app.get('/swap/deposit-status/:txId', async (req, res) => {
  const startTime = Date.now();
  try {
    const { txId } = req.params;
    const deposit = ckethDepositService.getDepositStatus(txId);

    if (!deposit) {
      return res.status(404).json({
        success: false,
        error: `Deposit ${txId} not found`
      });
    }

    res.json({
      success: true,
      deposit: {
        txId: deposit.ckethTxId,
        agentPrincipal: deposit.agentPrincipal,
        amount: deposit.amount.toString(),
        amountFormatted: `${Number(deposit.amount) / 1e18} ETH`,
        status: deposit.status,
        error: deposit.error,
        detectedAt: new Date(deposit.detectedAt).toISOString()
      },
      timestamp: new Date().toISOString()
    });

    logOperation('swap-deposit-status', true, Date.now() - startTime);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logOperation('swap-deposit-status', false, Date.now() - startTime, undefined, errorMessage);
    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
});

/**
 * GET /swap/deposits/:principal
 * Get all deposits for an agent
 */
app.get('/swap/deposits/:principal', async (req, res) => {
  const startTime = Date.now();
  try {
    const { principal } = req.params;
    const deposits = ckethDepositService.getDepositsForAgent(principal);

    res.json({
      success: true,
      deposits: deposits.map(d => ({
        txId: d.ckethTxId,
        amount: d.amount.toString(),
        amountFormatted: `${Number(d.amount) / 1e18} ETH`,
        status: d.status,
        error: d.error,
        detectedAt: new Date(d.detectedAt).toISOString()
      })),
      count: deposits.length,
      principal,
      timestamp: new Date().toISOString()
    });

    logOperation('swap-deposits', true, Date.now() - startTime);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logOperation('swap-deposits', false, Date.now() - startTime, undefined, errorMessage);
    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
});

/**
 * GET /swap/deposit-metrics
 * Get deposit service metrics
 */
app.get('/swap/deposit-metrics', async (req, res) => {
  const startTime = Date.now();
  try {
    const metrics = ckethDepositService.getMetrics();

    res.json({
      success: true,
      metrics: {
        totalDepositsProcessed: metrics.totalDepositsProcessed,
        pendingDeposits: metrics.pendingDeposits,
        swappedDeposits: metrics.swappedDeposits,
        failedDeposits: metrics.failedDeposits,
        totalCkethProcessed: metrics.totalCkethProcessed.toString(),
        totalCkethProcessedFormatted: `${Number(metrics.totalCkethProcessed) / 1e18} ETH`
      },
      timestamp: new Date().toISOString()
    });

    logOperation('swap-deposit-metrics', true, Date.now() - startTime);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logOperation('swap-deposit-metrics', false, Date.now() - startTime, undefined, errorMessage);
    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
});
```

---

## API Reference (Updated)

### Autonomous Agent Flow

| Step | Endpoint | Method | Description |
|------|----------|--------|-------------|
| 1 | `/swap/custody-account/:principal` | GET | Get custody account for ckETH deposits |
| 2 | (ckETH canister `icrc1_transfer`) | - | Agent transfers ckETH to custody |
| 3 | `/swap/execute` | POST | Execute swap with deposit proof |

### Full API

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/swap/config` | GET | Get swap configuration | None |
| `/swap/rate` | GET | Get current ETH/ALGO rate | None |
| `/swap/quote` | POST | Get swap quote | None |
| `/swap/custody-account/:principal` | GET | Get custody account for deposits | None |
| `/swap/custody-balance/:principal` | GET | Get unprocessed deposit balance | None |
| `/swap/execute` | POST | Execute deposit-based swap | None |
| `/swap/deposit-status/:txId` | GET | Get deposit status | None |
| `/swap/deposits/:principal` | GET | Get all deposits for agent | None |
| `/swap/deposit-metrics` | GET | Get deposit service metrics | None |
| `/swap/history` | GET | Get swap history | None |
| `/swap/metrics` | GET | Get overall swap metrics | None |
| `/swap/admin/enable` | POST | Enable/disable swaps | Controller |
| `/swap/admin/fee` | POST | Set swap fee | Controller |
| `/swap/admin/limits` | POST | Set swap limits | Controller |

---

## Agent Integration Example

```typescript
// Example: Autonomous agent executing ckETH to ckALGO swap

import { HttpAgent, Actor } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';

const SIPPAR_API = 'https://sippar.api.example.com';
const CKETH_CANISTER_ID = 'ss2fx-dyaaa-aaaar-qacoq-cai';

async function swapCkethToCkalgo(
  agentPrincipal: string,
  ckethAmount: bigint,
  agentIdentity: Identity  // Agent's signing identity
) {
  // Step 1: Get custody account
  const custodyRes = await fetch(`${SIPPAR_API}/swap/custody-account/${agentPrincipal}`);
  const custody = await custodyRes.json();

  if (!custody.success) throw new Error(custody.error);

  const custodyAccount = {
    owner: Principal.fromText(custody.custodyAccount.owner),
    subaccount: [new Uint8Array(custody.custodyAccount.subaccountArray)]
  };

  // Step 2: Transfer ckETH to custody (agent signs directly)
  const ckethAgent = new HttpAgent({ identity: agentIdentity, host: 'https://ic0.app' });
  const ckethActor = Actor.createActor(ckethIdl, {
    agent: ckethAgent,
    canisterId: CKETH_CANISTER_ID
  });

  const transferResult = await ckethActor.icrc1_transfer({
    to: custodyAccount,
    amount: ckethAmount,
    fee: [],
    memo: [],
    from_subaccount: [],
    created_at_time: []
  });

  if ('Err' in transferResult) {
    throw new Error(`ckETH transfer failed: ${JSON.stringify(transferResult.Err)}`);
  }

  const ckethTxId = transferResult.Ok.toString();
  console.log(`ckETH transferred, block index: ${ckethTxId}`);

  // Step 3: Execute swap
  const swapRes = await fetch(`${SIPPAR_API}/swap/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      principal: agentPrincipal,
      ckethAmount: ckethAmount.toString(),
      ckethTxId: ckethTxId
    })
  });

  const swap = await swapRes.json();

  if (!swap.success) throw new Error(swap.error);

  console.log(`Swap complete: ${swap.swap.ckalgoOutFormatted}`);
  return swap;
}

// Usage
const result = await swapCkethToCkalgo(
  'abc123-xyz...',           // Agent's principal
  BigInt(10_000_000_000_000_000),  // 0.01 ETH
  myAgentIdentity
);
```

---

## Implementation Status

| Phase | Task | Status | Notes |
|-------|------|--------|-------|
| 1 | Core swap function + XRC integration | ✅ DONE | ICRC-2 version deployed |
| 2 | Admin controls | ✅ DONE | Works |
| 3.1 | Canister deposit-based swap function | ✅ DONE | `swap_cketh_for_ckalgo_deposit()` deployed |
| 3.2 | ckethDepositService.ts | ✅ DONE | 280 lines, ICRC-3 verification |
| 3.3 | simplifiedBridgeService.ts updates | ✅ DONE | All method bindings added |
| 3.4 | API endpoints | ✅ DONE | 10 endpoints, all live on VPS |
| 4 | Testing | ✅ DONE | Real swap: 0.000248 ETH → 5.405549 ckALGO |
| 5 | Documentation | ✅ DONE | ARCHITECTURE.md, STATUS.md updated |

### Security Audit Fixes (2026-02-21)

| Issue | Severity | Fix |
|-------|----------|-----|
| TOCTOU race condition | P0 Critical | ICRC-3 `get_transactions()` verification |
| Amount manipulation | P1 High | User-provided amount IGNORED, use on-chain data |
| Subaccount derivation mismatch | P1 High | Query canister's `get_swap_custody_subaccount()` |
| Float overflow | P2 Medium | Bounds check before `f64 as u64` cast |

### Admin Utilities Added

| Function | Purpose |
|----------|---------|
| `admin_sweep_cketh_to_custody(principal, amount)` | Recover ckETH sent to wrong account |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Double-processing deposit | Low | High | Track processed tx_ids in canister + backend |
| Balance verification race | Low | Medium | Per-principal subaccounts isolate deposits |
| XRC unavailable | Low | Medium | Reject swap, agent retries |
| Agent deposits wrong amount | Low | Low | Balance check before swap |
| Backend downtime | Low | Medium | Deposits safe in custody, swap when backend returns |

---

## Security Considerations

1. **Replay protection**: `ckethTxId` tracked in canister's `PROCESSED_SWAP_DEPOSITS` set
2. **Balance isolation**: Per-principal subaccounts prevent cross-agent issues
3. **Authorization**: Only authorized minters can call canister swap function
4. **Rate freshness**: XRC provides real-time rates, no fallback (fail-safe)
5. **Slippage protection**: `minCkalgoOut` parameter optional

---

## Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `src/canisters/simplified_bridge/src/lib.rs` | Modify | Add deposit-based swap, custody subaccount |
| `src/canisters/simplified_bridge/simplified_bridge.did` | Modify | Add new function signatures |
| `src/canisters/simplified_bridge/Cargo.toml` | Modify | Add sha2 dependency |
| `src/backend/src/services/ckethDepositService.ts` | Create | New deposit detection service |
| `src/backend/src/services/simplifiedBridgeService.ts` | Modify | Add new method bindings |
| `src/backend/src/server.ts` | Modify | Add deposit-based endpoints |
| `docs/ARCHITECTURE.md` | Modify | Document new flow |

---

## Actual Effort (Completed 2026-02-21)

| Phase | Task | Actual |
|-------|------|--------|
| 3.1 | Canister changes | ~3 hours |
| 3.2 | ckethDepositService.ts | ~4 hours |
| 3.3 | simplifiedBridgeService updates | ~1 hour |
| 3.4 | API endpoints | ~2 hours |
| 4 | Testing + security fixes | ~3 hours |
| 5 | Documentation | ~1 hour |

**Total**: ~1 day (with security audit and VPS deployment)

---

## Production Test Results (2026-02-21)

### First Real Swap

```
Input:  0.000248 ETH (248,000,000,000,000 wei)
Output: 5.405549 ckALGO
Rate:   ~21,795 ALGO/ETH
Block:  935652
```

### VPS Endpoint Latencies

| Endpoint | Latency |
|----------|---------|
| `/health` | instant |
| `/swap/custody-account/:principal` | 628ms |
| `/swap/custody-balance/:principal` | 263ms |
| `/swap/deposit-status/:txId` | instant |
| `/swap/metrics` | 580ms |
| `/swap/config` | 75s (XRC rate slow) |

### Metrics After First Swap

```json
{
  "ckethBackedCkalgo": "5395549",
  "totalCkethReceived": "248000000000000"
}
```

---

## Appendix: Why Not ICRC-2?

ICRC-2 `approve`/`transfer_from` is designed for:
- DEX swaps where user approves via UI
- Human-in-the-loop flows with wallet signing
- Single-party authorization (user controls their tokens)

It doesn't work for autonomous agents because:
- Agents cannot sign on behalf of users
- Backend uses anonymous principal, cannot impersonate
- Approval requires wallet interaction

The deposit-based pattern mirrors how all successful cross-chain bridges work:
- User transfers to custody
- Bridge detects and processes
- No approval needed
