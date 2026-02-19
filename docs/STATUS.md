# Sippar Status

**Last Updated**: 2026-02-19

## What Works ✅

### Deposit → Mint (Mainnet, Automated)
- Backend detects ALGO deposits to custody address within ~30 seconds
- Registers deposit with simplified_bridge canister
- Tracks Algorand confirmations (6 required for mainnet)
- Updates canister confirmations when threshold reached
- Automatically mints ckALGO
- **Proven**: 3 successful mints on 2026-02-19 (13.12 + 6 + 5 ALGO = 24.12 ckALGO)
- Total supply: 25.119095 ckALGO

### ICRC-1 Token
- Standard query methods (name, symbol, decimals, fee, total_supply, balance_of)
- Transfers between principals
- Reserve ratio tracking (1:1 backing verified)

### Threshold Signatures
- Ed25519 address derivation from ICP principals
- Transaction signing via ICP Schnorr API
- Proven on both testnet and mainnet (Sept 2025)

### Infrastructure
- Backend running on VPS (74.50.113.152:3004)
- Both canisters deployed on ICP mainnet
- Canister upgrades preserve state (pre_upgrade/post_upgrade with stable storage)

## What Doesn't Work ❌

### Redemption (ckALGO → ALGO)
- Canister burn function exists but **automatic redemption service is untested on mainnet**
- Requires threshold_signer to sign withdrawal — flow is wired but not battle-tested
- No user has attempted a redemption yet

### Frontend
- React app at nuru.network/sippar — **stale since Sept 2025**
- Internet Identity integration exists but not tested with current backend
- Would need updates to match current canister interface

### Per-User Custody Addresses
- All deposits currently go to ONE shared address (`7KJLCG...`)
- `custodyAddressService` can derive per-user addresses via threshold_signer
- But the live flow hardcodes the single address on startup
- **Scaling blocker**: Can't distinguish deposits from different users without tx metadata

## Known Issues

### Critical
1. **Single custody address** — all users share one address. Works for demo/testing, not for multi-user production.
2. **Confirmation architecture is temporary** — backend reports confirmations to canister (trusted party). Phase 2 should use canister-side HTTP outcalls (ckETH pattern) for trustless verification.

### Important
3. **VPS memory pressure** — 3.8GB RAM, frequently near OOM. npm install fails, services compete for memory.
4. **Backend principal `2vxsx-fae`** — the anonymous principal is used as authorized minter. Should be replaced with the actual deploy identity for production.
5. **No monitoring/alerts** — monitoring code exists but no dashboards or alerting in production.

### Cleanup
6. **`ck_algo` canister on mainnet** — archived in code but still deployed. Consider stopping to reclaim cycles.
7. **109 stale docs** — moved to `archive/docs/`. All from Sept 2025, mostly aspirational.
8. **Backend has ~5000 lines in server.ts** — many endpoints for features that don't exist (X402, CI agents, AI oracle). Candidate for cleanup.

## Architecture Changes (2026-02-19)

- Archived `ck_algo` canister (6700 lines) → `archive/canisters/ck_algo/`
- Removed orphaned `sign_and_mint_ck_algo()` from threshold_signer
- Removed fake `generate_deposit_address()` from simplified_bridge
- Added `register_custody_address()` to simplified_bridge Candid interface
- Updated backend services to match new canister interface
- Both canisters redeployed to mainnet

## Next Steps (Priority Order)

1. **Per-user custody addresses** — derive unique address per user via threshold_signer, register with simplified_bridge
2. **Test redemption flow end-to-end** — burn ckALGO → sign withdrawal → submit to Algorand
3. **Phase 2 confirmations** — canister-side HTTP outcalls to verify Algorand deposits (no trusted backend)
4. **VPS cleanup** — kill unused services eating memory, or upgrade server
5. **Frontend refresh** — update to match current canister interface
