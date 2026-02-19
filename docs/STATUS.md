# Sippar Status

**Last Updated**: 2026-02-19

## Vision
Sippar is a **universal payment bridge for AI agent-to-agent commerce**. The ICP-Algorand bridge (ckALGO) is the infrastructure layer. The product is agents paying agents across chains via X402, with mathematical security from ICP threshold signatures.

See `docs/ARCHITECTURE.md` for the full vision stack and `working/sprint-018-agent-to-agent-payments/` for the agent payment sprint docs.

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

### Cleanup
5. **`ck_algo` canister on mainnet** — archived in code but still deployed. Consider stopping to reclaim cycles.

## Architecture Changes (2026-02-19)

- Archived `ck_algo` canister (6700 lines) → `archive/canisters/ck_algo/`
- Removed orphaned `sign_and_mint_ck_algo()` from threshold_signer
- Removed fake `generate_deposit_address()` from simplified_bridge
- Added `register_custody_address()` to simplified_bridge Candid interface
- Updated backend services to match new canister interface
- Both canisters redeployed to mainnet

## What's Prototyped But Not Production

### X402 Agent Payment Infrastructure
- X402 middleware exists (`x402Service.ts`, 10KB)
- Frontend components: `X402PaymentModal.tsx`, `X402AgentMarketplace.tsx`, `X402Analytics.tsx`
- CI agent integration service (`ciAgentService.ts`, 40KB, 5 agent types)
- Smart routing system built (Sprint 018.1-018.2)
- **Status**: Code exists, not connected to real agent platforms yet
- **Honest assessment** (from `honest-implementation-status.md`): prototypes use mock data, no real ELNA/Fetch.ai connections

### Agent Platform Integrations (Planned, Not Built)
- ELNA.ai — SNS canister identified, no IDL/API access yet
- Fetch.ai — SDK integration designed, not implemented
- Google A2A — mandate system designed, not implemented
- Coinbase Bazaar — x402 registration planned

## Next Steps (Priority Order)

### Infrastructure (bridge must work first)
1. **Per-user custody addresses** — derive unique address per user via threshold_signer, register with simplified_bridge
2. **Test redemption flow end-to-end** — burn ckALGO → sign withdrawal → submit to Algorand
3. **Phase 2 confirmations** — canister-side HTTP outcalls to verify Algorand deposits (no trusted backend)

### Product (agent payments)
4. **X402 integration with real agents** — connect to at least one live agent platform
5. **Agent registry canister** — on-chain agent discovery and capability advertisement
6. **Universal payment router** — cross-ecosystem routing with 0.1% fee collection

### Ops
7. **VPS cleanup** — kill unused services eating memory, or upgrade server
