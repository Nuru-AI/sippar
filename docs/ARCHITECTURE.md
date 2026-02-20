# Sippar Architecture

**Last Updated**: 2026-02-20

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
| **simplified_bridge** | `hldvt-2yaaa-aaaak-qulxa-cai` | Token + bridge — ICRC-1 ckALGO token, deposit tracking, minting, burning, reserve accounting |

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
