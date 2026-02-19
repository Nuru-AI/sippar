# Algorand Blockchain Integration

**Last Updated**: September 18, 2025 - Sprint 016 X402 Integration Complete
**Integration Status**: ✅ Production Active with X402 Payment Protocol
**Smart Contract**: AI Oracle deployed on testnet + X402 payment-protected services

---

## 🌐 **Network Configuration**

### **Testnet Integration**
- **Network**: Algorand Testnet
- **API Server**: `https://testnet-api.algonode.cloud`
- **Explorer**: [testnet.algoscan.app](https://testnet.algoscan.app)
- **Status**: Active with verified smart contract

### **Mainnet Support**
- **Network**: Algorand Mainnet  
- **API Server**: `https://mainnet-api.algonode.cloud`
- **Status**: Backend configured for mainnet operations

---

## 📜 **Smart Contract Deployment**

### **AI Oracle Contract**
- **Application ID**: `745336394`
- **Network**: Algorand Testnet
- **Deployment Date**: September 4, 2025
- **Transaction ID**: `X6YJGS57OP3KYRCROTDYMEEBSLFEIHDKY6DDJJR7HN37DYB6GWRQ`
- **Creator Address**: `A3QJWHRHRSHQ6GP5BOXQ5244EYMFMACO2AA7GZL4VYS6TLSPVODR2RRNME`

**Contract Schema**:
```json
{
  "global_schema": {
    "num_uints": 2,
    "num_byte_slices": 2
  },
  "local_schema": {
    "num_uints": 2,
    "num_byte_slices": 0
  }
}
```

**Verification Status**: ✅ Confirmed deployed and accessible via Algorand API

---

## 🔗 **Address Derivation System**

### **Threshold-Derived Addresses**
Sippar generates unique Algorand addresses for each user through ICP threshold signatures:

**Derivation Process**:
1. **Input**: User's Internet Identity principal
2. **ICP Processing**: Threshold secp256k1 key generation
3. **Format Conversion**: secp256k1 → Algorand address format
4. **Output**: Valid 58-character Algorand address

**Example Output**:
```json
{
  "success": true,
  "address": "5XP5MWBUY4LHENV5IJJNXEGAWCD6R63YANEBSCIOCXDT5WMIV7PDPN4SVE",
  "public_key": [237, 223, 214, 88, 52, 199, ...],
  "canister_id": "vj7ly-diaaa-aaaae-abvoq-cai"
}
```

### **Address Validation**
All generated addresses pass Algorand's validation:
- Length: 58 characters
- Format: Base32 encoding
- Checksum: SHA-512/256 verification
- Validation: `algosdk.isValidAddress()` returns true

---

## 🤖 **AI Oracle Integration**

### **Oracle Functionality**
The deployed smart contract enables blockchain-native AI operations:

**Core Features**:
- AI query processing via blockchain transactions
- Response delivery through smart contract callbacks
- Credit-based access control system
- Transparent AI operation logging

**Integration Architecture**:
```
User Transaction → AI Oracle Contract → Backend Processing → AI Response → Callback Transaction
```

**Transaction Note Format**: `"sippar-ai-oracle"` for indexer filtering

---

## 💳 **X402 Payment Protocol Integration** *(NEW - Sprint 016)*

### **World's First X402 + Algorand Integration**

Sprint 016 achieved the **world's first integration of HTTP 402 "Payment Required" standard with Algorand threshold signatures**, enabling autonomous AI-to-AI payments for Algorand services.

**Production Deployment**: https://nuru.network/api/sippar/x402/

### **X402 + Algorand Payment Flow**

**Complete Payment Architecture**:
```
AI Agent Request → X402 Payment Required → Internet Identity → Algorand Address Derivation → Service Access
        ↓                   ↓                      ↓                     ↓                    ↓
   HTTP 402 Response    Payment Creation    Threshold Signature    Mathematical Backing    Protected Service
```

### **Payment-Protected Algorand Services**

**AI Oracle Services with X402 Payment Protection**:
```typescript
// AI Oracle Basic Query - $0.01 USD
POST /api/sippar/ai/query
Authorization: Bearer <X402-payment-token>

// AI Oracle Enhanced Query - $0.05 USD
POST /api/sippar/ai/enhanced-query
Authorization: Bearer <X402-payment-token>

// Response includes Algorand integration proof
{
  "success": true,
  "ai_response": "Analysis complete...",
  "algorand_integration": {
    "user_address": "6W47GCLXWEIEZ2LRQCXF7HGLOYSXYCXOPXJ5YE55EULFHB7O4RWIM3JDCI",
    "threshold_controlled": true,
    "mathematical_backing": true,
    "canister_id": "vj7ly-diaaa-aaaae-abvoq-cai"
  }
}
```

**ckALGO Services with X402 Payment Protection**:
```typescript
// ckALGO Minting Service - $0.001 USD
POST /api/sippar/x402/mint-ckALGO
Authorization: Bearer <X402-payment-token>

// ckALGO Redemption Service - $0.001 USD
POST /api/sippar/x402/redeem-ckALGO
Authorization: Bearer <X402-payment-token>

// Response includes Algorand transaction proof
{
  "success": true,
  "algorand_tx_id": "3RU7HQ2EIO7VIFYW2Q5IIANI5WJJBXH6YT5W4RCB7JZLNH6F3NUQ",
  "amount": 0.5,
  "threshold_signature": "verified",
  "network": "algorand_testnet"
}
```

### **X402 Payment Creation with Algorand Backing**

**Enterprise Payment Request**:
```typescript
// Create X402 payment with Algorand address verification
const payment = await fetch('/api/sippar/x402/create-payment', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 0.05,
    service: 'ai-oracle-enhanced',
    principal: '7renf-5svak-mtapl-juxhw-3hv7d-zzfzs-hjlxv-p7wsv-e2zjc-kksxf-3ae',
    algorandAddress: '6W47GCLXWEIEZ2LRQCXF7HGLOYSXYCXOPXJ5YE55EULFHB7O4RWIM3JDCI'
  })
});

// Response includes Algorand integration proof
{
  "success": true,
  "paymentId": "payment_1726689600000_abc123",
  "serviceToken": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "algorandIntegration": {
    "backingAddress": "6W47GCLXWEIEZ2LRQCXF7HGLOYSXYCXOPXJ5YE55EULFHB7O4RWIM3JDCI",
    "thresholdControlled": true,
    "canisterId": "vj7ly-diaaa-aaaae-abvoq-cai",
    "mathematicalProof": "threshold_signature_verified"
  }
}
```

### **Algorand Address Verification in X402 Flow**

**Address Validation Process**:
1. **Principal Submission**: User provides Internet Identity principal
2. **Address Derivation**: ICP canister derives Algorand address via threshold signatures
3. **Verification**: Confirm address is controlled by ICP threshold signatures
4. **Payment Authorization**: Generate X402 token with Algorand backing proof
5. **Service Access**: Protected Algorand services accessible with valid token

**Address Verification API**:
```typescript
// Verify Algorand address is threshold-controlled
const verification = await chainFusionService.verifyThresholdControl(
  '6W47GCLXWEIEZ2LRQCXF7HGLOYSXYCXOPXJ5YE55EULFHB7O4RWIM3JDCI'
);

// Response confirms mathematical backing
{
  "thresholdControlled": true,
  "canisterId": "vj7ly-diaaa-aaaae-abvoq-cai",
  "derivationPath": ["principal_bytes", "algorand"],
  "proof": "Ed25519_threshold_signature_control_verified"
}
```

### **X402 Service Marketplace for Algorand**

**Available Algorand Services** (4 active):
```typescript
{
  "marketplace": {
    "services": [
      {
        "id": "ai-oracle-basic",
        "name": "AI Oracle Basic Query",
        "description": "Basic AI query with Algorand integration",
        "price": 0.01,
        "currency": "USD",
        "endpoint": "/api/sippar/ai/query",
        "algorand_features": {
          "threshold_backed": true,
          "address_derivation": true,
          "smart_contract_integration": true
        }
      },
      {
        "id": "ai-oracle-enhanced",
        "name": "Enhanced AI Query",
        "description": "Premium AI analysis with Algorand proof",
        "price": 0.05,
        "currency": "USD",
        "endpoint": "/api/sippar/ai/enhanced-query",
        "algorand_features": {
          "threshold_backed": true,
          "transaction_proof": true,
          "mathematical_verification": true
        }
      },
      {
        "id": "ckALGO-mint",
        "name": "ckALGO Minting Service",
        "description": "Cross-chain ALGO to ckALGO conversion",
        "price": 0.001,
        "currency": "USD",
        "endpoint": "/api/sippar/x402/mint-ckALGO",
        "algorand_features": {
          "threshold_signatures": true,
          "real_algo_custody": true,
          "cross_chain_bridge": true
        }
      },
      {
        "id": "ckALGO-redeem",
        "name": "ckALGO Redemption Service",
        "description": "Cross-chain ckALGO to ALGO conversion",
        "price": 0.001,
        "currency": "USD",
        "endpoint": "/api/sippar/x402/redeem-ckALGO",
        "algorand_features": {
          "threshold_signatures": true,
          "real_algo_release": true,
          "cross_chain_bridge": true
        }
      }
    ],
    "totalServices": 4,
    "algorand_integration": "full_threshold_signature_backing"
  }
}
```

### **Enterprise Algorand Analytics**

**Payment Analytics with Algorand Context**:
```typescript
// X402 Analytics with Algorand integration metrics
const analytics = await fetch('/api/sippar/x402/analytics');

{
  "analytics": {
    "algorand_integration_metrics": {
      "threshold_signatures_used": 1250,
      "algorand_addresses_derived": 450,
      "successful_algo_transactions": 1100,
      "average_transaction_time": "3.2s",
      "network_success_rate": 0.995
    },
    "service_usage": {
      "ai_oracle_basic": { "calls": 800, "algorand_addresses": 320 },
      "ai_oracle_enhanced": { "calls": 200, "algorand_addresses": 85 },
      "ckALGO_mint": { "calls": 150, "algo_amount": 75.5 },
      "ckALGO_redeem": { "calls": 100, "algo_amount": 50.2 }
    },
    "threshold_signature_performance": {
      "success_rate": 1.0,
      "average_signature_time": "1.8s",
      "canister_cycles_used": 45000000000
    }
  }
}
```

---

## 🔧 **Network Monitoring**

### **Real-time Network Status**
Sippar monitors both Algorand networks for operational status:

**Testnet Status** (verified):
- **Current Round**: 55,249,577+
- **API Endpoint**: `https://testnet-api.algonode.cloud`
- **Connectivity**: ✅ Active

**Mainnet Status** (verified):
- **Current Round**: 53,403,252+  
- **API Endpoint**: `https://mainnet-api.algonode.cloud`
- **Connectivity**: ✅ Active

### **Account Monitoring**
Backend services continuously monitor:
- Account balances for derived addresses
- Transaction confirmations
- Smart contract state changes
- Network health and performance

---

## 💰 **ALGO Token Management**

### **Native ALGO Operations**
- **Balance Queries**: Real-time ALGO balance checking
- **Transaction Monitoring**: Deposit and withdrawal tracking
- **Address Validation**: Algorand address format verification
- **Network Fee Handling**: Standard 0.001 ALGO transaction fees

### **ckALGO Bridge Operations**
- **Minting Process**: ALGO → ckALGO conversion via ICP
- **Redemption Process**: ckALGO → ALGO via threshold signatures
- **1:1 Backing**: Each ckALGO backed by native ALGO
- **Reserve Management**: Automated custody address monitoring

---

## 🛠️ **Development Integration**

### **Algorand SDK Usage**
```typescript
import algosdk from 'algosdk';

// Testnet configuration
const algodClient = new algosdk.Algodv2('', 'https://testnet-api.algonode.cloud', '');
const indexerClient = new algosdk.Indexer('', 'https://testnet-indexer.algonode.cloud', '');

// Account info retrieval
const accountInfo = await algodClient.accountInformation(address).do();
```

### **Smart Contract Interaction**
```typescript
// Application call transaction
const txn = algosdk.makeApplicationCallTxnFromObject({
  from: senderAddress,
  appIndex: 745336394,
  onComplete: algosdk.OnApplicationComplete.NoOpOC,
  appArgs: [
    new Uint8Array(Buffer.from('request_ai_analysis')),
    new Uint8Array(Buffer.from(query)),
    new Uint8Array(Buffer.from(model))
  ],
  note: new Uint8Array(Buffer.from('sippar-ai-oracle'))
});
```

---

## ⚡ **Performance Characteristics**

### **Network Performance**
- **Transaction Finality**: 3-4 seconds
- **Throughput**: 1,000+ TPS network capacity
- **API Response Time**: <200ms for standard queries
- **Block Time**: ~3.3 seconds average

### **Integration Performance**
- **Address Derivation**: 2-5 seconds (including ICP threshold signatures)
- **Balance Queries**: <1 second
- **Transaction Broadcasting**: <5 seconds total
- **Smart Contract Calls**: 3-4 seconds finality

---

## 🔗 **Official Resources**

- **Developer Portal**: [developer.algorand.org](https://developer.algorand.org)
- **Algorand SDK**: [developer.algorand.org/docs/sdks](https://developer.algorand.org/docs/sdks)
- **Testnet Explorer**: [testnet.algoscan.app](https://testnet.algoscan.app)
- **Smart Contracts**: [developer.algorand.org/docs/get-details/dapps/smart-contracts](https://developer.algorand.org/docs/get-details/dapps/smart-contracts)
- **API Reference**: [developer.algorand.org/docs/rest-apis](https://developer.algorand.org/docs/rest-apis)

---

**Status**: ✅ **Fully Operational + X402 Payment Integration** - Smart contract deployed, network monitoring active, address derivation working, X402 payment protocol operational at https://nuru.network/api/sippar/x402/