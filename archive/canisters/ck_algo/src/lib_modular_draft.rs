// ckALGO Main Canister - Refactored Modular Version
// Sprint 012.5 Day 19-20: Modular architecture for maintainability

use std::collections::HashMap;
use candid::{CandidType, Deserialize, Nat, Principal};
use serde::Serialize;
use ic_cdk::api::{caller, time};
use ic_cdk_macros::*;

// Module imports
mod modules {
    pub mod types;
    pub mod storage;
    pub mod utils;
    pub mod compliance;
}

use modules::types::*;
use modules::storage;
use modules::utils;
use modules::compliance;

// ============================================================================
// CANISTER METADATA
// ============================================================================

#[query]
fn get_canister_info() -> String {
    format!(
        "ckALGO Smart Contract Engine v1.0.0 - Modular Architecture\n\
        Platform: ckALGO Intelligent Automation Platform\n\
        Features: AI Services, Smart Contracts, Cross-Chain Operations, Enterprise Compliance\n\
        Build: Sprint 012.5 - Refactored for maintainability"
    )
}

#[query]
fn get_health() -> String {
    format!("{{\"status\": \"healthy\", \"timestamp\": {}, \"version\": \"1.0.0-modular\"}}", time())
}

// ============================================================================
// USER ACCOUNT MANAGEMENT
// ============================================================================

#[update]
fn register_user(tier: UserTier) -> Result<(), String> {
    let principal = caller();
    
    // Check if user already exists
    if storage::get_user_account(&principal).is_some() {
        return Err("User already registered".to_string());
    }
    
    let account = UserAccount {
        principal,
        tier,
        monthly_usage: 0,
        total_spent: Nat::from(0u64),
        created_at: time(),
        last_active: time(),
    };
    
    storage::set_user_account(principal, account);
    storage::set_user_balance(principal, Nat::from(0u64));
    
    Ok(())
}

#[query]
fn get_user_info() -> Option<UserAccount> {
    let principal = caller();
    storage::get_user_account(&principal)
}

#[query]
fn get_balance() -> Nat {
    let principal = caller();
    storage::get_user_balance(&principal)
}

#[update]
fn add_balance(amount: Nat) -> Result<(), String> {
    if !utils::is_valid_amount(&amount) {
        return Err("Invalid amount".to_string());
    }
    
    let principal = caller();
    let current_balance = storage::get_user_balance(&principal);
    let new_balance = current_balance + amount;
    storage::set_user_balance(principal, new_balance);
    
    Ok(())
}

#[update]
fn upgrade_tier(new_tier: UserTier) -> Result<(), String> {
    let principal = caller();
    
    let mut account = storage::get_user_account(&principal)
        .ok_or("User not registered")?;
    
    // Charge for tier upgrade (simplified)
    let upgrade_cost = match new_tier {
        UserTier::Free => 0,
        UserTier::Developer => 10_000_000_000, // 10 ckALGO
        UserTier::Professional => 50_000_000_000, // 50 ckALGO
        UserTier::Enterprise => 200_000_000_000, // 200 ckALGO
    };
    
    if upgrade_cost > 0 {
        utils::charge_user_for_service(
            principal, 
            upgrade_cost, 
            ServiceType::TierUpgrade
        )?;
    }
    
    account.tier = new_tier;
    account.last_active = time();
    storage::set_user_account(principal, account);
    
    Ok(())
}

// ============================================================================
// AI SERVICES
// ============================================================================

#[update]
async fn submit_ai_request(
    service_type: AIServiceType, 
    query: String,
    model: Option<String>
) -> Result<String, String> {
    let principal = caller();
    let request_id = utils::generate_request_id();
    
    // Check user tier and monthly limits
    let user_tier = utils::get_user_tier(Some(principal));
    let monthly_usage = utils::get_user_monthly_usage(&principal);
    let monthly_limit = utils::get_tier_monthly_limit(&user_tier);
    
    if monthly_usage >= monthly_limit {
        return Err("Monthly usage limit exceeded".to_string());
    }
    
    // Calculate cost and charge user
    let base_cost = 100_000_000; // 0.1 ckALGO
    utils::charge_user_for_service(principal, base_cost, ServiceType::AIService)?;
    
    let request = AIRequest {
        request_id: request_id.clone(),
        user: principal,
        service_type,
        query,
        model: model.unwrap_or("default".to_string()),
        timestamp: time(),
        cost: Nat::from(base_cost),
        status: RequestStatus::Processing,
    };
    
    storage::add_ai_request(request);
    
    // Simulate AI processing (in real implementation, this would be async call to AI service)
    let mock_response = AIResponse {
        request_id: request_id.clone(),
        response: "This is a mock AI response for modular architecture demo".to_string(),
        timestamp: time(),
        processing_time_ms: 150,
        confidence_score: Some(0.95),
    };
    
    storage::set_ai_response(request_id.clone(), mock_response);
    
    Ok(request_id)
}

#[query]
fn get_ai_response(request_id: String) -> Option<AIResponse> {
    storage::get_ai_response(&request_id)
}

#[query]  
fn get_user_ai_history() -> Vec<AIRequest> {
    let principal = caller();
    storage::get_ai_requests_for_user(&principal)
}

// ============================================================================
// SMART CONTRACTS
// ============================================================================

#[update]
async fn create_smart_contract(
    name: String,
    description: String,
    trigger_type: TriggerType,
    actions: Vec<ContractAction>,
    gas_limit: u64,
) -> Result<String, String> {
    let principal = caller();
    let contract_id = utils::generate_contract_id();
    
    // Check permissions
    let user_tier = utils::get_user_tier(Some(principal));
    if matches!(user_tier, UserTier::Free) {
        return Err("Smart contract creation requires Developer tier or higher".to_string());
    }
    
    // Charge for contract creation
    let creation_cost = 1_000_000_000; // 1 ckALGO
    utils::charge_user_for_service(principal, creation_cost, ServiceType::SmartContract)?;
    
    let contract = SmartContract {
        contract_id: contract_id.clone(),
        owner: principal,
        name,
        description,
        trigger_type,
        actions,
        gas_limit,
        created_at: time(),
        is_active: true,
    };
    
    storage::add_smart_contract(contract);
    
    Ok(contract_id)
}

#[update]
async fn execute_smart_contract(
    contract_id: String,
    gas_limit: Option<u64>,
) -> Result<String, String> {
    let principal = caller();
    
    let contract = storage::get_smart_contract(&contract_id)
        .ok_or("Contract not found")?;
    
    if contract.owner != principal {
        return Err("Only contract owner can execute".to_string());
    }
    
    if !contract.is_active {
        return Err("Contract is not active".to_string());
    }
    
    let execution_id = format!("exec_{}", time());
    let gas_used = gas_limit.unwrap_or(contract.gas_limit).min(contract.gas_limit);
    
    // Simulate contract execution
    let result = ExecutionResult {
        execution_id: execution_id.clone(),
        contract_id,
        triggered_by: principal,
        timestamp: time(),
        gas_used,
        status: ExecutionStatus::Success,
        result: Some("Contract executed successfully".to_string()),
        error: None,
    };
    
    storage::add_execution_result(result);
    
    Ok(execution_id)
}

#[query]
fn get_smart_contract(contract_id: String) -> Option<SmartContract> {
    storage::get_smart_contract(&contract_id)
}

#[query]
fn list_user_contracts() -> Vec<SmartContract> {
    let principal = caller();
    storage::get_user_contracts(&principal)
}

// ============================================================================
// CROSS-CHAIN OPERATIONS
// ============================================================================

#[update]
async fn create_cross_chain_operation(
    operation_type: CrossChainOpType,
    algorand_address: String,
    amount: Option<Nat>,
) -> Result<String, String> {
    let principal = caller();
    
    // Validate Algorand address
    if !utils::is_valid_algorand_address(&algorand_address) {
        return Err("Invalid Algorand address".to_string());
    }
    
    // Check permissions
    let user_tier = utils::get_user_tier(Some(principal));
    if matches!(user_tier, UserTier::Free) {
        return Err("Cross-chain operations require Developer tier or higher".to_string());
    }
    
    let operation_id = utils::generate_operation_id();
    
    let operation = CrossChainOperation {
        operation_id: operation_id.clone(),
        user: principal,
        operation_type,
        algorand_address,
        amount,
        status: CrossChainStatus::Pending,
        created_at: time(),
        completed_at: None,
        transaction_hash: None,
    };
    
    storage::add_cross_chain_operation(operation);
    
    // Start async processing (simulated)
    storage::update_cross_chain_operation_status(&operation_id, CrossChainStatus::Processing);
    
    Ok(operation_id)
}

#[query]
fn get_cross_chain_operation(operation_id: String) -> Option<CrossChainOperation> {
    storage::get_cross_chain_operation(&operation_id)
}

// ============================================================================
// COMPLIANCE & GOVERNANCE (Using compliance module)
// ============================================================================

#[update]
async fn evaluate_operation_compliance(
    operation_type: AuditOperationType,
    amount: Option<Nat>,
    metadata: HashMap<String, String>,
) -> Result<ComplianceEvaluationResult, String> {
    let principal = caller();
    compliance::evaluate_compliance_for_operation(
        operation_type,
        principal,
        amount,
        metadata,
    ).await
}

#[update]
async fn assess_user_risk() -> Result<UserRiskProfile, String> {
    let principal = caller();
    compliance::assess_user_risk_profile(&principal).await
}

#[update]
async fn generate_compliance_report(
    regulation_type: RegulationType,
    period_start: u64,
    period_end: u64,
) -> Result<String, String> {
    // Check permissions
    let principal = caller();
    if !utils::user_has_permission(&principal, Permission::ComplianceManagement)? {
        return Err("Insufficient permissions for compliance reporting".to_string());
    }
    
    compliance::generate_regulatory_report(regulation_type, period_start, period_end).await
}

// ============================================================================
// ENTERPRISE ACCESS CONTROL
// ============================================================================

#[update]
async fn create_access_role(
    role_name: String,
    permissions: Vec<Permission>,
    tier_requirement: UserTier,
) -> Result<String, String> {
    let caller = caller();
    
    // Check if caller has admin permissions
    let caller_tier = utils::get_user_tier(Some(caller));
    if !matches!(caller_tier, UserTier::Enterprise) {
        return Err("Only Enterprise tier users can create access roles".to_string());
    }
    
    let role_id = utils::generate_role_id();
    let role = AccessRole {
        role_id: role_id.clone(),
        role_name,
        permissions,
        tier_requirement,
        created_by: caller,
        created_at: time(),
        is_active: true,
    };
    
    storage::add_access_role(role);
    
    Ok(role_id)
}

#[update]
async fn assign_role_to_user(user: Principal, role_id: String) -> Result<(), String> {
    let caller = caller();
    
    // Check permissions
    let caller_tier = utils::get_user_tier(Some(caller));
    if !matches!(caller_tier, UserTier::Enterprise | UserTier::Professional) {
        return Err("Insufficient permissions to assign roles".to_string());
    }
    
    // Verify role exists
    if storage::get_access_role(&role_id).is_none() {
        return Err("Role does not exist".to_string());
    }
    
    storage::assign_role_to_user(user, role_id);
    
    Ok(())
}

#[query]
fn check_user_permission(user: Principal, permission: Permission) -> Result<bool, String> {
    utils::user_has_permission(&user, permission)
}

#[query]
fn get_user_roles(user: Principal) -> Vec<String> {
    storage::get_user_roles(&user)
}

#[query]
fn list_access_roles() -> Vec<AccessRole> {
    storage::ACCESS_ROLES.with(|roles| {
        roles.borrow().values().cloned().collect()
    })
}

// ============================================================================
// GOVERNANCE SYSTEM
// ============================================================================

#[update]
async fn create_governance_proposal(
    proposal_type: ProposalType,
    title: String,
    description: String,
    execution_data: Option<String>,
) -> Result<String, String> {
    let caller = caller();
    
    // Get user tier to determine if they can create proposals
    let user_tier = utils::get_user_tier(Some(caller));
    if matches!(user_tier, UserTier::Free) {
        return Err("Free tier users cannot create governance proposals".to_string());
    }
    
    let current_time = time();
    let proposal_id = utils::generate_proposal_id();
    
    let voting_deadline = current_time + (7 * 24 * 60 * 60 * 1_000_000_000); // 7 days
    
    let proposal = GovernanceProposal {
        proposal_id: proposal_id.clone(),
        proposal_type,
        title,
        description,
        proposed_by: caller,
        created_at: current_time,
        voting_deadline,
        status: ProposalStatus::Active,
        votes: Vec::new(),
        execution_data,
    };
    
    storage::add_governance_proposal(proposal);
    
    Ok(proposal_id)
}

#[update]
async fn vote_on_proposal(
    proposal_id: String,
    vote_decision: VoteDecision,
    reason: Option<String>,
) -> Result<(), String> {
    let caller = caller();
    let current_time = time();
    
    // Get user tier for vote weight calculation
    let user_tier = utils::get_user_tier(Some(caller));
    let vote_weight = match user_tier {
        UserTier::Free => 1.0,
        UserTier::Developer => 2.0,
        UserTier::Professional => 5.0,
        UserTier::Enterprise => 10.0,
    };
    
    let mut proposal = storage::get_governance_proposal(&proposal_id)
        .ok_or("Proposal not found")?;
    
    // Check if proposal is still active
    if !matches!(proposal.status, ProposalStatus::Active) {
        return Err("Proposal is not active".to_string());
    }
    
    // Check if voting deadline has passed
    if current_time > proposal.voting_deadline {
        proposal.status = ProposalStatus::Expired;
        storage::update_governance_proposal(&proposal_id, proposal);
        return Err("Voting deadline has passed".to_string());
    }
    
    // Check if user has already voted
    if proposal.votes.iter().any(|v| v.voter == caller) {
        return Err("User has already voted on this proposal".to_string());
    }
    
    // Add the vote
    let vote = Vote {
        voter: caller,
        voter_tier: user_tier,
        vote_weight,
        vote_decision,
        timestamp: current_time,
        reason,
    };
    
    proposal.votes.push(vote);
    storage::update_governance_proposal(&proposal_id, proposal);
    
    Ok(())
}

#[query]
fn get_governance_proposal(proposal_id: String) -> Option<GovernanceProposal> {
    storage::get_governance_proposal(&proposal_id)
}

#[query]
fn list_active_proposals() -> Vec<GovernanceProposal> {
    storage::get_active_proposals()
}

// ============================================================================
// AI EXPLAINABILITY
// ============================================================================

#[update]
async fn generate_ai_explanation(
    request_id: String,
    explanation_type: ExplanationType,
) -> Result<String, String> {
    let caller = caller();
    
    // Verify the AI request exists and belongs to the caller
    let ai_requests = storage::get_ai_requests_for_user(&caller);
    let request_exists = ai_requests.iter()
        .any(|req| req.request_id == request_id);
    
    if !request_exists {
        return Err("AI request not found or access denied".to_string());
    }
    
    let explanation_id = utils::generate_explanation_id();
    
    // Generate mock explanation (in real implementation, this would call AI explanation service)
    let explanation = AIExplanation {
        explanation_id: explanation_id.clone(),
        request_id: request_id.clone(),
        explanation_type: explanation_type.clone(),
        explanation_text: format!("Mock explanation for {:?}: The AI decision was based on analysis of input patterns and historical data.", explanation_type),
        confidence_factors: vec![
            ConfidenceFactor {
                factor_name: "Input Quality".to_string(),
                weight: 0.4,
                contribution: 0.85,
                explanation: "High quality structured input data".to_string(),
            },
            ConfidenceFactor {
                factor_name: "Model Confidence".to_string(),
                weight: 0.6,
                contribution: 0.92,
                explanation: "Model shows high confidence in prediction".to_string(),
            },
        ],
        data_sources_used: vec![
            DataSource {
                source_name: "Training Dataset".to_string(),
                source_type: "Historical Data".to_string(),
                reliability_score: 0.95,
                last_updated: time() - (24 * 60 * 60 * 1_000_000_000), // 24 hours ago
            },
        ],
        decision_path: vec![
            DecisionStep {
                step_number: 1,
                condition: "Input validation passed".to_string(),
                outcome: "Proceed to analysis".to_string(),
                confidence: 0.98,
            },
            DecisionStep {
                step_number: 2,
                condition: "Pattern recognition completed".to_string(),
                outcome: "Generate response".to_string(),
                confidence: 0.92,
            },
        ],
        bias_assessment: utils::generate_mock_bias_assessment(),
        limitations: vec![
            "Limited to training data patterns".to_string(),
            "May not account for recent market changes".to_string(),
        ],
        generated_at: time(),
    };
    
    storage::set_ai_explanation(explanation_id.clone(), explanation);
    
    Ok(explanation_id)
}

#[query]
fn get_ai_explanation(explanation_id: String) -> Option<AIExplanation> {
    storage::get_ai_explanation(&explanation_id)
}

// ============================================================================
// ANALYTICS & REPORTING
// ============================================================================

#[query]
fn get_platform_stats() -> String {
    let total_users = storage::USER_ACCOUNTS.with(|accounts| accounts.borrow().len());
    let total_contracts = storage::SMART_CONTRACTS.with(|contracts| contracts.borrow().len());
    let total_ai_requests = storage::AI_REQUESTS.with(|requests| requests.borrow().len());
    
    format!(
        "{{\"total_users\": {}, \"total_contracts\": {}, \"total_ai_requests\": {}, \"timestamp\": {}}}",
        total_users, total_contracts, total_ai_requests, time()
    )
}

#[query]
fn get_user_analytics() -> String {
    let principal = caller();
    let monthly_usage = utils::get_user_monthly_usage(&principal);
    let total_spent = utils::calculate_total_user_spending(&principal);
    let user_tier = utils::get_user_tier(Some(principal));
    
    format!(
        "{{\"monthly_usage\": {}, \"total_spent\": \"{}\", \"tier\": \"{:?}\", \"timestamp\": {}}}",
        monthly_usage, total_spent, user_tier, time()
    )
}

// Re-export storage for direct access if needed
pub use modules::storage as canister_storage;