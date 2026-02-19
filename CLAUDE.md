# Sippar — ICP-Algorand Bridge

**Project**: Universal payment bridge for AI agent-to-agent commerce, built on ICP-Algorand Chain Fusion
**Vision**: Agents paying agents across chains via X402 protocol, secured by ICP threshold signatures
**Status**: Bridge layer working on mainnet (25+ ckALGO minted). Agent payment layer prototyped, not production.
**Last Updated**: 2026-02-19

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
- `simplifiedBridgeService` → talks to simplified_bridge canister
- `icpCanisterService` → talks to threshold_signer canister
- `depositDetectionService` → polls Algorand via AlgoNode RPC
- Uses `@dfinity/agent` for ICP canister calls

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
