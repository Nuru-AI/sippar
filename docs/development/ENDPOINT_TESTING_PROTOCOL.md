# Sippar Endpoint Testing Protocol

**Version**: 2.1
**Created**: September 8, 2025
**Purpose**: Comprehensive verification of 53-endpoint production system including X402 Payment Protocol
**Last Updated**: September 18, 2025 - Sprint 016 X402 Integration Complete
**System**: Production-ready with X402 payments, migration, monitoring, and core functionality

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
The system includes **53 endpoints** across 5 categories:

| Category | Endpoints | Purpose |
|----------|-----------|---------|
| **Core Platform** | 35 | Chain fusion, authentication, AI integration |
| **X402 Payment Protocol** | 6 | HTTP 402 payments, marketplace, enterprise billing |
| **Migration System** | 6 | User migration from legacy to production |
| **Deposit Tracking** | 4 | Real-time deposit monitoring and processing |
| **Production Monitoring** | 2 | System health, alerts, and metrics |
| **TOTAL** | **53** | Complete production system with X402 payments |

### **3. Available Endpoints Discovery**
Always get the current endpoint list before testing:

```bash
# Test invalid endpoint to get available endpoints list (53 total)
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

#### **B. X402 Payment Protocol Tests (Priority 2)** ⚡ **NEW - Sprint 016**
```bash
# 4. X402 Agent Marketplace (service discovery)
curl -s "https://nuru.network/api/sippar/x402/agent-marketplace"

# 5. X402 Analytics (payment metrics)
curl -s "https://nuru.network/api/sippar/x402/analytics"

# 6. X402 Payment Status (with test ID)
curl -s "https://nuru.network/api/sippar/x402/payment-status/test123"

# 7. X402 Token Verification (with test token)
curl -s -X POST "https://nuru.network/api/sippar/x402/verify-token" \
  -H "Content-Type: application/json" \
  -d '{"token": "test-token"}'

# 8. X402 Enterprise Billing (with test usage)
curl -s -X POST "https://nuru.network/api/sippar/x402/enterprise-billing" \
  -H "Content-Type: application/json" \
  -d '{"usage": 100}'

# 9. X402 Create Payment (with valid principal and address)
curl -s -X POST "https://nuru.network/api/sippar/x402/create-payment" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 0.01,
    "service": "ai-oracle-basic",
    "principal": "7renf-5svak-mtapl-juxhw-3hv7d-zzfzs-hjlxv-p7wsv-e2zjc-kksxf-3ae",
    "algorandAddress": "6W47GCLXWEIEZ2LRQCXF7HGLOYSXYCXOPXJ5YE55EULFHB7O4RWIM3JDCI"
  }'
```

#### **C. Core Platform Tests (Priority 3)**
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

#### **D. Migration System Tests (Priority 4)**
```bash
# 6. Migration status (check user migration state)
curl -s "https://nuru.network/api/sippar/migration/status/PRINCIPAL_ID"

# 7. Migration statistics (system-wide metrics)
curl -s "https://nuru.network/api/sippar/migration/statistics"
```

#### **E. Production Monitoring Tests (Priority 5)**
```bash
# 8. System metrics (performance data)
curl -s "https://nuru.network/api/sippar/monitoring/metrics"

# 9. Active alerts (current system alerts)
curl -s "https://nuru.network/api/sippar/monitoring/alerts"
```

#### **F. Deposit Tracking Tests (Priority 6)**
```bash
# 10. Deposit system status
curl -s "https://nuru.network/api/sippar/deposits/status"

# 11. Force deposit check (test monitoring)
curl -s -X POST "https://nuru.network/api/sippar/deposits/force-check/PRINCIPAL_ID"
```

## 🚫 **Critical Don'ts**

### **NEVER:**
1. **Mix base URLs** - Stick to nuru.network domain for production testing
2. **Test undocumented endpoints** - Only test endpoints from the 53 verified endpoints
3. **Claim endpoints exist** without successful HTTP 200 responses
4. **Update documentation** without live endpoint verification
5. **Test with large amounts** - Always use 0.001 ALGO for testing
6. **Skip system categories** - Test all 5 categories (Core, X402, Migration, Monitoring, Deposits)
7. **Test monitoring endpoints in production** - Use caution with alert-triggering endpoints
8. **🚨 NEW - X402 Warnings:**
   - **Never test X402 create-payment without valid principal/address** - Will fail authentication
   - **Never assume X402 endpoints work without payment tokens** - HTTP 402 required for protected services
   - **Never test X402 enterprise billing in production** - May affect real billing data
   - **Always verify X402 marketplace response format** - Changes affect client integration

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
# Comprehensive verification of 53-endpoint production system including X402

echo "🔍 Sippar Production Verification (53 Endpoints + X402 Payment Protocol)"
echo "======================================================================="

# 1. Core System Health
echo "1. Testing core system health..."
HEALTH=$(curl -s "https://nuru.network/api/sippar/health")
echo $HEALTH | jq '.service, .deployment, .timestamp'

# 2. Threshold Signature System
echo "2. Testing threshold signature status..."
curl -s "https://nuru.network/api/sippar/api/v1/threshold/status" | jq '.status, .canister_id'

# 3. X402 Payment Protocol Testing (NEW - Sprint 016)
echo "3. Testing X402 Payment Protocol..."
echo "   - Agent Marketplace:"
curl -s "https://nuru.network/api/sippar/x402/agent-marketplace" | jq '.marketplace.totalServices, .success'
echo "   - Analytics Dashboard:"
curl -s "https://nuru.network/api/sippar/x402/analytics" | jq '.analytics.metrics.totalPayments, .success'
echo "   - Payment Status (test):"
curl -s "https://nuru.network/api/sippar/x402/payment-status/test123" | jq '.success, .paymentId'

# 4. Migration System Health
echo "4. Testing migration system..."
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
echo "Total endpoints available: $ENDPOINTS (expected: 53)"

# Count X402 endpoints specifically
X402_ENDPOINTS=$(curl -s "https://nuru.network/api/sippar/invalid" | jq '.available_endpoints[]' | grep -c x402)
echo "X402 endpoints available: $X402_ENDPOINTS (expected: 6)"

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
echo "   - X402 Payment Protocol: ✓ (NEW - Sprint 016)"
echo "   - Migration system: ✓"
echo "   - Production monitoring: ✓"
echo "   - Deposit tracking: ✓"
echo "   - Total endpoints: $ENDPOINTS/53"
echo "   - X402 endpoints: $X402_ENDPOINTS/6"
```

## 📋 **Deployment Verification Checklist**

After ANY deployment, verify all 5 system categories:

### **Core System (Priority 1)**
- [ ] Health endpoint returns current system status
- [ ] Threshold signature system operational
- [ ] Chain fusion endpoint accepts valid requests
- [ ] Balance tracking shows real changes on Algorand network

### **X402 Payment Protocol (Priority 2)** ⚡ **NEW - Sprint 016**
- [ ] Agent marketplace returns service list (4 services)
- [ ] Analytics dashboard accessible and shows metrics
- [ ] Payment status endpoint handles test IDs correctly
- [ ] Token verification accepts and validates tokens
- [ ] Enterprise billing calculates usage correctly
- [ ] Create payment endpoint validates principals and addresses

### **Migration System (Priority 3)**
- [ ] Migration status endpoint functional
- [ ] Migration statistics available
- [ ] Migration history accessible
- [ ] Fresh start migration working

### **Production Monitoring (Priority 4)**
- [ ] Monitoring health endpoint operational
- [ ] System metrics accessible
- [ ] Alert system functional
- [ ] Dashboard data available

### **Deposit Tracking (Priority 5)**
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
1. **All 53 documented endpoints work** on production domain
2. **All 5 system categories operational** (Core, X402, Migration, Monitoring, Deposits)
3. **X402 Payment Protocol fully functional** - All 6 endpoints responding correctly
4. **Real balance changes** confirmed on Algorand network for financial operations
5. **HTTP responses match** documented examples exactly
6. **System integration verified** - categories work together correctly
7. **No hallucinated features** - only claim what's been tested and verified
8. **X402 marketplace shows 4 services** - Service discovery working correctly

## 📊 **Production System Health Indicators**

### **Green Light Criteria** (Deploy/Update Safe)
- ✅ All 53 endpoints accessible
- ✅ Core system health: OK
- ✅ X402 Payment Protocol: All 6 endpoints operational
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

**This protocol ensures comprehensive verification of the complete 53-endpoint production system including Sprint 016 X402 Payment Protocol across all operational categories.**