// ckALGO Types Module
// Centralized type definitions for the entire canister

use std::collections::HashMap;
use candid::{CandidType, Deserialize, Nat, Principal};
use serde::Serialize;

// ============================================================================
// CORE USER & ACCOUNT TYPES
// ============================================================================

#[derive(Clone, Debug, CandidType, Deserialize, Serialize, PartialEq)]
pub enum UserTier {
    Free,
    Developer,
    Professional,
    Enterprise,
}

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub struct UserAccount {
    pub principal: Principal,
    pub tier: UserTier,
    pub monthly_usage: u64,
    pub total_spent: Nat,
    pub created_at: u64,
    pub last_active: u64,
}

// ============================================================================
// AI SERVICE TYPES
// ============================================================================

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub enum AIServiceType {
    AlgorandOracle,
    OpenWebUIChat,
    DeepSeekR1,
    CustomModel,
}

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub struct AIRequest {
    pub request_id: String,
    pub user: Principal,
    pub service_type: AIServiceType,
    pub query: String,
    pub model: String,
    pub timestamp: u64,
    pub cost: Nat,
    pub status: RequestStatus,
}

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub struct AIResponse {
    pub request_id: String,
    pub response: String,
    pub timestamp: u64,
    pub processing_time_ms: u64,
    pub confidence_score: Option<f64>,
}

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub enum RequestStatus {
    Pending,
    Processing,
    Completed,
    Failed,
}

// ============================================================================
// SMART CONTRACT TYPES  
// ============================================================================

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub struct SmartContract {
    pub contract_id: String,
    pub owner: Principal,
    pub name: String,
    pub description: String,
    pub trigger_type: TriggerType,
    pub actions: Vec<ContractAction>,
    pub gas_limit: u64,
    pub created_at: u64,
    pub is_active: bool,
}

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub enum TriggerType {
    TimeInterval,
    AIDecision,
    PriceThreshold,
    Manual,
}

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub struct ContractAction {
    pub action_type: String,
    pub parameters: HashMap<String, String>,
    pub gas_cost: u64,
}

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub struct ExecutionResult {
    pub execution_id: String,
    pub contract_id: String,
    pub triggered_by: Principal,
    pub timestamp: u64,
    pub gas_used: u64,
    pub status: ExecutionStatus,
    pub result: Option<String>,
    pub error: Option<String>,
}

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub enum ExecutionStatus {
    Success,
    Failed,
    OutOfGas,
}

// ============================================================================
// CROSS-CHAIN TYPES
// ============================================================================

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub struct CrossChainOperation {
    pub operation_id: String,
    pub user: Principal,
    pub operation_type: CrossChainOpType,
    pub algorand_address: String,
    pub amount: Option<Nat>,
    pub status: CrossChainStatus,
    pub created_at: u64,
    pub completed_at: Option<u64>,
    pub transaction_hash: Option<String>,
}

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub enum CrossChainOpType {
    Transfer,
    StateRead,
    StateWrite,
    ContractCall,
}

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub enum CrossChainStatus {
    Pending,
    Processing,
    Completed,
    Failed,
}

// ============================================================================
// PAYMENT & TRANSACTION TYPES
// ============================================================================

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub struct PaymentRecord {
    pub payment_id: String,
    pub payer: Principal,
    pub amount: Nat,
    pub service_type: ServiceType,
    pub description: String,
    pub timestamp: u64,
    pub transaction_hash: Option<String>,
}

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub enum ServiceType {
    AIService,
    SmartContract,
    CrossChain,
    TierUpgrade,
    AccessControl,
    Governance,
}

// ============================================================================
// COMPLIANCE & AUDIT TYPES
// ============================================================================

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub enum RegulationType {
    GDPR,           // European Union General Data Protection Regulation
    CCPA,           // California Consumer Privacy Act
    SOX,            // Sarbanes-Oxley Act
    FINCEN,         // Financial Crimes Enforcement Network
    MiFID,          // Markets in Financial Instruments Directive
    BASEL,          // Basel III banking regulations
    ISO27001,       // Information security management
    SOC2,           // Service Organization Control 2
}

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub enum AuditOperationType {
    AIServiceRequest,
    CrossChainTransaction,
    SmartContractExecution,
    UserRegistration,
    TierUpgrade,
    PaymentProcessing,
    ComplianceCheck,
    SystemConfiguration,
    DataAccess,
    SecurityEvent,
}

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub struct EnhancedAuditLogEntry {
    pub entry_id: String,
    pub timestamp: u64,
    pub operation_type: AuditOperationType,
    pub user: Principal,
    pub user_tier: UserTier,
    pub service_involved: ServiceType,
    pub ai_involvement: bool,
    pub ai_confidence_score: Option<f64>,
    pub financial_impact: Option<Nat>,
    pub compliance_checks: Vec<ComplianceCheck>,
    pub risk_level: RiskLevel,
    pub regulatory_flags: Vec<RegulatoryFlag>,
    pub cross_chain_data: Option<CrossChainAuditData>,
    pub metadata: HashMap<String, String>,
}

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub struct ComplianceCheck {
    pub check_type: ComplianceCheckType,
    pub performed_at: u64,
    pub result: ComplianceResult,
    pub details: String,
    pub remediation_required: bool,
}

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub enum ComplianceCheckType {
    AntiMoneyLaundering,
    KnowYourCustomer,
    DataPrivacy,
    AIEthics,
    CrossBorderTransfer,
    TaxCompliance,
}

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub enum ComplianceResult {
    Passed,
    Failed,
    RequiresReview,
    Exempted,
}

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub enum RiskLevel {
    Low,
    Medium,
    High,
    Critical,
}

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub enum RegulatoryFlag {
    HighValueTransaction,
    CrossBorderCompliance,
    TaxReporting,
    AMLAlert,
    DataProcessing,
}

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub struct CrossChainAuditData {
    pub algorand_address: String,
    pub transaction_type: String,
    pub network: String,
    pub confirmation_hash: Option<String>,
}

// ============================================================================
// ENTERPRISE ACCESS CONTROL TYPES
// ============================================================================

#[derive(Clone, Debug, CandidType, Deserialize, Serialize, PartialEq)]
pub enum Permission {
    // System Administration
    SystemConfiguration,
    UserManagement,
    RoleManagement,
    ComplianceManagement,
    AuditLogAccess,
    
    // AI Services
    AIServiceAccess,
    AIModelConfiguration,
    AIDataAccess,
    AIBatchProcessing,
    
    // Smart Contracts
    SmartContractCreate,
    SmartContractExecute,
    SmartContractManage,
    SmartContractAudit,
    
    // Cross-Chain Operations
    CrossChainRead,
    CrossChainWrite,
    CrossChainManage,
    
    // Financial Operations
    PaymentProcessing,
    RevenueAnalysis,
    FinancialAudit,
    
    // Data Operations
    DataRead,
    DataWrite,
    DataExport,
    DataDelete,
}

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub struct AccessRole {
    pub role_id: String,
    pub role_name: String,
    pub permissions: Vec<Permission>,
    pub tier_requirement: UserTier,
    pub created_by: Principal,
    pub created_at: u64,
    pub is_active: bool,
}

// ============================================================================
// GOVERNANCE TYPES
// ============================================================================

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub struct GovernanceProposal {
    pub proposal_id: String,
    pub proposal_type: ProposalType,
    pub title: String,
    pub description: String,
    pub proposed_by: Principal,
    pub created_at: u64,
    pub voting_deadline: u64,
    pub status: ProposalStatus,
    pub votes: Vec<Vote>,
    pub execution_data: Option<String>,
}

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub enum ProposalType {
    SystemUpgrade,
    ComplianceRuleChange,
    AccessControlModification,
    TierBenefitAdjustment,
    EmergencyAction,
    PolicyChange,
}

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub enum ProposalStatus {
    Active,
    Approved,
    Rejected,
    Executed,
    Expired,
}

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub struct Vote {
    pub voter: Principal,
    pub voter_tier: UserTier,
    pub vote_weight: f64,
    pub vote_decision: VoteDecision,
    pub timestamp: u64,
    pub reason: Option<String>,
}

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub enum VoteDecision {
    Approve,
    Reject,
    Abstain,
}

// ============================================================================
// AI EXPLAINABILITY TYPES
// ============================================================================

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub struct AIExplanation {
    pub explanation_id: String,
    pub request_id: String,
    pub explanation_type: ExplanationType,
    pub explanation_text: String,
    pub confidence_factors: Vec<ConfidenceFactor>,
    pub data_sources_used: Vec<DataSource>,
    pub decision_path: Vec<DecisionStep>,
    pub bias_assessment: BiasAssessment,
    pub limitations: Vec<String>,
    pub generated_at: u64,
}

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub enum ExplanationType {
    DecisionTree,
    FeatureImportance,
    Counterfactual,
    Confidence,
    DataSources,
    BiasCheck,
}

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub struct ConfidenceFactor {
    pub factor_name: String,
    pub weight: f64,
    pub contribution: f64,
    pub explanation: String,
}

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub struct DataSource {
    pub source_name: String,
    pub source_type: String,
    pub reliability_score: f64,
    pub last_updated: u64,
}

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub struct DecisionStep {
    pub step_number: u32,
    pub condition: String,
    pub outcome: String,
    pub confidence: f64,
}

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub struct BiasAssessment {
    pub bias_types_checked: Vec<String>,
    pub bias_score: f64,
    pub recommendation: BiasRecommendation,
    pub mitigation_suggestions: Vec<String>,
}

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub enum BiasRecommendation {
    Acceptable,
    ReviewRequired,
    BiasDetected,
    HighRiskBias,
}

// ============================================================================
// ADVANCED COMPLIANCE TYPES
// ============================================================================

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub struct AdvancedComplianceRule {
    pub rule_id: String,
    pub rule_name: String,
    pub regulation_type: RegulationType,
    pub severity_level: ComplianceSeverity,
    pub conditions: Vec<ComplianceCondition>,
    pub actions: Vec<ComplianceAction>,
    pub is_active: bool,
    pub created_at: u64,
    pub last_updated: u64,
    pub compliance_officer: Principal,
}

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub enum ComplianceSeverity {
    Low,
    Medium,
    High,
    Critical,
}

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub struct ComplianceCondition {
    pub condition_type: ConditionType,
    pub operator: ComplianceOperator,
    pub value: String,
    pub description: String,
}

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub enum ConditionType {
    TransactionAmount,
    UserTier,
    GeographicLocation,
    TimeOfDay,
    FrequencyLimit,
    RiskScore,
    AggregateVolume,
}

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub enum ComplianceOperator {
    GreaterThan,
    LessThan,
    Equal,
    NotEqual,
    Contains,
    NotContains,
}

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub struct ComplianceAction {
    pub action_type: ActionType,
    pub parameters: HashMap<String, String>,
    pub is_blocking: bool,
}

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub enum ActionType {
    Block,
    RequireApproval,
    LogEvent,
    NotifyOfficer,
    IncreaseMonitoring,
    RequestDocumentation,
}

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub struct UserRiskProfile {
    pub user: Principal,
    pub overall_risk_score: f64,
    pub risk_factors: Vec<RiskFactor>,
    pub last_assessment: u64,
    pub next_review_due: u64,
    pub profile_status: RiskProfileStatus,
}

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub struct RiskFactor {
    pub factor_type: RiskFactorType,
    pub score_impact: f64,
    pub description: String,
    pub detected_at: u64,
}

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub enum RiskFactorType {
    NewUser,
    HighFrequencyTrading,
    LargeTransactions,
    UnusualPatterns,
    GeographicRisk,
    TechnicalViolations,
}

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub enum RiskProfileStatus {
    Clean,
    UnderReview,
    Elevated,
    Restricted,
}

// ============================================================================
// RESPONSE & RESULT TYPES
// ============================================================================

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub struct ComplianceEvaluationResult {
    pub evaluation_id: String,
    pub timestamp: u64,
    pub overall_result: ComplianceResult,
    pub rules_evaluated: Vec<RuleEvaluationResult>,
    pub risk_assessment: Option<UserRiskProfile>,
    pub recommended_actions: Vec<String>,
}

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub struct RuleEvaluationResult {
    pub rule_id: String,
    pub rule_name: String,
    pub result: ComplianceResult,
    pub triggered_conditions: Vec<String>,
    pub actions_taken: Vec<String>,
}