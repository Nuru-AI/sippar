# Sippar API Endpoints - Current Reference

**Last Verified**: 2026-02-21
**Backend**: 74.50.113.152:3004
**Base URL**: `https://nuru.network/api/sippar/` or `http://74.50.113.152:3004/`

This document reflects the **actual working endpoints** as of the verification date.

---

## Quick Reference

### Core Integration Endpoints (External Developers)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | System health |
| `/ck-algo/balance/:principal` | GET | Get ckALGO balance |
| `/ck-algo/info` | GET | Token info |
| `/ck-algo/redeem` | POST | Burn ckALGO -> ALGO |
| `/swap/config` | GET | Swap config + rate |
| `/swap/custody-account/:principal` | GET | Get deposit address |
| `/swap/execute` | POST | Execute swap |
| `/api/sippar/x402/create-payment` | POST | Create X402 payment |
| `/api/sippar/x402/agent-marketplace` | GET | List services |

---

## Health & Monitoring

### GET /health

System health check.

```bash
curl https://nuru.network/api/sippar/health
```

Response:
```json
{
  "status": "healthy",
  "service": "Sippar Algorand Chain Fusion Backend",
  "version": "1.0.0-alpha",
  "deployment": "Phase 3 - Threshold Signatures",
  "components": {
    "chain_fusion_engine": true,
    "threshold_ecdsa": true,
    "algorand_integration": true,
    "ck_algo_minting": true,
    "icp_canister": true
  }
}
```

### GET /metrics

System performance metrics.

```bash
curl https://nuru.network/api/sippar/metrics
```

### GET /balance-monitor/:address

Monitor ALGO balance for an address.

```bash
curl https://nuru.network/api/sippar/balance-monitor/6W47GCLXWEIEZ2LRQCXF7HGLOYSXYCXOPXJ5YE55EULFHB7O4RWIM3JDCI
```

---

## ckALGO Token Operations

### GET /ck-algo/balance/:principal

Get ckALGO balance for an ICP principal.

```bash
curl https://nuru.network/api/sippar/ck-algo/balance/2vxsx-fae
```

Response:
```json
{
  "success": true,
  "principal": "2vxsx-fae",
  "balance": "23419000",
  "balance_formatted": "23.419 ckALGO"
}
```

### GET /ck-algo/info

Get ckALGO token information.

```bash
curl https://nuru.network/api/sippar/ck-algo/info
```

Response:
```json
{
  "success": true,
  "token": {
    "name": "Chain-Key ALGO",
    "symbol": "ckALGO",
    "decimals": 6
  },
  "totalSupply": 23.419,
  "canisterId": "hldvt-2yaaa-aaaak-qulxa-cai"
}
```

### POST /ck-algo/redeem

Redeem ckALGO for native ALGO.

```bash
curl -X POST https://nuru.network/api/sippar/ck-algo/redeem \
  -H "Content-Type: application/json" \
  -d '{
    "principal": "your-principal",
    "amount": "1000000",
    "destinationAddress": "YOUR_ALGORAND_ADDRESS"
  }'
```

### POST /ck-algo/transfer

Transfer ckALGO between principals.

```bash
curl -X POST https://nuru.network/api/sippar/ck-algo/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "from": "sender-principal",
    "to": "recipient-principal",
    "amount": "1000000"
  }'
```

---

## ckETH to ckALGO Swap

### GET /swap/config

Get swap configuration and current exchange rate.

```bash
curl https://nuru.network/api/sippar/swap/config
```

Response:
```json
{
  "success": true,
  "config": {
    "enabled": true,
    "feeBps": 30,
    "minCketh": "100000000000000",
    "maxCketh": "1000000000000000000",
    "rate": 21795
  }
}
```

### GET /swap/rate

Get current ETH/ALGO exchange rate.

```bash
curl https://nuru.network/api/sippar/swap/rate
```

### GET /swap/custody-account/:principal

Get custody account for ckETH deposits.

```bash
curl https://nuru.network/api/sippar/swap/custody-account/your-principal
```

Response:
```json
{
  "success": true,
  "custodyAccount": {
    "owner": "hldvt-2yaaa-aaaak-qulxa-cai",
    "subaccount": "hex-string",
    "subaccountArray": [1, 2, 3, ...],
    "ckethCanister": "ss2fx-dyaaa-aaaar-qacoq-cai",
    "instructions": "Transfer ckETH to this account"
  }
}
```

### GET /swap/custody-balance/:principal

Check ckETH balance in custody (deposited but not yet swapped).

```bash
curl https://nuru.network/api/sippar/swap/custody-balance/your-principal
```

### POST /swap/execute

Execute ckETH to ckALGO swap after deposit.

```bash
curl -X POST https://nuru.network/api/sippar/swap/execute \
  -H "Content-Type: application/json" \
  -d '{
    "principal": "your-principal",
    "ckethAmount": "100000000000000000",
    "ckethTxId": "935652"
  }'
```

Response:
```json
{
  "success": true,
  "swap": {
    "ckethIn": "100000000000000000",
    "ckethInFormatted": "0.1 ETH",
    "ckalgoOut": "2179500000",
    "ckalgoOutFormatted": "2179.5 ALGO",
    "rateUsed": 21795
  }
}
```

### GET /swap/deposit-status/:txId

Check status of a deposit.

```bash
curl https://nuru.network/api/sippar/swap/deposit-status/935652
```

### GET /swap/history

Get swap history.

```bash
curl https://nuru.network/api/sippar/swap/history
```

### GET /swap/metrics

Get swap service metrics.

```bash
curl https://nuru.network/api/sippar/swap/metrics
```

---

## X402 Payment Protocol

### GET /api/sippar/x402/agent-marketplace

List available services in the X402 marketplace.

```bash
curl https://nuru.network/api/sippar/x402/agent-marketplace
```

Response:
```json
{
  "success": true,
  "services": [
    {
      "id": "ai-query",
      "name": "Basic AI Query",
      "price": 0.01,
      "currency": "USD"
    }
  ]
}
```

### POST /api/sippar/x402/create-payment

Create a payment for service access.

```bash
curl -X POST https://nuru.network/api/sippar/x402/create-payment \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 0.01,
    "service": "ai-query",
    "principal": "your-principal"
  }'
```

Response:
```json
{
  "success": true,
  "paymentId": "payment_1708534800000_abc123",
  "serviceToken": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "expiresAt": "2026-02-22T12:00:00.000Z"
}
```

### POST /api/sippar/x402/verify-token

Verify a service token.

```bash
curl -X POST https://nuru.network/api/sippar/x402/verify-token \
  -H "Content-Type: application/json" \
  -d '{
    "serviceToken": "eyJ...",
    "service": "ai-query"
  }'
```

### GET /api/sippar/x402/payment-status/:id

Check payment status.

```bash
curl https://nuru.network/api/sippar/x402/payment-status/payment_123
```

### GET /api/sippar/x402/analytics

Get X402 payment analytics.

```bash
curl https://nuru.network/api/sippar/x402/analytics
```

### POST /api/sippar/x402/enterprise-billing

Enterprise billing endpoint.

```bash
curl -X POST https://nuru.network/api/sippar/x402/enterprise-billing \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "enterprise_001",
    "services": ["ai-query"],
    "billingCycle": "monthly"
  }'
```

---

## CI Agent Services

### GET /api/sippar/ci-agents/marketplace

List available CI agents.

```bash
curl https://nuru.network/api/sippar/ci-agents/marketplace
```

### POST /api/sippar/ci-agents/:agent/:service

Invoke a CI agent service. Requires X402 payment token.

```bash
curl -X POST https://nuru.network/api/sippar/ci-agents/Developer/code-review \
  -H "Content-Type: application/json" \
  -d '{
    "paymentToken": "eyJ...",
    "query": "Review this code"
  }'
```

### POST /api/sippar/ci-agents/route

Smart routing - NLP to agent team assembly.

```bash
curl -X POST https://nuru.network/api/sippar/ci-agents/route \
  -H "Content-Type: application/json" \
  -d '{
    "query": "I need help debugging my code",
    "paymentToken": "eyJ..."
  }'
```

### GET /api/sippar/ci-agents/health

CI agent service health.

```bash
curl https://nuru.network/api/sippar/ci-agents/health
```

---

## Threshold Signing API

### GET /api/v1/threshold/status

Get threshold signer status.

```bash
curl https://nuru.network/api/sippar/api/v1/threshold/status
```

### POST /api/v1/threshold/derive-address

Derive Algorand address from principal.

```bash
curl -X POST https://nuru.network/api/sippar/api/v1/threshold/derive-address \
  -H "Content-Type: application/json" \
  -d '{"principal": "your-principal"}'
```

### POST /api/v1/threshold/sign-transaction

Sign an Algorand transaction.

```bash
curl -X POST https://nuru.network/api/sippar/api/v1/threshold/sign-transaction \
  -H "Content-Type: application/json" \
  -d '{
    "principal": "your-principal",
    "transaction_bytes": "base64_encoded_tx"
  }'
```

---

## Reserve Management

### GET /reserves/status

Get reserve status.

```bash
curl https://nuru.network/api/sippar/reserves/status
```

### GET /reserves/proof

Get cryptographic proof of reserves.

```bash
curl https://nuru.network/api/sippar/reserves/proof
```

---

## Algorand Integration

### GET /algorand/account/:address

Get Algorand account info.

```bash
curl https://nuru.network/api/sippar/algorand/account/YOUR_ADDRESS
```

### GET /algorand/deposits/:address

Get deposits for an Algorand address.

```bash
curl https://nuru.network/api/sippar/algorand/deposits/YOUR_ADDRESS
```

---

## Admin Endpoints

These endpoints require controller authorization.

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/swap/admin/enable` | POST | Enable/disable swaps |
| `/swap/admin/fee` | POST | Set swap fee |
| `/swap/admin/limits` | POST | Set swap limits |
| `/reserves/admin/pause` | POST | Emergency pause |
| `/reserves/admin/unpause` | POST | Clear emergency pause |
| `/ck-algo/admin/restore-balance` | POST | Restore balance |

---

## Monitoring Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/monitoring/system` | GET | System metrics |
| `/monitoring/migration` | GET | Migration status |
| `/monitoring/reserves` | GET | Reserve health |
| `/monitoring/alerts` | GET | Active alerts |
| `/monitoring/dashboard` | GET | Dashboard data |
| `/monitoring/history` | GET | Historical metrics |

---

## Deposit Monitoring

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/deposits/monitoring-stats` | GET | Monitoring statistics |
| `/deposits/start-monitoring` | POST | Start monitoring |
| `/deposits/stop-monitoring` | POST | Stop monitoring |
| `/deposits/pending` | GET | Pending deposits |

---

## Internal/Legacy Endpoints

These endpoints exist but are primarily for internal use or debugging:

- `/derive-algorand-credentials` - Internal credential derivation
- `/canister/test` - Canister connectivity test
- `/chain-fusion/transfer-algo` - Direct ALGO transfer (use redeem instead)
- `/migrate-algo` - Migration utility
- `/test-*` and `/debug-*` endpoints - Development only

---

## Complete Endpoint Count

As of 2026-02-21, the backend has **111 endpoints** total:

| Category | Count |
|----------|-------|
| ckALGO operations | 30+ |
| Swap operations | 12 |
| X402 payments | 10 |
| CI agents | 5 |
| Monitoring | 8 |
| Reserves | 6 |
| Threshold signing | 5 |
| Admin/internal | 35+ |

---

**Note**: The old `docs/api/endpoints.md` (dated September 2025) is outdated and should be replaced with this document.
