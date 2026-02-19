# Frontend API Endpoint Fixes - Implementation Plan

**Document**: Frontend API Endpoint Corrections  
**Date**: September 10, 2025  
**Status**: 🔧 **READY FOR IMPLEMENTATION**  
**Priority**: 🚨 **CRITICAL** - Multiple UI components are broken  
**Estimated Time**: 2-3 hours  

## 🎯 **OBJECTIVE**

Fix all frontend-backend API endpoint mismatches to restore full functionality to Sippar's user interface. Currently, several UI components are calling wrong or non-existent endpoints.

## 🚨 **CURRENT BROKEN FUNCTIONALITY**

### **1. Redeem Flow - COMPLETELY BROKEN**
- **Component**: `RedeemFlow.tsx` 
- **Issue**: Calls `/ck-algo/redeem-confirmed` which doesn't exist
- **Impact**: Users cannot redeem ckALGO tokens
- **User Experience**: Redeem button fails silently or shows errors

### **2. AI Chat - COMPLETELY BROKEN**  
- **Component**: `AIChat.tsx`
- **Issue**: Uses relative paths that resolve to wrong URLs
- **Impact**: AI chat interface doesn't load/work
- **User Experience**: No AI assistance available

### **3. ckAlgo Balance/Operations - POTENTIALLY BROKEN**
- **Component**: `ckAlgoCanister.ts` 
- **Issue**: Uses relative paths that may not resolve correctly
- **Impact**: Balance queries and direct ckALGO operations may fail
- **User Experience**: Incorrect balances or failed transactions

## 📋 **DETAILED FIXES REQUIRED**

### **🔧 FIX #1: RedeemFlow.tsx - Line 131**

**Current (BROKEN)**:
```typescript
const response = await fetch('https://nuru.network/api/sippar/ck-algo/redeem-confirmed', {
```

**Fix to**:
```typescript
const response = await fetch('https://nuru.network/api/sippar/ck-algo/redeem', {
```

**Reasoning**: The server has `POST /ck-algo/redeem` but no `redeem-confirmed` endpoint.

---

### **🔧 FIX #2: AIChat.tsx - Line 48**

**Current (BROKEN)**:
```typescript
const response = await fetch('/api/ai/status');
```

**Fix to**:
```typescript
const response = await fetch('https://nuru.network/api/ai/status');
```

**Reasoning**: Relative path resolves to `https://nuru.network/sippar/api/ai/status` (404), but should be `https://nuru.network/api/ai/status` (working).

---

### **🔧 FIX #3: AIChat.tsx - Line 78**

**Current (BROKEN)**:
```typescript
const response = await fetch('/api/ai/auth-url', {
```

**Fix to**:
```typescript
const response = await fetch('https://nuru.network/api/ai/auth-url', {
```

**Reasoning**: Same relative path issue as above.

---

### **🔧 FIX #4: ckAlgoCanister.ts - Line 26**

**Current (POTENTIALLY PROBLEMATIC)**:
```typescript
this.canisterUrl = '/ck-algo'; // Production: nginx proxy
```

**Fix to**:
```typescript
this.canisterUrl = 'https://nuru.network/api/sippar/ck-algo'; // Production: full URL
```

**Reasoning**: Ensures absolute URL resolution to correct backend endpoints.

---

### **🔧 FIX #5: ckAlgoCanister.ts - Line 32-34 (Optional Cleanup)**

**Current**:
```typescript
const endpoints = [
  `/api/sippar${endpoint}`, // Production: nginx proxy
  `http://localhost:3001${endpoint}`, // Local dev fallback
];
```

**Fix to** (since we're using absolute URLs now):
```typescript
// Remove fallback logic since we're using absolute URLs
// This entire tryEndpoints method can be simplified
```

## 🧪 **TESTING PLAN**

### **Pre-Implementation Testing**
Test current broken state to confirm issues:

```bash
# Test current AI endpoints (should fail)
curl -s https://nuru.network/sippar/api/ai/status
curl -s https://nuru.network/sippar/api/ai/auth-url

# Test redeem-confirmed endpoint (should fail)
curl -s -X POST https://nuru.network/api/sippar/ck-algo/redeem-confirmed

# Test correct endpoints (should work)
curl -s https://nuru.network/api/ai/status
curl -s https://nuru.network/api/ai/auth-url  
curl -s -X POST https://nuru.network/api/sippar/ck-algo/redeem
```

### **Post-Implementation Testing**

#### **1. Redeem Flow Testing**
- [ ] Login with Internet Identity
- [ ] Navigate to Redeem tab
- [ ] Attempt to redeem small amount of ckALGO
- [ ] Verify no console errors
- [ ] Verify API calls go to correct endpoint

#### **2. AI Chat Testing**  
- [ ] Navigate to AI Chat section
- [ ] Verify AI status loads correctly
- [ ] Test auth URL generation
- [ ] Verify no console errors

#### **3. Balance/ckAlgo Testing**
- [ ] Check balance display updates correctly
- [ ] Test ckALGO operations
- [ ] Verify no console errors

### **Console Verification**
After fixes, check browser console for:
- ✅ No 404 errors for API calls
- ✅ Successful API responses
- ✅ Proper error handling for actual failures

## 📁 **FILE MODIFICATION CHECKLIST**

### **Files to Modify**:
- [ ] `src/frontend/src/components/RedeemFlow.tsx` (Line 131)
- [ ] `src/frontend/src/components/ai/AIChat.tsx` (Lines 48, 78)  
- [ ] `src/frontend/src/services/ckAlgoCanister.ts` (Lines 26, 32-34)

### **Files to Review** (No changes needed but verify):
- [x] `src/frontend/src/services/SipparAPIService.ts` ✅ Already correct
- [x] `src/frontend/src/components/Dashboard.tsx` ✅ Already correct
- [x] `src/frontend/src/components/MintFlow.tsx` ✅ Already correct

## 🚀 **IMPLEMENTATION SEQUENCE**

### **Step 1: Backup & Branch**
```bash
cd /Users/eladm/Projects/Nuru-AI/Sippar
git checkout -b fix/frontend-api-endpoints
git status # Ensure clean working directory
```

### **Step 2: Fix RedeemFlow.tsx (CRITICAL)**
```typescript
// File: src/frontend/src/components/RedeemFlow.tsx
// Line: 131
// Change: ck-algo/redeem-confirmed → ck-algo/redeem
```

### **Step 3: Fix AIChat.tsx (HIGH PRIORITY)**
```typescript  
// File: src/frontend/src/components/ai/AIChat.tsx
// Line 48: /api/ai/status → https://nuru.network/api/ai/status
// Line 78: /api/ai/auth-url → https://nuru.network/api/ai/auth-url
```

### **Step 4: Fix ckAlgoCanister.ts (MEDIUM PRIORITY)**
```typescript
// File: src/frontend/src/services/ckAlgoCanister.ts  
// Line 26: '/ck-algo' → 'https://nuru.network/api/sippar/ck-algo'
// Simplify tryEndpoints method
```

### **Step 5: Build & Test**
```bash
cd src/frontend
npm run build
npm run dev # Test locally
```

### **Step 6: Production Deployment**
```bash
cd /Users/eladm/Projects/Nuru-AI/Sippar
./tools/deployment/deploy-frontend.sh
```

### **Step 7: Verify Production**
- Test all three fixed components on https://nuru.network/sippar/
- Check browser console for errors
- Test user workflows end-to-end

## 🔒 **RISK ASSESSMENT**

### **LOW RISK** ✅
- **Why**: These are pure frontend fixes calling existing working endpoints
- **Backend**: No changes required - all target endpoints already work
- **Rollback**: Easy - previous frontend version works except for these specific features

### **Validation**
All target endpoints already verified working:
- ✅ `POST /ck-algo/redeem` - Works
- ✅ `GET /api/ai/status` - Works  
- ✅ `POST /api/ai/auth-url` - Works
- ✅ `GET /ck-algo/balance/:principal` - Works

## 📊 **SUCCESS CRITERIA**

### **Must Have**:
- [ ] Redeem flow completes without errors
- [ ] AI Chat loads and functions
- [ ] No 404 API errors in browser console
- [ ] All existing functionality still works

### **Should Have**:
- [ ] Improved error messages for actual failures
- [ ] Consistent API URL patterns across frontend
- [ ] Clean browser console output

### **Could Have**:
- [ ] Simplified ckAlgoCanister service architecture
- [ ] Consistent error handling patterns

## 💡 **ADDITIONAL IMPROVEMENTS**

### **Future Considerations**:
1. **API Configuration**: Create centralized API endpoint configuration
2. **Error Handling**: Standardize API error handling across components  
3. **Type Safety**: Add TypeScript interfaces for all API responses
4. **Retry Logic**: Implement smart retry for network failures

### **Monitoring Recommendations**:
- Add API call success/failure metrics
- Monitor for new endpoint mismatches  
- Set up alerts for 404 API errors

## 🏁 **EXPECTED OUTCOME**

After implementing this plan:
- ✅ **Redeem Flow**: Fully functional ckALGO redemption
- ✅ **AI Chat**: Working AI assistance in UI
- ✅ **Balance Operations**: Reliable ckALGO balance queries  
- ✅ **User Experience**: No broken functionality
- ✅ **Developer Experience**: Clean console, proper error handling

**Estimated Development Time**: 2-3 hours  
**Testing Time**: 1 hour  
**Total Time**: 3-4 hours  

---

**Status**: 📋 **READY FOR IMPLEMENTATION**  
**Next Step**: Begin Step 1 (Backup & Branch)