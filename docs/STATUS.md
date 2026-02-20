# Sippar Status

**Last Updated**: 2026-02-21 14:30 CET

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

### CI Agent Marketplace (Restored 2026-02-19)
- **CI API**: 17 agents loaded, healthy (Docker on VPS port 8080)
- **Marketplace**: 32 services listed (20 CI agents + 12 X402 services)
- **Smart routing**: NLP → agent team assembly, 3ms response time
- **Agent invocation**: Developer (225ms), Auditor (19ms), all agents responding
- **Payment gating**: X402 real payments with JWT tokens
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

### ckETH → ckALGO Swap Implementation (Phase 1+2 DEPLOYED)
- **Goal**: Direct swap function for cross-chain agent payments
- **Canister update**: Added `swap_cketh_to_ckalgo()` to `simplified_bridge`
- **XRC integration**: Inter-canister calls to Exchange Rate Canister for ETH/ALGO pricing
- **ICRC-2 support**: Added `icrc2_transfer_from` capability to pull ckETH from users
- **Reserve tracking**: Separate tracking of ckETH-backed vs ALGO-backed ckALGO
- **Admin controls**: `set_swap_enabled`, `set_swap_fee_bps`, `set_swap_limits`
- **Configuration**: 0.3% fee, 0.0001-1 ETH limits, disabled by default
- **Stable storage**: Updated `pre_upgrade`/`post_upgrade` for swap state persistence
- **Files changed**: `lib.rs` (+500 lines), `simplified_bridge.did` (+25 lines)
- **Commits**:
  - `d91bce9` feat: implement ckETH → ckALGO swap in simplified_bridge canister
  - `d99ec9c` fix: XRC integration - add cycles and missing error variants
- **XRC fix**: Changed `ic_cdk::call` to `call_with_payment128` (1B cycles per XRC request)
- **Deployed**: `hldvt` upgraded on mainnet
- **Tested**: `get_current_eth_algo_rate()` → **21,743.81 ALGO/ETH** ✅
- **Status**: Phase 1+2 DEPLOYED & TESTED. Phase 3 (backend) pending.
- **Plan**: `docs/plans/CKETH_CKALGO_SWAP_PLAN.md`

## What's Prototyped But Not Production

### X402 Agent Payment Infrastructure (PRODUCTION 2026-02-20)
- ✅ X402 service rewritten (`x402Service.ts`, ~450 lines) with JWT + real ICRC-1 transfers
- ✅ Backend transfers ckALGO via `admin_transfer_ck_algo()` — **LIVE, TESTED**
- x402-sdk package (954 lines TypeScript, published)
- Frontend components: `X402PaymentModal.tsx`, `X402AgentMarketplace.tsx`, `X402Analytics.tsx`
- CI agent integration service (`ciAgentService.ts`, 40KB, 20 agent types)
- Smart routing system (NLP → agent team assembly)
- **Status**: Real payments LIVE. Pipeline works end-to-end with Grok LLM and real ckALGO transfers.

### ckETH → ckALGO Swap (DEPLOYED & TESTED 2026-02-21)
- Canister code complete: `swap_cketh_to_ckalgo()` with ICRC-2 + XRC
- Pulls ckETH from user via `icrc2_transfer_from`, mints ckALGO
- Exchange rate from ICP Exchange Rate Canister (no fallback)
- Admin controls for enable/disable, fee, limits
- XRC tested: 21,743.81 ALGO/ETH rate returned successfully
- **Status**: Canister DEPLOYED on mainnet. Backend integration (Phase 3) pending.

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
5. **Backend swap integration** — Phase 3: swapService.ts, IDL bindings, server endpoints
6. **Wire full flow** — swap → burn → sign → settle

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
