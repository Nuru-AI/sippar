# Sippar X402 Developer Guide

## 📚 Complete Integration Guide for X402 Payment Protocol

Welcome to the comprehensive developer guide for integrating Sippar's X402 payment protocol into your applications. This guide covers everything from basic concepts to advanced implementation patterns.

---

## 🎯 **Quick Start**

### 1. **Understanding X402**
X402 extends HTTP 402 "Payment Required" to enable seamless AI-to-AI commerce using:
- **Internet Computer (ICP)** threshold signatures for authentication
- **Algorand blockchain** for payment settlement and asset backing
- **Chain Fusion technology** for trustless cross-chain operations

### 2. **Basic Integration (5 minutes)**
```bash
npm install @sippar/x402-sdk
```

```typescript
import { X402Client } from '@sippar/x402-sdk';

const client = new X402Client({
  principal: 'your-internet-identity-principal',
  algorandAddress: 'your-algorand-address'
});

// Create payment and use service
const payment = await client.createPayment({
  service: 'ai-oracle-enhanced',
  amount: 0.05
});

const response = await client.queryAI({
  query: 'What is blockchain technology?',
  model: 'deepseek-r1'
}, payment.serviceToken);
```

---

## 🏗️ **Architecture Overview**

### **Payment Flow**
```
┌─────────────┐    ┌──────────────┐    ┌─────────────────┐
│   Client    │    │  X402 API    │    │ Service Provider│
│ Application │    │   Gateway    │    │   (AI Oracle)   │
└─────────────┘    └──────────────┘    └─────────────────┘
       │                   │                      │
       │ 1. Create Payment │                      │
       ├──────────────────►│                      │
       │                   │ 2. ICP Threshold    │
       │                   │    Signature        │
       │                   ├──────────────────────┤
       │                   │ 3. Algorand         │
       │                   │    Settlement       │
       │                   ├──────────────────────┤
       │ 4. Service Token  │                      │
       │◄──────────────────┤                      │
       │                   │                      │
       │ 5. AI Query + Token                      │
       ├─────────────────────────────────────────►│
       │                                          │
       │ 6. AI Response                           │
       │◄─────────────────────────────────────────┤
```

### **Key Components**
- **X402Client**: Main SDK interface for payment creation and service access
- **Payment Gateway**: Handles payment processing with sub-millisecond performance
- **Service Registry**: Marketplace of available AI services and providers
- **Token Management**: JWT-based service access tokens with automatic expiry

---

## 🌍 **Multi-Language Support**

### **JavaScript/TypeScript** (Primary)
```typescript
// Full TypeScript support with comprehensive type definitions
const client = new X402Client(config);
const payment: X402PaymentResponse = await client.createPayment(request);
```

### **Python**
```python
# Simple Python client with requests library
from x402_client import X402Client, X402Config

config = X402Config(
    principal="your-principal",
    algorand_address="your-address"
)
client = X402Client(config)
payment = client.create_payment("ai-oracle-enhanced", 0.05)
```

### **Go**
```go
// High-performance Go client with full error handling
config := X402Config{
    Principal:       "your-principal",
    AlgorandAddress: "your-address",
}
client := NewX402Client(config)
payment, err := client.CreatePayment("ai-oracle-enhanced", 0.05, nil)
```

### **Rust**
```rust
// Memory-safe Rust client with async/await support
let config = X402Config {
    principal: "your-principal".to_string(),
    algorand_address: "your-address".to_string(),
    ..Default::default()
};
let client = X402Client::new(config);
let payment = client.create_payment("ai-oracle-enhanced", 0.05, None).await?;
```

---

## 🛠️ **Integration Patterns**

### **1. Basic Payment Integration**
Perfect for simple AI service access:

```typescript
class BasicAIService {
  private x402Client: X402Client;

  async queryAI(prompt: string): Promise<string> {
    const payment = await this.x402Client.createPayment({
      service: 'ai-oracle-basic',
      amount: 0.01
    });

    return await this.x402Client.queryAI({
      query: prompt,
      model: 'phi-3'
    }, payment.serviceToken);
  }
}
```

### **2. Enterprise Batch Processing**
For high-volume AI operations:

```typescript
class EnterpriseAIProcessor {
  async processBatch(queries: string[]): Promise<ProcessedResult[]> {
    const results: ProcessedResult[] = [];

    for (const query of queries) {
      const payment = await this.x402Client.createPayment({
        service: 'ai-oracle-enterprise',
        amount: 0.10
      });

      const response = await this.x402Client.queryAI({
        query,
        model: 'deepseek-r1'
      }, payment.serviceToken);

      results.push({
        query,
        response,
        cost: 0.10,
        transactionId: payment.transactionId
      });
    }

    return results;
  }
}
```

### **3. Service Provider Integration**
For companies offering AI services:

```typescript
class AIServiceProvider {
  async registerService(): Promise<void> {
    const registration = await fetch('/api/sippar/x402/register-provider', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        providerName: 'YourAI Corp',
        serviceId: 'your-ai-service',
        serviceEndpoint: 'https://api.yourai.com/v1',
        description: 'Advanced AI analytics service',
        pricing: 0.08,
        category: 'AI Services'
      })
    });

    const { registrationId } = await registration.json();
    console.log(`Service registered: ${registrationId}`);
  }

  async getAnalytics(): Promise<ProviderAnalytics> {
    const response = await fetch('/api/sippar/x402/provider-analytics/your-provider-id');
    return await response.json();
  }
}
```

---

## 🔒 **Security Best Practices**

### **1. Credential Management**
```typescript
// ✅ Good: Use environment variables
const client = new X402Client({
  principal: process.env.ICP_PRINCIPAL,
  algorandAddress: process.env.ALGORAND_ADDRESS
});

// ❌ Bad: Hardcode credentials
const client = new X402Client({
  principal: 'rdmx6-jaaaa-aaaah-qcaiq-cai', // Don't do this!
  algorandAddress: 'ABCD...' // Don't do this!
});
```

### **2. Token Validation**
```typescript
class SecureAIService {
  async validateAndUseToken(token: string): Promise<boolean> {
    // Always verify tokens before use
    const isValid = await this.x402Client.verifyToken(token);
    if (!isValid) {
      throw new Error('Invalid or expired service token');
    }
    return true;
  }
}
```

### **3. Error Handling**
```typescript
async function robustPaymentCreation(service: string, amount: number) {
  try {
    const payment = await client.createPayment({ service, amount });
    return payment;
  } catch (error) {
    if (error.message.includes('Rate limit exceeded')) {
      // Wait and retry
      await new Promise(resolve => setTimeout(resolve, 60000));
      return await client.createPayment({ service, amount });
    }
    throw error;
  }
}
```

---

## 📊 **Available Services**

### **AI Services**
| Service ID | Description | Price | Use Case |
|------------|-------------|-------|----------|
| `ai-oracle-basic` | Basic AI queries | $0.01 | Simple Q&A, basic analysis |
| `ai-oracle-enhanced` | Premium AI analysis | $0.05 | Complex reasoning, detailed analysis |
| `ai-oracle-enterprise` | Enterprise AI with SLA | $0.10 | Mission-critical applications |

### **AI Chat Services**
| Service ID | Description | Price | Use Case |
|------------|-------------|-------|----------|
| `ai-chat-basic` | Interactive conversations | $0.02 | Customer support, basic chatbots |
| `ai-chat-enhanced` | Advanced chat with context | $0.07 | Virtual assistants, complex dialogues |

### **Chain Fusion Services**
| Service ID | Description | Price | Use Case |
|------------|-------------|-------|----------|
| `chain-fusion-basic` | Cross-chain transfers | $0.003 | Asset bridging, simple transfers |
| `chain-fusion-enhanced` | Advanced cross-chain ops | $0.008 | Smart contract integration |

### **External API Gateways**
| Service ID | Description | Price | Use Case |
|------------|-------------|-------|----------|
| `external-openai-gpt4` | OpenAI GPT-4 access | $0.15 | Premium AI capabilities |
| `external-claude-sonnet` | Anthropic Claude access | $0.12 | Advanced reasoning tasks |

---

## 🚀 **Performance Optimization**

### **1. Connection Pooling**
```typescript
// Reuse client instances
const globalX402Client = new X402Client(config);

// Use connection pooling for high throughput
const client = new X402Client({
  ...config,
  httpAgent: new http.Agent({ keepAlive: true, maxSockets: 50 })
});
```

### **2. Batch Operations**
```typescript
// Efficient batch processing
async function processBatchEfficiently(queries: string[]) {
  const payments = await Promise.all(
    queries.map(query =>
      client.createPayment({ service: 'ai-oracle-enhanced', amount: 0.05 })
    )
  );

  const responses = await Promise.all(
    payments.map((payment, index) =>
      client.queryAI({ query: queries[index], model: 'deepseek-r1' }, payment.serviceToken)
    )
  );

  return responses;
}
```

### **3. Caching Strategies**
```typescript
class CachedAIService {
  private cache = new Map<string, { response: string; expiry: number }>();

  async queryWithCache(query: string): Promise<string> {
    const cached = this.cache.get(query);
    if (cached && cached.expiry > Date.now()) {
      return cached.response; // Return cached result
    }

    // Create payment and query AI service
    const payment = await this.x402Client.createPayment({
      service: 'ai-oracle-enhanced',
      amount: 0.05
    });

    const response = await this.x402Client.queryAI({
      query,
      model: 'deepseek-r1'
    }, payment.serviceToken);

    // Cache for 1 hour
    this.cache.set(query, {
      response,
      expiry: Date.now() + 3600000
    });

    return response;
  }
}
```

---

## 🧪 **Testing Strategies**

### **1. Unit Testing**
```typescript
import { X402Client } from '@sippar/x402-sdk';

describe('X402Client', () => {
  let client: X402Client;

  beforeEach(() => {
    client = new X402Client({
      principal: 'test-principal',
      algorandAddress: 'test-address'
    });
  });

  it('should create payment successfully', async () => {
    const payment = await client.createPayment({
      service: 'ai-oracle-basic',
      amount: 0.01
    });

    expect(payment.success).toBe(true);
    expect(payment.transactionId).toBeDefined();
    expect(payment.serviceToken).toBeDefined();
  });
});
```

### **2. Integration Testing**
```typescript
describe('X402 Integration', () => {
  it('should complete full payment flow', async () => {
    const client = new X402Client(testConfig);

    // 1. Create payment
    const payment = await client.createPayment({
      service: 'ai-oracle-enhanced',
      amount: 0.05
    });

    // 2. Verify token
    const isValid = await client.verifyToken(payment.serviceToken);
    expect(isValid).toBe(true);

    // 3. Use service
    const response = await client.queryAI({
      query: 'Test query',
      model: 'deepseek-r1'
    }, payment.serviceToken);

    expect(response).toBeDefined();
  });
});
```

---

## 🌟 **Advanced Features**

### **1. Custom Service Integration**
```typescript
interface CustomService {
  endpoint: string;
  authentication: 'x402' | 'api-key';
  pricing: number;
}

class CustomServiceAdapter {
  async callService(service: CustomService, request: any): Promise<any> {
    if (service.authentication === 'x402') {
      const payment = await this.x402Client.createPayment({
        service: service.endpoint,
        amount: service.pricing
      });

      return await this.makeAuthenticatedRequest(
        service.endpoint,
        request,
        payment.serviceToken
      );
    }

    return await this.makeAPIKeyRequest(service.endpoint, request);
  }
}
```

### **2. Revenue Analytics Dashboard**
```typescript
class RevenueAnalytics {
  async getProviderMetrics(providerId: string): Promise<ProviderMetrics> {
    const response = await fetch(`/api/sippar/x402/provider-analytics/${providerId}`);
    const data = await response.json();

    return {
      totalRevenue: data.analytics.overview.totalRevenue,
      transactionCount: data.analytics.overview.totalTransactions,
      averageTransactionValue: data.analytics.overview.averageTransactionValue,
      topServices: data.analytics.servicePerformance,
      revenueSharing: data.analytics.revenueSharing
    };
  }
}
```

### **3. Service Discovery**
```typescript
class ServiceDiscovery {
  async findServices(criteria: ServiceCriteria): Promise<ServiceInfo[]> {
    const params = new URLSearchParams({
      category: criteria.category || 'all',
      priceMin: criteria.priceMin?.toString() || '0',
      priceMax: criteria.priceMax?.toString() || '1000',
      sortBy: criteria.sortBy || 'popularity'
    });

    const response = await fetch(`/api/sippar/x402/discover-services?${params}`);
    const data = await response.json();

    return data.discovery.recommendations;
  }
}
```

---

## 📈 **Monitoring and Analytics**

### **1. Performance Monitoring**
```typescript
class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();

  async monitorPaymentPerformance(): Promise<void> {
    const startTime = performance.now();

    try {
      const payment = await this.x402Client.createPayment({
        service: 'ai-oracle-enhanced',
        amount: 0.05
      });

      const duration = performance.now() - startTime;
      this.recordMetric('payment_creation', duration);

      console.log(`Payment created in ${duration.toFixed(2)}ms`);
    } catch (error) {
      console.error('Payment failed:', error);
    }
  }

  private recordMetric(operation: string, duration: number): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    this.metrics.get(operation)!.push(duration);
  }

  getAveragePerformance(operation: string): number {
    const durations = this.metrics.get(operation) || [];
    return durations.reduce((a, b) => a + b, 0) / durations.length;
  }
}
```

### **2. Usage Analytics**
```typescript
class UsageAnalytics {
  async trackUsage(service: string, cost: number): Promise<void> {
    await fetch('/api/analytics/usage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service,
        cost,
        timestamp: new Date().toISOString(),
        principal: this.config.principal
      })
    });
  }

  async generateReport(): Promise<UsageReport> {
    const response = await fetch('/api/analytics/report');
    return await response.json();
  }
}
```

---

## 🎓 **Learning Resources**

### **Documentation**
- [API Reference](./API_REFERENCE.md) - Complete API documentation
- [Examples Repository](./examples/) - Code samples in multiple languages
- [Integration Guides](./guides/) - Framework-specific integration guides

### **Video Tutorials**
- [X402 Quick Start (5 minutes)](https://youtube.com/watch?v=example1)
- [Enterprise Integration Patterns](https://youtube.com/watch?v=example2)
- [Security Best Practices](https://youtube.com/watch?v=example3)

### **Community Resources**
- [GitHub Discussions](https://github.com/sippar/x402-sdk/discussions) - Community Q&A
- [Discord Server](https://discord.gg/sippar) - Real-time developer chat
- [Developer Blog](https://blog.sippar.io) - Technical articles and updates

---

## 🆘 **Support and Troubleshooting**

### **Common Issues**

#### **Payment Creation Fails**
```typescript
// Check rate limits
if (error.message.includes('Rate limit exceeded')) {
  console.log('Rate limit hit, waiting 60 seconds...');
  await new Promise(resolve => setTimeout(resolve, 60000));
}

// Verify credentials
if (error.message.includes('invalid principal format')) {
  console.log('Check your ICP Principal format');
}
```

#### **Token Verification Fails**
```typescript
// Check token expiry
const tokenData = JSON.parse(atob(token.split('.')[1]));
if (tokenData.expiry < Date.now()) {
  console.log('Token has expired, create new payment');
}
```

### **Getting Help**
- **GitHub Issues**: [Report bugs and feature requests](https://github.com/sippar/x402-sdk/issues)
- **Developer Office Hours**: Tuesdays 2-3 PM PST
- **Email Support**: developers@sippar.io
- **Community Chat**: [Discord #developer-support](https://discord.gg/sippar)

---

**🎉 Happy building with Sippar X402!**

*This guide is continuously updated. Last updated: September 19, 2025*