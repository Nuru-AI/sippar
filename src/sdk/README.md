# ckALGO SDK v0.1.0

TypeScript SDK for the ckALGO Intelligent Automation Platform - the world's first AI-powered cross-chain token bridging Internet Computer and Algorand.

## 🚀 Quick Start

```bash
npm install @sippar/ck-algo-sdk
```

```typescript
import { SipparSDK } from '@sippar/ck-algo-sdk';

// Initialize the SDK
const client = await SipparSDK.init({
  network: 'testnet', // 'mainnet', 'testnet', or 'local'
  autoLogin: true
});

// Query AI services
const aiResponse = await client.ai.query({
  serviceType: 'AlgorandOracle',
  query: 'What is the current ALGO price?',
  model: 'deepseek-r1'
});

console.log(aiResponse.data.response);
```

## 🏗️ Architecture

The ckALGO SDK provides a comprehensive TypeScript interface for:

- **AI Services**: Query AI models with automatic payment processing
- **Smart Contracts**: Create and execute programmable logic with AI integration  
- **Cross-Chain Operations**: Seamless ICP ↔ Algorand state management
- **Payment Processing**: Built-in fee calculation and transaction handling
- **Authentication**: Internet Identity integration with tier-based permissions

## 📚 Core Features

### AI Services

```typescript
// Basic AI query
const response = await client.ai.query({
  serviceType: 'AlgorandOracle',
  query: 'Analyze this smart contract for security issues',
  model: 'deepseek-r1'
});

// Batch processing (Professional+ tier)
const responses = await client.ai.batchQuery([
  { serviceType: 'AlgorandOracle', query: 'Query 1' },
  { serviceType: 'OpenWebUIChat', query: 'Query 2' }
]);

// Get service health
const health = await client.ai.getServiceHealth('AlgorandOracle');
```

### Smart Contracts

```typescript
// Create a smart contract
const contract = await client.smartContracts.createContract({
  name: 'AI Trading Bot',
  description: 'Automated trading with AI decision making',
  triggerType: 'AIDecision',
  actions: [
    {
      actionType: 'ai_query',
      parameters: { prompt: 'Should I buy or sell ALGO?' },
      gasCost: 1000
    },
    {
      actionType: 'transfer',
      parameters: { amount: '100' },
      gasCost: 500
    }
  ],
  gasLimit: 10000
});

// Execute contract
const execution = await client.smartContracts.executeContract({
  contractId: contract.data.contractId,
  gasLimit: 5000
});
```

### Cross-Chain Operations

```typescript
// Read Algorand account state
const account = await client.crossChain.readState({
  address: 'ALGORAND_ADDRESS_HERE',
  stateType: 'account'
});

// Transfer ALGO across chains
const transfer = await client.crossChain.transfer({
  toAddress: 'RECIPIENT_ADDRESS',
  amount: '1000000', // 1 ALGO in microALGO
  note: 'Cross-chain transfer'
});

// Check operation status
const status = await client.crossChain.getOperationStatus(transfer.data.operationId);
```

### Authentication & User Management

```typescript
// Login with Internet Identity
const user = await client.login();

// Check user tier and permissions
const tier = await client.getUserTier();
const benefits = getTierBenefits(tier.data);

// Upgrade tier
await client.upgradeTier('Professional');
```

## 🔧 Configuration

### Network Configurations

```typescript
import { DefaultConfigs, createSipparClient } from '@sippar/ck-algo-sdk';

// Use pre-configured networks
const client = await createSipparClient({
  config: DefaultConfigs.mainnet, // or .testnet, .local
  autoLogin: false
});

// Custom configuration
const client = await createSipparClient({
  config: {
    network: 'mainnet',
    canisterId: 'your-canister-id',
    backendUrl: 'https://your-backend.com',
    algorandNodeUrl: 'https://mainnet-api.algonode.cloud',
    thresholdSignerCanisterId: 'signer-canister-id'
  }
});
```

### Authentication Setup

```typescript
import { createAuth } from '@sippar/ck-algo-sdk';

const auth = await createAuth({
  identityProvider: 'https://identity.ic0.app',
  maxTimeToLive: BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000) // 7 days
});

// Listen to auth state changes
const unsubscribe = auth.onAuthStateChange((state) => {
  if (state.isAuthenticated) {
    console.log('User logged in:', state.identity);
  } else {
    console.log('User logged out');
  }
});
```

## 💳 User Tiers & Permissions

| Feature | Free | Developer | Professional | Enterprise |
|---------|------|-----------|--------------|------------|
| AI Queries | 100/month | 1,000/month | 10,000/month | Unlimited |
| AI Discount | 0% | 25% | 50% | 75% |
| Smart Contracts | ❌ | ✅ | ✅ | ✅ |
| Cross-Chain Ops | ❌ | ✅ | ✅ | ✅ |
| Batch Processing | ❌ | ❌ | ✅ | ✅ |
| Revenue Analytics | ❌ | ❌ | ✅ | ✅ |
| Priority Support | ❌ | ❌ | ✅ | ✅ |

## 🛠️ Utilities

```typescript
import { 
  formatCkALGO, 
  parseCkALGO, 
  isValidAlgorandAddress,
  formatTimestamp,
  getTierBenefits,
  retry
} from '@sippar/ck-algo-sdk';

// Format amounts for display
const formatted = formatCkALGO('100000000'); // "1"

// Parse user input
const parsed = parseCkALGO('1.5'); // "150000000"

// Validate addresses
const isValid = isValidAlgorandAddress('ALGO_ADDRESS'); // boolean

// Retry failed operations
const result = await retry(
  () => client.ai.query({ serviceType: 'AlgorandOracle', query: 'test' }),
  { maxAttempts: 3, delay: 1000 }
);
```

## 🚨 Error Handling

```typescript
import { SipparSDKError, handleSDKResponse } from '@sippar/ck-algo-sdk';

try {
  // Option 1: Handle responses manually
  const response = await client.ai.query({ /* ... */ });
  if (response.success) {
    console.log(response.data);
  } else {
    console.error(response.error);
  }

  // Option 2: Use response handler (throws on error)
  const data = handleSDKResponse(response);
  console.log(data);

} catch (error) {
  if (error instanceof SipparSDKError) {
    console.error('SDK Error:', error.code, error.message);
    console.error('Details:', error.details);
  }
}
```

## 📱 Convenience Functions

```typescript
// Quick operations without full client setup
import { SipparSDK } from '@sippar/ck-algo-sdk';

// Quick AI query
const response = await SipparSDK.queryAI('What is ALGO?', {
  network: 'testnet',
  serviceType: 'AlgorandOracle'
});

// Quick balance check  
const balance = await SipparSDK.getBalance({ network: 'mainnet' });

// Quick state read
const account = await SipparSDK.readAlgorandState('ALGO_ADDRESS', {
  network: 'testnet'
});
```

## 🔗 Integration Examples

### React Hook

```typescript
import { useEffect, useState } from 'react';
import { SipparClient, UserIdentity } from '@sippar/ck-algo-sdk';

export function useSippar(network: 'mainnet' | 'testnet' = 'testnet') {
  const [client, setClient] = useState<SipparClient | null>(null);
  const [user, setUser] = useState<UserIdentity | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initClient() {
      const sippar = await SipparSDK.init({ network });
      setClient(sippar);
      
      // Listen to auth changes
      sippar.onAuthStateChange(setUser);
      
      setLoading(false);
    }
    
    initClient();
  }, [network]);

  const login = async () => {
    if (client) {
      const result = await client.login();
      return result.success;
    }
    return false;
  };

  const logout = async () => {
    if (client) {
      await client.logout();
    }
  };

  return { client, user, loading, login, logout };
}
```

### Vue.js Composable

```typescript
import { ref, onMounted } from 'vue';
import { SipparSDK } from '@sippar/ck-algo-sdk';

export function useSippar(network = 'testnet') {
  const client = ref(null);
  const user = ref(null);
  const loading = ref(true);

  onMounted(async () => {
    client.value = await SipparSDK.init({ network });
    client.value.onAuthStateChange((identity) => {
      user.value = identity;
    });
    loading.value = false;
  });

  return { client, user, loading };
}
```

## 🔐 Security Best Practices

1. **Never store private keys**: The SDK uses Internet Identity for secure authentication
2. **Validate user input**: Always validate Algorand addresses and amounts
3. **Handle errors gracefully**: Implement proper error handling for network issues
4. **Use tier restrictions**: Respect user tier limitations for features
5. **Monitor gas usage**: Set appropriate gas limits for operations

## 📖 API Reference

### SipparClient

- `login()` - Authenticate with Internet Identity
- `logout()` - Clear authentication state  
- `getBalance()` - Get user's ckALGO balance
- `transfer()` - Transfer ckALGO tokens
- `getUserTier()` - Get user's tier level
- `upgradeTier()` - Upgrade user tier

### AIService

- `query()` - Submit AI query
- `batchQuery()` - Submit multiple queries (Professional+)
- `getServiceHealth()` - Check service status
- `getQueryHistory()` - Get query history
- `calculateQueryCost()` - Estimate query cost

### SmartContractService  

- `createContract()` - Create new smart contract
- `executeContract()` - Execute contract
- `getContract()` - Get contract details
- `listContracts()` - List user's contracts
- `getExecutionHistory()` - Get execution history

### CrossChainService

- `readState()` - Read Algorand state
- `transfer()` - Cross-chain transfer
- `getOperationStatus()` - Check operation status
- `listOperations()` - List operations
- `syncState()` - Synchronize state

### PaymentService

- `processPayment()` - Process service payment
- `getPaymentHistory()` - Get payment history
- `calculateFee()` - Calculate service fee
- `getRevenueMetrics()` - Get revenue data (Professional+)

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🆘 Support

- Documentation: [https://docs.sippar.ai](https://docs.sippar.ai)
- Discord: [https://discord.gg/sippar](https://discord.gg/sippar)
- Issues: [GitHub Issues](https://github.com/nuru-ai/sippar/issues)

---

Built with ❤️ by the Sippar Team | Powered by Internet Computer & Algorand