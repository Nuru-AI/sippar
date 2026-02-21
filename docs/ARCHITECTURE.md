# Sippar Architecture

**Last Updated**: 2026-02-21

## What Sippar Is

**The universal payment bridge for AI agent-to-agent commerce**, built on ICP-Algorand Chain Fusion.

The bridge (ALGO → ckALGO) is the **infrastructure layer**. The product is **agent-to-agent payments** — AI agents discovering, negotiating with, and paying other agents across chains using ckALGO, secured by ICP threshold signatures with zero custody risk.

### Vision Stack
```
┌─────────────────────────────────────────────┐
│  Agent-to-Agent Commerce (the product)      │
│  • X402 payment protocol (HTTP 402)         │
│  • Agent discovery + marketplace            │
│  • Cross-ecosystem routing (ELNA, Fetch.ai, │
│    Google A2A, Coinbase Bazaar)              │
│  • 0.1% routing fee revenue model           │
├─────────────────────────────────────────────┤
│  ckALGO Bridge (the infrastructure)         │
│  • ICP threshold Ed25519 signatures         │
│  • ICRC-1 token, 1:1 ALGO backed            │
│  • Zero custody risk (mathematical security)│
│  • Internet Identity (no seed phrases)      │
├─────────────────────────────────────────────┤
│  Algorand Settlement (the rails)            │
│  • 2.8s finality, $0.001/tx                 │
│  • x402 native support (Algorand 2025+)     │
│  • ASIF framework (MCP + A2A + x402)        │
└─────────────────────────────────────────────┘
```

### Why This Architecture
- **Algorand's 2025+ roadmap** explicitly targets agentic commerce via x402 + MCP + A2A
- **ICP Chain Fusion** provides mathematical security (threshold crypto) vs economic security (staking)
- **Sippar is the payment highway** — agents are the cars, we're the roads
- **Competitive moat**: 12-18 months to replicate threshold signature infrastructure

## System Components

```
┌─────────────────────────────────────────────────────┐
│                   ICP Mainnet                        │
│                                                      │
│  ┌──────────────────┐    ┌──────────────────────┐   │
│  │ threshold_signer  │    │  simplified_bridge    │   │
│  │ vj7ly-...abvoq    │    │  hldvt-...qulxa      │   │
│  │                    │    │                       │   │
│  │ • derive_algorand_ │    │ • ICRC-1 ckALGO token│   │
│  │   address()        │    │ • register_custody_   │   │
│  │ • sign_algorand_   │    │   address()           │   │
│  │   transaction()    │    │ • register_pending_   │   │
│  │                    │    │   deposit()           │   │
│  │ Ed25519 threshold  │    │ • update_deposit_     │   │
│  │ signatures via ICP │    │   confirmations()     │   │
│  │ Schnorr API        │    │ • mint_after_deposit_ │   │
│  └──────────────────┘    │   confirmed()          │   │
│                           │ • redeem_ck_algo()     │   │
│                           └──────────────────────┘   │
└─────────────────────────────────────────────────────┘
         │                          │
         │ signs withdrawal txns    │ deposit/mint/burn
         │                          │
┌─────────────────────────────────────────────────────┐
│              Backend (VPS 74.50.113.152:3004)         │
│                                                      │
│  icpCanisterService ──→ threshold_signer             │
│  simplifiedBridgeService ──→ simplified_bridge       │
│                                                      │
│  depositDetectionService   (polls Algorand mainnet)  │
│  automaticMintingService   (queues confirmed → mint) │
│  automaticRedemptionService (burn → sign → send ALGO)│
│  custodyAddressService     (derives + registers)     │
└─────────────────────────────────────────────────────┘
         │
         │ polls / submits txns
         │
┌─────────────────────────────────────────────────────┐
│              Algorand Mainnet                        │
│                                                      │
│  Custody Address: 6W47GCLXWEIEZ2LRQCXF7HGLOYSXYC... │
│  (threshold-controlled, derived for principal        │
│   2vxsx-fae via threshold_signer canister)           │
└─────────────────────────────────────────────────────┘
```

## Canisters

| Canister | ID | Purpose |
|---|---|---|
| **threshold_signer** | `vj7ly-diaaa-aaaae-abvoq-cai` | Crypto engine — derives Algorand addresses from ICP principals, signs Algorand transactions using ICP's threshold Ed25519 |
| **simplified_bridge** | `hldvt-2yaaa-aaaak-qulxa-cai` | Token + bridge — ICRC-1 ckALGO token, deposit tracking, minting, burning, reserve accounting, X402 transfers |

**Archived**: `ck_algo` (`gbmxj-yiaaa-aaaak-qulqa-cai`) — original 6700-line monolith with AI/compliance/governance code. Replaced by simplified_bridge. Code in `archive/canisters/ck_algo/`.

## Deposit Flow (ALGO → ckALGO)

```
1. Backend starts → auto-registers hardcoded custody address with simplified_bridge
2. User sends ALGO to custody address on Algorand mainnet
3. depositDetectionService polls Algorand, detects incoming transaction
4. Backend calls simplified_bridge.register_pending_deposit(user, txId, amount, address, requiredConfirmations)
5. Backend monitors Algorand rounds until confirmations >= required (6 for mainnet)
6. Backend calls simplified_bridge.update_deposit_confirmations(txId, confirmations)
7. automaticMintingService calls simplified_bridge.mint_after_deposit_confirmed(txId)
8. Canister mints ckALGO to user's balance, updates reserves
```

**Note**: threshold_signer is NOT involved in deposits. The custody address is hardcoded.

## Redemption Flow (ckALGO → ALGO) — WORKING

```
1. User calls POST /ck-algo/redeem with principal, amount, destinationAddress
2. Backend calls simplified_bridge.admin_redeem_ck_algo() to burn ckALGO
3. Backend calls threshold_signer.derive_algorand_address(userPrincipal) to find custody address
4. Backend builds Algorand payment transaction (custody → user's Algorand address)
5. Backend calls threshold_signer.sign_algorand_transaction(principal, txBytes)
6. Backend submits signed transaction to Algorand mainnet via algorandMainnet.submitTransaction()
```

**Proven**: Transaction `KX5MFBTZKYN654BUEEAIIVSVUCKWKCW465EXNFE6XMM3IUPPEHWA` (0.5 ALGO, round 58569162)

**Note**: Must use `algorandMainnet` service (not `algorandService` which is testnet).

## Backend Services

| Service | File | Talks To | Purpose |
|---|---|---|---|
| `simplifiedBridgeService` | simplifiedBridgeService.ts | simplified_bridge canister | All bridge + token operations |
| `icpCanisterService` | icpCanisterService.ts | threshold_signer canister | Address derivation + tx signing |
| `depositDetectionService` | depositDetectionService.ts | Algorand mainnet (AlgoNode) | Polls for deposits to custody addresses |
| `automaticMintingService` | automaticMintingService.ts | (via simplifiedBridgeService) | Queues and processes confirmed deposits |
| `automaticRedemptionService` | automaticRedemptionService.ts | threshold_signer + Algorand | Signs and submits withdrawal transactions |
| `custodyAddressService` | custodyAddressService.ts | Both canisters | Generates and registers custody addresses |
| `x402Service` | x402Service.ts | simplified_bridge canister | X402 payments, JWT tokens, replay protection |
| `ckethDepositService` | ckethDepositService.ts | ckETH canister + simplified_bridge | ckETH → ckALGO swap with ICRC-3 verification |

## Infrastructure

| Component | Location |
|---|---|
| Backend | Hivelocity VPS `74.50.113.152`, port 3004, systemd `sippar-backend.service` |
| Frontend | `https://nuru.network/sippar/` (React + Zustand) |
| ICP Canisters | ICP mainnet (ic0.app) |
| Algorand | Mainnet via AlgoNode RPC |

## Token Details

| Property | Value |
|---|---|
| Name | Chain-Key ALGO |
| Symbol | ckALGO |
| Standard | ICRC-1 |
| Decimals | 6 (matches ALGO) |
| Fee | 0.01 ckALGO (10,000 microALGO) |
| Min deposit | 0.1 ALGO |
| Max deposit | 1M ALGO |
| Confirmations | 6 (mainnet), 3 (testnet) |
| Total supply | 23.419 ckALGO (as of 2026-02-20, after 0.7 redeemed) |

## X402 Agent Payment Architecture (2026-02-20)

X402 enables agents to pay for services with real ckALGO transfers, verified by JWT tokens.

### Payment Flow

```
1. Agent requests service → GET /api/sippar/ci-agents/marketplace
2. Agent calls POST /api/sippar/x402/create-payment with:
   - serviceEndpoint, paymentAmount, payerCredentials (principal)
3. Backend calls simplified_bridge.admin_transfer_ck_algo(from, treasury, amount)
4. If transfer succeeds, backend signs JWT token with payment proof
5. Agent receives serviceAccessToken (JWT) with txId, amount, expiry
6. Agent calls POST /api/sippar/ci-agents/:agent/:service with paymentToken
7. Backend verifies JWT signature, checks not already consumed
8. Service executes, token marked as consumed (replay protection)
```

### Components

| Component | File | Purpose |
|---|---|---|
| `x402Service` | x402Service.ts | Payment creation, JWT signing/verification, replay protection |
| `admin_transfer_ck_algo` | simplified_bridge canister | Backend-initiated ckALGO transfers between principals |
| Treasury Principal | env `X402_TREASURY_PRINCIPAL` | Destination for all agent payments |

### JWT Token Structure

```typescript
interface X402PaymentJWT {
  sub: string;    // payer principal
  svc: string;    // service endpoint
  amt: number;    // amount in ckALGO
  txId: string;   // canister transfer index
  iat: number;    // issued at (seconds)
  exp: number;    // expiry (24 hours)
  jti: string;    // unique token ID (for replay protection)
  real: boolean;  // true = real ckALGO transfer
}
```

### Environment Variables

| Variable | Purpose | Default |
|---|---|---|
| `X402_JWT_SECRET` | HMAC secret for JWT signing | dev-secret (MUST change in prod) |
| `X402_TREASURY_PRINCIPAL` | Payment destination | none (required for real payments) |
| `X402_REAL_PAYMENTS` | Enable real ckALGO transfers | false (simulated mode) |

### Security

- JWT tokens signed with HS256 (HMAC-SHA256)
- Replay protection: token IDs tracked, consumed after service execution
- Backwards compatibility: legacy base64 tokens still verified (for migration)
- Backend-initiated transfers: only authorized minters can call `admin_transfer_ck_algo`

## ckETH → ckALGO Swap Architecture (2026-02-21)

Enables autonomous AI agents to swap ckETH for ckALGO without human signatures.

### Why Deposit-Based (Not ICRC-2)

ICRC-2's `icrc2_approve()` function uses `caller()` as the token owner. This means:
- The backend's anonymous principal (`2vxsx-fae`) cannot approve on behalf of users
- Users would need to sign approval transactions manually
- **This breaks autonomous agent operation**

The deposit-based pattern solves this:
1. Agent transfers ckETH to a custody subaccount (owned by the canister)
2. Backend verifies the on-chain transaction
3. Canister mints ckALGO to the agent

### Flow Diagram

```
┌──────────────┐     1. Transfer ckETH      ┌──────────────────┐
│              │ ─────────────────────────→ │  ckETH Canister  │
│    Agent     │                            │  (custody sub-   │
│  (principal) │                            │   account)       │
└──────────────┘                            └──────────────────┘
       │                                            │
       │ 2. POST /swap/execute                      │
       │    with tx_id (block index)                │
       ▼                                            │
┌──────────────────────────────────────┐            │
│           Backend                     │            │
│                                       │ 3. ICRC-3  │
│  ckethDepositService:                 │◀───────────┘
│  • Queries get_transactions(block_id) │    query
│  • Verifies recipient = custody       │
│  • Extracts ACTUAL amount from tx     │
│  • Ignores user-provided amount       │
└──────────────────────────────────────┘
       │
       │ 4. swap_cketh_for_ckalgo_deposit()
       │    (with verified amount)
       ▼
┌──────────────────────────────────────┐
│      simplified_bridge canister       │
│                                       │
│  • Checks tx_id not already processed │
│  • Fetches ETH/ALGO rate from XRC     │
│  • Mints ckALGO to agent principal    │
│  • Records tx_id in processed set     │
└──────────────────────────────────────┘
       │
       │ 5. ckALGO minted
       ▼
┌──────────────┐
│    Agent     │  Now has ckALGO!
│  (principal) │
└──────────────┘
```

### Security Model

| Threat | Mitigation |
|--------|------------|
| **TOCTOU race condition** | Uses ICRC-3 to query immutable transaction data, not mutable balance |
| **Amount manipulation** | User-provided `ckethAmount` is **IGNORED**. Backend extracts actual amount from on-chain transaction |
| **Replay attacks** | `processed_swap_deposits` HashSet in canister tracks all tx_ids |
| **Wrong custody subaccount** | Backend queries canister's `get_swap_custody_subaccount()` instead of local derivation |
| **Float overflow** | Bounds check before `f64 as u64` cast in canister |

### Per-Principal Custody Subaccounts

Each agent has a unique custody subaccount derived as:
```
subaccount = SHA256(agent_principal.as_bytes())[0:32]
```

The canister owns all subaccounts, so it can:
- Receive ckETH transfers without approval
- Track which agent deposited what
- Isolate deposits between agents

### Canister Functions

| Function | Type | Purpose |
|----------|------|---------|
| `get_swap_custody_subaccount(principal)` | Query | Get 32-byte subaccount for agent deposits |
| `is_swap_deposit_processed(tx_id)` | Query | Check if tx_id already processed (anti-replay) |
| `swap_cketh_for_ckalgo_deposit(principal, amount, tx_id, min_out)` | Update | Execute deposit-based swap |
| `get_swap_config()` | Query | Get swap configuration (fee, limits, rate) |
| `set_swap_enabled(bool)` | Update | Admin: enable/disable swaps |
| `admin_sweep_cketh_to_custody(principal, amount)` | Update | Admin: move ckETH from main account to custody (recovery) |

### REST Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/swap/config` | GET | Swap config + current ETH/ALGO rate |
| `/swap/custody-account/:principal` | GET | Get custody subaccount for deposits |
| `/swap/custody-balance/:principal` | GET | Check ckETH balance in custody |
| `/swap/execute` | POST | Execute swap after deposit |
| `/swap/metrics` | GET | Service metrics |

### Configuration

| Parameter | Value | Notes |
|-----------|-------|-------|
| Fee | 0.3% (30 bps) | Configurable via `set_swap_fee_bps()` |
| Min swap | 0.0001 ETH | ~$0.20 at current prices |
| Max swap | 1 ETH | ~$2000 at current prices |
| Exchange rate | XRC canister | ~21,750 ALGO/ETH (Feb 2026) |

### CRITICAL: Security Rules

1. **NEVER trust user-provided amounts** — Always use on-chain verified amount from ICRC-3 query
2. **ALWAYS use canister's subaccount query** — Don't derive locally, call `get_swap_custody_subaccount()`
3. **tx_id is block index** — Must be a valid ckETH block index, not arbitrary string
4. **Anti-replay is in canister** — Backend check is optimization only, canister is source of truth
