# X402 SDK Quickstart Guide

Get up and running with X402 payments in under 5 minutes.

## 🚀 Installation

```bash
npm install @sippar/x402-sdk
```

## ⚡ Quick Example

```typescript
import { X402Client } from '@sippar/x402-sdk';

// Initialize client
const client = new X402Client({
  principal: 'your-internet-identity-principal',
  algorandAddress: 'your-algorand-address'
});

// Create payment and use AI service
async function quickDemo() {
  // 1. Create payment
  const payment = await client.createPayment({
    service: 'ai-oracle-enhanced',
    amount: 0.05
  });

  // 2. Use AI service
  const response = await client.queryAI({
    query: 'What are the benefits of blockchain technology?',
    model: 'deepseek-r1'
  }, payment.serviceToken);

  console.log(response.ai_response);
}

quickDemo();
```

## 🔧 Configuration

### Required Parameters

```typescript
interface X402Config {
  principal: string;        // Your Internet Identity principal
  algorandAddress: string;  // Your Algorand address
  baseURL?: string;        // API base URL (optional)
  timeout?: number;        // Request timeout (optional)
  apiKey?: string;         // Enterprise API key (optional)
}
```

### Getting Your Credentials

1. **Internet Identity Principal**: Available from your Internet Identity
2. **Algorand Address**: Derived from threshold signatures via ICP

## 📖 Core Concepts

### Payment Flow

1. **Create Payment** → Get service token
2. **Use Service** → Provide token for access
3. **Monitor Status** → Track payment status

### Service Types

- `ai-oracle-basic` - $0.01 - Basic AI processing
- `ai-oracle-enhanced` - $0.05 - Advanced reasoning
- `market-analysis` - $0.03 - Crypto analysis
- `enterprise-ai` - $0.10 - High-performance AI

## 🔍 Common Patterns

### Error Handling

```typescript
import { PaymentRequiredError, InvalidTokenError } from '@sippar/x402-sdk';

try {
  const response = await client.queryAI(request, token);
} catch (error) {
  if (error instanceof PaymentRequiredError) {
    // Create new payment
  } else if (error instanceof InvalidTokenError) {
    // Token expired, refresh
  }
}
```

### Convenience Method

```typescript
// Create payment and call service in one step
const result = await client.payAndCall(
  'ai-oracle-enhanced',
  0.05,
  { query: 'Analyze market trends', model: 'deepseek-r1' },
  '/ai/enhanced-query'
);
```

## 🎯 Next Steps

- [Full API Reference](./README.md#api-reference)
- [Enterprise Integration](./README.md#enterprise-integration)
- [Error Handling Guide](./README.md#error-handling)
- [Live Demo](https://demo.nuru.network/sippar-x402/)

## 💬 Support

- [GitHub Issues](https://github.com/Nuru-AI/sippar/issues)
- [Documentation](https://nuru.network/sippar/)
- [Developer Community](https://github.com/Nuru-AI/sippar/discussions)