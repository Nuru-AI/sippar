# ICP Cycle Management Strategy for Sippar Chain Fusion

**Created**: September 10, 2025  
**Status**: Active Implementation  
**Priority**: Critical - Prevents service outages

---

## 🚨 **Current Critical Issue**

**Threshold Signer Canister**: `vj7ly-diaaa-aaaae-abvoq-cai`  
**Status**: ❌ Out of cycles (causing wallet derivation failures)  
**Error**: `"Couldn't send message (Code: 2)"`  
**Impact**: Users see "Phase 1 Mode" instead of Algorand addresses

---

## 🎯 **Automatic Cycle Management Solution: CycleOps**

### **Service**: CycleOps (https://cycleops.dev)
- **Type**: Proactive, automated, no-code canister management
- **Monitoring Frequency**: Every 6 hours
- **Features**: Email notifications, historical metrics, automatic top-ups

### **Setup Instructions**:

#### 1. **Account Setup**
```bash
# Visit: https://cycleops.dev
# Login with Internet Identity
# Principal: 2vxsx-fae (current dfx identity)
```

#### 2. **Monitoring Configuration**
```
Canister ID: vj7ly-diaaa-aaaae-abvoq-cai
Display Name: Sippar Threshold Signer
Monitoring Type: Blackhole Monitoring (private metrics recommended)
```

#### 3. **Top-up Rules**
```
Cycles Threshold: 50T cycles (50 trillion)
Top-up Amount: 100T cycles (100 trillion)
Rationale: Each address derivation costs 15B cycles
           100T cycles = ~6,600 address derivations
```

#### 4. **Funding Requirements**
```
Minimum Deposit: 0.1 ICP
Recommended: 0.5 ICP (provides ~1,500T cycles)
Cost per 100T top-up: ~0.033 ICP (at 1 XDR ≈ $1.30)
```

#### 5. **Notification Setup**
- Email notifications for successful/failed top-ups
- Daily/weekly cycle consumption reports
- Low balance warnings

---

## 💰 **Alternative Cycle Management Services**

### **Option 1: CycleOps** (Recommended)
- ✅ Fully automated
- ✅ Email notifications  
- ✅ Historical analytics
- ✅ Private metrics option
- 💰 Cost: 0.1 ICP minimum

### **Option 2: TipJar** (Community donations)
- ✅ Free for recipients
- ❌ Depends on community donations
- ❌ Not guaranteed automatic
- 🌐 URL: https://tipjar.rocks

### **Option 3: Manual Management**
```bash
# Check balance
dfx canister --network ic call vj7ly-diaaa-aaaae-abvoq-cai get_cycles_balance

# Manual top-up (requires ICP)
dfx ledger --network ic top-up vj7ly-diaaa-aaaae-abvoq-cai --amount 0.1
```

---

## 📊 **Cycle Consumption Analysis**

### **Sippar Threshold Signer Usage**:
- **Address Derivation**: 15B cycles per call
- **Transaction Signing**: 10B cycles per signature  
- **Base Operations**: ~1B cycles per query

### **Projected Usage** (based on user growth):
- **Light Usage**: 10 users/day × 15B = 150B cycles/day
- **Medium Usage**: 100 users/day × 15B = 1.5T cycles/day  
- **Heavy Usage**: 1000 users/day × 15B = 15T cycles/day

### **Cost Analysis**:
- **1T cycles** ≈ $1.30 (1 XDR)
- **100T cycles** ≈ $130 (sufficient for 6,600+ operations)
- **Monthly cost estimate**: $10-50 depending on usage

---

## 🔧 **Implementation Priority**

### **Immediate Actions** (Next 24 hours):

1. **✅ Cache-First Frontend**: Deployed (reduces cycle consumption by 99% for returning users)

2. **🔄 Emergency Manual Top-up**: 
   ```bash
   # Requires funding dfx identity with ICP first
   dfx ledger --network ic top-up vj7ly-diaaa-aaaae-abvoq-cai --amount 0.2
   ```

3. **🔄 CycleOps Setup**:
   - Create account at https://cycleops.dev
   - Add threshold signer canister
   - Configure 50T threshold, 100T top-up
   - Fund account with 0.5 ICP

### **Long-term Strategy** (Next 7 days):

4. **Monitor and Optimize**:
   - Track actual cycle consumption
   - Adjust thresholds based on usage patterns
   - Consider implementing cycle-efficient alternatives for heavy operations

5. **Secondary Canister Setup**:
   - Monitor ckALGO canister: `gbmxj-yiaaa-aaaak-qulqa-cai`
   - Set up similar automated management

---

## 🚨 **Emergency Response Plan**

### **If Canister Runs Out of Cycles**:

1. **Immediate Check**:
   ```bash
   curl "https://nuru.network/api/sippar/api/v1/threshold/derive-address" \
     -X POST -H "Content-Type: application/json" \
     -d '{"principal": "test-principal"}'
   # If error contains "Code: 2" = cycles issue
   ```

2. **Emergency Top-up**:
   ```bash
   # If you have ICP balance
   dfx ledger --network ic top-up vj7ly-diaaa-aaaae-abvoq-cai --amount 0.1
   ```

3. **Verify Recovery**:
   ```bash
   # Test API endpoint again
   # Should return address instead of cycle error
   ```

### **Prevention**:
- CycleOps monitoring prevents emergencies
- Frontend caching reduces consumption
- Regular balance monitoring

---

## 📈 **Success Metrics**

### **Technical Metrics**:
- ✅ Zero service outages due to cycle depletion
- ✅ <10 second wallet derivation response times
- ✅ 99.9% API success rate

### **Cost Metrics**:
- ✅ Monthly cycle costs <$100
- ✅ Cost per user interaction <$0.01
- ✅ ROI positive vs. manual management time

### **User Experience**:
- ✅ No more "Phase 1 Mode" errors
- ✅ Instant address derivation for cached users
- ✅ Consistent service availability

---

## 🔗 **Resources & Links**

- **CycleOps**: https://cycleops.dev
- **CycleOps Docs**: https://docs.cycleops.dev
- **ICP Cycle Guide**: https://internetcomputer.org/docs/current/developer-docs/smart-contracts/topping-up/cycles_management_services
- **TipJar**: https://tipjar.rocks
- **Canister IDs**: 
  - Threshold Signer: `vj7ly-diaaa-aaaae-abvoq-cai`
  - ckALGO Token: `gbmxj-yiaaa-aaaak-qulqa-cai`

---

*This document should be updated as we implement and refine the cycle management strategy.*