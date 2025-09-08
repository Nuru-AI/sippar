# Sippar Claude Code Hooks

**Purpose**: Prevent hallucinations and ensure proper verification of completion claims  
**Created**: September 8, 2025  
**Last Updated**: September 8, 2025

## 🛡️ **Protection System Overview**

These hooks protect against the exact verification mistakes that occurred during Sprint 011, including:
- False completion claims without actual verification
- Hallucinated transaction IDs and endpoint functionality  
- Documentation updates without testing production endpoints
- Sprint completion claims without systematic validation

## 📋 **Available Hooks**

### **1. `sprint-protection.sh`** - Real-time Protection
**Trigger**: Responses containing verification keywords  
**Action**: Warns about unverified claims and provides verification steps

**Protected Keywords**:
- `COMPLETED`, `VERIFIED`, `BREAKTHROUGH` 
- `WORKING`, `DEPLOYED`, `TRANSACTION`, `ENDPOINT`

**Protections**:
- ⚠️ Warns when completion claims are made
- 📋 Flags endpoint documentation updates
- 🔍 Detects transaction ID claims
- ✅ Provides verification checklist

### **2. `sprint-post-validation.sh`** - Automatic Verification  
**Trigger**: Sprint completion claims  
**Action**: Automatically runs production verification

**Auto-Verification Features**:
- 🚀 Runs `./tools/verify-production.sh` automatically
- ✅ Validates endpoints are actually working
- 📁 Checks for active sprint directories
- 🎯 Provides sprint completion checklist

## 🔧 **Configuration**

Claude Code will automatically execute these hooks when triggered. The hooks are designed to:

1. **Prevent False Claims**: Stop hallucinations before they're accepted
2. **Force Verification**: Require actual endpoint testing 
3. **Provide Guidance**: Show exactly what needs to be verified
4. **Automate Checks**: Run production verification automatically

## 🎯 **Usage Examples**

### **When Protection Triggers**:
```
🛡️ [Sprint Protection] Validation triggered
🚨 Detected claim keyword: COMPLETED

⚠️  VERIFICATION REQUIRED
==================================
Claude is making completion/success claims that require verification.

Before accepting these claims, please run:
  ./tools/verify-production.sh

Required verifications:
  ✅ Health endpoint returns Phase 3 status
  ✅ Chain fusion endpoint executes real transactions
  ✅ Algorand balance changes confirm real network interaction
  ✅ All claimed endpoints return HTTP 200 (not 404)
```

### **When Auto-Verification Runs**:
```
🔍 [Sprint Post-Validation] Auto-verification triggered
📋 Detected sprint completion claim: all.*tasks.*complete

🚀 RUNNING AUTOMATIC VERIFICATION
=================================
Running production verification script...
[Production verification output...]

✅ VERIFICATION PASSED
Sprint completion claims are supported by working endpoints.
```

## ⚡ **Benefits**

1. **Immediate Feedback**: Warns about unverified claims in real-time
2. **Automatic Validation**: Runs verification scripts without manual intervention  
3. **Prevents Hallucinations**: Catches false claims before they're accepted
4. **Systematic Approach**: Provides clear verification checklists
5. **Production Focus**: Always validates against production endpoints

## 🔄 **Maintenance**

To update hook behavior:
1. Edit the hook scripts directly
2. Add new keywords to `VERIFICATION_KEYWORDS` arrays
3. Modify verification requirements as needed
4. Test hooks with `./tools/verify-production.sh`

These hooks ensure that Sprint 011-type verification mistakes cannot happen again by forcing systematic validation of all completion claims.