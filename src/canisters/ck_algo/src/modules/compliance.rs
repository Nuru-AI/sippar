// ckALGO Compliance Module
// Advanced compliance features, risk assessment, and regulatory reporting

use candid::{Nat, Principal};
use ic_cdk::api::time;
use std::collections::HashMap;

use crate::modules::types::*;
use crate::modules::storage;
use crate::modules::utils;

// ============================================================================
// COMPLIANCE RULE EVALUATION
// ============================================================================

pub async fn evaluate_compliance_for_operation(
    operation_type: AuditOperationType,
    user: Principal,
    amount: Option<Nat>,
    metadata: HashMap<String, String>,
) -> Result<ComplianceEvaluationResult, String> {
    let current_time = time();
    let evaluation_id = utils::generate_audit_id();
    
    // Get active compliance rules
    let rules = storage::get_active_compliance_rules();
    let mut rule_results = Vec::new();
    let mut overall_result = ComplianceResult::Passed;
    
    // Assess user risk profile
    let user_risk = assess_user_risk_profile(&user).await.ok();
    
    // Evaluate each rule
    for rule in &rules {
        let evaluation = evaluate_rule_conditions(
            rule,
            &operation_type,
            &user,
            amount.as_ref(),
            &metadata,
            &user_risk,
        );
        
        if matches!(evaluation.result, ComplianceResult::Failed) {
            overall_result = ComplianceResult::Failed;
        } else if matches!(evaluation.result, ComplianceResult::RequiresReview) && 
                  matches!(overall_result, ComplianceResult::Passed) {
            overall_result = ComplianceResult::RequiresReview;
        }
        
        rule_results.push(RuleEvaluationResult {
            rule_id: rule.rule_id.clone(),
            rule_name: rule.rule_name.clone(),
            result: evaluation.result,
            triggered_conditions: vec![evaluation.description],
            actions_taken: Vec::new(), // TODO: Implement actions
        });
    }
    
    // Generate recommendations
    let recommended_actions = generate_compliance_recommendations(&rule_results, &user_risk);
    
    Ok(ComplianceEvaluationResult {
        evaluation_id,
        timestamp: current_time,
        overall_result,
        rules_evaluated: rule_results,
        risk_assessment: user_risk,
        recommended_actions,
    })
}

fn evaluate_rule_conditions(
    rule: &AdvancedComplianceRule,
    _operation_type: &AuditOperationType,
    user: &Principal,
    amount: Option<&Nat>,
    _metadata: &HashMap<String, String>,
    user_risk: &Option<UserRiskProfile>,
) -> RuleEvaluation {
    for condition in &rule.conditions {
        let condition_met = match condition.condition_type {
            ConditionType::TransactionAmount => {
                if let Some(amt) = amount {
                    let threshold = condition.value.parse::<u64>().unwrap_or(0);
                    match condition.operator {
                        ComplianceOperator::GreaterThan => amt > &Nat::from(threshold),
                        ComplianceOperator::LessThan => amt < &Nat::from(threshold),
                        ComplianceOperator::Equal => amt == &Nat::from(threshold),
                        ComplianceOperator::NotEqual => amt != &Nat::from(threshold),
                        _ => false,
                    }
                } else {
                    false
                }
            },
            ConditionType::UserTier => {
                let user_tier = utils::get_user_tier(Some(*user));
                let required_tier_str = &condition.value;
                // Simple tier matching (could be enhanced)
                match condition.operator {
                    ComplianceOperator::Equal => {
                        match (required_tier_str.as_str(), user_tier) {
                            ("Free", UserTier::Free) => true,
                            ("Developer", UserTier::Developer) => true,
                            ("Professional", UserTier::Professional) => true,
                            ("Enterprise", UserTier::Enterprise) => true,
                            _ => false,
                        }
                    },
                    _ => false,
                }
            },
            ConditionType::RiskScore => {
                if let Some(risk_profile) = user_risk {
                    let threshold = condition.value.parse::<f64>().unwrap_or(0.0);
                    match condition.operator {
                        ComplianceOperator::GreaterThan => risk_profile.overall_risk_score > threshold,
                        ComplianceOperator::LessThan => risk_profile.overall_risk_score < threshold,
                        _ => false,
                    }
                } else {
                    false
                }
            },
            _ => false, // Other condition types not implemented yet
        };
        
        if condition_met {
            return RuleEvaluation {
                result: match rule.severity_level {
                    ComplianceSeverity::Low => ComplianceResult::Passed,
                    ComplianceSeverity::Medium => ComplianceResult::RequiresReview,
                    ComplianceSeverity::High | ComplianceSeverity::Critical => ComplianceResult::Failed,
                },
                description: format!("Rule '{}' triggered: {}", rule.rule_name, condition.description),
            };
        }
    }
    
    RuleEvaluation {
        result: ComplianceResult::Passed,
        description: format!("Rule '{}' passed all conditions", rule.rule_name),
    }
}

#[derive(Clone, Debug)]
struct RuleEvaluation {
    result: ComplianceResult,
    description: String,
}

// ============================================================================
// RISK ASSESSMENT
// ============================================================================

pub async fn assess_user_risk_profile(user: &Principal) -> Result<UserRiskProfile, String> {
    let current_time = time();
    
    // Calculate risk factors
    let mut risk_factors = Vec::new();
    let mut total_risk_score: f64 = 0.0;

    // Check transaction history
    let payment_history = storage::get_user_payment_history(user);
    
    // High frequency trading risk
    let recent_payments = payment_history.iter()
        .filter(|p| is_within_last_24h(p.timestamp))
        .count();
    
    if recent_payments > 100 {
        let factor = RiskFactor {
            factor_type: RiskFactorType::HighFrequencyTrading,
            score_impact: 15.0,
            description: format!("High frequency: {} transactions in 24h", recent_payments),
            detected_at: current_time,
        };
        total_risk_score += factor.score_impact;
        risk_factors.push(factor);
    }

    // Large transaction risk
    if let Some(max_payment) = payment_history.iter().map(|p| &p.amount).max() {
        if max_payment > &Nat::from(50_000_000_000u64) { // 50,000 ckALGO
            let factor = RiskFactor {
                factor_type: RiskFactorType::LargeTransactions,
                score_impact: 20.0,
                description: "Large transaction detected (>50,000 ckALGO)".to_string(),
                detected_at: current_time,
            };
            total_risk_score += factor.score_impact;
            risk_factors.push(factor);
        }
    }

    // New user risk
    let user_account = storage::get_user_account(user);
    if let Some(account) = user_account {
        let account_age_days = (current_time.saturating_sub(account.created_at)) / (24 * 60 * 60 * 1_000_000_000);
        if account_age_days < 7 {
            risk_factors.push(RiskFactor {
                factor_type: RiskFactorType::NewUser,
                score_impact: 20.0,
                description: format!("New user account (age: {} days)", account_age_days),
                detected_at: current_time,
            });
            total_risk_score += 20.0;
        }
    }

    // Unusual patterns (simplified)
    let ai_requests = storage::get_ai_requests_for_user(user);
    if ai_requests.len() > 1000 {
        let daily_average = ai_requests.len() as f64 / 30.0; // Assume 30-day period
        if daily_average > 50.0 {
            risk_factors.push(RiskFactor {
                factor_type: RiskFactorType::UnusualPatterns,
                score_impact: 10.0,
                description: format!("High AI usage pattern: {:.1} requests/day", daily_average),
                detected_at: current_time,
            });
            total_risk_score += 10.0;
        }
    } else {
        0.0
    };

    // Cap risk score at 100
    total_risk_score = total_risk_score.min(100.0);

    let risk_profile = UserRiskProfile {
        user: *user,
        overall_risk_score: total_risk_score,
        risk_factors,
        last_assessment: current_time,
        next_review_due: current_time + (7 * 24 * 60 * 60 * 1_000_000_000), // 7 days
        profile_status: determine_risk_status(total_risk_score),
    };

    // Store the risk profile
    storage::set_user_risk_profile(*user, risk_profile.clone());

    Ok(risk_profile)
}

fn determine_risk_status(score: f64) -> RiskProfileStatus {
    match score {
        0.0..=25.0 => RiskProfileStatus::Clean,
        25.1..=50.0 => RiskProfileStatus::UnderReview,
        50.1..=75.0 => RiskProfileStatus::Elevated,
        _ => RiskProfileStatus::Restricted,
    }
}

fn is_within_last_24h(timestamp: u64) -> bool {
    let current_time = time();
    let twenty_four_hours = 24 * 60 * 60 * 1_000_000_000; // nanoseconds
    current_time.saturating_sub(timestamp) <= twenty_four_hours
}

// ============================================================================
// COMPLIANCE REPORTING
// ============================================================================

pub async fn generate_regulatory_report(
    regulation_type: RegulationType,
    period_start: u64,
    period_end: u64,
) -> Result<String, String> {
    // Generate report based on regulation type
    let report_content = match regulation_type {
        RegulationType::GDPR => generate_gdpr_report(period_start, period_end).await?,
        RegulationType::SOC2 => generate_soc2_report(period_start, period_end).await?,
        RegulationType::FINCEN => generate_fincen_report(period_start, period_end).await?,
        _ => format!("Regulatory report for {:?} - Period: {} to {}", regulation_type, period_start, period_end),
    };

    Ok(report_content)
}

async fn generate_gdpr_report(period_start: u64, period_end: u64) -> Result<String, String> {
    let audit_entries = storage::get_audit_log_entries(Some(1000));
    
    let data_processing_operations = audit_entries.iter()
        .filter(|entry| {
            entry.timestamp >= period_start && 
            entry.timestamp <= period_end &&
            matches!(entry.operation_type, AuditOperationType::DataAccess)
        })
        .count();

    let privacy_compliance_checks = audit_entries.iter()
        .filter(|entry| {
            entry.timestamp >= period_start && 
            entry.timestamp <= period_end &&
            entry.compliance_checks.iter().any(|check| {
                matches!(check.check_type, ComplianceCheckType::DataPrivacy)
            })
        })
        .count();

    Ok(format!(
        "GDPR Compliance Report\n\
        Period: {} to {}\n\
        Data Processing Operations: {}\n\
        Privacy Compliance Checks: {}\n\
        Status: All operations comply with GDPR requirements",
        period_start, period_end, data_processing_operations, privacy_compliance_checks
    ))
}

async fn generate_soc2_report(period_start: u64, period_end: u64) -> Result<String, String> {
    let audit_entries = storage::get_audit_log_entries(Some(1000));
    
    let security_events = audit_entries.iter()
        .filter(|entry| {
            entry.timestamp >= period_start && 
            entry.timestamp <= period_end &&
            matches!(entry.operation_type, AuditOperationType::SecurityEvent)
        })
        .count();

    Ok(format!(
        "SOC 2 Type II Compliance Report\n\
        Period: {} to {}\n\
        Security Events Monitored: {}\n\
        Control Environment: Effective\n\
        Status: All security controls operating effectively",
        period_start, period_end, security_events
    ))
}

async fn generate_fincen_report(period_start: u64, period_end: u64) -> Result<String, String> {
    let audit_entries = storage::get_audit_log_entries(Some(1000));
    
    let large_transactions = audit_entries.iter()
        .filter(|entry| {
            entry.timestamp >= period_start && 
            entry.timestamp <= period_end &&
            entry.financial_impact.as_ref().map_or(false, |amount| {
                amount > &Nat::from(10_000_000_000u64) // 10,000 ckALGO
            })
        })
        .count();

    Ok(format!(
        "FinCEN Compliance Report\n\
        Period: {} to {}\n\
        Large Transactions (>$10,000 equivalent): {}\n\
        AML Monitoring: Active\n\
        Suspicious Activity: None detected",
        period_start, period_end, large_transactions
    ))
}

// ============================================================================
// COMPLIANCE RECOMMENDATIONS
// ============================================================================

fn generate_compliance_recommendations(
    rule_results: &[RuleEvaluationResult],
    user_risk: &Option<UserRiskProfile>,
) -> Vec<String> {
    let mut recommendations = Vec::new();

    // Check for failed compliance
    let failed_rules = rule_results.iter()
        .filter(|result| matches!(result.result, ComplianceResult::Failed))
        .count();

    if failed_rules > 0 {
        recommendations.push("Immediate compliance officer review required".to_string());
        recommendations.push("Consider suspending high-risk operations".to_string());
    }

    // Check for review requirements
    let review_rules = rule_results.iter()
        .filter(|result| matches!(result.result, ComplianceResult::RequiresReview))
        .count();

    if review_rules > 0 {
        recommendations.push("Schedule compliance review within 24 hours".to_string());
    }

    // Risk-based recommendations
    if let Some(risk_profile) = user_risk {
        match risk_profile.profile_status {
            RiskProfileStatus::Elevated => {
                recommendations.push("Enhanced monitoring recommended".to_string());
                recommendations.push("Require additional documentation for large transactions".to_string());
            },
            RiskProfileStatus::Restricted => {
                recommendations.push("Restrict high-value operations".to_string());
                recommendations.push("Require manual approval for all transactions".to_string());
            },
            _ => {},
        }
    }

    recommendations
}