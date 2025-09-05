# Internet Computer Protocol (ICP) Integration

**Last Updated**: September 5, 2025  
**Integration Status**: ✅ Production Active  
**Canisters Deployed**: 2 production canisters fully controlled

---

## 🌐 **DFINITY Service Connections**

Sippar's backend connects to core ICP infrastructure services:

### **Internet Identity Service**
- **Endpoint**: `https://identity.ic0.app`
- **Purpose**: User authentication without private keys
- **Integration**: Frontend authentication flow via `@dfinity/auth-client`
- **Code Location**: `src/frontend/src/hooks/useAlgorandIdentity.ts`

### **Management Canister**  
- **Purpose**: Threshold ECDSA signature operations
- **API Functions**: `ecdsa_public_key`, `sign_with_ecdsa`
- **Key Type**: secp256k1 (converted to Algorand-compatible format)
- **Integration**: Direct canister calls for cryptographic operations

---

## 🏗️ **Production Canisters Deployed**

### **1. Threshold Signer Canister**
- **Canister ID**: `vj7ly-diaaa-aaaae-abvoq-cai`
- **Controller**: mainnet-deploy identity (verified controlled)
- **Source Code**: `src/canisters/threshold_signer/`

**Core Functions**:
```rust
derive_algorand_address(user_principal: Principal) -> SigningResult<AlgorandAddress>
sign_algorand_transaction(principal: Principal, tx_bytes: Vec<u8>) -> TransactionSigningResult  
get_canister_status() -> Vec<(String, String)>
verify_signature(msg: Vec<u8>, sig: Vec<u8>, pubkey: Vec<u8>) -> bool
```

**Verified Capabilities** (from canister status):
- Version: 1.0.0
- Supported curves: "secp256k1 (converted to Ed25519)"
- Network support: "Algorand Testnet, Mainnet" 
- Status: Running with 1.47T cycles

### **2. ckALGO Token Canister**
- **Canister ID**: `gbmxj-yiaaa-aaaak-qulqa-cai` 
- **Controller**: mainnet-deploy identity (verified controlled)
- **Source Code**: `src/canisters/ck_algo/`
- **Standard**: ICRC-1 compliant token

**Core Functions**:
```rust
// ICRC-1 Standard Methods
icrc1_name() -> String                    // Returns "Chain-Key ALGO"
icrc1_symbol() -> String                  // Returns "ckALGO" 
icrc1_decimals() -> u8                    // Returns 6
icrc1_total_supply() -> Nat               // Current total supply
icrc1_balance_of(account: Principal) -> Nat
icrc1_transfer(to: Principal, amount: Nat) -> Result<Nat, String>

// ckALGO Specific Methods  
mint_ck_algo(to: Principal, amount: Nat) -> Result<Nat, String>
redeem_ck_algo(amount: Nat, algorand_address: String) -> Result<String, String>
get_reserves() -> (Nat, Nat, f32)         // (total_supply, algorand_balance, ratio)
add_authorized_minter(principal: Principal) -> Result<(), String>
```

**Verified Token Details**:
- Name: "Chain-Key ALGO"
- Symbol: "ckALGO"
- Decimals: 6
- Fee: 10,000 units (0.01 ckALGO)
- Current supply: 0 (no tokens minted yet)
- Status: Running with 493B cycles

---

## 🔐 **Threshold Signature Architecture**

### **Cryptographic Flow**
1. **User Principal Input**: Internet Identity principal
2. **Derivation Path**: `[user_principal, "algorand", "sippar"]` 
3. **Threshold Key Generation**: ICP subnet generates secp256k1 public key
4. **Address Conversion**: Convert secp256k1 to valid Algorand address format
5. **Signature Generation**: 2/3+ subnet nodes collaborate for transaction signing

### **Algorand Address Derivation**
```typescript
// Verified API endpoint response format
{
  "success": true,
  "address": "5XP5MWBUY4LHENV5IJJNXEGAWCD6R63YANEBSCIOCXDT5WMIV7PDPN4SVE",
  "public_key": [237, 223, 214, 88, ...],
  "canister_id": "vj7ly-diaaa-aaaae-abvoq-cai"
}
```

### **Security Model**
- **No Private Key Exposure**: Keys distributed across ICP subnet nodes
- **Consensus Required**: 2/3+ nodes must agree for signatures
- **Mathematical Security**: Cryptographic proofs, not economic incentives
- **Censorship Resistance**: No single point of failure

---

## 🛠️ **Development Integration**

### **Backend Service Integration**
```typescript
// ThresholdSignerService client
import { HttpAgent, Actor } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';

const agent = new HttpAgent({ host: 'https://ic0.app' });
const actor = Actor.createActor(idlFactory, {
  agent,
  canisterId: 'vj7ly-diaaa-aaaae-abvoq-cai'
});
```

### **Frontend Authentication**
```typescript
// Internet Identity integration
import { AuthClient } from '@dfinity/auth-client';

const authClient = await AuthClient.create();
await authClient.login({
  identityProvider: 'https://identity.ic0.app/#authorize',
  maxTimeToLive: BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000) // 7 days
});
```

---

## 📊 **Performance Characteristics**

### **Response Times**
- **Address Derivation**: 2-5 seconds (threshold signature generation)
- **Transaction Signing**: 2-5 seconds (ICP subnet consensus)
- **Token Operations**: <1 second (standard canister calls)
- **Authentication**: <5 seconds (Internet Identity)

### **Throughput Limitations**
- **Signature Generation**: ~1 signature per second per canister
- **Token Transfers**: Higher throughput (standard ICRC-1 operations)
- **Network Dependency**: ICP subnet performance and availability

---

## 🔗 **Official Resources**

- **Chain Fusion Technology**: [internetcomputer.org/chainfusion](https://internetcomputer.org/chainfusion)
- **Internet Identity**: [identity.ic0.app](https://identity.ic0.app)
- **ICRC-1 Standard**: [github.com/dfinity/ICRC-1](https://github.com/dfinity/ICRC-1)
- **Threshold ECDSA**: [internetcomputer.org/docs/current/developer-docs/integrations/t-ecdsa](https://internetcomputer.org/docs/current/developer-docs/integrations/t-ecdsa)
- **Candid Interface**: [internetcomputer.org/docs/current/references/candid-ref](https://internetcomputer.org/docs/current/references/candid-ref)

---

**Status**: ✅ **Fully Operational** - Both canisters responding to calls and under full management control