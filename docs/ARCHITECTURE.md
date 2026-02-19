# Sippar Architecture

**Last Updated**: 2026-02-19

## What Sippar Is

An ICP-Algorand bridge that lets users deposit ALGO and receive ckALGO (chain-key ALGO) on ICP, 1:1 backed. Uses ICP's threshold Ed25519 signatures to control Algorand custody addresses without trusted intermediaries.

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
│  Custody Address: 7KJLCGZSMYMF6CKUGSTHRU75TN6CHJ... │
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

## Redemption Flow (ckALGO → ALGO)

```
1. User calls simplified_bridge.redeem_ck_algo(amount, algorandDestination)
2. Canister burns ckALGO, updates reserves
3. automaticRedemptionService picks up the redemption job
4. Backend calls threshold_signer.derive_algorand_address(userPrincipal) to find custody address
5. Backend builds Algorand payment transaction (custody → user's Algorand address)
6. Backend calls threshold_signer.sign_algorand_transaction(principal, txBytes)
7. Backend submits signed transaction to Algorand mainnet
```

**Note**: threshold_signer IS required for redemptions (signing the withdrawal).

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
| Total supply | 25.119095 ckALGO (as of 2026-02-19) |
