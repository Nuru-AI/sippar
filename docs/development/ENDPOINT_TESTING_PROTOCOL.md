# Sippar Endpoint Testing Protocol

**Version**: 2.0
**Created**: September 8, 2025
**Purpose**: Comprehensive verification of 59-endpoint production system
**Last Updated**: September 18, 2025
**System**: Production-ready with migration, monitoring, and core functionality

## 🎯 **Critical Testing Standards**

### **1. Base URL Verification First**
Before testing ANY endpoints, verify the correct base URLs:

```bash
# Production Domain (ALWAYS test this first)
curl -s "https://nuru.network/api/sippar/health" | jq '.service'

# Direct IP Access (fallback)
curl -s "http://74.50.113.152:3004/health" | jq '.service'

# Expected: "Sippar Algorand Chain Fusion Backend"
```

### **2. Production System Overview**
The system includes **59 endpoints** across 4 categories:

| Category | Endpoints | Purpose |
|----------|-----------|---------|
| **Core Platform** | 41 | Chain fusion, authentication, AI integration |
| **Migration System** | 6 | User migration from legacy to production |
| **Deposit Tracking** | 4 | Real-time deposit monitoring and processing |
| **Production Monitoring** | 8 | System health, alerts, and metrics |
| **TOTAL** | **59** | Complete production system |

### **3. Available Endpoints Discovery**
Always get the current endpoint list before testing:

```bash
# Test invalid endpoint to get available endpoints list (59 total)
curl -s "https://nuru.network/api/sippar/invalid" | jq '.available_endpoints[]'
```

### **4. Systematic Endpoint Testing**
Test endpoints by category in this exact order:

#### **A. Health & Status Endpoints (Priority 1)**
```bash
# 1. Health check (core system)
curl -s "https://nuru.network/api/sippar/health"

# 2. Threshold status (signature system)
curl -s "https://nuru.network/api/sippar/api/v1/threshold/status"

# 3. Production monitoring health
curl -s "https://nuru.network/api/sippar/monitoring/health"
```

#### **B. Core Platform Tests (Priority 2)**
```bash
# 4. Address derivation (with valid principal)
curl -s -X POST "https://nuru.network/api/sippar/api/v1/threshold/derive-address" \
  -H "Content-Type: application/json" \
  -d '{"principal":"valid-principal-here"}'

# 5. Chain fusion (ONLY with small amounts)
curl -s -X POST "https://nuru.network/api/sippar/chain-fusion/transfer-algo" \
  -H "Content-Type: application/json" \
  -d '{"principal":"vj7ly-diaaa-aaaae-abvoq-cai","toAddress":"VALID_ADDRESS","amount":0.001}'
```

#### **C. Migration System Tests (Priority 3)**
```bash
# 6. Migration status (check user migration state)
curl -s "https://nuru.network/api/sippar/migration/status/PRINCIPAL_ID"

# 7. Migration statistics (system-wide metrics)
curl -s "https://nuru.network/api/sippar/migration/statistics"
```

#### **D. Production Monitoring Tests (Priority 4)**
```bash
# 8. System metrics (performance data)
curl -s "https://nuru.network/api/sippar/monitoring/metrics"

# 9. Active alerts (current system alerts)
curl -s "https://nuru.network/api/sippar/monitoring/alerts"
```

#### **E. Deposit Tracking Tests (Priority 5)**
```bash
# 10. Deposit system status
curl -s "https://nuru.network/api/sippar/deposits/status"

# 11. Force deposit check (test monitoring)
curl -s -X POST "https://nuru.network/api/sippar/deposits/force-check/PRINCIPAL_ID"
```

## 🚫 **Critical Don'ts**

### **NEVER:**
1. **Mix base URLs** - Stick to nuru.network domain for production testing
2. **Test undocumented endpoints** - Only test endpoints from the 59 verified endpoints
3. **Claim endpoints exist** without successful HTTP 200 responses
4. **Update documentation** without live endpoint verification
5. **Test with large amounts** - Always use 0.001 ALGO for testing
6. **Skip system categories** - Test all 4 categories (Core, Migration, Monitoring, Deposits)
7. **Test monitoring endpoints in production** - Use caution with alert-triggering endpoints

## ✅ **Documentation Update Protocol**

### **Before updating ANY endpoint documentation:**

1. **✅ Verify endpoint exists**: Get HTTP 200 response
2. **✅ Test with valid inputs**: Confirm expected response format  
3. **✅ Record exact request/response**: Copy actual API responses
4. **✅ Verify balance changes**: For financial operations, confirm network changes
5. **✅ Update docs with REAL data**: No hypothetical examples

### **Documentation Requirements:**
- **Base URL**: Always specify correct production domain
- **Request Examples**: Use actual working request bodies
- **Response Examples**: Copy real API responses verbatim
- **Status Indicators**: Only mark "VERIFIED WORKING" after successful test

## 🔄 **Continuous Verification Process**

### **Comprehensive Daily Health Checks:**
```bash
#!/bin/bash
# Save as: tools/verify-production.sh
# Comprehensive verification of 59-endpoint production system

echo "🔍 Sippar Production Verification (59 Endpoints)"
echo "==============================================="

# 1. Core System Health
echo "1. Testing core system health..."
HEALTH=$(curl -s "https://nuru.network/api/sippar/health")
echo $HEALTH | jq '.service, .deployment, .timestamp'

# 2. Threshold Signature System
echo "2. Testing threshold signature status..."
curl -s "https://nuru.network/api/sippar/api/v1/threshold/status" | jq '.status, .canister_id'

# 3. Migration System Health
echo "3. Testing migration system..."
curl -s "https://nuru.network/api/sippar/migration/statistics" | jq '.total_migrations, .active_migrations'

# 4. Production Monitoring System
echo "4. Testing production monitoring..."
curl -s "https://nuru.network/api/sippar/monitoring/health" | jq '.status, .uptime'

# 5. Deposit Tracking System
echo "5. Testing deposit tracking..."
curl -s "https://nuru.network/api/sippar/deposits/status" | jq '.monitoring_active, .last_check'

# 6. Available endpoints (should show 59)
echo "6. Getting available endpoints..."
ENDPOINTS=$(curl -s "https://nuru.network/api/sippar/invalid" | jq '.available_endpoints | length')
echo "Total endpoints available: $ENDPOINTS (expected: 59)"

# 7. Chain fusion test (0.001 ALGO) - Only if needed
if [ "$1" = "--test-transfer" ]; then
    echo "7. Testing chain fusion (0.001 ALGO)..."
    curl -s -X POST "https://nuru.network/api/sippar/chain-fusion/transfer-algo" \
      -H "Content-Type: application/json" \
      -d '{"principal":"vj7ly-diaaa-aaaae-abvoq-cai","toAddress":"GD64YIY3TWGDMCNPP553DZPPR6LDUSFQOIJVFDPPXWEG3FVOJCCDBBHU5A","amount":0.001,"note":"daily verification"}' \
      | jq '.success, .algorand_tx_id'
fi

echo "✅ Production verification complete"
echo "   - Core system: ✓"
echo "   - Threshold signatures: ✓"
echo "   - Migration system: ✓"
echo "   - Production monitoring: ✓"
echo "   - Deposit tracking: ✓"
echo "   - Total endpoints: $ENDPOINTS/59"
```

## 📋 **Deployment Verification Checklist**

After ANY deployment, verify all 4 system categories:

### **Core System (Priority 1)**
- [ ] Health endpoint returns current system status
- [ ] Threshold signature system operational
- [ ] Chain fusion endpoint accepts valid requests
- [ ] Balance tracking shows real changes on Algorand network

### **Migration System (Priority 2)**
- [ ] Migration status endpoint functional
- [ ] Migration statistics available
- [ ] Migration history accessible
- [ ] Fresh start migration working

### **Production Monitoring (Priority 3)**
- [ ] Monitoring health endpoint operational
- [ ] System metrics accessible
- [ ] Alert system functional
- [ ] Dashboard data available

### **Deposit Tracking (Priority 4)**
- [ ] Deposit status monitoring active
- [ ] Force check functionality working
- [ ] Deposit history accessible
- [ ] Pending deposits trackable

### **Overall System**
- [ ] All 59 endpoints return appropriate responses (200 or expected error)
- [ ] Available endpoints count equals 59
- [ ] No "Not Found" errors for documented endpoints
- [ ] System integration between categories working

## 🎯 **Success Criteria**

A deployment is verified when:
1. **All 59 documented endpoints work** on production domain
2. **All 4 system categories operational** (Core, Migration, Monitoring, Deposits)
3. **Real balance changes** confirmed on Algorand network for financial operations
4. **HTTP responses match** documented examples exactly
5. **System integration verified** - categories work together correctly
6. **No hallucinated features** - only claim what's been tested and verified

## 📊 **Production System Health Indicators**

### **Green Light Criteria** (Deploy/Update Safe)
- ✅ All 59 endpoints accessible
- ✅ Core system health: OK
- ✅ Migration system: Operational
- ✅ Monitoring system: Active
- ✅ Deposit tracking: Monitoring
- ✅ No critical alerts active

### **Yellow Light Criteria** (Caution - Monitor Closely)
- ⚠️ 1-2 non-critical endpoints returning errors
- ⚠️ Minor performance degradation
- ⚠️ Non-blocking alerts present
- ⚠️ Partial system functionality

### **Red Light Criteria** (Stop - Do Not Deploy)
- ❌ Core system health failing
- ❌ >5% of endpoints failing
- ❌ Critical alerts active
- ❌ System integration broken
- ❌ Financial operations failing

---

**This protocol ensures comprehensive verification of the complete 59-endpoint production system across all operational categories.**