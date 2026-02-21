# Sippar Status

**Last Updated**: 2026-02-21 18:00 UTC

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

### Redeem → Burn → Withdraw (Mainnet, Fully Working 2026-02-20)
- User requests redemption via `/ck-algo/redeem` endpoint
- Backend burns ckALGO via `admin_redeem_ck_algo` on `simplified_bridge` canister
- Creates Algorand withdrawal transaction
- Signs via ICP threshold signatures (`threshold_signer` canister)
- Submits to Algorand mainnet using `algorandMainnet` service
- **Proven**:
  - `F6NK46JT23X24AROCM65CWFFCEM55GSHN54DSLFRGM4UEVUUHTKA` (0.1 ALGO, round 58568996)
  - `KX5MFBTZKYN654BUEEAIIVSVUCKWKCW465EXNFE6XMM3IUPPEHWA` (0.5 ALGO to external wallet, round 58569162)
- Total redeemed: 0.7 ckALGO → 0.6 ALGO delivered (0.1 lost to testnet bug, now fixed)
- Current supply: 23.419 ckALGO

### ICRC-1 Token
- Standard query methods (name, symbol, decimals, fee, total_supply, balance_of)
- Transfers between principals
- Reserve ratio tracking (1:1 backing verified)

### Threshold Signatures
- Ed25519 address derivation from ICP principals
- Transaction signing via ICP Schnorr API
- Proven on both testnet and mainnet (Sept 2025)

### X402 Real Payments (LIVE 2026-02-20)
- Agent calls `POST /api/sippar/x402/create-payment` with service, amount, principal
- Backend transfers ckALGO from payer → treasury via `admin_transfer_ck_algo()` on canister
- Returns signed JWT token (HS256) with transaction proof
- Replay protection: token IDs tracked, consumed after service execution
- **Proven**: Test payment transferred 0.01 ckALGO (10,000 microALGO) to treasury
- **On-chain verification**: `dfx canister call hldvt... icrc1_balance_of` shows 10,000
- Treasury: `smm4f-x54l6-7c2ed-rxdm7-coedl-62i2x-azfmt-ezhzj-ocftg-aa5ir-iqe`

### ckETH → ckALGO Swap (LIVE 2026-02-21)
- Fully autonomous deposit-based swap — no human signatures required
- Agent transfers ckETH to per-principal custody subaccount (SHA256 derived)
- Backend verifies deposit via ICRC-3 `get_transactions()` query (TOCTOU-safe)
- Canister mints ckALGO at XRC exchange rate (~21,750 ALGO/ETH)
- Anti-replay protection via `processed_swap_deposits` HashSet
- **Proven**: First real swap executed on mainnet
  - Input: 0.000248 ETH (248,000,000,000,000 wei)
  - Output: 5.405549 ckALGO
  - Block: 935652
- **Production endpoints** (74.50.113.152:3004):
  - `GET /swap/config` — swap configuration + live rate
  - `GET /swap/custody-account/:principal` — get deposit instructions
  - `GET /swap/custody-balance/:principal` — check ckETH in custody
  - `POST /swap/execute` — execute swap after deposit
  - `GET /swap/deposit-status/:txId` — check processing status
  - `GET /swap/metrics` — service metrics
- **Admin utility**: `admin_sweep_cketh_to_custody()` for recovering misplaced ckETH

### CI Agent Marketplace (Restored 2026-02-19)
- **CI API**: 17 agents loaded, healthy (Docker on VPS port 8080)
- **Marketplace**: 32 services listed (20 CI agents + 12 X402 services)
- **Smart routing**: NLP → agent team assembly, 3ms response time
- **Agent invocation**: Developer (225ms), Auditor (19ms), all agents responding
- **Payment gating**: X402 real payments with JWT tokens
- **✅ Real LLM responses** — Grok (grok-3-mini-fast) via xAI API, 6-12s response times
- **✅ Payment verification fixed** — requires valid X402 token, old `paymentVerified` bypass removed
- **✅ CI agent services in X402 payment whitelist** — all 20 agent service IDs added

### End-to-End Flow: ckETH → ckALGO → X402 Payment → CI Agent (PROVEN 2026-02-21)
- **Full autonomous agent payment flow tested on mainnet production**
- Step 1: ckETH deposit → swap → 5.41 ckALGO minted (block 935652) ✅
- Step 2: X402 payment → 0.01 ckALGO transferred to treasury → JWT issued (3.4s) ✅
- Step 3: JWT token → CI Developer agent invoked → Grok LLM response (7.5s) ✅
- Replay protection confirmed (token consumed after use)
- **Known bug**: Prompt field not passing through to Grok correctly (`[object Object]` — serialization issue in CI agent handler)
- **Balances after test**: `2vxsx-fae` = 23.41 ckALGO, treasury = 5.41 ckALGO

### Infrastructure
- Backend running on VPS (74.50.113.152:3004)
- CI API running on VPS (74.50.113.152:8080, Docker, healthy)
- CI Redis + DB healthy on VPS
- Both canisters deployed on ICP mainnet
- Canister upgrades preserve state (pre_upgrade/post_upgrade with stable storage)

## What Doesn't Work ❌

### Per-User Custody Addresses
- All deposits currently go to ONE shared address (`6W47GCLX...`)
- This address is properly derivable via threshold_signer (principal `2vxsx-fae`, NEW method)
- `custodyAddressService` can derive per-user addresses via threshold_signer
- But the live flow hardcodes the single address on startup
- **Scaling blocker**: Can't distinguish deposits from different users without tx metadata

## Known Issues

### Critical
1. **Single custody address** — all users share one address (`6W47GCLX...`). Works for demo/testing, not for multi-user production.
2. **Confirmation architecture is temporary** — backend reports confirmations to canister (trusted party). Phase 2 should use canister-side HTTP outcalls (ckETH pattern) for trustless verification.

### Important
3. **VPS memory pressure** — 3.8GB RAM, frequently near OOM. npm install fails, services compete for memory.
4. **Backend principal `2vxsx-fae`** — the anonymous principal is used as authorized minter. Should be replaced with the actual deploy identity for production.

### Cleanup
5. **`ck_algo` canister on mainnet** — archived in code but still deployed. Consider stopping to reclaim cycles.

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

## Architecture Changes (2026-02-20)

### Custody Address Cleanup
- **Removed inaccessible address**: `7KJLCG...` was hardcoded but could not be signed by threshold_signer
- **Investigation**: Tested 28+ derivation combinations — address origin unknown (likely external generation, key lost)
- **Written off**: ~24 ALGO at old address (testing loss, all deposits were internal)
- **Replaced with**: `6W47GCLX...` — properly derivable via threshold_signer (principal `2vxsx-fae`, NEW method)
- **Files changed**: `server.ts`, `reserveVerificationService.ts`
- **Backend deployed**: VPS running with new address

### Canister Cleanup
- **Added**: `derive_old_algorand_address()` — migration support for OLD derivation method
- **Removed**: 12 test derivation endpoints (investigation leftovers)
- **Canister deployed**: `vj7ly-diaaa-aaaae-abvoq-cai` upgraded on mainnet

### Documentation
- Created `docs/reports/CUSTODY-ADDRESS-CLEANUP-2026-02-20.md` — full investigation report

### Redemption Flow Fix (~13:42 UTC)
- **Root cause**: `automaticRedemptionService` was calling archived `ck_algo` canister (`gbmxj`) instead of live `simplified_bridge` (`hldvt`)
- **Fix**: Added `admin_redeem_ck_algo` function to `simplified_bridge` canister for backend-initiated burns
- **Updated**: `automaticRedemptionService.ts` now uses `SimplifiedBridgeService.adminRedeemCkAlgo()`
- **Files changed**: `lib.rs`, `simplified_bridge.did`, `simplifiedBridgeService.ts`, `automaticRedemptionService.ts`, `server.ts`
- **Both deployed**: Canister upgraded on mainnet, backend restarted on VPS

### X402 Real Payments Implementation (~15:00-17:00 UTC)
- **Goal**: Replace simulated X402 tokens with real ICRC-1 ckALGO transfers
- **Canister update**: Added `admin_transfer_ck_algo(from, to, amount)` to `simplified_bridge`
- **JWT signing**: Replaced insecure base64 JSON tokens with HS256-signed JWTs
- **Replay protection**: Token IDs tracked to prevent reuse (`consumeToken()`)
- **Backwards compatibility**: Legacy base64 tokens still verified for existing clients
- **Environment variables**: `X402_JWT_SECRET`, `X402_TREASURY_PRINCIPAL`, `X402_REAL_PAYMENTS`
- **Systemd fix**: Added `-r dotenv/config` to preload env vars before module initialization
- **Files changed**: `lib.rs`, `simplified_bridge.did`, `package.json`, `simplifiedBridgeService.ts`, `x402Service.ts`, `server.ts`
- **Canister deployed**: `hldvt` upgraded on mainnet (commit `58b8940`)
- **Backend deployed**: VPS running with real payments enabled
- **Tested**: 0.01 ckALGO transferred to treasury, verified on-chain

## Architecture Changes (2026-02-21)

### ckETH → ckALGO Swap Implementation (PHASE 3 COMPLETE - AUTONOMOUS AGENT FLOW)
- **Goal**: Fully autonomous ckETH → ckALGO swap for AI agents (no human signatures)
- **Architecture Decision**: Deposit-based pattern (NOT ICRC-2) — agents transfer to custody subaccount, backend verifies, canister mints
- **Why not ICRC-2**: `icrc2_approve()` uses `caller()` as owner — backend cannot approve on behalf of users. Breaks autonomous agent flow.
- **Phase 1+2 (Canister)**:
  - `swap_cketh_to_ckalgo()` — authorized minter swap (still available)
  - XRC integration for ETH/ALGO pricing
  - Admin controls: enable/disable, fee (0.3%), limits (0.0001-1 ETH)
- **Phase 3 (Deposit-Based Autonomous Flow)**:
  - `derive_custody_subaccount(principal)` — SHA256 hash for per-agent subaccounts
  - `get_swap_custody_subaccount(principal)` — query subaccount bytes
  - `is_swap_deposit_processed(tx_id)` — anti-replay check
  - `swap_cketh_for_ckalgo_deposit(principal, amount, tx_id, min_out)` — deposit-based swap
  - Backend: `ckethDepositService.ts` (280 lines) — deposit verification + swap execution
  - Backend: 10 new endpoints (`/swap/config`, `/swap/execute`, `/swap/custody-account/:principal`, etc.)
- **Stable storage**: Persists `processed_swap_deposits` HashSet for anti-replay protection
- **Files changed**: `lib.rs`, `Cargo.toml` (sha2), `simplified_bridge.did`, `simplifiedBridgeService.ts`, `ckethDepositService.ts` (NEW), `server.ts`
- **Deployed**: `hldvt` upgraded on mainnet
- **Tested**:
  - `get_swap_custody_subaccount()` → 32-byte subaccount ✅
  - `is_swap_deposit_processed()` → false for new tx_ids ✅
  - `GET /swap/config` → enabled=true, rate=21,750 ALGO/ETH ✅
  - `GET /swap/custody-account/:principal` → full custody instructions ✅
  - **REAL SWAP EXECUTED**: 0.000248 ETH → 5.405549 ckALGO (tx 935652) ✅
- **Admin utility**: `admin_sweep_cketh_to_custody(principal, amount)` — moves ckETH from main account to custody subaccount (for recovery)
- **Status**: PHASE 3 COMPLETE & TESTED ON MAINNET. First real ckETH → ckALGO swap successful.
- **Plan**: `docs/plans/CKETH_CKALGO_SWAP_PLAN.md`

### VPS Deployment (~11:00 UTC)
- **Backend deployed**: All swap endpoints live on 74.50.113.152:3004
- **Endpoints tested**:
  - `/health` — healthy ✅
  - `/swap/custody-account/:principal` — 628ms ✅
  - `/swap/custody-balance/:principal` — 263ms ✅
  - `/swap/deposit-status/:txId` — instant ✅
  - `/swap/metrics` — 580ms ✅
  - `/swap/config` — 75s (XRC rate fetch slow but works) ✅
- **Metrics confirmed**:
  - `ckethBackedCkalgo`: 5,395,549 (5.395549 ckALGO)
  - `totalCkethReceived`: 248,000,000,000,000 wei (0.000248 ETH)
- **Service**: `sippar-backend.service` running, memory 69MB

### E2E Flow Test (~18:00 UTC)
- **Goal**: Prove full ckETH → ckALGO → X402 payment → CI agent invocation flow on production
- **Step 1** (swap): Already proven — 0.000248 ETH → 5.41 ckALGO
- **Step 2** (X402 payment): `POST /api/sippar/x402/create-payment` with `ci-developer-code-generation` service
  - 0.01 ckALGO transferred from `2vxsx-fae` → treasury (`smm4f...`)
  - JWT token issued (HS256, `real: true`), 3.4s processing
- **Step 3** (CI agent invoke): `POST /api/sippar/ci-agents/developer/code-generation` with JWT token
  - Token verified, consumed (replay protection worked)
  - Grok LLM responded via Developer agent, 7.5s
  - **Bug found**: `prompt` field reaches CI agent as `[object Object]` — serialization issue in request forwarding
- **Result**: **E2E FLOW WORKS.** First complete ckETH → agent service invocation on mainnet.
- **Remaining fix**: Prompt passthrough bug in CI agent handler

### Documentation Audit (~17:00 UTC)
- **Audit**: 90+ markdown files, many stale (Sept 2025), ~30 endpoints missing from API docs
- **Created**: `docs/DOCUMENTATION-AUDIT.md`, `docs/README.md`, `docs/api/CURRENT_ENDPOINTS.md` (111 endpoints), `docs/integration/AGENT_QUICKSTART.md`
- **Commit**: `37a2000`

### E2E Flow Trace
- **Report**: `docs/reports/E2E-FLOW-TRACE.md` — 958-line analysis of full payment flow
- **Script**: `scripts/e2e-cketh-to-ci-agent.sh` — executable curl test
- **P0 false positives**: Treasury principal + JWT secret both correctly configured on VPS
- **Commit**: `6dddd97`

### Research Reports
- **Created**: `docs/research/COMPETITIVE-LANDSCAPE-2026-02.md`, `docs/research/MOAT-ASSESSMENT-2026-02.md`, `docs/research/MVP-GAP-ANALYSIS-2026-02.md`
- **Key findings**: Market real ($24M x402), competitors ahead (Coinbase/Stripe/Google), Algorand niche wide open, ICP DePIN + Algorand PQC = institutional moat
- **Commit**: `ee65789`

## What's Prototyped But Not Production

### X402 Agent Payment Infrastructure (PRODUCTION 2026-02-20)
- ✅ X402 service rewritten (`x402Service.ts`, ~450 lines) with JWT + real ICRC-1 transfers
- ✅ Backend transfers ckALGO via `admin_transfer_ck_algo()` — **LIVE, TESTED**
- x402-sdk package (954 lines TypeScript, published)
- Frontend components: `X402PaymentModal.tsx`, `X402AgentMarketplace.tsx`, `X402Analytics.tsx`
- CI agent integration service (`ciAgentService.ts`, 40KB, 20 agent types)
- Smart routing system (NLP → agent team assembly)
- **Status**: Real payments LIVE. Pipeline works end-to-end with Grok LLM and real ckALGO transfers.

### ckETH → ckALGO Swap (PRODUCTION 2026-02-21)
- ✅ **Deposit-based autonomous swap** — agents transfer ckETH to custody subaccount, no signatures required
- ✅ Exchange rate from ICP Exchange Rate Canister (~21,795 ALGO/ETH at test time)
- ✅ Admin controls for enable/disable, fee (0.3%), limits (0.0001-1 ETH)
- ✅ Backend services: `ckethDepositService.ts`, 10 REST endpoints deployed to VPS
- ✅ Anti-replay protection via `processed_swap_deposits` HashSet
- ✅ **First real swap**: 0.000248 ETH → 5.405549 ckALGO (block 935652)
- **Status**: PRODUCTION — canister + backend deployed, all endpoints live on VPS.

### Agent Platform Integrations (Planned, Not Built)
- ELNA.ai — SNS canister identified, no IDL/API access yet
- Fetch.ai — SDK integration designed, not implemented
- Google A2A — mandate system designed, not implemented
- Coinbase Bazaar — x402 registration planned

## Next Steps (Priority Order)

### Week 1-2: Bridge Completion
1. ~~**Redemption e2e**~~ **DONE** — ckALGO burn → threshold sign → ALGO delivered (proven 2026-02-20)
2. ~~**Real payment verification**~~ **DONE + DEPLOYED** — JWT + ICRC-1 transfers (tested on-chain 2026-02-20)
3. **List ckALGO on ICPSwap** — critical for cross-token routing

### Week 3: Cross-Chain Routing
4. ~~**Canister swap integration**~~ **Phase 1+2 DEPLOYED** (`d91bce9`, `d99ec9c`) — ckETH → ckALGO swap in canister, XRC tested (21,743 ALGO/ETH)
5. ~~**Backend swap integration**~~ **Phase 3 DEPLOYED + VPS LIVE** — ckethDepositService.ts, 10 REST endpoints, autonomous agent flow
6. ~~**Wire full flow**~~ **TESTED ON MAINNET** — 0.000248 ETH → 5.405549 ckALGO (block 935652)

### Week 4: Agents
6. ~~**Grok API → CI agents**~~ **DONE** — real LLM responses via grok-3-mini-fast (6-12s)
7. ~~**E2E flow test**~~ **DONE** — ckETH → ckALGO → X402 payment → CI agent → Grok response (proven on mainnet 2026-02-21)
8. **Fix prompt passthrough bug** — `[object Object]` in CI agent handler
9. **Ethereum-side agent script** — autonomous agent that does the full flow
10. **Algorand-side agent** — receives ALGO, delivers service

### Week 5: Integration + Grant
11. **End-to-end demo** — polished version of proven flow
12. **Lava MCP server** — agent-accessible RPC (if time)
13. **Algorand Foundation grant proposal** — Sippar + Lava as agent infra stack

### Deferred
- Per-user custody addresses (post-MVP)
- Phase 2 confirmations / canister HTTP outcalls (post-MVP)
- VPS cleanup (functional for now)
