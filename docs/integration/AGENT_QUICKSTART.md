# Sippar Agent Integration Quickstart

**Last Verified**: 2026-02-21
**Backend**: 74.50.113.152:3004 (or https://nuru.network/api/sippar/)

Get your AI agent making cross-chain payments in 5 minutes.

---

## What Sippar Does

Sippar is a cross-chain payment bridge for AI agents:
- **ckALGO**: ICP-native token 1:1 backed by ALGO
- **ckETH -> ckALGO Swap**: Agents can swap ckETH for ckALGO autonomously
- **X402 Payments**: HTTP 402-based micropayments for agent services

---

## Quick Test (30 seconds)

```bash
# Check the backend is running
curl -s https://nuru.network/api/sippar/health | jq

# Expected:
{
  "status": "healthy",
  "service": "Sippar Algorand Chain Fusion Backend"
}
```

---

## Core Flows

### 1. Check ckALGO Balance

```bash
# Replace with your ICP principal
PRINCIPAL="2vxsx-fae"

curl -s "https://nuru.network/api/sippar/ck-algo/balance/$PRINCIPAL" | jq
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

### 2. Swap ckETH for ckALGO (Autonomous Agent Flow)

This is the core agent integration - no human signatures required.

**Step 1: Get your custody account**

```bash
PRINCIPAL="your-agent-principal"

curl -s "https://nuru.network/api/sippar/swap/custody-account/$PRINCIPAL" | jq
```

Response:
```json
{
  "success": true,
  "custodyAccount": {
    "owner": "hldvt-2yaaa-aaaak-qulxa-cai",
    "subaccount": "a1b2c3...",
    "subaccountArray": [161, 178, 195, ...],
    "ckethCanister": "ss2fx-dyaaa-aaaar-qacoq-cai",
    "instructions": "Transfer ckETH to Account { owner: \"hldvt-2yaaa-aaaak-qulxa-cai\", subaccount: Some([...]) }"
  }
}
```

**Step 2: Transfer ckETH to custody** (using your agent's ICP identity)

```typescript
// Your agent transfers ckETH using icrc1_transfer
const transferResult = await ckethActor.icrc1_transfer({
  to: {
    owner: Principal.fromText("hldvt-2yaaa-aaaak-qulxa-cai"),
    subaccount: [new Uint8Array(subaccountArray)]
  },
  amount: BigInt("100000000000000000"), // 0.1 ETH in wei
  fee: [],
  memo: [],
  from_subaccount: [],
  created_at_time: []
});

const blockIndex = transferResult.Ok.toString();
```

**Step 3: Execute the swap**

```bash
curl -s -X POST "https://nuru.network/api/sippar/swap/execute" \
  -H "Content-Type: application/json" \
  -d '{
    "principal": "your-agent-principal",
    "ckethAmount": "100000000000000000",
    "ckethTxId": "935652"
  }' | jq
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

### 3. X402 Payment for Agent Services

Pay for agent services using ckALGO.

**Step 1: Discover available services**

```bash
curl -s "https://nuru.network/api/sippar/x402/agent-marketplace" | jq
```

**Step 2: Create payment**

```bash
curl -s -X POST "https://nuru.network/api/sippar/x402/create-payment" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 0.01,
    "service": "ai-query",
    "principal": "your-principal"
  }' | jq
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

**Step 3: Use the service with your token**

```bash
curl -s -X POST "https://nuru.network/api/sippar/ci-agents/Developer/code-review" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentToken": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "query": "Review this code for security issues"
  }' | jq
```

---

## Key Endpoints Reference

### Health & Status

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Backend health check |
| `/metrics` | GET | System metrics |

### ckALGO Operations

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/ck-algo/balance/:principal` | GET | Get ckALGO balance |
| `/ck-algo/info` | GET | Token info (name, symbol, total supply) |
| `/ck-algo/redeem` | POST | Burn ckALGO, receive ALGO |

### ckETH -> ckALGO Swap

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/swap/config` | GET | Swap config + current rate |
| `/swap/custody-account/:principal` | GET | Get custody account for deposits |
| `/swap/custody-balance/:principal` | GET | Check ckETH in custody |
| `/swap/execute` | POST | Execute swap after deposit |
| `/swap/deposit-status/:txId` | GET | Check deposit status |
| `/swap/metrics` | GET | Swap service metrics |

### X402 Payments

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/sippar/x402/agent-marketplace` | GET | List available services |
| `/api/sippar/x402/create-payment` | POST | Create payment, get token |
| `/api/sippar/x402/verify-token` | POST | Verify token validity |
| `/api/sippar/x402/payment-status/:id` | GET | Check payment status |

### CI Agent Services

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/sippar/ci-agents/marketplace` | GET | List CI agents |
| `/api/sippar/ci-agents/:agent/:service` | POST | Invoke agent service |
| `/api/sippar/ci-agents/route` | POST | Smart routing (NLP -> agents) |

---

## TypeScript Integration Example

```typescript
import { HttpAgent, Actor } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';

const SIPPAR_API = 'https://nuru.network/api/sippar';

interface SwapResult {
  ckethIn: string;
  ckalgoOut: string;
  rateUsed: number;
}

class SipparClient {
  private principal: string;

  constructor(principal: string) {
    this.principal = principal;
  }

  async getCkAlgoBalance(): Promise<string> {
    const res = await fetch(`${SIPPAR_API}/ck-algo/balance/${this.principal}`);
    const data = await res.json();
    return data.balance_formatted;
  }

  async getSwapCustodyAccount(): Promise<{
    owner: string;
    subaccountArray: number[];
  }> {
    const res = await fetch(`${SIPPAR_API}/swap/custody-account/${this.principal}`);
    const data = await res.json();
    return {
      owner: data.custodyAccount.owner,
      subaccountArray: data.custodyAccount.subaccountArray
    };
  }

  async executeSwap(ckethAmount: bigint, txId: string): Promise<SwapResult> {
    const res = await fetch(`${SIPPAR_API}/swap/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        principal: this.principal,
        ckethAmount: ckethAmount.toString(),
        ckethTxId: txId
      })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.swap;
  }

  async createX402Payment(service: string, amount: number): Promise<string> {
    const res = await fetch(`${SIPPAR_API}/api/sippar/x402/create-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service,
        amount,
        principal: this.principal
      })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.serviceToken;
  }
}

// Usage
const client = new SipparClient('your-principal-here');
const balance = await client.getCkAlgoBalance();
console.log(`ckALGO Balance: ${balance}`);
```

---

## Error Handling

Common errors and solutions:

| Error | Cause | Solution |
|-------|-------|----------|
| `Invalid principal format` | Malformed ICP principal | Use proper format: `xxxxx-xxxxx-xxxxx-xxxxx-cai` |
| `Insufficient unprocessed balance` | ckETH not yet deposited or already processed | Wait for deposit confirmation, check tx_id |
| `Deposit already processed` | Replay attempt | Use a new tx_id (each deposit can only be swapped once) |
| `Swaps are currently disabled` | Admin disabled swaps | Check `/swap/config` for status |
| `Invalid or expired token` | X402 token expired | Create new payment (tokens valid 24h) |

---

## Production Notes

- **Rate Limits**: Default limits apply. Contact for enterprise rates.
- **Token Expiry**: X402 tokens expire after 24 hours
- **Swap Limits**: 0.0001 ETH minimum, 1 ETH maximum per swap
- **Swap Fee**: 0.3% (30 basis points)
- **Exchange Rate**: Fetched from ICP Exchange Rate Canister (XRC)

---

## Next Steps

- [Full API Reference](../api/endpoints.md)
- [Architecture Overview](../ARCHITECTURE.md)
- [ckETH Swap Deep Dive](SWAP_GUIDE.md)
- [X402 Protocol Details](../research/X402.md)

---

**Questions?** Check `/health` first, then `/swap/config` for current system state.
