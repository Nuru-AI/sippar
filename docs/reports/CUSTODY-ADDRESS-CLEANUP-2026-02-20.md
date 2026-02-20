# Custody Address Cleanup Report

**Date**: 2026-02-20
**Issue**: Inaccessible hardcoded custody address
**Resolution**: Removed and replaced with derivable address
**Impact**: ~24 ALGO written off as testing loss

---

## Summary

A hardcoded Algorand address `7KJLCGZSMYMF6CKUGSTHRU75TN6CHJQZEUJZPSAO3AQLTMVLFPL6W5YX7I` was discovered in the codebase that could not be signed by the ICP threshold signer canister. After investigation, it was determined that:

1. The address was generated during early testing (Sept 9, 2025)
2. The derivation method used is unknown/lost
3. Neither the NEW nor OLD canister derivation methods produce this address
4. The ~24 ALGO at this address are inaccessible

**Decision**: Remove the hardcoded address and use properly derivable addresses going forward.

---

## Changes Made

### 1. `src/backend/src/server.ts` (line ~5223)

**Before:**
```typescript
const KNOWN_CUSTODY_ADDRESS = '7KJLCGZSMYMF6CKUGSTHRU75TN6CHJQZEUJZPSAO3AQLTMVLFPL6W5YX7I';
```

**After:**
```typescript
// This is the actual address derivable via threshold_signer canister (NEW method)
const CUSTODY_ADDRESS = '6W47GCLXWEIEZ2LRQCXF7HGLOYSXYCXOPXJ5YE55EULFHB7O4RWIM3JDCI';
```

### 2. `src/backend/src/services/reserveVerificationService.ts` (lines ~269-274)

**Removed:** Hardcoded addition of mystery address to reserve verification.

The reserve verification now uses only addresses from `custodyAddressService.getAllRealCustodyAddresses()`.

---

## Technical Details

### Address Derivation Methods

| Method | Principal | Address Produced |
|--------|-----------|------------------|
| NEW (`derive_algorand_address`) | `2vxsx-fae` | `6W47GCLXWEIEZ2LRQCXF7HGLOYSXYCXOPXJ5YE55EULFHB7O4RWIM3JDCI` |
| OLD (`derive_old_algorand_address`) | `2vxsx-fae` | `YOSB3IPYDXZY2UOENDHKLGFCSADS3MBUXI64WSKBVPKQOOVQAZOOYJTCO4` |
| OLD | canister principal | `AC4ZYO4CYWNEWATOZETFXJHDE3GRM7CSPDSZHZADZU7HGJKPKV7JBQLHDM` |
| **Unknown** | ? | `7KJLCGZSMYMF6CKUGSTHRU75TN6CHJQZEUJZPSAO3AQLTMVLFPL6W5YX7I` |

### Timeline

- **Sept 8, 2025**: Chain fusion breakthrough with address `AC4ZYO4...`
- **Sept 9, 2025**: First deposit to mystery address `7KJLCG...` (6 ALGO)
- **Sept 18, 2025**: Mystery address hardcoded in codebase (commit e80c91a)
- **Feb 19, 2026**: Additional deposits totaling ~18 ALGO
- **Feb 20, 2026**: Investigation concluded, address removed

### Funds Written Off

| Address | Balance | Status |
|---------|---------|--------|
| `7KJLCGZSMYMF6CKUGSTHRU75TN6CHJQZEUJZPSAO3AQLTMVLFPL6W5YX7I` | ~24.12 ALGO | Inaccessible - written off |

---

## Lessons Learned

1. **Always verify derivation before accepting deposits** - Test signing before using an address
2. **Log derivation parameters** - Store principal, key name, and derivation path with each address
3. **Never hardcode addresses without proof** - Include derivation method in comments
4. **Test recovery capability** - Verify you can sign from an address before using it in production

---

## Files Cleaned Up

Removed investigation scripts and documentation:
- `scripts/test-migration-*.{js,ts,sh}`
- `scripts/comprehensive-derivation-test.*`
- `scripts/*algorand-keys*`, `*mnemonic*`, `*derivation*`
- `working/INVESTIGATION-*.md`, `working/FINAL-FINDINGS-*.md`
- `docs/reports/DERIVATION_PATH_ANALYSIS.md`, `*ADDRESS_MAP.md`

---

**Status**: Resolved
**Backend**: Rebuilt and ready for deployment
