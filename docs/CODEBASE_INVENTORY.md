# Sippar Codebase Inventory
**Generated**: 2026-02-20 from source code inspection (no docs consulted)

## A. Canisters (All deployed to ICP mainnet)

### simplified_bridge (`hldvt-2yaaa-aaaak-qulxa-cai`)
File: `src/canisters/simplified_bridge/src/lib.rs`

| Function | Type | Purpose |
|---|---|---|
| `icrc1_name()` | query | Returns "Chain-Key ALGO" |
| `icrc1_symbol()` | query | Returns "ckALGO" |
| `icrc1_decimals()` | query | Returns 6 |
| `icrc1_fee()` | query | Returns fee |
| `icrc1_total_supply()` | query | Total ckALGO minted |
| `icrc1_balance_of(principal)` | query | User balance |
| `icrc1_supported_standards()` | query | Standards list |
| `icrc1_transfer(to, amount)` | update | Transfer ckALGO |
| `register_custody_address(addr, user)` | update | Links Algorand address to ICP principal |
| `register_pending_deposit(user, tx, amt, addr, confs)` | update | Registers detected ALGO deposit |
| `mint_after_deposit_confirmed(tx_id)` | update | Mints ckALGO after confirmations met |
| `update_deposit_confirmations(tx_id, confs)` | update | Updates confirmation count |
| `redeem_ck_algo(amount, destination)` | update | Burns caller's ckALGO, returns redemption ID |
| `admin_redeem_ck_algo(user, amount, dest)` | update | Burns user's ckALGO (backend-initiated redemptions) |
| `get_reserve_ratio()` | query | Reserve status |
| `get_user_deposits(user)` | query | User's deposit records |
| `update_reserve_health(is_healthy)` | update | Admin: set reserve health flag |
| `get_canister_status()` | query | Status string |

### threshold_signer (`vj7ly-diaaa-aaaae-abvoq-cai`)
File: `src/canisters/threshold_signer/src/algorand_threshold_signer_backend/src/lib.rs`

| Function | Type | Purpose |
|---|---|---|
| `derive_algorand_address(principal)` | update | Derives Algorand address via ICP Schnorr Ed25519 (NEW method) |
| `derive_old_algorand_address(principal)` | update | Migration support for OLD derivation method |
| `sign_algorand_transaction(principal, tx_bytes)` | update | Threshold-signs an Algorand transaction |
| `sign_migration_transaction(principal, tx_bytes)` | update | Signs migration transactions (OLD derivation) |
| `verify_signature(...)` | query | Signature verification |
| `get_canister_status()` | query | Status info |
| `greet(name)` | query | Test function |

**Real crypto**: Uses `SchnorrKeyId` with ICP management canister for Ed25519 threshold signatures.

### ck_algo (`gbmxj-yiaaa-aaaak-qulqa-cai`) — ARCHIVED
File: `archive/canisters/ck_algo/src/lib.rs` — **6,732 lines, 103 functions**

**ARCHIVED 2026-02-19**: This canister is no longer used. Code moved to `archive/canisters/ck_algo/`.

Was a massive monolith with AI/compliance/governance code. Replaced by `simplified_bridge` for all token operations. Backend services that referenced this canister have been updated to use `simplified_bridge` instead.

## B. Backend Services

File: `src/backend/src/server.ts` — **111 API endpoints**, 5300+ lines

### Imported & Active in server.ts

| Service | Size | Key Role |
|---|---|---|
| `algorandService.ts` | 13.5KB | Algorand node queries, tx monitoring, submission |
| `simplifiedBridgeService.ts` | 14.5KB | Calls simplified_bridge canister (register, mint, confirm) |
| `icpCanisterService.ts` | 12.4KB | Calls threshold_signer canister (derive address, sign tx) |
| `depositDetectionService.ts` | 23.9KB | Polls Algorand for incoming deposits |
| `automaticMintingService.ts` | 11.2KB | Queues and processes mint jobs |
| `automaticMintingHandler.ts` | 1.1KB | Deposit→mint event handler |
| `automaticRedemptionService.ts` | 13.5KB | Queues and processes redemption jobs |
| `custodyAddressService.ts` | 14.5KB | Generates threshold-controlled custody addresses |
| `reserveVerificationService.ts` | 15.5KB | Monitors ALGO reserves vs ckALGO supply |
| `balanceSynchronizationService.ts` | 13.1KB | Syncs Algorand↔ICP balances |
| `transactionHistoryService.ts` | 14.3KB | Audit trail for all operations |
| `migrationService.ts` | 23.8KB | User migration from unbacked to backed tokens |
| `productionMonitoringService.ts` | 21.7KB | System health monitoring |
| `alertManager.ts` | 25.2KB | Multi-channel alerts (Slack, email, SMS) |
| `ckAlgoService.ts` | 11.7KB | ckALGO token operations |
| `ciAgentService.ts` | 40.6KB | CI agent routing and marketplace |
| `x402Service.ts` | 10.3KB | X402 payment protocol |
| `elnaIntegration.ts` | 12.7KB | Elna AI integration |

### NOT Imported (orphaned or used indirectly)

| Service | Size | Notes |
|---|---|---|
| `thresholdSignerService.ts` | 6.7KB | Wraps icpCanisterService — used by sipparAIOracleService only |
| `sipparAIService.ts` | 7.1KB | OpenWebUI integration |
| `sipparAIOracleService.ts` | 19.6KB | Algorand oracle service |
| `oracleMonitoringService.ts` | 10.0KB | Oracle health monitoring |
| `localAddressDerivation.ts` | 3.4KB | Local (non-threshold) address derivation |

## C. Redemption Flow — Code Trace

**Status**: WORKING END-TO-END (fixed 2026-02-20)

1. `server.ts` — `POST /ck-algo/redeem` → direct redemption endpoint
2. Burns ckALGO via `simplifiedBridgeService.adminRedeemCkAlgo(user, amount, dest)`
3. Creates Algorand payment tx via `algosdk.makePaymentTxnWithSuggestedParamsFromObject()`
4. Signs via `icpCanisterService.signAlgorandTransaction()` — **REAL threshold signing**
5. Submits to Algorand mainnet via `algorandMainnet.submitTransaction()`

**Proven**: Transaction `KX5MFBTZKYN654BUEEAIIVSVUCKWKCW465EXNFE6XMM3IUPPEHWA` (0.5 ALGO to external wallet, round 58569162)

**Important**: Must use `algorandMainnet` service (not `algorandService` which defaults to testnet).

## D. Frontend Components

| Component | Size | Purpose |
|---|---|---|
| `Dashboard.tsx` | 55.7KB | Main dashboard with balance display |
| `MintFlow.tsx` | 53.4KB | Deposit ALGO → mint ckALGO UI |
| `RedeemFlow.tsx` | 22.5KB | Burn ckALGO → withdraw ALGO UI |
| `AgentPayments.tsx` | 15.0KB | CI agent payment interface |
| `TransactionHistory.tsx` | 13.6KB | Transaction log |
| `ChainFusionExplanation.tsx` | 13.1KB | Educational content |
| `BackingEducation.tsx` | 11.1KB | Reserve backing explainer |
| `ConnectedWalletDisplay.tsx` | 7.6KB | Wallet status |
| `WalletConnectionModal.tsx` | 7.4KB | Wallet connect modal |
| `LoginComponent.tsx` | 6.8KB | Login UI |

## E. Deployment State

All 3 canisters deployed to ICP mainnet (`canister_ids.json`):
- `simplified_bridge`: `hldvt-2yaaa-aaaak-qulxa-cai`
- `threshold_signer`: `vj7ly-diaaa-aaaae-abvoq-cai`
- `ck_algo`: `gbmxj-yiaaa-aaaak-qulqa-cai`

Backend: `74.50.113.152:3004` via `sippar-backend.service`
Frontend: `https://nuru.network/sippar/`

## F. SDK

`src/sdk/src/` contains: auth, client, services (ai, cross-chain, payments, smart-contracts), types, utils.
**Not imported by backend or frontend.** Standalone package.

## G. Proven on Real Networks

| What | Evidence |
|---|---|
| Threshold address derivation | Custody address `6W47GCLX...` (NEW method, principal `2vxsx-fae`) |
| Deposit detection (mainnet) | 3 deposits detected and minted (Feb 19, 2026) |
| Automatic minting | Working end-to-end |
| Threshold signing (testnet) | tx `3RU7HQ2EIO7VIFYW2Q5IIANI5WJJBXH6YT5W4RCB7JZLNH6F3NUQ` |
| Threshold signing (mainnet) | tx `QODAHWSF55G3P43JXZ7TOYDJUCEQS7CZDMQ5WC5BGPMH6OQ4QTQA` |
| **Redemption (mainnet)** | tx `KX5MFBTZKYN654BUEEAIIVSVUCKWKCW465EXNFE6XMM3IUPPEHWA` (0.5 ALGO, Feb 20, 2026) |
| ckALGO minting (mainnet) | 23.419 ckALGO current supply (after 0.7 redeemed) |
| Canister ICRC-1 functions | All query/update functions verified |

## H. Key Gaps (from code, not docs)

1. ~~**Redemption tx submission**~~ **FIXED 2026-02-20** — redemption flow working end-to-end on mainnet
2. ~~**generate_deposit_address**~~ **REMOVED** — function deleted from canister. Backend uses `custodyAddressService` to derive real addresses.
3. **No persistent storage**: All state in-memory. Backend restart loses processed tx cache, pending deposits, etc.
4. **Single hardcoded custody address**: `server.ts` auto-registers one address on boot. No per-user address flow active.
