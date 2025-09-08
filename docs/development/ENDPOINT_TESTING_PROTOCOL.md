# Sippar Endpoint Testing Protocol

**Created**: September 8, 2025  
**Purpose**: Prevent routing mistakes and ensure systematic endpoint verification  
**Last Updated**: September 8, 2025

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

### **2. Available Endpoints Discovery**
Always get the current endpoint list before testing:

```bash
# Test invalid endpoint to get available endpoints list
curl -s "https://nuru.network/api/sippar/invalid" | jq '.available_endpoints[]'
```

### **3. Systematic Endpoint Testing**
Test endpoints in this exact order:

#### **Health & Status Endpoints**
```bash
# 1. Health check
curl -s "https://nuru.network/api/sippar/health"

# 2. Threshold status  
curl -s "https://nuru.network/api/sippar/api/v1/threshold/status"
```

#### **Core Functionality Tests**
```bash
# 3. Address derivation (with valid principal)
curl -s -X POST "https://nuru.network/api/sippar/api/v1/threshold/derive-address" \
  -H "Content-Type: application/json" \
  -d '{"principal":"valid-principal-here"}'

# 4. Chain fusion (ONLY with small amounts)
curl -s -X POST "https://nuru.network/api/sippar/chain-fusion/transfer-algo" \
  -H "Content-Type: application/json" \
  -d '{"principal":"vj7ly-diaaa-aaaae-abvoq-cai","toAddress":"VALID_ADDRESS","amount":0.001}'
```

## 🚫 **Critical Don'ts**

### **NEVER:**
1. **Mix base URLs** - Stick to nuru.network domain for production testing
2. **Test undocumented endpoints** - Only test endpoints listed in available_endpoints
3. **Claim endpoints exist** without successful HTTP 200 responses
4. **Update documentation** without live endpoint verification
5. **Test with large amounts** - Always use 0.001 ALGO for testing

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

### **Daily Health Checks:**
```bash
#!/bin/bash
# Save as: tools/verify-production.sh

echo "🔍 Sippar Production Verification"
echo "================================"

# 1. Health check
echo "Testing health endpoint..."
HEALTH=$(curl -s "https://nuru.network/api/sippar/health")
echo $HEALTH | jq '.service, .deployment'

# 2. Available endpoints
echo "Getting available endpoints..."
curl -s "https://nuru.network/api/sippar/invalid" | jq '.available_endpoints'

# 3. Chain fusion test (0.001 ALGO)
echo "Testing chain fusion (0.001 ALGO)..."
curl -s -X POST "https://nuru.network/api/sippar/chain-fusion/transfer-algo" \
  -H "Content-Type: application/json" \
  -d '{"principal":"vj7ly-diaaa-aaaae-abvoq-cai","toAddress":"GD64YIY3TWGDMCNPP553DZPPR6LDUSFQOIJVFDPPXWEG3FVOJCCDBBHU5A","amount":0.001,"note":"daily verification"}' \
  | jq '.success, .algorand_tx_id'

echo "✅ Verification complete"
```

## 📋 **Deployment Verification Checklist**

After ANY deployment:

- [ ] Health endpoint returns Phase 3 status
- [ ] Available endpoints list matches expectations  
- [ ] Chain fusion endpoint accepts valid requests
- [ ] Balance tracking shows real changes on Algorand network
- [ ] All documented endpoints return HTTP 200
- [ ] No endpoints return "Not Found" that should exist

## 🎯 **Success Criteria**

A deployment is verified when:
1. **All documented endpoints work** on production domain
2. **Real balance changes** confirmed on Algorand network
3. **HTTP responses match** documented examples exactly
4. **No hallucinated features** - only claim what's been tested

---

**This protocol prevents routing mistakes and ensures reliable endpoint verification.**