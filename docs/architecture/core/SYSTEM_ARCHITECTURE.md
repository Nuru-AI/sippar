# Sippar System Architecture

**Project**: Sippar - Algorand Chain Fusion Bridge  
**Date**: September 3, 2025  
**Version**: 1.0.0-alpha  
**Purpose**: Complete technical architecture documentation

## 🏗️ **Architecture Overview**

Sippar implements ICP Chain Fusion technology to create a trustless bridge between Internet Computer and Algorand, enabling direct cross-chain asset control through threshold cryptography without traditional bridge risks.

## 🔗 **Chain Fusion Technology Stack**

### **Core Components**
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   User Device   │    │  Internet Computer │    │   Algorand      │
│                 │    │                    │    │                 │
│ Internet Identity│──▶ │ Threshold Ed25519  │──▶ │ Native ALGO     │
│ (Biometric/Device)│   │ Signature Service  │    │ Direct Control  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         │                        ▼                        │
         │              ┌──────────────────┐                │
         │              │   ckALGO Token   │                │
         └──────────────│   (1:1 Backed)   │────────────────┘
                        │   ICP Canister   │
                        └──────────────────┘
```

### **Architecture Principles**
1. **Zero Bridge Risk**: Direct cryptographic control, no validators or custodians
2. **Mathematical Security**: Threshold signatures provide formal security proofs
3. **Zero Web3 Complexity**: Internet Identity hides all blockchain complexity
4. **Native Asset Control**: Users control actual ALGO, not wrapped tokens

## 🔐 **Security Architecture**

### **Threshold Signature System**
```rust
// Threshold Ed25519 for Algorand (same pattern as Solana)
pub struct AlgorandThresholdSigner {
    key_id: EcdsaKeyId,
    derivation_path: Vec<Vec<u8>>,
    subnet_consensus: SubnetConsensus,
}

impl AlgorandThresholdSigner {
    // Generate Algorand address from user principal
    pub async fn derive_algorand_address(&self, principal: Principal) -> AlgorandAddress {
        let derivation_path = vec![principal.as_slice().to_vec(), b"algorand".to_vec()];
        let public_key = self.get_public_key(derivation_path).await?;
        AlgorandAddress::from_public_key(public_key)
    }
    
    // Sign Algorand transaction using threshold Ed25519
    pub async fn sign_algorand_transaction(
        &self, 
        transaction: AlgorandTransaction,
        principal: Principal
    ) -> ThresholdSignature {
        let derivation_path = vec![principal.as_slice().to_vec(), b"algorand".to_vec()];
        let message_hash = transaction.compute_hash();
        
        // ICP subnet consensus signs transaction
        self.sign_with_threshold_ed25519(message_hash, derivation_path).await
    }
}
```

### **Key Derivation Strategy**
- **User Principal**: Internet Identity provides unique principal for each user
- **Deterministic Derivation**: PBKDF2-SHA256 with 50,000 iterations for address generation
- **Path Isolation**: Each blockchain gets isolated derivation path
- **Privacy Preservation**: No linkability between different blockchain addresses

### **Asset Security Model**
```
Native ALGO (Algorand) ←→ Threshold Signatures (ICP) ←→ ckALGO (ICP DEXs)
                        ↑                              ↑
            Mathematical Proof                1:1 Backing Guarantee
            of Ownership                     Always Redeemable
```

## 🔌 **Integration Architecture**

### **Internet Identity Integration**
Following established patterns from Rabbi Trading Bot:
```typescript
// Adapted from Rabbi's useInternetIdentity.ts
export interface AlgorandCredentials {
  algorandAddress: string;
  publicKey: string;
  signature: string;
  timestamp: number;
  milkomedaAddress?: string; // EVM L2 address
}

export const useAlgorandIdentity = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: false,
    error: null,
    algorandCredentials: null,
  });

  const deriveAlgorandCredentials = async (principal: string): Promise<AlgorandCredentials> => {
    // Call Chain Fusion backend for credential derivation
    const response = await fetch('/api/sippar/derive-algorand-credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ principal, timestamp: Date.now() })
    });

    const data = await response.json();
    return {
      algorandAddress: data.addresses.algorand,
      publicKey: data.public_key,
      signature: data.signature,
      timestamp: data.timestamp,
      milkomedaAddress: data.addresses.milkomeda,
    };
  };
};
```

### **Chain Fusion Backend Integration**
```python
# Extend existing Chain Fusion backend for Algorand
class AlgorandChainFusionService:
    def __init__(self):
        self.icp_agent = ICPAgent()
        self.algorand_client = AlgorandClient()
        
    async def derive_algorand_credentials(self, ii_principal: str) -> dict:
        # Derive Algorand address from Internet Identity principal
        derivation_seed = self.pbkdf2_derive(ii_principal, "ALGORAND_SALT", 50000)
        algorand_address = self.generate_algorand_address(derivation_seed)
        
        # Get threshold signature capability for this address
        signature_capability = await self.icp_agent.get_threshold_signature_capability(
            derivation_path=[ii_principal.encode(), b"algorand"]
        )
        
        return {
            "addresses": {
                "algorand": algorand_address,
                "milkomeda": self.derive_milkomeda_address(derivation_seed)
            },
            "public_key": signature_capability.public_key,
            "signature_capability": signature_capability.can_sign,
            "timestamp": int(time.time())
        }
```

## 🪙 **ckALGO Token Architecture**

### **Chain-Key Token Implementation**
```rust
// ICP Canister for ckALGO (following ckBTC/ckETH patterns)
use ic_cdk::api::management_canister::ecdsa::{sign_with_ecdsa, EcdsaKeyId};
use ic_cdk_macros::*;

#[derive(CandidType, Deserialize)]
pub struct CkAlgoCanister {
    algorand_client: AlgorandClient,
    total_supply: u64,
    balances: BTreeMap<Principal, u64>,
    algorand_deposits: BTreeMap<String, DepositStatus>, // Track Algorand deposits
}

impl CkAlgoCanister {
    // Mint ckALGO when user deposits native ALGO
    #[update]
    pub async fn mint_ck_algo(&mut self, deposit_proof: AlgorandDepositProof) -> Result<u64> {
        // Verify Algorand deposit using threshold signature verification
        let deposit_valid = self.verify_algorand_deposit(deposit_proof).await?;
        
        if deposit_valid {
            let amount = deposit_proof.amount;
            let user_principal = ic_cdk::caller();
            
            // Mint ckALGO 1:1 with deposited ALGO
            self.balances.entry(user_principal)
                .and_modify(|balance| *balance += amount)
                .or_insert(amount);
            
            self.total_supply += amount;
            Ok(amount)
        } else {
            Err("Invalid Algorand deposit proof".to_string())
        }
    }
    
    // Redeem ckALGO for native ALGO
    #[update]
    pub async fn redeem_ck_algo(&mut self, amount: u64, algorand_address: String) -> Result<String> {
        let user_principal = ic_cdk::caller();
        let user_balance = self.balances.get(&user_principal).unwrap_or(&0);
        
        if *user_balance >= amount {
            // Burn ckALGO
            self.balances.entry(user_principal).and_modify(|balance| *balance -= amount);
            self.total_supply -= amount;
            
            // Send native ALGO using threshold signature
            let algo_txn = self.create_algorand_withdrawal(algorand_address, amount).await?;
            let signed_txn = self.sign_algorand_transaction(algo_txn).await?;
            let txn_id = self.broadcast_algorand_transaction(signed_txn).await?;
            
            Ok(txn_id)
        } else {
            Err("Insufficient ckALGO balance".to_string())
        }
    }
}
```

### **1:1 Backing Mechanism**
- **Native Asset Reserve**: All ckALGO backed by actual ALGO held in ICP-controlled accounts
- **Real-Time Verification**: Continuous monitoring of Algorand deposits and withdrawals
- **Instant Redemption**: Users can redeem ckALGO for native ALGO at any time
- **Transparency**: All reserves publicly auditable on Algorand blockchain

## 🌐 **EVM Compatibility via Milkomeda**

### **Milkomeda A1 Integration Architecture**
```typescript
// Dual L1/L2 integration for maximum compatibility
export interface MilkomedaIntegration {
  // Algorand L1 (native)
  algorand_l1: {
    address: string;
    nativeAlgoBalance: number;
    canisterControlled: boolean;
  };
  
  // Milkomeda A1 L2 (EVM-compatible)
  milkomeda_l2: {
    evmAddress: string;
    milkAlgoBalance: number;
    web3Compatible: boolean;
  };
  
  // Bridge operations
  bridgeOperations: {
    wrapAlgo: (amount: number) => Promise<TransactionResult>;
    unwrapAlgo: (amount: number) => Promise<TransactionResult>;
    estimateBridgeFees: () => Promise<FeeEstimate>;
  };
}

export class MilkomedaBridge {
  constructor(private algorandCredentials: AlgorandCredentials) {}
  
  // Wrap ALGO → milkALGO for EVM compatibility
  async wrapAlgoToMilkomeda(amount: number): Promise<TransactionResult> {
    // Use threshold signature to interact with Milkomeda bridge
    const bridgeTransaction = await this.createMilkomedaBridgeTransaction(amount);
    const signedTransaction = await this.signWithThresholdSignature(bridgeTransaction);
    return await this.broadcastToMilkomeda(signedTransaction);
  }
  
  // Unwrap milkALGO → ALGO back to L1
  async unwrapMilkomedaToAlgo(amount: number): Promise<TransactionResult> {
    // EVM transaction to unwrap milkALGO
    const unwrapTransaction = await this.createUnwrapTransaction(amount);
    const signedTransaction = await this.signWithThresholdSignature(unwrapTransaction);
    return await this.broadcastToAlgorand(signedTransaction);
  }
}
```

### **EVM Tooling Compatibility**
- **MetaMask Integration**: Full MetaMask support for Milkomeda A1
- **Web3.js Compatibility**: Standard Ethereum tooling works seamlessly
- **Smart Contract Deployment**: Deploy Solidity contracts on Milkomeda A1
- **DeFi Protocol Access**: Access to Ethereum-based DeFi protocols

## 📊 **API Architecture**

### **REST API Design**
Following Rabbi Trading Bot patterns with Algorand-specific extensions:
```typescript
// API endpoint structure
/api/sippar/
├── auth/
│   ├── POST /login                    # Internet Identity login
│   ├── POST /derive-credentials       # Algorand credential derivation
│   └── POST /logout                   # Logout and cleanup
├── algorand/
│   ├── GET /balance/{address}         # Get native ALGO balance
│   ├── POST /transaction             # Submit Algorand transaction
│   └── GET /transaction/{id}         # Get transaction status
├── ck-algo/
│   ├── POST /mint                    # Mint ckALGO from ALGO
│   ├── POST /redeem                  # Redeem ckALGO to ALGO
│   ├── GET /balance/{principal}      # Get ckALGO balance
│   └── GET /total-supply            # Get total ckALGO supply
├── milkomeda/
│   ├── POST /wrap                    # Wrap ALGO to milkALGO
│   ├── POST /unwrap                  # Unwrap milkALGO to ALGO
│   └── GET /bridge-status           # Bridge operation status
└── health/
    ├── GET /                         # Overall system health
    ├── GET /algorand                 # Algorand node health
    └── GET /icp                      # ICP canister health
```

### **WebSocket Integration**
Real-time updates following Rabbi WebSocket patterns:
```typescript
// WebSocket event types
export interface SipparWebSocketEvents {
  'algorand:balance': { address: string; balance: number };
  'ck-algo:mint': { principal: string; amount: number; txn_id: string };
  'ck-algo:redeem': { principal: string; amount: number; algo_txn_id: string };
  'milkomeda:wrap': { amount: number; l2_txn_id: string };
  'milkomeda:unwrap': { amount: number; l1_txn_id: string };
  'system:health': { status: 'healthy' | 'degraded' | 'unhealthy' };
}

// WebSocket service
export class SipparWebSocketService {
  private ws: WebSocket;
  
  connect(principal: string) {
    this.ws = new WebSocket(`wss://nuru.network/ws/sippar?principal=${principal}`);
    this.setupEventHandlers();
  }
  
  subscribeToAlgorandBalance(address: string) {
    this.ws.send(JSON.stringify({
      type: 'subscribe',
      channel: 'algorand:balance',
      params: { address }
    }));
  }
}
```

## 🔄 **Data Flow Architecture**

### **User Journey Flow**
```
1. User Authentication
   Internet Identity → Principal Generation → Algorand Address Derivation

2. Asset Deposit
   Native ALGO → Algorand Network → Deposit Detection → ckALGO Minting

3. Trading
   ckALGO → ICP DEXs → Trade Execution → Balance Updates

4. Cross-Chain Operations
   ckALGO → Native ALGO Redemption → Threshold Signature → Algorand Transfer

5. EVM Integration
   ALGO → Milkomeda Bridge → milkALGO → EVM DeFi Protocols
```

### **State Management**
```typescript
// Frontend state architecture
export interface SipparAppState {
  authentication: {
    user: InternetIdentityUser | null;
    algorandCredentials: AlgorandCredentials | null;
    isLoading: boolean;
    error: string | null;
  };
  
  balances: {
    nativeAlgo: number;
    ckAlgo: number;
    milkAlgo: number;
    lastUpdated: Date;
  };
  
  transactions: {
    pending: Transaction[];
    confirmed: Transaction[];
    failed: Transaction[];
  };
  
  system: {
    health: SystemHealth;
    prices: TokenPrices;
    networkStatus: NetworkStatus;
  };
}
```

## 🚀 **Deployment Architecture**

### **Infrastructure Components**
- **Frontend**: React app deployed on Hivelocity VPS
- **API Backend**: Chain Fusion service in separate container
- **ICP Canisters**: Smart contracts deployed on Internet Computer mainnet
- **Monitoring**: Unified dashboard with Sippar-specific metrics
- **Database**: PostgreSQL for transaction history and user preferences

### **Scalability Considerations**
- **Horizontal Scaling**: Multiple API backend instances behind load balancer
- **Canister Upgrades**: ICP canisters designed for seamless upgrades
- **Database Sharding**: User data sharded by principal for scalability
- **CDN Integration**: Static assets served via CDN for global performance

## 🔍 **Monitoring & Observability**

### **Key Metrics**
- **Transaction Throughput**: Signatures per second (target: ~1/sec ICP limit)
- **User Experience**: Authentication time, transaction confirmation time
- **System Health**: Canister cycles, API response times, error rates
- **Financial Metrics**: Total Value Locked (TVL), volume, fee collection

### **Alerting Strategy**
- **Critical**: Canister failures, signature service outages
- **Warning**: High error rates, slow response times
- **Info**: Normal operation metrics, usage statistics

---

**Next Steps**: Begin implementation with Internet Identity integration and Algorand credential derivation, following the architecture patterns established in this document.