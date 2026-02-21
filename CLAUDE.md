# Sippar — ICP-Algorand Bridge

**Project**: Universal payment bridge for AI agent-to-agent commerce, built on ICP-Algorand Chain Fusion
**Vision**: Agents paying agents across chains via X402 protocol, secured by ICP threshold signatures
**Status**: Bridge layer fully working on mainnet — deposit→mint AND redeem→withdraw both proven. ckETH→ckALGO swap deployed. Agent payment layer prototyped, not production.
**Last Updated**: 2026-02-21

## What This Is

Sippar is the **payment highway for AI agents**. The bridge (ALGO↔ckALGO) is infrastructure. The product is agent-to-agent payments via X402 protocol with mathematical security from ICP threshold signatures — no custody risk, no seed phrases.

**Bridge layer**: Users deposit ALGO → get ckALGO (ICRC-1, 1:1 backed). Redemption burns ckALGO → threshold-signed ALGO withdrawal.

**Agent payment layer**: X402 protocol enables agents to discover, negotiate with, and pay other agents across ecosystems (ELNA, Fetch.ai, Google A2A, Coinbase Bazaar). Sippar collects 0.1% routing fee. Currently prototyped, not production.

**Strategic context**: Algorand's 2025+ roadmap explicitly targets agentic commerce via ASIF (MCP + A2A + x402). Sippar is positioned as the payment bridge that all agent platforms need.

## Architecture

**Read `docs/ARCHITECTURE.md`** for the full picture. Quick summary:

Two canisters on ICP mainnet:
- **threshold_signer** (`vj7ly`) — derives Algorand addresses, signs transactions
- **simplified_bridge** (`hldvt`) — ckALGO token + deposit/mint/redeem logic

Backend on VPS (74.50.113.152:3004) — polls Algorand, manages deposit lifecycle.

**Archived**: `ck_algo` (`gbmxj`) canister — dead 6700-line monolith in `archive/canisters/ck_algo/`.

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
- `simplifiedBridgeService` → talks to simplified_bridge canister (mint, burn, balances)
- `icpCanisterService` → talks to threshold_signer canister (address derivation, signing)
- `depositDetectionService` → polls Algorand via AlgoNode RPC
- `ckethDepositService` → handles ckETH → ckALGO swaps with ICRC-3 verification
- Uses `@dfinity/agent` for ICP canister calls
- **Redemption**: `/ck-algo/redeem` endpoint burns ckALGO and sends ALGO via threshold signature
- **Important**: Use `algorandMainnet` (not `algorandService`) for all mainnet transactions

### Swap (ckETH → ckALGO)
- **Deposit-based pattern** (NOT ICRC-2) — agents transfer ckETH to custody subaccount, no signatures required
- `ckethDepositService` verifies via ICRC-3 `get_transactions()` query (not balance)
- **CRITICAL**: User-provided `ckethAmount` is **IGNORED** — always use on-chain verified amount
- **Subaccount derivation**: Use `simplifiedBridgeService.getSwapCustodySubaccount()`, NOT local SHA256
- **Anti-replay**: Canister tracks processed tx_ids in `processed_swap_deposits` HashSet
- **Exchange rate**: Fetched from ICP Exchange Rate Canister (XRC), ~21,750 ALGO/ETH
- **Endpoints**: `/swap/config`, `/swap/custody-account/:principal`, `/swap/execute`, `/swap/metrics`

### Deployment
- Canisters: `dfx deploy --network ic <canister> --mode upgrade`
- Backend: build locally (`npm run build`), rsync dist + node_modules to VPS, `systemctl restart sippar-backend`
- **VPS has 3.8GB RAM** — npm install fails there. Ship node_modules from local machine.

## Key Docs
- `docs/ARCHITECTURE.md` — system architecture, canister map, flows
- `docs/STATUS.md` — current state, known issues, next steps
- `docs/CODEBASE_INVENTORY.md` — generated 2026-02-19, code-level inventory
- Other docs in `docs/` — from Sept 2025, may contain useful reference but not current

## Don't

- Don't reference `ck_algo` canister (`gbmxj`) — it's archived/dead
- Don't call `generate_deposit_address` — removed, use `register_custody_address`
- Don't use `sign_and_mint_ck_algo` — removed from threshold_signer
- Don't run `npm install` on the VPS — it OOM kills. Ship from local.
- Don't deploy canisters with `--mode reinstall` unless you want to wipe state

### Swap-Specific Don'ts
- Don't trust user-provided `ckethAmount` — always verify via ICRC-3 `get_transactions()`
- Don't derive subaccounts locally with SHA256 — call `get_swap_custody_subaccount()` on canister
- Don't use ICRC-2 approve/transferFrom for swaps — breaks autonomous agent flow
- Don't skip anti-replay check — canister's `is_swap_deposit_processed()` is source of truth
