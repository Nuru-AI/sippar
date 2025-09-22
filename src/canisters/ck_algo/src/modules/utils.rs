// ckALGO Utilities Module
// Helper functions and utilities used across the canister

use candid::{Nat, Principal};
use ic_cdk::api::{caller, time};
use std::collections::HashMap;

use crate::modules::types::*;
use crate::modules::storage;

// ============================================================================
// USER & TIER UTILITIES
// ============================================================================

pub fn get_user_tier(user: Option<Principal>) -> UserTier {
    let principal = user.unwrap_or_else(|| caller());
    storage::get_user_account(&principal)
        .map(|account| account.tier)
        .unwrap_or(UserTier::Free)
}

pub fn is_tier_sufficient(required: &UserTier, actual: &UserTier) -> bool {
    let tier_levels = HashMap::from([
        (UserTier::Free, 0),
        (UserTier::Developer, 1),
        (UserTier::Professional, 2),
        (UserTier::Enterprise, 3),
    ]);
    
    let required_level = tier_levels.get(required).unwrap_or(&0);
    let actual_level = tier_levels.get(actual).unwrap_or(&0);
    
    actual_level >= required_level
}

pub fn get_tier_monthly_limit(tier: &UserTier) -> u64 {
    match tier {
        UserTier::Free => 100,
        UserTier::Developer => 1000,
        UserTier::Professional => 10000,
        UserTier::Enterprise => u64::MAX, // Unlimited
    }
}

pub fn get_tier_discount(tier: &UserTier) -> f64 {
    match tier {
        UserTier::Free => 0.0,
        UserTier::Developer => 0.25,
        UserTier::Professional => 0.50,
        UserTier::Enterprise => 0.75,
    }
}

// ============================================================================
// BALANCE & PAYMENT UTILITIES
// ============================================================================

pub fn charge_user_for_service(
    user: Principal, 
    base_cost: u64, 
    service_type: ServiceType
) -> Result<Nat, String> {
    let user_tier = get_user_tier(Some(user));
    let discount = get_tier_discount(&user_tier);
    let final_cost = (base_cost as f64 * (1.0 - discount)) as u64;
    let cost_nat = Nat::from(final_cost);
    
    let current_balance = storage::get_user_balance(&user);
    
    if current_balance < cost_nat {
        return Err("Insufficient balance".to_string());
    }
    
    let new_balance = current_balance - cost_nat.clone();
    storage::set_user_balance(user, new_balance);
    
    // Record payment
    let payment = PaymentRecord {
        payment_id: format!("pay_{}", time()),
        payer: user,
        amount: cost_nat.clone(),
        service_type,
        description: format!("Service charge with {}% discount", (discount * 100.0) as u8),
        timestamp: time(),
        transaction_hash: None,
    };
    storage::add_payment_record(payment);
    
    Ok(cost_nat)
}

// ============================================================================
// ID GENERATION UTILITIES
// ============================================================================

pub fn generate_request_id() -> String {
    format!("req_{}", time())
}

pub fn generate_contract_id() -> String {
    format!("contract_{}", time())
}

pub fn generate_operation_id() -> String {
    format!("op_{}", time())
}

pub fn generate_explanation_id() -> String {
    format!("explain_{}", time())
}

pub fn generate_audit_id() -> String {
    format!("audit_{}", time())
}

pub fn generate_rule_id() -> String {
    format!("rule_{}", time())
}

pub fn generate_role_id() -> String {
    format!("role_{}", time())
}

pub fn generate_proposal_id() -> String {
    format!("proposal_{}", time())
}

// ============================================================================
// COMPLIANCE UTILITIES
// ============================================================================

pub fn regulation_type_to_string(reg_type: &RegulationType) -> &'static str {
    match reg_type {
        RegulationType::GDPR => "gdpr",
        RegulationType::CCPA => "ccpa",
        RegulationType::SOX => "sox",
        RegulationType::FINCEN => "fincen",
        RegulationType::MiFID => "mifid",
        RegulationType::BASEL => "basel",
        RegulationType::ISO27001 => "iso27001",
        RegulationType::SOC2 => "soc2",
    }
}

pub fn operation_type_to_audit_string(op_type: &AuditOperationType) -> &'static str {
    match op_type {
        AuditOperationType::AIServiceRequest => "ai_service",
        AuditOperationType::CrossChainTransaction => "cross_chain",
        AuditOperationType::SmartContractExecution => "smart_contract",
        AuditOperationType::UserRegistration => "user_reg",
        AuditOperationType::TierUpgrade => "tier_upgrade",
        AuditOperationType::PaymentProcessing => "payment",
        AuditOperationType::ComplianceCheck => "compliance",
        AuditOperationType::SystemConfiguration => "sys_config",
        AuditOperationType::DataAccess => "data_access",
        AuditOperationType::SecurityEvent => "security",
    }
}

pub fn assess_risk_level(
    _operation_type: &AuditOperationType,
    compliance_checks: &[ComplianceCheck],
    financial_impact: Option<&Nat>,
) -> RiskLevel {
    let mut risk_score = 0;

    // Check compliance results
    for check in compliance_checks {
        match check.result {
            ComplianceResult::Failed => risk_score += 30,
            ComplianceResult::RequiresReview => risk_score += 15,
            ComplianceResult::Passed => risk_score += 0,
            ComplianceResult::Exempted => risk_score += 5,
        }
    }

    // Consider financial impact
    if let Some(amount) = financial_impact {
        if amount > &Nat::from(100_000_000_000u64) { // 100,000 ckALGO
            risk_score += 25;
        } else if amount > &Nat::from(10_000_000_000u64) { // 10,000 ckALGO
            risk_score += 15;
        } else if amount > &Nat::from(1_000_000_000u64) { // 1,000 ckALGO
            risk_score += 5;
        }
    }

    // Determine risk level based on score
    match risk_score {
        0..=10 => RiskLevel::Low,
        11..=30 => RiskLevel::Medium,
        31..=60 => RiskLevel::High,
        _ => RiskLevel::Critical,
    }
}

pub fn identify_regulatory_flags(
    operation_type: &AuditOperationType,
    _principal: &Principal,
    financial_impact: Option<&Nat>,
) -> Vec<RegulatoryFlag> {
    let mut flags = Vec::new();

    // High-value transaction flag
    if let Some(amount) = financial_impact {
        if amount > &Nat::from(10_000_000_000u64) { // 10,000 ckALGO
            flags.push(RegulatoryFlag::HighValueTransaction);
            flags.push(RegulatoryFlag::TaxReporting);
        }
    }

    // Cross-border compliance for international operations
    if matches!(operation_type, AuditOperationType::CrossChainTransaction) {
        flags.push(RegulatoryFlag::CrossBorderCompliance);
    }

    flags
}

// ============================================================================
// AI EXPLAINABILITY UTILITIES  
// ============================================================================

pub fn calculate_ethical_score(explanation: &AIExplanation) -> f64 {
    let mut score: f64 = 100.0;
    
    // Reduce score based on bias assessment
    match explanation.bias_assessment.recommendation {
        BiasRecommendation::Acceptable => score -= 0.0,
        BiasRecommendation::ReviewRequired => score -= 10.0,
        BiasRecommendation::BiasDetected => score -= 25.0,
        BiasRecommendation::HighRiskBias => score -= 50.0,
    }
    
    // Adjust based on transparency level
    if explanation.decision_path.is_empty() {
        score -= 5.0;
    }
    
    score.max(0.0)
}

pub fn generate_mock_bias_assessment() -> BiasAssessment {
    BiasAssessment {
        bias_types_checked: vec![
            "gender_bias".to_string(),
            "racial_bias".to_string(),
            "age_bias".to_string(),
            "economic_bias".to_string(),
        ],
        bias_score: 0.05, // Low bias score
        recommendation: BiasRecommendation::Acceptable,
        mitigation_suggestions: vec![
            "Continue monitoring for bias patterns".to_string(),
            "Regular model retraining with diverse datasets".to_string(),
        ],
    }
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

pub fn is_valid_algorand_address(address: &str) -> bool {
    // Basic Algorand address validation (58 characters, base32)
    if address.len() != 58 {
        return false;
    }
    
    // Check if contains only valid base32 characters
    address.chars().all(|c| "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".contains(c))
}

pub fn is_valid_amount(amount: &Nat) -> bool {
    amount > &Nat::from(0u64)
}

pub fn is_user_account_valid(account: &UserAccount) -> bool {
    account.created_at > 0 && account.last_active >= account.created_at
}

// ============================================================================
// TIME & DATE UTILITIES
// ============================================================================

pub fn format_timestamp(timestamp: u64) -> String {
    // Convert nanoseconds to seconds for human-readable format
    let seconds = timestamp / 1_000_000_000;
    format!("Timestamp: {} seconds since epoch", seconds)
}

pub fn is_within_time_window(timestamp: u64, window_seconds: u64) -> bool {
    let current_time = time();
    let window_nanos = window_seconds * 1_000_000_000;
    current_time.saturating_sub(timestamp) <= window_nanos
}

// ============================================================================
// PERMISSION CHECKING UTILITIES
// ============================================================================

pub fn user_has_permission(user: &Principal, permission: Permission) -> Result<bool, String> {
    let user_roles = storage::get_user_roles(user);
    
    for role_id in user_roles {
        if let Some(role) = storage::get_access_role(&role_id) {
            if role.is_active && role.permissions.contains(&permission) {
                return Ok(true);
            }
        }
    }
    
    Ok(false)
}

// ============================================================================
// DATA AGGREGATION UTILITIES
// ============================================================================

pub fn calculate_total_user_spending(user: &Principal) -> Nat {
    storage::get_user_payment_history(user)
        .into_iter()
        .fold(Nat::from(0u64), |acc, payment| acc + payment.amount)
}

pub fn get_user_monthly_usage(user: &Principal) -> u64 {
    let current_time = time();
    let month_start = current_time - (30 * 24 * 60 * 60 * 1_000_000_000); // 30 days in nanoseconds
    
    storage::get_ai_requests_for_user(user)
        .into_iter()
        .filter(|req| req.timestamp >= month_start)
        .count() as u64
}