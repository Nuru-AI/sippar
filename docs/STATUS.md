# Sippar Status

**Last Updated**: 2026-02-19 19:59 CET

## Vision
Sippar is the **cross-chain payment rail for AI agent commerce**. ICP is invisible middleware (chain fusion, threshold crypto, ckTokens) — not a competing L1. Agents on Ethereum or Solana pay in their native token; Sippar swaps via ICP DEX, burns ckALGO, and settles native ALGO to the receiving agent. No bridges, no seed phrases, no human intervention.

**Combined with Lava Network** (decentralized RPC, 50+ chains, 160B+ requests): full-stack agent infrastructure. Lava = chain access, Sippar = payments. See `docs/strategy/LAVA-SIPPAR-AGENT-INFRA.md`.

See also: `docs/ARCHITECTURE.md`, `working/sprint-018-agent-to-agent-payments/`.

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

### CI Agent Marketplace (Restored 2026-02-19)
- **CI API**: 17 agents loaded, healthy (Docker on VPS port 8080)
- **Marketplace**: 32 services listed (20 CI agents + 12 X402 services)
- **Smart routing**: NLP → agent team assembly, 3ms response time
- **Agent invocation**: Developer (225ms), Auditor (19ms), all agents responding
- **Payment gating**: X402 payment-required flow implemented (needs hardening)
- **✅ Real LLM responses** — Grok (grok-3-mini-fast) via xAI API, 6-12s response times
- **✅ Payment verification fixed** — requires valid X402 token, old `paymentVerified` bypass removed
- **✅ CI agent services in X402 payment whitelist** — all 20 agent service IDs added

### Infrastructure
- Backend running on VPS (74.50.113.152:3004)
- CI API running on VPS (74.50.113.152:8080, Docker, healthy)
- CI Redis + DB healthy on VPS
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

### Real Payment Settlement
- X402 payment tokens are base64-encoded JSON (not on-chain)
- No actual blockchain transaction verification
- Payment gate now requires valid token (bypass fixed) but tokens themselves are simulated

## Known Issues

### Critical
1. **Single custody address** — all users share one address. Works for demo/testing, not for multi-user production.
2. **Confirmation architecture is temporary** — backend reports confirmations to canister (trusted party). Phase 2 should use canister-side HTTP outcalls (ckETH pattern) for trustless verification.
3. **Payment tokens are simulated** — X402 tokens are base64 JSON with expiry, not backed by on-chain transactions. Gate requires valid token now (bypass fixed).

### Important
4. **VPS memory pressure** — 3.8GB RAM, frequently near OOM. npm install fails, services compete for memory.
5. **Backend principal `2vxsx-fae`** — the anonymous principal is used as authorized minter. Should be replaced with the actual deploy identity for production.
6. ~~CI agent services not in payment whitelist~~ — **FIXED**: all 20 CI agent service IDs added

### Cleanup
7. **`ck_algo` canister on mainnet** — archived in code but still deployed. Consider stopping to reclaim cycles.

## Architecture Changes (2026-02-19)

### Morning
- Archived `ck_algo` canister (6700 lines) → `archive/canisters/ck_algo/`
- Removed orphaned `sign_and_mint_ck_algo()` from threshold_signer
- Removed fake `generate_deposit_address()` from simplified_bridge
- Added `register_custody_address()` to simplified_bridge Candid interface
- Updated backend services to match new canister interface
- Both canisters redeployed to mainnet

### Evening (early)
- Fixed CI API Docker container (dead for 2 months — log dir permission error on bind mount)
- Verified full agent marketplace pipeline: marketplace → routing → payment gate → agent invocation
- Discovered Grok API already configured on CI API (grok-3-mini-fast, real LLM responses)

### Evening (Tier 1 complete ~19:58 CET)
- Fixed payment bypass: replaced `paymentVerified` body param with `paymentToken` (X402 service access token)
- Root cause: `sanitizeString` middleware was corrupting base64 tokens (stripping `=` and `/`)
- Fix: skip sanitization for `paymentToken` field in `sanitizeObject`
- Added 20 CI agent service IDs to X402 payment whitelist
- All deployed to VPS, verified on production: valid token → Grok response, no token → 402, old bypass → 402
- Created `docs/strategy/LAVA-SIPPAR-AGENT-INFRA.md` — combined Lava+Sippar agent infrastructure strategy

## What's Prototyped But Not Production

### X402 Agent Payment Infrastructure
- X402 middleware exists (`x402Service.ts`, 10KB)
- x402-sdk package (954 lines TypeScript, published)
- Frontend components: `X402PaymentModal.tsx`, `X402AgentMarketplace.tsx`, `X402Analytics.tsx`
- CI agent integration service (`ciAgentService.ts`, 40KB, 20 agent types)
- Smart routing system (NLP → agent team assembly)
- **Status**: Pipeline works end-to-end with mock responses. Needs LLM keys + real payment verification.

### Agent Platform Integrations (Planned, Not Built)
- ELNA.ai — SNS canister identified, no IDL/API access yet
- Fetch.ai — SDK integration designed, not implemented
- Google A2A — mandate system designed, not implemented
- Coinbase Bazaar — x402 registration planned

## Next Steps (Priority Order)

### Week 1-2: Bridge Completion
1. **Redemption e2e** — ckALGO burn → threshold sign → ALGO delivered (foundation of everything)
2. **Real payment verification** — ICRC-1 transfers, server-side validation (replace fake tokens)
3. **List ckALGO on ICPSwap** — critical for cross-token routing

### Week 3: Cross-Chain Routing
4. **Canister swap integration** — call ICPSwap programmatically (ckETH → ckALGO)
5. **Wire full flow** — swap → burn → sign → settle

### Week 4: Agents
6. **Grok API → CI agents** — real LLM responses
7. **Ethereum-side agent** — pays ckETH, receives service
8. **Algorand-side agent** — receives ALGO, delivers service

### Week 5: Integration + Grant
9. **End-to-end demo** — ETH agent pays, ALGO agent delivers, fully automated
10. **Lava MCP server** — agent-accessible RPC (if time)
11. **Algorand Foundation grant proposal** — Sippar + Lava as agent infra stack

### Deferred
- Per-user custody addresses (post-MVP)
- Phase 2 confirmations / canister HTTP outcalls (post-MVP)
- VPS cleanup (functional for now)
