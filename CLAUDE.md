# Sippar — ICP-Algorand Bridge

**Project**: Trustless bridge between ICP and Algorand using threshold Ed25519 signatures
**Status**: Mainnet — deposit→mint flow working, 25+ ckALGO minted
**Last Updated**: 2026-02-19

## What This Is

Users deposit ALGO to a threshold-controlled custody address. Backend detects the deposit, registers it with the bridge canister, and mints ckALGO (ICRC-1 token) 1:1. Redemption burns ckALGO and uses threshold signatures to send ALGO back.

## Architecture

**Read `docs/ARCHITECTURE.md`** for the full picture. Quick summary:

Two canisters on ICP mainnet:
- **threshold_signer** (`vj7ly`) — derives Algorand addresses, signs transactions
- **simplified_bridge** (`hldvt`) — ckALGO token + deposit/mint/redeem logic

Backend on VPS (74.50.113.152:3004) — polls Algorand, manages deposit lifecycle.

## Key Rules

### Code
- **Rust** for canisters (target `wasm32-unknown-unknown`)
- **TypeScript** for backend (ESM, compiled with tsc)
- Canister upgrades MUST use `--mode upgrade` to preserve state
- Test canister changes with `dfx canister call` before deploying

### Canisters
- `simplified_bridge` is the LIVE token canister — balance changes affect real users
- `threshold_signer` is the crypto engine — changes affect address derivation and signing
- Both use `ic_cdk` 0.13, `candid` 0.10
- Authorized minters: `2vxsx-fae` (anonymous principal) + canister controllers

### Backend
- Express.js on port 3004 behind nginx
- `simplifiedBridgeService` → talks to simplified_bridge canister
- `icpCanisterService` → talks to threshold_signer canister
- `depositDetectionService` → polls Algorand via AlgoNode RPC
- Uses `@dfinity/agent` for ICP canister calls

### Deployment
- Canisters: `dfx deploy --network ic <canister> --mode upgrade`
- Backend: build locally (`npm run build`), rsync dist + node_modules to VPS, `systemctl restart sippar-backend`
- **VPS has 3.8GB RAM** — npm install fails there. Ship node_modules from local machine.

## Project Structure

```
src/canisters/simplified_bridge/   # Live bridge + token canister (662 lines Rust)
src/canisters/threshold_signer/    # Crypto engine canister (280 lines Rust)
src/backend/src/server.ts          # Express backend
src/backend/src/services/          # 24 service files
docs/ARCHITECTURE.md               # System architecture
docs/STATUS.md                     # Current state + known issues
archive/                           # Old canisters + 109 stale docs from Sept 2025
```

## Current State

See `docs/STATUS.md` for details. TL;DR:
- ✅ Deposits + minting work on mainnet (automated)
- ✅ ICRC-1 token works
- ✅ Threshold signatures work
- ❌ Redemption untested on mainnet
- ❌ Single shared custody address (not per-user)
- ❌ Frontend stale since Sept 2025

## Don't

- Don't reference `ck_algo` canister (`gbmxj`) — it's archived/dead
- Don't call `generate_deposit_address` — removed, use `register_custody_address`
- Don't use `sign_and_mint_ck_algo` — removed from threshold_signer
- Don't run `npm install` on the VPS — it OOM kills. Ship from local.
- Don't deploy canisters with `--mode reinstall` unless you want to wipe state
