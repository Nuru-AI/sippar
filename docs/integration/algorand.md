# Algorand Blockchain Integration

**Last Updated**: September 5, 2025  
**Integration Status**: ✅ Production Active  
**Smart Contract**: AI Oracle deployed on testnet

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

**Status**: ✅ **Fully Operational** - Smart contract deployed, network monitoring active, address derivation working