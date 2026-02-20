# ckETH → ckALGO Direct Swap Implementation Plan

**Created**: 2026-02-20
**Updated**: 2026-02-21
**Status**: Phase 1+2 DEPLOYED & TESTED on mainnet, Phase 3 pending (backend)
**Goal**: Add direct swap function to simplified_bridge canister that accepts ckETH and mints ckALGO

**Commits**:
- `d91bce9` feat: implement ckETH → ckALGO swap in simplified_bridge canister
- `d99ec9c` fix: XRC integration - add cycles and missing error variants

**Mainnet Tests** (2026-02-21):
- `get_current_eth_algo_rate()` → **21,743.81 ALGO/ETH** ✅
- `get_swap_config()` → disabled, 0.3% fee, 0.0001-1 ETH limits ✅

---

## Executive Summary

This document outlines the research findings and implementation plan for adding a direct swap function to the `simplified_bridge` canister that accepts ckETH and mints ckALGO. This is a **private endpoint** (not a public DEX listing) for controlled cross-chain agent payments.

---

## Research Findings

### 1. ckETH Canister Details

| Property | Value |
|----------|-------|
| **Canister ID** | `ss2fx-dyaaa-aaaar-qacoq-cai` |
| **Standard** | ICRC-1 + ICRC-2 |
| **Controllers** | NNS Root (`r7inp-6aaaa-aaaaa-aaabq-cai`), ckERC20 Orchestrator (`vxkom-oyaaa-aaaar-qafda-cai`) |
| **Token Symbol** | ckETH |
| **Decimals** | 18 (ETH native) |

**Key Insight**: ckETH fully supports ICRC-2 (approve/transfer_from pattern), making it straightforward to pull tokens into the canister.

### 2. ICRC-1/ICRC-2 Cross-Canister Transfer Patterns

**ICRC-1 Limitation**: No transaction notifications. A canister cannot "listen" for incoming transfers.

**Two approaches to accept tokens into a canister:**

| Approach | Pattern | Complexity | Best For |
|----------|---------|------------|----------|
| **ICRC-2 Approve/TransferFrom** | User approves canister → canister pulls tokens | Medium | Real-time swaps |
| **Polling/Query** | User transfers to canister account → canister polls ledger/index | Low | Batched processing |

**Recommended for this use case**: ICRC-2 pattern. It's synchronous, reliable, and the user experience is cleaner (single transaction from user perspective after approval).

### 3. Pricing Mechanism Options

| Option | Source | Pros | Cons |
|--------|--------|------|------|
| **Exchange Rate Canister (XRC)** | `uf6dk-hyaaa-aaaaq-qaaaq-cai` | On-chain, decentralized, DFINITY-maintained | No ALGO/ETH pair directly — need USD pivot |
| **Hardcoded Rate** | Config | Simple, predictable | Stale, market manipulation risk |
| **Off-chain Oracle** | Backend HTTP call | Accurate, real-time | Trust assumption, latency |
| **ICPSwap Canister** | AMM pool | Market rate | Requires pool existence, slippage |

**Recommended**: **Exchange Rate Canister (XRC)** with fallback to hardcoded rate.

The XRC provides crypto/fiat pairs (ETH/USD, ALGO/USD). We derive ETH/ALGO:
```
ETH/ALGO = (ETH/USD) / (ALGO/USD)
```

### 4. Reusable Code from Archived `ck_algo` Canister

From `archive/canisters/ck_algo/src/lib.rs` (6700 lines), useful patterns identified:

| Component | Lines | Reusability |
|-----------|-------|-------------|
| ICRC-1 transfer logic | 764-791 | **Direct reuse** — same pattern needed |
| Admin transfer function | 1623-1681 | **Already ported** — `admin_transfer_ck_algo` in simplified_bridge |
| Audit trail recording | Throughout | **Useful pattern** — consider adding for swap traceability |
| Cross-chain operation types | 281-286 | **Reference only** — `TransferALGO`, `AssetTransfer` enum |

**No existing swap or cross-token logic** — this will be new functionality.

### 5. Current `simplified_bridge` Canister Structure

The canister at `src/canisters/simplified_bridge/src/lib.rs` (778 lines) has:

- **ICRC-1 token**: ckALGO with balances, transfers, mint/burn
- **Bridge logic**: deposit tracking, confirmation flow, redemption
- **Admin functions**: `admin_transfer_ck_algo`, `admin_redeem_ck_algo`, `register_custody_address`
- **Authorized minters**: `2vxsx-fae` (anonymous principal) + controllers

**Key observation**: The canister does NOT currently make inter-canister calls. Adding ckETH transfer_from requires `ic_cdk::call` infrastructure.

---

## Security Considerations

### Critical Security Requirements

1. **Reentrancy Protection**: ICRC-2 `transfer_from` is an async inter-canister call. State must be updated atomically.

2. **Price Manipulation**: Rate must be checked just-in-time, not cached for long periods.

3. **Minimum/Maximum Limits**: Like deposit limits (0.1 - 1M ALGO), swap limits needed.

4. **Authorization**: Private endpoint — only authorized callers (backend, controllers).

5. **Slippage Protection**: Optional parameter for user-specified minimum output.

6. **No Partial Fills**: Either full swap succeeds or entire transaction reverts.

### Trust Model

```
┌──────────────────────────────────────────────────────────────┐
│                     Trust Boundaries                          │
├──────────────────────────────────────────────────────────────┤
│ TRUSTED:                                                      │
│ - ckETH canister (ss2fx...) — DFINITY-controlled              │
│ - Exchange Rate Canister (uf6dk...) — DFINITY-controlled      │
│ - simplified_bridge canister — our code, on-chain             │
│                                                               │
│ SEMI-TRUSTED:                                                 │
│ - Backend principal (2vxsx-fae) — authorized minter           │
│ - Price oracle data — external sources aggregated by XRC      │
│                                                               │
│ UNTRUSTED:                                                    │
│ - User input (principal, amounts)                             │
│ - Third-party callers                                         │
└──────────────────────────────────────────────────────────────┘
```

---

## Proposed Implementation Plan

### Phase 1: Core Swap Function (3-4 days)

#### 1.1 Add Dependencies to `Cargo.toml`

```toml
[dependencies]
# Existing
ic-cdk = "0.13"
candid = "0.10"

# New for ICRC-1 inter-canister calls
icrc-ledger-types = "0.1"  # ICRC-1/ICRC-2 types
```

#### 1.2 Add Canister State

```rust
// In simplified_bridge/src/lib.rs

// Constants
const CKETH_CANISTER_ID: &str = "ss2fx-dyaaa-aaaar-qacoq-cai";
const XRC_CANISTER_ID: &str = "uf6dk-hyaaa-aaaaq-qaaaq-cai"; // Exchange Rate Canister

// Swap configuration
thread_local! {
    static SWAP_ENABLED: RefCell<bool> = RefCell::new(false);
    static SWAP_FEE_BPS: RefCell<u64> = RefCell::new(30); // 0.3% fee
    static MIN_SWAP_CKETH: RefCell<Nat> = RefCell::new(Nat::from(100_000_000_000_000u64)); // 0.0001 ETH
    static MAX_SWAP_CKETH: RefCell<Nat> = RefCell::new(Nat::from(1_000_000_000_000_000_000u64)); // 1 ETH
    static SWAP_RECORDS: RefCell<Vec<SwapRecord>> = RefCell::new(Vec::new());
    // Reserve tracking: separate ckETH-backed vs ALGO-backed ckALGO
    static CKETH_BACKED_CKALGO: RefCell<Nat> = RefCell::new(Nat::from(0u64)); // Total ckALGO minted via swaps
    static TOTAL_CKETH_RECEIVED: RefCell<Nat> = RefCell::new(Nat::from(0u64)); // Total ckETH held by canister
}

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub struct SwapRecord {
    pub user: Principal,
    pub cketh_in: Nat,
    pub ckalgo_out: Nat,
    pub rate_used: f64,  // ETH/ALGO rate
    pub fee_collected: Nat,
    pub timestamp: u64,
    pub tx_id: String,
}
```

#### 1.3 Implement Core Swap Function

```rust
/// Private swap endpoint: ckETH → ckALGO
///
/// SECURITY: Only callable by authorized principals (backend, controllers)
///
/// Flow:
/// 1. Verify caller is authorized
/// 2. Verify swap amount within limits
/// 3. Get current ETH/ALGO rate from XRC (or fallback)
/// 4. Call ckETH.icrc2_transfer_from(user, this_canister, amount)
/// 5. Calculate ckALGO output (minus fee)
/// 6. Mint ckALGO to user
/// 7. Record swap, update reserves
#[update]
async fn swap_cketh_to_ckalgo(
    user: Principal,
    cketh_amount: Nat,
    min_ckalgo_out: Option<Nat>  // Slippage protection
) -> Result<SwapResult, String> {
    // Authorization check
    let caller_principal = caller();
    let is_authorized = AUTHORIZED_MINTERS.with(|m| m.borrow().contains(&caller_principal));
    let is_controller = ic_cdk::api::is_controller(&caller_principal);

    if !is_authorized && !is_controller {
        return Err(format!("Unauthorized: only authorized minters can execute swaps. Caller: {}", caller_principal));
    }

    // Check swap enabled
    let enabled = SWAP_ENABLED.with(|e| *e.borrow());
    if !enabled {
        return Err("Swaps are currently disabled".to_string());
    }

    // Validate amount
    let min_swap = MIN_SWAP_CKETH.with(|m| m.borrow().clone());
    let max_swap = MAX_SWAP_CKETH.with(|m| m.borrow().clone());

    if cketh_amount < min_swap || cketh_amount > max_swap {
        return Err(format!("Swap amount {} outside limits [{}, {}]", cketh_amount, min_swap, max_swap));
    }

    // Get exchange rate (ETH/ALGO)
    let rate = get_eth_algo_rate().await?;

    // Calculate output
    let cketh_as_f64 = nat_to_f64(&cketh_amount);
    let gross_algo = cketh_as_f64 * rate * 1_000_000.0; // Convert to microALGO

    let fee_bps = SWAP_FEE_BPS.with(|f| *f.borrow());
    let fee_amount = gross_algo * (fee_bps as f64 / 10_000.0);
    let net_algo = gross_algo - fee_amount;

    let ckalgo_out = Nat::from(net_algo as u64);

    // Slippage check
    if let Some(min_out) = min_ckalgo_out {
        if ckalgo_out < min_out {
            return Err(format!("Slippage exceeded: output {} < minimum {}", ckalgo_out, min_out));
        }
    }

    // Execute: Pull ckETH from user
    let cketh_canister = Principal::from_text(CKETH_CANISTER_ID).unwrap();
    let this_canister = ic_cdk::api::id();

    // Build transfer_from args
    let transfer_args = icrc_ledger_types::icrc2::transfer_from::TransferFromArgs {
        from: icrc_ledger_types::icrc1::account::Account {
            owner: user,
            subaccount: None,
        },
        to: icrc_ledger_types::icrc1::account::Account {
            owner: this_canister,
            subaccount: None,
        },
        amount: cketh_amount.clone(),
        fee: None,
        memo: None,
        created_at_time: None,
        spender_subaccount: None,
    };

    // Inter-canister call to ckETH
    let transfer_result: Result<(Result<Nat, icrc_ledger_types::icrc2::transfer_from::TransferFromError>,), _> =
        ic_cdk::call(cketh_canister, "icrc2_transfer_from", (transfer_args,)).await;

    match transfer_result {
        Ok((Ok(block_index),)) => {
            // ckETH received! Now mint ckALGO
            let user_str = user.to_text();

            BALANCES.with(|balances| {
                let mut balances_map = balances.borrow_mut();
                let current = balances_map.get(&user_str).unwrap_or(&Nat::from(0u64)).clone();
                balances_map.insert(user_str.clone(), current + ckalgo_out.clone());
            });

            TOTAL_SUPPLY.with(|supply| {
                let mut total = supply.borrow_mut();
                *total = total.clone() + ckalgo_out.clone();
            });

            // Note: This ckALGO is NOT backed by ALGO reserves!
            // Treasury management needed to maintain backing

            // Record swap
            let record = SwapRecord {
                user,
                cketh_in: cketh_amount.clone(),
                ckalgo_out: ckalgo_out.clone(),
                rate_used: rate,
                fee_collected: Nat::from(fee_amount as u64),
                timestamp: time(),
                tx_id: format!("SWAP_{}", block_index),
            };

            SWAP_RECORDS.with(|records| records.borrow_mut().push(record));

            Ok(SwapResult {
                cketh_in: cketh_amount,
                ckalgo_out,
                rate_used: rate,
                cketh_block_index: block_index,
            })
        }
        Ok((Err(e),)) => Err(format!("ckETH transfer_from failed: {:?}", e)),
        Err((code, msg)) => Err(format!("Inter-canister call failed: {:?} - {}", code, msg)),
    }
}

#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct SwapResult {
    pub cketh_in: Nat,
    pub ckalgo_out: Nat,
    pub rate_used: f64,
    pub cketh_block_index: Nat,
}
```

#### 1.4 Exchange Rate Function

```rust
/// Get current ETH/ALGO exchange rate from XRC
/// Falls back to hardcoded rate if XRC unavailable
async fn get_eth_algo_rate() -> Result<f64, String> {
    // Try XRC first
    let xrc_canister = Principal::from_text(XRC_CANISTER_ID)
        .map_err(|e| format!("Invalid XRC canister ID: {}", e))?;

    // Get ETH/USD
    let eth_usd_result: Result<(GetExchangeRateResult,), _> = ic_cdk::call(
        xrc_canister,
        "get_exchange_rate",
        (GetExchangeRateRequest {
            base_asset: Asset { symbol: "ETH".to_string(), class: AssetClass::Cryptocurrency },
            quote_asset: Asset { symbol: "USD".to_string(), class: AssetClass::FiatCurrency },
            timestamp: None,
        },)
    ).await;

    // Get ALGO/USD
    let algo_usd_result: Result<(GetExchangeRateResult,), _> = ic_cdk::call(
        xrc_canister,
        "get_exchange_rate",
        (GetExchangeRateRequest {
            base_asset: Asset { symbol: "ALGO".to_string(), class: AssetClass::Cryptocurrency },
            quote_asset: Asset { symbol: "USD".to_string(), class: AssetClass::FiatCurrency },
            timestamp: None,
        },)
    ).await;

    match (eth_usd_result, algo_usd_result) {
        (Ok((Ok(eth_rate),)), Ok((Ok(algo_rate),))) => {
            // ETH/ALGO = (ETH/USD) / (ALGO/USD)
            let eth_usd = eth_rate.rate as f64 / 1_000_000_000.0; // XRC uses 9 decimals
            let algo_usd = algo_rate.rate as f64 / 1_000_000_000.0;

            if algo_usd > 0.0 {
                Ok(eth_usd / algo_usd)
            } else {
                Err("ALGO/USD rate is zero".to_string())
            }
        }
        _ => {
            // NO FALLBACK — reject swap if XRC unavailable
            // Better to fail than give a bad rate with real money
            Err("Exchange Rate Canister unavailable — swap rejected. Try again later.".to_string())
        }
    }
}
```

### Phase 2: Admin Controls (1-2 days)

```rust
/// Enable/disable swaps (admin only)
#[update]
fn set_swap_enabled(enabled: bool) -> Result<String, String> {
    let caller_principal = caller();
    if !ic_cdk::api::is_controller(&caller_principal) {
        return Err("Only controllers can enable/disable swaps".to_string());
    }

    SWAP_ENABLED.with(|e| *e.borrow_mut() = enabled);
    Ok(format!("Swaps {}", if enabled { "enabled" } else { "disabled" }))
}

/// Set swap fee (admin only, max 5%)
#[update]
fn set_swap_fee_bps(fee_bps: u64) -> Result<String, String> {
    let caller_principal = caller();
    if !ic_cdk::api::is_controller(&caller_principal) {
        return Err("Only controllers can set swap fee".to_string());
    }

    if fee_bps > 500 {
        return Err("Fee cannot exceed 5% (500 bps)".to_string());
    }

    SWAP_FEE_BPS.with(|f| *f.borrow_mut() = fee_bps);
    Ok(format!("Swap fee set to {} bps ({}%)", fee_bps, fee_bps as f64 / 100.0))
}

/// Query swap configuration
#[query]
fn get_swap_config() -> SwapConfig {
    SwapConfig {
        enabled: SWAP_ENABLED.with(|e| *e.borrow()),
        fee_bps: SWAP_FEE_BPS.with(|f| *f.borrow()),
        min_cketh: MIN_SWAP_CKETH.with(|m| m.borrow().clone()),
        max_cketh: MAX_SWAP_CKETH.with(|m| m.borrow().clone()),
    }
}

/// Query swap history
#[query]
fn get_swap_records(limit: Option<u32>) -> Vec<SwapRecord> {
    let limit = limit.unwrap_or(100) as usize;
    SWAP_RECORDS.with(|records| {
        let r = records.borrow();
        r.iter().rev().take(limit).cloned().collect()
    })
}
```

### Phase 3: Backend Integration (2-3 days)

**New file**: `src/backend/src/services/swapService.ts`

```typescript
import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { SimplifiedBridgeService } from './simplifiedBridgeService';

const CKETH_CANISTER_ID = 'ss2fx-dyaaa-aaaar-qacoq-cai';
const SIMPLIFIED_BRIDGE_CANISTER_ID = 'hldvt-2yaaa-aaaak-qulxa-cai';

export class SwapService {
  private simplifiedBridge: SimplifiedBridgeService;

  constructor() {
    this.simplifiedBridge = new SimplifiedBridgeService();
  }

  /**
   * Execute ckETH → ckALGO swap
   *
   * PREREQUISITE: User must have approved simplified_bridge canister
   * to spend their ckETH via icrc2_approve on ckETH canister
   */
  async executeSwap(
    userPrincipal: string,
    ckethAmount: bigint,
    minCkalgoOut?: bigint
  ): Promise<SwapResult> {
    // Call canister swap function
    const result = await this.simplifiedBridge.swapCkethToCkalgo(
      Principal.fromText(userPrincipal),
      ckethAmount,
      minCkalgoOut
    );

    return result;
  }

  /**
   * Get quote for swap (no execution)
   */
  async getSwapQuote(ckethAmount: bigint): Promise<SwapQuote> {
    // Get current rate from canister
    const rate = await this.simplifiedBridge.getEthAlgoRate();
    const config = await this.simplifiedBridge.getSwapConfig();

    const grossAlgo = Number(ckethAmount) * rate / 1e18 * 1e6; // ETH → microALGO
    const feeAmount = grossAlgo * (config.feeBps / 10000);
    const netAlgo = grossAlgo - feeAmount;

    return {
      ckethIn: ckethAmount,
      ckalgoOut: BigInt(Math.floor(netAlgo)),
      rate,
      fee: BigInt(Math.floor(feeAmount)),
      feeBps: config.feeBps,
    };
  }
}

interface SwapResult {
  ckethIn: bigint;
  ckalgoOut: bigint;
  rateUsed: number;
  ckethBlockIndex: bigint;
}

interface SwapQuote {
  ckethIn: bigint;
  ckalgoOut: bigint;
  rate: number;
  fee: bigint;
  feeBps: number;
}
```

### Phase 4: Stable Storage Updates (1 day)

Update `StableStorage` struct to persist swap state across upgrades:

```rust
#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub struct StableStorage {
    // ... existing fields ...

    // Swap state (Phase 4 addition)
    pub swap_enabled: bool,
    pub swap_fee_bps: u64,
    pub swap_records: Vec<SwapRecord>,
    pub total_cketh_received: Nat,  // For treasury tracking
}
```

Update `pre_upgrade` and `post_upgrade` accordingly.

---

## Treasury Management Consideration

**CRITICAL**: When swapping ckETH → ckALGO, the new ckALGO is **NOT backed by real ALGO reserves**.

```
Current reserve model:
- User deposits ALGO → ckALGO minted (1:1 backed)
- LOCKED_ALGO_RESERVES tracks total ALGO held

After swap:
- User swaps ckETH → ckALGO minted (backed by ckETH, not ALGO)
- Reserve ratio becomes misleading
```

**Options:**

1. **Separate Reserve Tracking**: Track "ckETH-backed ckALGO" separately from "ALGO-backed ckALGO"

2. **Auto-Swap Treasury**: Periodically swap accumulated ckETH → ALGO on external market, deposit to custody

3. **Dual-Token Model**: Issue different tokens (ckALGO-native vs ckALGO-synthetic) — complex

4. **Accept Fractional Reserve**: For small swap volumes, acceptable risk — simple

**Decision**: Option 4 (Accept Fractional Reserve) + Option 1 tracking. Don't enforce backing ratio for MVP, but track ckETH-backed vs ALGO-backed ckALGO separately in canister state for visibility. Alert if ckETH-backed supply exceeds 10% of total.

---

## Implementation Status

| Phase | Task | Status | Commit |
|-------|------|--------|--------|
| 1 | Core swap function + XRC integration | ✅ **DONE** | `d91bce9` |
| 2 | Admin controls | ✅ **DONE** | `d91bce9` |
| 3 | Backend integration | ⏳ **PENDING** | — |
| 4 | Stable storage updates | ✅ **DONE** | `d91bce9` |
| - | Testing (unit + integration) | ⏳ **PENDING** | — |
| - | Documentation | ⏳ **PENDING** | — |

### Phase 1+2 Implementation (2026-02-21)

**Files modified**:
- `src/canisters/simplified_bridge/src/lib.rs` (+500 lines)
- `src/canisters/simplified_bridge/simplified_bridge.did` (+25 lines)

**Functions added**:
- `swap_cketh_to_ckalgo(user, amount, min_out)` — core swap with ICRC-2 transfer_from
- `get_eth_algo_rate()` — XRC query (no fallback, rejects if unavailable)
- `get_current_eth_algo_rate()` — public query wrapper
- `set_swap_enabled(bool)` — admin enable/disable
- `set_swap_fee_bps(u64)` — admin fee control (max 5%)
- `set_swap_limits(min, max)` — admin limit control
- `get_swap_config()` — query configuration
- `get_swap_records(limit)` — query swap history

**State added**:
- `SWAP_ENABLED` — disabled by default
- `SWAP_FEE_BPS` — 30 (0.3%)
- `MIN_SWAP_CKETH` — 0.0001 ETH
- `MAX_SWAP_CKETH` — 1 ETH
- `SWAP_RECORDS` — audit trail
- `CKETH_BACKED_CKALGO` — separate reserve tracking
- `TOTAL_CKETH_RECEIVED` — treasury tracking

**Build verified**: `cargo build --target wasm32-unknown-unknown --release` ✅

## Original Effort Estimate

| Phase | Task | Days | Dependencies |
|-------|------|------|--------------|
| 1 | Core swap function + XRC integration | 3-4 | None |
| 2 | Admin controls | 1-2 | Phase 1 |
| 3 | Backend integration | 2-3 | Phase 1-2 |
| 4 | Stable storage updates | 1 | Phase 1 |
| - | Testing (unit + integration) | 2-3 | All |
| - | Documentation | 1 | All |

**Total**: 10-14 days

---

## Decisions (2026-02-21)

1. **Fee Level**: ✅ **0.3% (30 bps)** — Fine for MVP. Private endpoint, not competing with Uniswap. Adjustable later.

2. **Rate Source Priority**: ✅ **XRC required, NO fallback** — If XRC fails, reject the swap. Better to fail than give a bad rate with real money. Hardcoded fallback too dangerous if stale. Remove fallback from implementation.

3. **Swap Limits**: ✅ **0.0001 - 1 ETH** (reduced from 10 ETH) — 1 ETH (~$2.4K) is plenty for alpha. 10 ETH too risky for unaudited canister.

4. **Backend vs Direct**: ✅ **Backend** — Consistent with all other endpoints.

5. **ICPSwap**: ✅ **This swap is a substitute for now** — Stay under the radar. ICPSwap listing comes later after audit.

6. **Reserve Management**: ✅ **Option 4 (accept fractional reserve) + Option 1 tracking** — Don't enforce backing ratio, but track ckETH-backed vs ALGO-backed ckALGO separately for visibility.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/canisters/simplified_bridge/Cargo.toml` | Add `icrc-ledger-types` dependency |
| `src/canisters/simplified_bridge/src/lib.rs` | Add swap functions, state, XRC types |
| `src/canisters/simplified_bridge/simplified_bridge.did` | Add swap method signatures |
| `src/backend/src/services/swapService.ts` | New file |
| `src/backend/src/services/simplifiedBridgeService.ts` | Add swap method bindings |
| `src/backend/src/server.ts` | Add `/swap` endpoints |
| `docs/ARCHITECTURE.md` | Document swap flow |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| XRC unavailable | Low | Medium | Hardcoded fallback rate |
| ckETH transfer_from fails | Low | High | Proper error handling, no state change |
| Price manipulation | Medium | High | Rate freshness check, limits |
| Reserve imbalance | Medium | Medium | Tracking + alerts |
| Reentrancy | Low | Critical | Atomic state updates |

---

## Sources

- [ckETH Ledger on ICP Dashboard](https://dashboard.internetcomputer.org/canister/ss2fx-dyaaa-aaaar-qacoq-cai)
- [What are ckETH and ckERC-20 tokens? - DFINITY](https://support.dfinity.org/hc/en-us/articles/20273018220180-What-are-ckETH-and-ckERC-20-tokens)
- [ICRC-2 Standard (GitHub)](https://github.com/dfinity/ICRC-1/blob/main/standards/ICRC-2/README.md)
- [Token transfer_from Example](https://internetcomputer.org/docs/current/references/samples/motoko/token_transfer_from/)
- [Using an ICRC-1 ledger](https://docs.internetcomputer.org/defi/token-ledgers/usage/icrc1_ledger_usage)
- [Exchange Rate Canister - DFINITY Medium](https://medium.com/dfinity/exchange-rate-canister-a-smart-contract-with-oracle-capabilities-f30694753c89)
- [Exchange rate canister docs](https://internetcomputer.org/docs/current/developer-docs/defi/exchange-rate-canister)
- [Inter-canister calls (Rust)](https://docs.internetcomputer.org/building-apps/developer-tools/cdks/rust/intercanister)
- [ICPSwap Forum Discussion (Rust interface)](https://forum.dfinity.org/t/whether-a-rust-interface-is-provided-with-icpswap/27669)
