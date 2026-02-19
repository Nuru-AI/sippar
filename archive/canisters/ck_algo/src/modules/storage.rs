// ckALGO Storage Module
// Thread-local storage definitions for all canister data

use std::cell::RefCell;
use std::collections::HashMap;
use candid::{Nat, Principal};

use crate::modules::types::*;

// ============================================================================
// CORE USER & ACCOUNT STORAGE
// ============================================================================

thread_local! {
    static USER_ACCOUNTS: RefCell<HashMap<Principal, UserAccount>> = RefCell::new(HashMap::new());
    static BALANCES: RefCell<HashMap<Principal, Nat>> = RefCell::new(HashMap::new());
}

// ============================================================================
// AI SERVICE STORAGE
// ============================================================================

thread_local! {
    static AI_REQUESTS: RefCell<Vec<AIRequest>> = RefCell::new(Vec::new());
    static AI_RESPONSES: RefCell<HashMap<String, AIResponse>> = RefCell::new(HashMap::new());
    static AI_EXPLANATIONS: RefCell<HashMap<String, AIExplanation>> = RefCell::new(HashMap::new());
}

// ============================================================================
// SMART CONTRACT STORAGE
// ============================================================================

thread_local! {
    static SMART_CONTRACTS: RefCell<HashMap<String, SmartContract>> = RefCell::new(HashMap::new());
    static EXECUTION_RESULTS: RefCell<Vec<ExecutionResult>> = RefCell::new(Vec::new());
}

// ============================================================================
// CROSS-CHAIN STORAGE
// ============================================================================

thread_local! {
    static CROSS_CHAIN_OPERATIONS: RefCell<HashMap<String, CrossChainOperation>> = RefCell::new(HashMap::new());
}

// ============================================================================
// PAYMENT & TRANSACTION STORAGE
// ============================================================================

thread_local! {
    static PAYMENT_HISTORY: RefCell<Vec<PaymentRecord>> = RefCell::new(Vec::new());
}

// ============================================================================
// COMPLIANCE & AUDIT STORAGE
// ============================================================================

thread_local! {
    static ENHANCED_AUDIT_LOG: RefCell<Vec<EnhancedAuditLogEntry>> = RefCell::new(Vec::new());
    static COMPLIANCE_RULES: RefCell<HashMap<String, AdvancedComplianceRule>> = RefCell::new(HashMap::new());
    static USER_RISK_PROFILES: RefCell<HashMap<Principal, UserRiskProfile>> = RefCell::new(HashMap::new());
    static COMPLIANCE_FRAMEWORK_CONFIG: RefCell<ComplianceFramework> = RefCell::new(ComplianceFramework {
        framework_version: "1.0.0".to_string(),
        last_updated: 0,
        enabled_regulations: vec![RegulationType::GDPR, RegulationType::SOC2],
        compliance_thresholds: HashMap::new(),
        audit_retention_days: 2555, // 7 years
        automated_reporting: true,
    });
}

// ============================================================================
// ENTERPRISE ACCESS CONTROL STORAGE
// ============================================================================

thread_local! {
    static ACCESS_ROLES: RefCell<HashMap<String, AccessRole>> = RefCell::new(HashMap::new());
    static USER_ROLE_ASSIGNMENTS: RefCell<HashMap<Principal, Vec<String>>> = RefCell::new(HashMap::new());
}

// ============================================================================
// GOVERNANCE STORAGE
// ============================================================================

thread_local! {
    static GOVERNANCE_PROPOSALS: RefCell<HashMap<String, GovernanceProposal>> = RefCell::new(HashMap::new());
}

// ============================================================================
// COMPLIANCE FRAMEWORK CONFIG
// ============================================================================

#[derive(Clone, Debug)]
pub struct ComplianceFramework {
    pub framework_version: String,
    pub last_updated: u64,
    pub enabled_regulations: Vec<RegulationType>,
    pub compliance_thresholds: HashMap<String, f64>,
    pub audit_retention_days: u32,
    pub automated_reporting: bool,
}

// ============================================================================
// STORAGE ACCESS FUNCTIONS
// ============================================================================

// User Account Functions
pub fn get_user_account(principal: &Principal) -> Option<UserAccount> {
    USER_ACCOUNTS.with(|accounts| {
        accounts.borrow().get(principal).cloned()
    })
}

pub fn set_user_account(principal: Principal, account: UserAccount) {
    USER_ACCOUNTS.with(|accounts| {
        accounts.borrow_mut().insert(principal, account);
    });
}

pub fn get_user_balance(principal: &Principal) -> Nat {
    BALANCES.with(|balances| {
        balances.borrow().get(principal).cloned().unwrap_or(Nat::from(0u64))
    })
}

pub fn set_user_balance(principal: Principal, balance: Nat) {
    BALANCES.with(|balances| {
        balances.borrow_mut().insert(principal, balance);
    });
}

// AI Request Functions
pub fn add_ai_request(request: AIRequest) {
    AI_REQUESTS.with(|requests| {
        requests.borrow_mut().push(request);
    });
}

pub fn get_ai_requests_for_user(user: &Principal) -> Vec<AIRequest> {
    AI_REQUESTS.with(|requests| {
        requests.borrow()
            .iter()
            .filter(|req| req.user == *user)
            .cloned()
            .collect()
    })
}

pub fn set_ai_response(request_id: String, response: AIResponse) {
    AI_RESPONSES.with(|responses| {
        responses.borrow_mut().insert(request_id, response);
    });
}

pub fn get_ai_response(request_id: &str) -> Option<AIResponse> {
    AI_RESPONSES.with(|responses| {
        responses.borrow().get(request_id).cloned()
    })
}

// Smart Contract Functions
pub fn add_smart_contract(contract: SmartContract) {
    let contract_id = contract.contract_id.clone();
    SMART_CONTRACTS.with(|contracts| {
        contracts.borrow_mut().insert(contract_id, contract);
    });
}

pub fn get_smart_contract(contract_id: &str) -> Option<SmartContract> {
    SMART_CONTRACTS.with(|contracts| {
        contracts.borrow().get(contract_id).cloned()
    })
}

pub fn get_user_contracts(user: &Principal) -> Vec<SmartContract> {
    SMART_CONTRACTS.with(|contracts| {
        contracts.borrow()
            .values()
            .filter(|contract| contract.owner == *user)
            .cloned()
            .collect()
    })
}

pub fn add_execution_result(result: ExecutionResult) {
    EXECUTION_RESULTS.with(|results| {
        results.borrow_mut().push(result);
    });
}

// Cross-Chain Functions
pub fn add_cross_chain_operation(operation: CrossChainOperation) {
    let op_id = operation.operation_id.clone();
    CROSS_CHAIN_OPERATIONS.with(|operations| {
        operations.borrow_mut().insert(op_id, operation);
    });
}

pub fn get_cross_chain_operation(operation_id: &str) -> Option<CrossChainOperation> {
    CROSS_CHAIN_OPERATIONS.with(|operations| {
        operations.borrow().get(operation_id).cloned()
    })
}

pub fn update_cross_chain_operation_status(operation_id: &str, status: CrossChainStatus) {
    CROSS_CHAIN_OPERATIONS.with(|operations| {
        if let Some(operation) = operations.borrow_mut().get_mut(operation_id) {
            operation.status = status;
            if matches!(status, CrossChainStatus::Completed | CrossChainStatus::Failed) {
                operation.completed_at = Some(ic_cdk::api::time());
            }
        }
    });
}

// Payment Functions
pub fn add_payment_record(payment: PaymentRecord) {
    PAYMENT_HISTORY.with(|history| {
        history.borrow_mut().push(payment);
    });
}

pub fn get_user_payment_history(user: &Principal) -> Vec<PaymentRecord> {
    PAYMENT_HISTORY.with(|history| {
        history.borrow()
            .iter()
            .filter(|payment| payment.payer == *user)
            .cloned()
            .collect()
    })
}

// Audit Functions
pub fn add_audit_log_entry(entry: EnhancedAuditLogEntry) {
    ENHANCED_AUDIT_LOG.with(|log| {
        log.borrow_mut().push(entry);
    });
}

pub fn get_audit_log_entries(limit: Option<u64>) -> Vec<EnhancedAuditLogEntry> {
    ENHANCED_AUDIT_LOG.with(|log| {
        let entries = log.borrow();
        let max_entries = limit.unwrap_or(100) as usize;
        entries.iter()
            .rev()
            .take(max_entries)
            .cloned()
            .collect()
    })
}

// Compliance Functions
pub fn add_compliance_rule(rule: AdvancedComplianceRule) {
    let rule_id = rule.rule_id.clone();
    COMPLIANCE_RULES.with(|rules| {
        rules.borrow_mut().insert(rule_id, rule);
    });
}

pub fn get_active_compliance_rules() -> Vec<AdvancedComplianceRule> {
    COMPLIANCE_RULES.with(|rules| {
        rules.borrow()
            .values()
            .filter(|rule| rule.is_active)
            .cloned()
            .collect()
    })
}

pub fn set_user_risk_profile(user: Principal, profile: UserRiskProfile) {
    USER_RISK_PROFILES.with(|profiles| {
        profiles.borrow_mut().insert(user, profile);
    });
}

pub fn get_user_risk_profile(user: &Principal) -> Option<UserRiskProfile> {
    USER_RISK_PROFILES.with(|profiles| {
        profiles.borrow().get(user).cloned()
    })
}

// Access Control Functions
pub fn add_access_role(role: AccessRole) {
    let role_id = role.role_id.clone();
    ACCESS_ROLES.with(|roles| {
        roles.borrow_mut().insert(role_id, role);
    });
}

pub fn get_access_role(role_id: &str) -> Option<AccessRole> {
    ACCESS_ROLES.with(|roles| {
        roles.borrow().get(role_id).cloned()
    })
}

pub fn get_user_roles(user: &Principal) -> Vec<String> {
    USER_ROLE_ASSIGNMENTS.with(|assignments| {
        assignments.borrow().get(user).cloned().unwrap_or_default()
    })
}

pub fn assign_role_to_user(user: Principal, role_id: String) {
    USER_ROLE_ASSIGNMENTS.with(|assignments| {
        let mut assignments = assignments.borrow_mut();
        let user_roles = assignments.entry(user).or_insert_with(Vec::new);
        if !user_roles.contains(&role_id) {
            user_roles.push(role_id);
        }
    });
}

// Governance Functions
pub fn add_governance_proposal(proposal: GovernanceProposal) {
    let proposal_id = proposal.proposal_id.clone();
    GOVERNANCE_PROPOSALS.with(|proposals| {
        proposals.borrow_mut().insert(proposal_id, proposal);
    });
}

pub fn get_governance_proposal(proposal_id: &str) -> Option<GovernanceProposal> {
    GOVERNANCE_PROPOSALS.with(|proposals| {
        proposals.borrow().get(proposal_id).cloned()
    })
}

pub fn update_governance_proposal(proposal_id: &str, proposal: GovernanceProposal) {
    GOVERNANCE_PROPOSALS.with(|proposals| {
        proposals.borrow_mut().insert(proposal_id.to_string(), proposal);
    });
}

pub fn get_active_proposals() -> Vec<GovernanceProposal> {
    GOVERNANCE_PROPOSALS.with(|proposals| {
        proposals.borrow()
            .values()
            .filter(|p| matches!(p.status, ProposalStatus::Active))
            .cloned()
            .collect()
    })
}

// AI Explanation Functions
pub fn set_ai_explanation(explanation_id: String, explanation: AIExplanation) {
    AI_EXPLANATIONS.with(|explanations| {
        explanations.borrow_mut().insert(explanation_id, explanation);
    });
}

pub fn get_ai_explanation(explanation_id: &str) -> Option<AIExplanation> {
    AI_EXPLANATIONS.with(|explanations| {
        explanations.borrow().get(explanation_id).cloned()
    })
}