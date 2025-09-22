# Actual ckALGO Canister Functions Reference

**Version**: 1.0.0  
**Date**: September 10, 2025  
**Status**: ✅ VERIFIED - Functions confirmed to exist in canister  

This document provides accurate reference for functions that actually exist in the deployed ckALGO canister, avoiding hallucinations and documentation mismatches.

---

## ⚠️ **Important Notice**

This document replaces `/docs/api/enterprise-features.md` which contained significant hallucinations about SDK methods that don't exist. This version documents only verified canister functions.

---

## 🔍 **Verification Method**

Functions listed here were verified by:
1. Grepping the actual canister source code: `/src/canisters/ck_algo/src/lib.rs`
2. Confirming `#[update]` and `#[query]` annotations
3. Testing function signatures match implementation

---

## 🛡️ **Compliance Functions**

### Update Functions

#### `create_advanced_compliance_rule`
**Signature:**
```rust
#[update]
async fn create_advanced_compliance_rule(
    rule_name: String,
    regulation_type: RegulationType,
    severity_level: ComplianceSeverity,
    conditions: Vec<ComplianceCondition>,
    actions: Vec<ComplianceAction>
) -> Result<String, String>
```

**Location:** Line 4854  
**Auth Required:** Yes (Enterprise tier)  
**Function:** Creates new compliance rule with conditions and actions

#### `evaluate_compliance_for_operation`
**Signature:**
```rust
#[update]
async fn evaluate_compliance_for_operation(
    operation_type: AuditOperationType,
    user: Principal,
    amount: Option<Nat>,
    metadata: HashMap<String, String>
) -> Result<ComplianceEvaluationResult, String>
```

**Location:** Line 4904  
**Auth Required:** Yes  
**Function:** Evaluates operation against active compliance rules

#### `assess_user_risk`
**Signature:**
```rust
#[update]
async fn assess_user_risk(user: Principal) -> Result<UserRiskProfile, String>
```

**Location:** Line 5066  
**Auth Required:** Yes (Professional+ tier)  
**Function:** Performs comprehensive user risk assessment

#### `generate_regulatory_report`
**Signature:**
```rust
#[update]
async fn generate_regulatory_report(
    regulation_type: RegulationType,
    period_start: u64,
    period_end: u64
) -> Result<String, String>
```

**Location:** Line 4480  
**Auth Required:** Yes (Enterprise tier)  
**Function:** Generates compliance reports for specific regulations

### Query Functions

#### `get_compliance_dashboard`
**Signature:**
```rust
#[query]
fn get_compliance_dashboard() -> String
```

**Location:** Line 4429  
**Auth Required:** Yes (Professional+ tier)  
**Function:** Returns compliance framework status and metrics

#### `get_compliance_metrics`
**Signature:**
```rust
#[query]
fn get_compliance_metrics() -> ComplianceMetrics
```

**Location:** Line 5333  
**Auth Required:** Yes  
**Function:** Returns compliance performance metrics

---

## 🤖 **AI & Explainability Functions**

### Update Functions

#### `request_ai_explanation`
**Signature:**
```rust
#[update]
async fn request_ai_explanation(
    ai_request_id: String,
    explanation_type: ExplanationType
) -> Result<String, String>
```

**Location:** Line 5529  
**Auth Required:** Yes  
**Function:** Requests AI explanation for specific request

#### `enhanced_ai_request`
**Signature:**
```rust
#[update]
async fn enhanced_ai_request(
    service_type: AIServiceType,
    query: String,
    model: Option<String>,
    context: HashMap<String, String>
) -> Result<AIServiceResponse, String>
```

**Location:** Line 2406  
**Auth Required:** Yes  
**Function:** Submits enhanced AI request with context

### Query Functions

#### `get_ai_explanation`
**Signature:**
```rust
#[query]
fn get_ai_explanation(explanation_id: String) -> Option<AIExplanation>
```

**Location:** Line 5818  
**Auth Required:** Yes  
**Function:** Retrieves AI explanation by ID

#### `get_ai_audit_log`
**Signature:**
```rust
#[query]  
fn get_ai_audit_log(limit: Option<u32>) -> Vec<AIAuditEntry>
```

**Location:** Line 5825  
**Auth Required:** Yes (Professional+ tier)  
**Function:** Gets AI audit trail with ethical scoring

---

## 🔐 **Access Control Functions**

### Update Functions

#### `create_access_role`
**Signature:**
```rust
#[update]
async fn create_access_role(
    role_name: String,
    permissions: Vec<Permission>,
    tier_requirement: UserTier
) -> Result<String, String>
```

**Location:** Line 5979  
**Auth Required:** Yes (Enterprise tier)  
**Function:** Creates new access control role

#### `assign_role_to_user`
**Signature:**
```rust
#[update]
async fn assign_role_to_user(user: Principal, role_id: String) -> Result<(), String>
```

**Location:** Line 6011  
**Auth Required:** Yes (Professional+ tier)  
**Function:** Assigns role to specific user

### Query Functions

#### `check_user_permission`
**Signature:**
```rust
#[query]
fn check_user_permission(user: Principal, permission: Permission) -> Result<bool, String>
```

**Location:** Line 6042  
**Auth Required:** No  
**Function:** Checks if user has specific permission

#### `get_user_roles`
**Signature:**
```rust
#[query]
fn get_user_roles(user: Principal) -> Vec<String>
```

**Location:** Line 6178  
**Auth Required:** No  
**Function:** Gets roles assigned to user

#### `list_access_roles`
**Signature:**
```rust
#[query]
fn list_access_roles() -> Vec<AccessRole>
```

**Location:** Line 6185  
**Auth Required:** Yes  
**Function:** Lists all access control roles

---

## 🗳️ **Governance Functions**

### Update Functions

#### `create_governance_proposal`
**Signature:**
```rust
#[update]
async fn create_governance_proposal(
    proposal_type: ProposalType,
    title: String,
    description: String,
    execution_data: Option<String>
) -> Result<String, String>
```

**Location:** Line 6066  
**Auth Required:** Yes (Developer+ tier)  
**Function:** Creates governance proposal for voting

#### `vote_on_proposal`
**Signature:**
```rust
#[update]
async fn vote_on_proposal(
    proposal_id: String,
    vote_decision: VoteDecision,
    reason: Option<String>
) -> Result<(), String>
```

**Location:** Line 6106  
**Auth Required:** Yes  
**Function:** Votes on active governance proposal

### Query Functions

#### `get_governance_proposal`
**Signature:**
```rust
#[query]
fn get_governance_proposal(proposal_id: String) -> Option<GovernanceProposal>
```

**Location:** Line 6160  
**Auth Required:** No  
**Function:** Gets specific governance proposal

#### `list_active_proposals`
**Signature:**
```rust
#[query]
fn list_active_proposals() -> Vec<GovernanceProposal>
```

**Location:** Line 6167  
**Auth Required:** No  
**Function:** Lists all active governance proposals

---

## 📊 **Audit & Monitoring Functions**

### Update Functions

#### `create_enhanced_audit_entry`
**Signature:**
```rust
#[update]
async fn create_enhanced_audit_entry(
    operation_type: AuditOperationType,
    service_involved: ServiceType,
    ai_involvement: bool,
    ai_confidence_score: Option<f64>,
    financial_impact: Option<Nat>,
    cross_chain_data: Option<CrossChainAuditData>,
    metadata: HashMap<String, String>
) -> Result<String, String>
```

**Location:** Line 3985  
**Auth Required:** Yes  
**Function:** Creates comprehensive audit log entry

### Query Functions

#### `get_enhanced_audit_summary`
**Signature:**
```rust
#[query]
fn get_enhanced_audit_summary(
    start_time: Option<u64>,
    end_time: Option<u64>,
    operation_filter: Option<AuditOperationType>,
    user_filter: Option<Principal>
) -> Vec<EnhancedAuditLogEntry>
```

**Location:** Line 4265  
**Auth Required:** Yes (Professional+ tier)  
**Function:** Gets filtered audit log entries

---

## 🚨 **What Doesn't Exist (Yet)**

### Missing SDK Integration
The following were claimed in examples but **DO NOT EXIST**:
- `client.compliance.createRule()` 
- `client.compliance.assessUserRisk()`
- `client.governance.createProposal()`
- `client.permissions.check()`
- `client.ai.generateExplanation()`

### Future Development Required
To make the examples work, these need to be implemented:
1. **ComplianceService** class in SDK
2. **GovernanceService** class in SDK  
3. **PermissionsService** class in SDK
4. **ExplainabilityService** class in SDK
5. Proper TypeScript types for all parameters
6. Error handling and response parsing

---

## 💡 **Using These Functions**

### Direct Canister Calls
Since SDK integration doesn't exist, use `@dfinity/agent` directly:

```typescript
import { Actor, HttpAgent } from '@dfinity/agent';

const agent = new HttpAgent({ host: 'https://ic0.app' });
const actor = Actor.createActor(idlFactory, {
  agent,
  canisterId: 'vj7ly-diaaa-aaaae-abvoq-cai'
});

// Direct call to actual function
const result = await actor.get_compliance_dashboard();
```

### Authentication Requirements
Most functions require:
- Internet Identity authentication
- Specific user tier (Free, Developer, Professional, Enterprise)
- Some require role-based permissions

---

## 🔧 **Next Steps for SDK Integration**

1. Create service classes that wrap these canister functions
2. Add proper TypeScript interfaces for all types
3. Implement authentication and tier checking
4. Add error handling and response validation
5. Write proper unit tests for each service

---

**Last Updated:** September 10, 2025  
**Verification Status:** ✅ All functions confirmed to exist in canister source code  
**SDK Status:** ❌ Not yet exposed through SDK - requires future development