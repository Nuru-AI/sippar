# @sippar/x402-sdk

TypeScript SDK for X402 Payment Protocol with ICP Chain Fusion integration - World's first autonomous AI-to-AI payment system with mathematical security backing.

## 🚀 Quick Start

```bash
npm install @sippar/x402-sdk
```

```typescript
import { X402Client } from '@sippar/x402-sdk';

// Initialize client with Internet Identity credentials
const client = new X402Client({
  principal: 'your-internet-identity-principal',
  algorandAddress: 'your-algorand-address'
});

// Discover available services
const marketplace = await client.getMarketplace();

// Create payment for AI service
const payment = await client.createPayment({
  service: 'ai-oracle-enhanced',
  amount: 0.05
});

// Use AI service with payment token
const aiResponse = await client.queryAI({
  query: 'Analyze current market conditions',
  model: 'deepseek-r1'
}, payment.serviceToken);

console.log(aiResponse.ai_response);
```

## 🏗️ Architecture

The X402 Payment Protocol enables autonomous AI-to-AI commerce with mathematical security backing through ICP Chain Fusion technology:

```
AI Agent → HTTP 402 Payment Required → Internet Identity → Payment Token → AI Service Access
    ↓            ↓                       ↓                ↓                 ↓
Request     Payment Required         Threshold Sig    Token Verification  Premium AI
```

### Key Features

- **🔐 Mathematical Security**: Threshold signatures backed by ICP network consensus
- **⚡ Instant Payments**: Sub-second payment creation with 24-hour token validity
- **🤖 AI-First Design**: Built specifically for autonomous AI-to-AI commerce
- **🌐 Cross-Chain**: Algorand integration with ICP security guarantees
- **📊 Analytics**: Real-time usage metrics and enterprise billing

## 📚 Core Concepts

### X402 Payment Protocol

The X402 protocol extends HTTP 402 "Payment Required" status code for AI services:

1. **Service Discovery**: Browse marketplace to find available AI services
2. **Payment Creation**: Create micropayments using Internet Identity
3. **Token Access**: Receive 24-hour service tokens for authenticated access
4. **Service Consumption**: Use tokens to access premium AI capabilities

### Authentication

Authentication uses Internet Identity principals and derived Algorand addresses:

```typescript
const config = {
  principal: '7renf-5svak-mtapl-juxhw-3hv7d-zzfzs-hjlxv-p7wsv-e2zjc-kksxf-3ae',
  algorandAddress: '6W47GCLXWEIEZ2LRQCXF7HGLOYSXYCXOPXJ5YE55EULFHB7O4RWIM3JDCI'
};
```

## 🛠️ API Reference

### X402Client

Main SDK client for all X402 operations.

#### Constructor

```typescript
const client = new X402Client(config: X402Config);
```

**Parameters:**
- `config.principal` (required): Internet Identity principal
- `config.algorandAddress` (required): Algorand address derived from threshold signatures
- `config.baseURL` (optional): API base URL (default: https://nuru.network/api/sippar)
- `config.timeout` (optional): Request timeout in ms (default: 30000)
- `config.apiKey` (optional): Enterprise API key

#### Methods

##### createPayment(request)

Create a payment for accessing X402-protected services.

```typescript
const payment = await client.createPayment({
  service: 'ai-oracle-enhanced',
  amount: 0.05,
  metadata: { userId: 'user123' }
});
```

**Returns:** `X402PaymentResponse` with service token and Algorand integration proof.

##### getPaymentStatus(paymentId)

Check the status of a payment.

```typescript
const status = await client.getPaymentStatus('payment-id-123');
console.log(status.status); // 'pending' | 'completed' | 'failed' | 'expired'
```

##### verifyToken(token)

Verify if a service token is valid and get token details.

```typescript
const tokenInfo = await client.verifyToken('service-token-jwt');
console.log(tokenInfo.valid, tokenInfo.expiresAt);
```

##### getMarketplace()

Discover available services in the X402 marketplace.

```typescript
const marketplace = await client.getMarketplace();
marketplace.marketplace.services.forEach(service => {
  console.log(`${service.name}: $${service.price} - ${service.description}`);
});
```

##### queryAI(request, serviceToken)

Query AI services with payment protection.

```typescript
const response = await client.queryAI({
  query: 'What are the current trends in blockchain technology?',
  model: 'deepseek-r1',
  options: {
    explanation: true,
    confidence_score: true
  }
}, serviceToken);

console.log(response.ai_response);
console.log(`Confidence: ${response.confidence}`);
```

##### callService(endpoint, data, options)

Call any X402-protected service endpoint.

```typescript
const result = await client.callService('/custom/analysis', {
  data: 'analysis-data'
}, {
  token: serviceToken,
  timeout: 60000
});
```

##### payAndCall(service, amount, serviceData, serviceEndpoint)

Convenience method that creates payment and calls service in one operation.

```typescript
const result = await client.payAndCall(
  'ai-oracle-enhanced',
  0.05,
  { query: 'Market analysis', model: 'deepseek-r1' },
  '/ai/enhanced-query'
);
```

## 🎯 Integration Examples

### Basic AI Query

```typescript
import { X402Client } from '@sippar/x402-sdk';

async function basicAIQuery() {
  const client = new X402Client({
    principal: process.env.ICP_PRINCIPAL!,
    algorandAddress: process.env.ALGORAND_ADDRESS!
  });

  try {
    // Create payment
    const payment = await client.createPayment({
      service: 'ai-oracle-basic',
      amount: 0.01
    });

    // Query AI service
    const response = await client.queryAI({
      query: 'Explain blockchain technology in simple terms',
      model: 'phi-3'
    }, payment.serviceToken);

    console.log('AI Response:', response.ai_response);
    console.log('Model Used:', response.model_used);

  } catch (error) {
    if (error instanceof PaymentRequiredError) {
      console.log('Payment required for this service');
    } else if (error instanceof InvalidTokenError) {
      console.log('Service token expired or invalid');
    } else {
      console.error('Error:', error.message);
    }
  }
}
```

### Advanced AI with Reasoning

```typescript
async function advancedAIAnalysis() {
  const client = new X402Client({
    principal: process.env.ICP_PRINCIPAL!,
    algorandAddress: process.env.ALGORAND_ADDRESS!
  });

  // Enhanced AI service with explanation and reasoning
  const result = await client.payAndCall(
    'ai-oracle-enhanced',
    0.05,
    {
      query: 'Analyze the potential impact of quantum computing on blockchain security',
      model: 'deepseek-r1',
      options: {
        explanation: true,
        confidence_score: true,
        reasoning_steps: true
      }
    },
    '/ai/enhanced-query'
  );

  console.log('Analysis:', result.ai_response);
  console.log('Confidence:', result.confidence);
  console.log('Algorand Integration:', result.algorand_integration);
}
```

### Enterprise Integration

```typescript
import { X402Client } from '@sippar/x402-sdk';

class EnterpriseAIService {
  private client: X402Client;

  constructor(apiKey: string, principal: string, algorandAddress: string) {
    this.client = new X402Client({
      apiKey,
      principal,
      algorandAddress,
      baseURL: 'https://enterprise.nuru.network/api/sippar'
    });
  }

  async getBilling() {
    return this.client.getEnterpriseBilling({
      usage: 1000,
      period: '2025-09'
    });
  }

  async getUsageAnalytics() {
    const analytics = await this.client.getAnalytics();
    return {
      totalCalls: analytics.analytics.metrics.totalPayments,
      successRate: analytics.analytics.metrics.successRate,
      algorandIntegration: analytics.analytics.algorand_integration_metrics
    };
  }

  async processAIWorkload(queries: string[]) {
    const results = [];

    for (const query of queries) {
      const result = await this.client.payAndCall(
        'enterprise-ai',
        0.10,
        { query, model: 'deepseek-r1' },
        '/ai/enhanced-query'
      );
      results.push(result);
    }

    return results;
  }
}
```

### Error Handling

```typescript
import {
  X402Client,
  PaymentRequiredError,
  InvalidTokenError,
  ServiceNotFoundError,
  InsufficientFundsError
} from '@sippar/x402-sdk';

async function robustAIQuery() {
  const client = new X402Client({
    principal: process.env.ICP_PRINCIPAL!,
    algorandAddress: process.env.ALGORAND_ADDRESS!
  });

  try {
    const payment = await client.createPayment({
      service: 'ai-oracle-enhanced',
      amount: 0.05
    });

    const response = await client.queryAI({
      query: 'Complex analysis request',
      model: 'deepseek-r1'
    }, payment.serviceToken);

    return response.ai_response;

  } catch (error) {
    if (error instanceof PaymentRequiredError) {
      console.error('Payment required:', error.message);
      // Handle payment required
    } else if (error instanceof InvalidTokenError) {
      console.error('Token invalid:', error.message);
      // Refresh token or create new payment
    } else if (error instanceof ServiceNotFoundError) {
      console.error('Service not found:', error.message);
      // Check marketplace for available services
    } else if (error instanceof InsufficientFundsError) {
      console.error('Insufficient funds:', error.message);
      // Handle funding requirements
    } else {
      console.error('Unexpected error:', error.message);
    }
  }
}
```

## 🔧 Configuration

### Environment Variables

```bash
# Required
ICP_PRINCIPAL=your-internet-identity-principal
ALGORAND_ADDRESS=your-algorand-address

# Optional
X402_API_KEY=your-enterprise-api-key
X402_BASE_URL=https://nuru.network/api/sippar
X402_TIMEOUT=30000
```

### Configuration Options

```typescript
interface X402Config {
  principal: string;              // Internet Identity principal (required)
  algorandAddress: string;        // Algorand address (required)
  baseURL?: string;              // API base URL
  timeout?: number;              // Request timeout in ms
  apiKey?: string;               // Enterprise API key
}
```

## 🌐 Available Services

Current X402 marketplace services:

| Service | Price | Description | Models |
|---------|-------|-------------|---------|
| `ai-oracle-basic` | $0.01 | Basic AI processing | phi-3, mistral |
| `ai-oracle-enhanced` | $0.05 | Advanced reasoning | deepseek-r1, qwen2.5 |
| `market-analysis` | $0.03 | Crypto market analysis | All models |
| `data-analytics` | $0.02 | Data processing | All models |
| `enterprise-ai` | $0.10 | High-performance AI | All models |

## 🔐 Security

- **Threshold Signatures**: Payments secured by ICP network consensus
- **No Private Keys**: Internet Identity handles authentication
- **Mathematical Backing**: Algorand integration with cryptographic proofs
- **Token Security**: JWT-based service tokens with automatic expiration

## 📊 Analytics & Monitoring

Track usage and performance:

```typescript
// Get comprehensive analytics
const analytics = await client.getAnalytics();

console.log('Total Payments:', analytics.analytics.metrics.totalPayments);
console.log('Success Rate:', analytics.analytics.metrics.successRate);
console.log('Algorand Integration:', analytics.analytics.algorand_integration_metrics);

// Enterprise billing
const billing = await client.getEnterpriseBilling({
  usage: 1000,
  period: '2025-09'
});

console.log('Total Cost:', billing.billing.totalCost);
console.log('Next Billing:', billing.billing.nextBillingDate);
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Lint code
npm run lint

# Type check
npm run typecheck
```

## 🚀 Development

```bash
# Install dependencies
npm install

# Build SDK
npm run build

# Watch mode for development
npm run dev

# Prepare for publishing
npm run prepare
```

## 📖 Documentation

- **API Documentation**: Complete endpoint reference
- **Integration Guide**: Step-by-step integration instructions
- **Examples**: Production-ready code examples
- **Architecture**: Technical deep-dive into X402 protocol

## 🤝 Support

- **Issues**: [GitHub Issues](https://github.com/Nuru-AI/sippar/issues)
- **Documentation**: [https://nuru.network/sippar/](https://nuru.network/sippar/)
- **Community**: Join our developer community

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Built by the Sippar Development Team**
*Pioneering autonomous AI-to-AI commerce with mathematical security*