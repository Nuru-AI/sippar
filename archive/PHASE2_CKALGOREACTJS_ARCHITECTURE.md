# Phase 2: ckALGO Chain-Key Token Architecture

**Document**: Phase 2 ckALGO Implementation Architecture  
**Date**: September 3, 2025  
**Phase**: 2 - Chain-Key Tokens  
**Status**: Planning → Implementation

## 🎯 **Phase 2 Objectives**

### **Primary Goals**
1. **ckALGO Token Implementation**: 1:1 backed Algorand tokens on ICP
2. **Minting/Redemption Flows**: Direct ALGO ↔ ckALGO conversion
3. **Balance Tracking**: Real-time balance display across both networks
4. **Trading Integration**: Basic ckALGO trading on ICP DEXs

### **Technical Requirements**
- **1:1 Backing**: Every ckALGO backed by native ALGO held in custody
- **Threshold Signatures**: Secure ALGO custody using ICP threshold Ed25519
- **Instant Finality**: Sub-second ckALGO transactions on ICP
- **Audit Trail**: Complete transaction history and proof of reserves

## 🏗️ **System Architecture**

### **Component Overview**
```
┌─────────────────────────────────────────────────────────────┐
│                    Phase 2: ckALGO System                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │   Frontend UI   │    │   Backend API   │                │
│  │                 │    │                 │                │
│  │ • Mint ckALGO   │◄──►│ • Minting Logic │                │
│  │ • Redeem ALGO   │    │ • Balance Sync  │                │
│  │ • Balance View  │    │ • TX Status     │                │
│  └─────────────────┘    └─────────────────┘                │
│           │                       │                        │
│           ▼                       ▼                        │
│  ┌─────────────────────────────────────────────────────────┤
│  │              ICP Canisters Layer                        │
│  │                                                         │
│  │  ┌─────────────────┐    ┌─────────────────┐            │
│  │  │ ckALGO Canister │    │Chain Fusion Hub │            │
│  │  │                 │    │                 │            │
│  │  │ • ICRC-1 Token  │◄──►│ • Threshold Sig │            │
│  │  │ • Mint/Burn     │    │ • ALGO Custody  │            │
│  │  │ • Balance Ledger│    │ • TX Execution  │            │
│  │  └─────────────────┘    └─────────────────┘            │
│  └─────────────────────────────────────────────────────────┤
│                           │                                │
│                           ▼                                │
│  ┌─────────────────────────────────────────────────────────┤
│  │                Algorand Network                         │
│  │                                                         │
│  │     • Native ALGO held in threshold custody             │
│  │     • Transaction execution via threshold Ed25519      │
│  │     • Balance verification and proof of reserves       │
│  └─────────────────────────────────────────────────────────┘
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 **Technical Implementation**

### **1. ckALGO Token Canister (ICRC-1)**

**Core Functions:**
```rust
// ICRC-1 standard token implementation
pub struct CkAlgoCanister {
    balances: BTreeMap<Principal, Nat>,
    total_supply: Nat,
    custody_address: String,
    chain_fusion_canister: Principal,
}

// Minting interface
#[update]
async fn mint_ck_algo(args: MintRequest) -> Result<Nat, MintError> {
    // 1. Validate Algorand deposit proof
    // 2. Verify custody address received ALGO
    // 3. Mint equivalent ckALGO to user
    // 4. Update total supply and audit trail
}

// Redemption interface
#[update] 
async fn redeem_ck_algo(args: RedeemRequest) -> Result<String, RedeemError> {
    // 1. Burn user's ckALGO tokens
    // 2. Request ALGO transfer via Chain Fusion
    // 3. Return Algorand transaction ID
}
```

### **2. Chain Fusion Hub Enhancement**

**Extended Backend API:**
```typescript
// New Phase 2 endpoints
POST /ck-algo/mint-request        // Initiate ckALGO minting
POST /ck-algo/redeem-request      // Initiate ALGO redemption  
GET  /ck-algo/balance/{principal} // Get all balances (ALGO + ckALGO)
GET  /ck-algo/reserves            // Proof of reserves
GET  /ck-algo/mint-status/{id}    // Track mint operation status
GET  /ck-algo/redeem-status/{id}  // Track redemption status
```

**Enhanced Functionality:**
- **Algorand Monitoring**: Watch for incoming ALGO deposits
- **Threshold Signing**: Execute ALGO transfers using threshold Ed25519
- **Balance Synchronization**: Keep ICP and Algorand balances in sync
- **Transaction Status**: Track operations across both networks

### **3. Frontend Enhancements**

**New UI Components:**
- **ckALGO Wallet**: Show ALGO and ckALGO balances side-by-side
- **Mint Interface**: Simple ALGO → ckALGO conversion
- **Redeem Interface**: Simple ckALGO → ALGO conversion  
- **Transaction History**: Complete cross-chain transaction log
- **Trading Integration**: Connect to ICP DEXs for ckALGO trading

## 🔄 **User Flows**

### **Mint Flow: ALGO → ckALGO**
1. User clicks "Mint ckALGO" in Sippar dashboard
2. System generates unique deposit address (or uses custody address)
3. User sends ALGO to deposit address from any Algorand wallet
4. Sippar detects deposit and verifies amount
5. ckALGO tokens minted 1:1 to user's ICP principal
6. User can now trade ckALGO on ICP DEXs instantly

### **Redeem Flow: ckALGO → ALGO**
1. User clicks "Redeem ALGO" with ckALGO amount
2. User specifies destination Algorand address
3. ckALGO tokens burned from user's ICP balance
4. Chain Fusion executes ALGO transfer via threshold signature
5. Native ALGO sent to user's specified address
6. User receives confirmation with Algorand transaction ID

### **Trading Flow: ckALGO on ICP**
1. User has ckALGO tokens from minting process
2. Connect to ICP DEXs (ICPSwap, Sonic, etc.)
3. Trade ckALGO ↔ ICP, ckBTC, ckETH, other tokens
4. Instant finality with zero gas fees
5. Option to redeem back to native ALGO anytime

## 🛡️ **Security Model**

### **Custody Architecture**
- **Threshold Ed25519**: No single point of failure
- **ICP Subnet Consensus**: Distributed key management
- **Audit Trail**: Every operation logged immutably
- **Proof of Reserves**: Public verification of 1:1 backing

### **Risk Mitigation**
- **No Bridge Risk**: Direct cryptographic control of ALGO
- **No Validator Set**: Mathematical security via threshold cryptography
- **No Economic Incentives**: Pure cryptographic guarantees
- **Instant Redeemability**: Always 1:1 backed by real ALGO

## 📊 **Implementation Milestones**

### **Week 3: Core Infrastructure**
- [ ] ckALGO canister development (ICRC-1 compliant)
- [ ] Chain Fusion canister enhancements
- [ ] Backend API expansion for Phase 2 endpoints
- [ ] Algorand monitoring service

### **Week 4: User Interface & Integration**
- [ ] Frontend ckALGO wallet components
- [ ] Mint/redeem user flows
- [ ] Transaction status tracking
- [ ] ICP DEX integration preparation

### **Success Criteria**
- [ ] 1:1 ALGO ↔ ckALGO conversion working
- [ ] Real-time balance synchronization
- [ ] Complete audit trail and transaction history
- [ ] Ready for ICP DEX trading integration

## 🚀 **Phase 2 → Phase 3 Bridge**

**Preparation for Milkomeda Integration:**
- ckALGO tokens can be wrapped for EVM compatibility
- Same custody model extends to Milkomeda A1 rollup
- Users get Algorand L1 + EVM L2 + ICP L1 access
- Triple-chain liquidity and trading opportunities

---

**Phase 2 represents the core value proposition of Sippar: true 1:1 backed chain-key tokens with mathematical security guarantees, enabling instant cross-chain liquidity between Algorand and Internet Computer ecosystems.**