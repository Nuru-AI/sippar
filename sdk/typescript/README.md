# Sippar TypeScript SDK v0.1.0

[![npm version](https://badge.fury.io/js/%40sippar%2Fsdk.svg)](https://badge.fury.io/js/%40sippar%2Fsdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Official TypeScript SDK for the Sippar Intelligent Cross-Chain Automation Platform.

## Overview

Sippar bridges Internet Computer (ICP) and Algorand blockchains with AI-powered automation capabilities. This SDK provides easy access to:

- **ckALGO Operations**: Mint, redeem, and transfer chain-key ALGO tokens
- **AI Services**: Access AI Oracle, OpenWebUI chat, and enhanced AI capabilities
- **Cross-Chain Operations**: Seamless ICP-Algorand interactions
- **Revenue Generation**: Multi-tier pricing and usage tracking

## Installation

```bash
npm install @sippar/sdk
```

## Quick Start

```typescript
import { SipparClient } from '@sippar/sdk';

// Initialize the client
const sippar = new SipparClient({
  network: 'mainnet', // or 'testnet', 'local'
  timeout: 30000
});

// Check platform health
const health = await sippar.getHealth();
console.log('Platform status:', health.status);

// Make an AI query
const aiResponse = await sippar.ai.query({
  query: "What's the current ALGO price trend?",
  userPrincipal: "your-principal-id",
  serviceType: 'oracle'
});

console.log('AI Response:', aiResponse.data.response);
```

## Core Services

### AI Service

Access Sippar's AI capabilities including Oracle queries and OpenWebUI chat:

```typescript
// Basic AI query
const response = await sippar.ai.query({
  query: "Analyze Algorand network status",
  userPrincipal: "user-principal",
  serviceType: 'general'
});

// AI Oracle query (Algorand-specific)
const oracleResponse = await sippar.ai.oracleQuery({
  query: "What are the latest Algorand developments?",
  userPrincipal: "user-principal",
  algorandData: { network: "mainnet" }
});

// Enhanced AI with caching
const enhancedResponse = await sippar.ai.enhancedQuery({
  query: "Complex analysis request",
  userPrincipal: "user-principal",
  serviceType: 'enhanced',
  cacheEnabled: true
});

// Get chat authentication for OpenWebUI
const chatAuth = await sippar.ai.getChatAuth({
  userPrincipal: "user-principal",
  algorandAddress: "optional-algo-address"
});

// Open authenticated chat
window.open(chatAuth.authUrl, '_blank');
```

### ckALGO Service

Manage chain-key ALGO tokens with 1:1 backing:

```typescript
// Get ckALGO balance
const balance = await sippar.ckAlgo.getBalance("user-principal");

// Mint ckALGO from ALGO
const mintResult = await sippar.ckAlgo.mint({
  amount: "100000000", // 100 ALGO (in microAlgos)
  algorandAddress: "source-algo-address"
});

// Redeem ckALGO to ALGO
const redeemResult = await sippar.ckAlgo.redeem({
  amount: "50000000", // 50 ckALGO
  algorandAddress: "destination-algo-address"
});

// Transfer ckALGO
const transferResult = await sippar.ckAlgo.transfer({
  to: "recipient-principal",
  amount: "25000000" // 25 ckALGO
});
```

### Cross-Chain Operations

Perform operations across ICP and Algorand:

```typescript
// Get Algorand account info
const accountInfo = await sippar.crossChain.getAlgorandAccount(
  "algorand-address"
);

// Execute cross-chain smart contract
const contractResult = await sippar.crossChain.executeContract({
  contractId: "contract-id",
  action: "ai_query",
  parameters: {
    query: "Market analysis",
    userTier: "premium"
  }
});

// Sync cross-chain state
const syncResult = await sippar.crossChain.syncState({
  userPrincipal: "user-principal",
  operations: ["balance_sync", "state_sync"]
});
```

## Configuration

```typescript
const sippar = new SipparClient({
  network: 'mainnet',           // Network: mainnet, testnet, local
  canisterId: 'custom-id',      // Override default canister ID
  backendUrl: 'custom-url',     // Override backend URL
  timeout: 30000                // Request timeout in ms
});
```

## Error Handling

The SDK provides comprehensive error handling:

```typescript
import { SipparError, ErrorCode } from '@sippar/sdk';

try {
  const response = await sippar.ai.query({
    query: "Test query",
    userPrincipal: "invalid-principal"
  });
} catch (error) {
  if (error instanceof SipparError) {
    console.log('Error code:', error.code);
    console.log('Error message:', error.message);
    console.log('Error details:', error.details);

    switch (error.code) {
      case ErrorCode.AI_QUERY_FAILED:
        // Handle AI query failure
        break;
      case ErrorCode.NOT_AUTHENTICATED:
        // Handle authentication error
        break;
      default:
        // Handle other errors
    }
  }
}
```

## Health Monitoring

Monitor platform and service health:

```typescript
// Overall platform health
const health = await sippar.getHealth();

// AI services health
const aiHealth = await sippar.ai.getHealth();
const oracleHealth = await sippar.ai.getOracleHealth();

// Platform statistics
const stats = await sippar.getStats();
```

## TypeScript Support

The SDK is built with TypeScript and provides full type safety:

```typescript
import { AIResponse, AIServiceType, SipparConfig } from '@sippar/sdk';

// All types are exported and documented
const config: SipparConfig = {
  network: 'mainnet',
  canisterId: 'gbmxj-yiaaa-aaaak-qulqa-cai',
  backendUrl: 'https://nuru.network/api/sippar',
  timeout: 30000
};

// Response types are fully typed
const response: AIResponse = await sippar.ai.query({
  query: "Test",
  userPrincipal: "principal",
  serviceType: 'oracle' as AIServiceType
});
```

## Examples

### AI-Powered DeFi Analysis

```typescript
// Get market analysis with AI
const marketAnalysis = await sippar.ai.enhancedQuery({
  query: "Analyze ALGO price trends and provide trading recommendations",
  userPrincipal: userPrincipal,
  serviceType: 'enhanced'
});

// Execute based on AI recommendation
if (marketAnalysis.data.confidence > 0.8) {
  const mintResult = await sippar.ckAlgo.mint({
    amount: "1000000000", // 1000 ALGO
    algorandAddress: userAlgoAddress
  });
}
```

### Cross-Chain Automated Trading

```typescript
// Set up AI-powered trading contract
const contract = await sippar.crossChain.createContract({
  name: "AI Trading Bot",
  triggers: ['price_threshold', 'ai_signal'],
  actions: [
    {
      type: 'ai_query',
      params: { query: 'Should I buy ALGO?' }
    },
    {
      type: 'conditional_mint',
      params: { confidence_threshold: 0.85 }
    }
  ]
});
```

## Platform Information

- **ckALGO Canister**: `gbmxj-yiaaa-aaaak-qulqa-cai`
- **Threshold Signer**: `vj7ly-diaaa-aaaae-abvoq-cai`
- **AI Oracle App ID**: `745336394`
- **Backend API**: `https://nuru.network/api/sippar`

## Development

```bash
# Install dependencies
npm install

# Build the SDK
npm run build

# Run tests
npm test

# Development mode (watch)
npm run dev
```

## Support

- **Documentation**: [docs.sippar.io](https://docs.sippar.io)
- **API Reference**: [api.sippar.io](https://api.sippar.io)
- **GitHub Issues**: [github.com/Nuru-AI/sippar/issues](https://github.com/Nuru-AI/sippar/issues)
- **Discord**: [discord.gg/sippar](https://discord.gg/sippar)

## License

MIT © Sippar Team

---

**Sippar**: The future of intelligent cross-chain automation 🚀