# Sippar Enterprise Features API Reference

**Version**: 1.0.0
**Date**: September 18, 2025
**Sprint**: 016 - X402 Protocol Integration Complete

This document provides comprehensive API reference for the enterprise features implemented in the Sippar platform, including the world-first X402 Payment Protocol + Chain Fusion integration.

---

## 🏢 **Enterprise Features Overview**

The Sippar platform includes enterprise-grade features designed for Fortune 500 adoption and autonomous AI-to-AI commerce:

- **🚀 X402 Payment Protocol** *(NEW - Sprint 016)*: World-first HTTP 402 + Chain Fusion payment system
- **💼 Enterprise Payment System**: B2B billing, analytics, marketplace with threshold signature backing
- **🤖 Agentic Commerce Platform**: AI-to-AI autonomous payments with mathematical security
- **Advanced Compliance Framework**: Rule-based compliance evaluation with 8+ regulation types
- **Explainable AI System**: 6 explanation types with bias assessment and ethical scoring
- **Enterprise Access Controls**: Role-based permissions with 24+ granular permission types
- **Governance System**: Weighted voting with tier-based governance participation
- **Risk Assessment**: Automated user risk profiling with continuous monitoring
- **Audit Logging**: Complete audit trail with regulatory reporting capabilities

---

## 🚀 **X402 Payment Protocol Enterprise Features** *(NEW - Sprint 016)*

### **World-First X402 + Chain Fusion Integration**

Sprint 016 achieved the **world's first integration of HTTP 402 "Payment Required" standard with blockchain threshold signatures**, enabling autonomous AI-to-AI commerce with mathematical security backing.

**Production Deployment**: All 6 X402 endpoints operational at `https://nuru.network/api/sippar/x402/`

### **Enterprise Payment Creation**

#### `POST /api/sippar/x402/create-payment`
Creates enterprise-grade payments with Chain Fusion backing and threshold signature verification.

**Request Structure:**
```typescript
interface EnterprisePaymentRequest {
  amount: number;           // Payment amount in USD
  service: string;          // Service identifier
  principal: string;        // Internet Identity principal
  algorandAddress: string;  // Threshold-controlled Algorand address
  metadata?: {
    enterpriseId?: string;
    projectId?: string;
    billingCategory?: string;
    costCenter?: string;
  };
}
```

**Response Structure:**
```typescript
interface EnterprisePaymentResponse {
  success: boolean;
  paymentId: string;        // Unique payment identifier
  amount: number;
  service: string;
  serviceToken: string;     // JWT token for service access
  expiresAt: string;        // Token expiration (1 hour)
  algorandIntegration: {
    backingAddress: string;     // Threshold-controlled custody address
    thresholdControlled: boolean;
    canisterId: string;         // ICP canister providing signatures
  };
  enterpriseFeatures: {
    billingIntegration: boolean;
    analyticsTracking: boolean;
    complianceLogging: boolean;
  };
}
```

**Example Usage:**
```typescript
const payment = await fetch('/api/sippar/x402/create-payment', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 0.05,
    service: 'ai-oracle-enhanced',
    principal: '7renf-5svak-mtapl-juxhw-3hv7d-zzfzs-hjlxv-p7wsv-e2zjc-kksxf-3ae',
    algorandAddress: '6W47GCLXWEIEZ2LRQCXF7HGLOYSXYCXOPXJ5YE55EULFHB7O4RWIM3JDCI',
    metadata: {
      enterpriseId: 'ACME-CORP-001',
      projectId: 'AI-RESEARCH-2025',
      billingCategory: 'AI_SERVICES'
    }
  })
});
```

### **Payment Status & Verification**

#### `GET /api/sippar/x402/payment-status/:id`
Retrieves detailed payment status with enterprise tracking.

**Response:**
```typescript
interface PaymentStatusResponse {
  success: boolean;
  paymentId: string;
  status: 'pending' | 'confirmed' | 'expired' | 'failed';
  amount: number;
  service: string;
  createdAt: string;
  expiresAt: string;
  enterpriseTracking: {
    billingPeriod: string;
    costCenter?: string;
    projectId?: string;
    invoiceNumber?: string;
  };
  chainFusionDetails: {
    thresholdSignature: boolean;
    mathematicalBacking: boolean;
    custodyAddress: string;
  };
}
```

#### `POST /api/sippar/x402/verify-token`
Verifies service tokens with enterprise auditing.

**Request:**
```typescript
{
  token: string;              // JWT service token
  requiredService?: string;   // Optional service validation
  enterpriseContext?: {
    auditTrail: boolean;      // Enable detailed audit logging
    complianceCheck: boolean; // Run compliance validation
  };
}
```

**Response:**
```typescript
{
  success: boolean;
  valid: boolean;
  tokenDetails?: {
    principal: string;
    service: string;
    expiresAt: string;
    enterpriseId?: string;
  };
  complianceStatus?: 'compliant' | 'requires_review' | 'violation';
  auditLogId?: string;
}
```

### **AI Service Marketplace**

#### `GET /api/sippar/x402/agent-marketplace`
Discovers available AI services with enterprise pricing and SLAs.

**Response:**
```typescript
interface ServiceMarketplaceResponse {
  success: boolean;
  marketplace: {
    services: ServiceDefinition[];
    totalServices: number;
    timestamp: string;
  };
}

interface ServiceDefinition {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: 'USD';
  endpoint: string;
  enterpriseFeatures: {
    slaGuarantee: string;     // "99.9% uptime"
    supportTier: string;      // "24/7 enterprise"
    customization: boolean;   // Custom model training
    dedicatedResources: boolean;
  };
  chainFusionBacked: boolean; // Always true
  responseTime: number;       // Average response time in ms
}
```

**Current Marketplace Services (4 active):**
```typescript
{
  "ai-oracle-basic": {
    price: 0.01,
    endpoint: "/api/sippar/ai/query",
    slaGuarantee: "99.5% uptime",
    supportTier: "business_hours"
  },
  "ai-oracle-enhanced": {
    price: 0.05,
    endpoint: "/api/sippar/ai/enhanced-query",
    slaGuarantee: "99.9% uptime",
    supportTier: "24/7 enterprise"
  },
  "ckALGO-mint": {
    price: 0.001,
    endpoint: "/api/sippar/x402/mint-ckALGO",
    slaGuarantee: "99.95% uptime",
    supportTier: "24/7 enterprise"
  },
  "ckALGO-redeem": {
    price: 0.001,
    endpoint: "/api/sippar/x402/redeem-ckALGO",
    slaGuarantee: "99.95% uptime",
    supportTier: "24/7 enterprise"
  }
}
```

### **Enterprise Analytics & Billing**

#### `GET /api/sippar/x402/analytics`
Real-time payment analytics dashboard with enterprise insights.

**Response:**
```typescript
interface PaymentAnalyticsResponse {
  success: boolean;
  analytics: {
    metrics: {
      totalPayments: number;
      totalRevenue: number;
      averagePaymentAmount: number;
      successRate: number;         // Percentage of successful payments
      topServices: ServiceMetrics[];
    };
    recentPayments: PaymentRecord[];
    enterpriseInsights: {
      monthlySpend: number;
      costSavings: number;         // vs traditional payment processing
      automationRate: number;     // % of automated AI-to-AI payments
      complianceScore: number;     // 0-100 compliance rating
    };
    chainFusionMetrics: {
      thresholdSignatures: number;
      averageConfirmationTime: number; // ms
      mathematicalBackingRatio: number; // Always 1.0
    };
    timestamp: string;
  };
}
```

#### `POST /api/sippar/x402/enterprise-billing`
Advanced B2B billing management with usage tracking.

**Request:**
```typescript
{
  operation: 'calculate_bill' | 'generate_invoice' | 'usage_report';
  principal?: string;           // For specific user billing
  billingPeriod?: string;       // "2025-09" for September 2025
  enterpriseOptions?: {
    consolidateByProject: boolean;
    includeComplianceReport: boolean;
    customRates: Record<string, number>; // Service-specific rates
  };
}
```

**Response:**
```typescript
interface EnterpriseBillingResponse {
  success: boolean;
  billing: {
    services: ServiceUsage[];
    totalUsage: number;          // Total service calls
    totalCost: number;           // Total cost in USD
    currency: 'USD';
    paymentStatus: 'current' | 'overdue' | 'processing';
    nextBillingDate: string;
    enterpriseDetails: {
      volume_discount: number;    // Percentage discount applied
      negotiated_rates: boolean;  // Custom rates in effect
      payment_terms: string;      // e.g., "Net 30"
      account_manager: string;    // Contact person
    };
    complianceReport?: {
      auditTrail: boolean;
      regulatoryCompliance: string[];
      riskAssessment: 'low' | 'medium' | 'high';
    };
  };
}
```

### **X402 Middleware Integration**

**Express.js Middleware for Service Protection:**
```typescript
import { X402Service } from '../services/x402Service';

const x402Service = new X402Service();

// Protect AI services with X402 payments
export const x402Middleware = x402Service.createMiddleware({
  name: 'AI Oracle Enhanced',
  price: 0.05,
  currency: 'USD',
  description: 'Premium AI analysis with faster response times',
  enterpriseFeatures: {
    billingIntegration: true,
    auditLogging: true,
    complianceChecking: true
  }
});

// Usage in Express routes
app.get('/api/sippar/ai/enhanced-query',
  x402Middleware,          // Payment required
  async (req, res) => {
    // Service only accessible after payment
    const result = await processEnhancedAIQuery(req.body);
    res.json(result);
  }
);
```

### **Enterprise Security Model**

**Payment Token Security:**
```typescript
interface X402SecurityFeatures {
  // JWT-based service tokens with threshold signature backing
  tokenGeneration: {
    algorithm: 'HS256';
    expirationTime: '1h';
    chainFusionProof: boolean;    // Includes threshold signature proof
    enterpriseAudit: boolean;     // Audit trail for enterprise users
  };

  // Verification process
  tokenVerification: {
    signatureValidation: boolean;  // Verify JWT signature
    expirationCheck: boolean;      // Check token expiration
    serviceAuthorization: boolean; // Verify service access rights
    thresholdProof: boolean;       // Verify Chain Fusion backing
    complianceCheck: boolean;      // Enterprise compliance validation
  };

  // Enterprise audit features
  auditIntegration: {
    paymentLogging: boolean;       // Log all payment activities
    complianceTracking: boolean;   // Track regulatory compliance
    costCenterMapping: boolean;    // Map to enterprise cost centers
    projectAllocation: boolean;    // Allocate costs to projects
  };
}
```

### **Performance & SLA Metrics**

**Enterprise SLA Guarantees:**
- **Payment Processing**: <100ms average response time
- **Token Verification**: <50ms average response time
- **Service Discovery**: <200ms average response time
- **Analytics Queries**: <500ms average response time
- **Billing Operations**: <1000ms average response time

**Uptime Guarantees:**
- **Standard Services**: 99.5% uptime
- **Enterprise Services**: 99.9% uptime
- **Mission Critical**: 99.95% uptime with 24/7 support

**Chain Fusion Performance:**
- **Threshold Signatures**: 100% mathematical backing
- **Signature Generation**: ~1 second average (ICP network limitation)
- **Payment Confirmation**: <2 seconds end-to-end
- **Reserve Verification**: Real-time, <100ms

---

## 🛡️ **Advanced Compliance Framework**

### **Compliance Rule Management**

#### `create_advanced_compliance_rule`
Creates a new compliance rule with specified conditions and actions.

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

**Parameters:**
- `rule_name`: Human-readable name for the rule
- `regulation_type`: One of GDPR, CCPA, SOX, FINCEN, MiFID, BASEL, ISO27001, SOC2
- `severity_level`: Low, Medium, High, Critical
- `conditions`: Array of conditions that trigger the rule
- `actions`: Actions to take when rule is triggered

**Example Usage:**
```typescript
const ruleId = await canister.create_advanced_compliance_rule(
  "High Value Transaction Monitor",
  { FINCEN: null },
  { High: null },
  [
    {
      condition_type: { TransactionAmount: null },
      operator: { GreaterThan: null },
      value: "10000000000000", // 10,000 ckALGO
      description: "Monitor transactions over $10,000 equivalent"
    }
  ],
  [
    {
      action_type: { RequireApproval: null },
      parameters: { "approval_tier": "compliance_officer" },
      is_blocking: true
    }
  ]
);
```

#### `evaluate_compliance_for_operation`
Evaluates all active compliance rules for a specific operation.

```rust
#[update]
async fn evaluate_compliance_for_operation(
    operation_type: AuditOperationType,
    user: Principal,
    amount: Option<Nat>,
    metadata: HashMap<String, String>
) -> Result<ComplianceEvaluationResult, String>
```

**Response Structure:**
```typescript
interface ComplianceEvaluationResult {
  evaluation_id: string;
  timestamp: number;
  overall_result: 'Passed' | 'Failed' | 'RequiresReview' | 'Exempted';
  rules_evaluated: RuleEvaluationResult[];
  risk_assessment?: UserRiskProfile;
  recommended_actions: string[];
}
```

### **Risk Assessment**

#### `assess_user_risk_profile`
Performs comprehensive risk assessment for a user.

```rust
#[update]
async fn assess_user_risk_profile(user: Principal) -> Result<UserRiskProfile, String>
```

**Risk Factors Analyzed:**
- **NewUser**: Account age less than 7 days (+20 points)
- **HighFrequencyTrading**: >100 transactions in 24h (+15 points)
- **LargeTransactions**: Transactions >50,000 ckALGO (+20 points)
- **UnusualPatterns**: High AI usage patterns (+10 points)
- **GeographicRisk**: High-risk jurisdictions (+variable)
- **TechnicalViolations**: API abuse or unusual behavior (+variable)

**Risk Profile Statuses:**
- **Clean** (0-25 points): Normal user
- **UnderReview** (25-50 points): Enhanced monitoring
- **Elevated** (50-75 points): Restricted operations
- **Restricted** (75+ points): Manual approval required

### **Regulatory Reporting**

#### `generate_regulatory_report`
Generates compliance reports for specific regulations.

```rust
#[update]
async fn generate_regulatory_report(
    regulation_type: RegulationType,
    period_start: u64,
    period_end: u64
) -> Result<String, String>
```

**Supported Report Types:**
- **GDPR**: Data processing operations and privacy compliance
- **SOC2**: Security controls and monitoring effectiveness
- **FINCEN**: Large transactions and AML monitoring
- **SOX**: Financial controls and audit trails
- **CCPA**: California privacy compliance
- **ISO27001**: Information security management

---

## 🤖 **Explainable AI Framework**

### **AI Explanation Generation**

#### `generate_ai_explanation`
Generates detailed explanations for AI decisions.

```rust
#[update]
async fn generate_ai_explanation(
    request_id: String,
    explanation_type: ExplanationType
) -> Result<String, String>
```

**Explanation Types:**
1. **DecisionTree**: Step-by-step decision process
2. **FeatureImportance**: Which input factors were most important
3. **Counterfactual**: "What if" scenarios that would change the decision
4. **Confidence**: Confidence intervals and uncertainty analysis
5. **DataSources**: What data sources influenced the decision
6. **BiasCheck**: Bias assessment and fairness analysis

**Example Response:**
```typescript
interface AIExplanation {
  explanation_id: string;
  request_id: string;
  explanation_type: ExplanationType;
  explanation_text: string;
  confidence_factors: ConfidenceFactor[];
  data_sources_used: DataSource[];
  decision_path: DecisionStep[];
  bias_assessment: BiasAssessment;
  limitations: string[];
  generated_at: number;
}
```

### **Bias Assessment**

Every AI explanation includes bias assessment:

```typescript
interface BiasAssessment {
  bias_types_checked: string[]; // ["gender_bias", "racial_bias", "age_bias", "economic_bias"]
  bias_score: number; // 0.0 to 1.0, lower is better
  recommendation: 'Acceptable' | 'ReviewRequired' | 'BiasDetected' | 'HighRiskBias';
  mitigation_suggestions: string[];
}
```

### **Ethical Scoring**

#### `calculate_ai_ethical_score`
Calculates ethical score for AI explanations (internal function, exposed via explanation).

**Scoring Factors:**
- **Base Score**: 100 points
- **Bias Assessment**: -0 to -50 points based on bias recommendation
- **Transparency**: -5 points if decision path is empty
- **Data Quality**: Variable based on data source reliability
- **Explainability**: Bonus points for comprehensive explanations

---

## 🔐 **Enterprise Access Controls**

### **Role Management**

#### `create_access_role`
Creates a new access role with specified permissions.

```rust
#[update]
async fn create_access_role(
    role_name: String,
    permissions: Vec<Permission>,
    tier_requirement: UserTier
) -> Result<String, String>
```

**24 Available Permissions:**

**System Administration:**
- `SystemConfiguration`: Modify system settings
- `UserManagement`: Manage user accounts
- `RoleManagement`: Create and assign roles
- `ComplianceManagement`: Configure compliance rules
- `AuditLogAccess`: Access audit logs

**AI Services:**
- `AIServiceAccess`: Use AI services
- `AIModelConfiguration`: Configure AI models
- `AIDataAccess`: Access AI training data
- `AIBatchProcessing`: Batch AI operations

**Smart Contracts:**
- `SmartContractCreate`: Create smart contracts
- `SmartContractExecute`: Execute contracts
- `SmartContractManage`: Modify contracts
- `SmartContractAudit`: Audit contract operations

**Cross-Chain Operations:**
- `CrossChainRead`: Read cross-chain state
- `CrossChainWrite`: Write cross-chain state
- `CrossChainManage`: Manage cross-chain operations

**Financial Operations:**
- `PaymentProcessing`: Process payments
- `RevenueAnalysis`: Access revenue analytics
- `FinancialAudit`: Audit financial operations

**Data Operations:**
- `DataRead`: Read sensitive data
- `DataWrite`: Modify data
- `DataExport`: Export data
- `DataDelete`: Delete data

#### `assign_role_to_user`
Assigns a role to a specific user.

```rust
#[update]
async fn assign_role_to_user(user: Principal, role_id: String) -> Result<(), String>
```

#### `check_user_permission`
Checks if a user has a specific permission.

```rust
#[query]
fn check_user_permission(user: Principal, permission: Permission) -> Result<bool, String>
```

---

## 🗳️ **Governance System**

### **Proposal Management**

#### `create_governance_proposal`
Creates a new governance proposal for community voting.

```rust
#[update]
async fn create_governance_proposal(
    proposal_type: ProposalType,
    title: String,
    description: String,
    execution_data: Option<String>
) -> Result<String, String>
```

**Proposal Types:**
- `SystemUpgrade`: Platform upgrades and new features
- `ComplianceRuleChange`: Modifications to compliance framework
- `AccessControlModification`: Changes to permission system
- `TierBenefitAdjustment`: User tier benefit changes
- `EmergencyAction`: Emergency system modifications
- `PolicyChange`: Platform policy updates

**Voting Requirements:**
- **Free Tier**: Cannot create proposals
- **Developer+**: Can create and vote on proposals
- **Professional+**: Higher vote weight
- **Enterprise**: Maximum vote weight

#### `vote_on_proposal`
Votes on an active governance proposal.

```rust
#[update]
async fn vote_on_proposal(
    proposal_id: String,
    vote_decision: VoteDecision,
    reason: Option<String>
) -> Result<(), String>
```

**Vote Weights by Tier:**
- **Free**: 1.0x weight
- **Developer**: 2.0x weight  
- **Professional**: 5.0x weight
- **Enterprise**: 10.0x weight

**Vote Decisions:**
- `Approve`: Support the proposal
- `Reject`: Oppose the proposal
- `Abstain`: Neutral position

### **Proposal Lifecycle**

1. **Creation**: Proposal submitted by eligible user
2. **Active**: 7-day voting period
3. **Resolution**: Automatic resolution based on votes
4. **Execution**: Implementation of approved proposals

---

## 📊 **Audit & Monitoring**

### **Enhanced Audit Logging**

#### `create_enhanced_audit_entry`
Creates comprehensive audit log entry.

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

**Audit Operation Types:**
- `AIServiceRequest`: AI service usage
- `CrossChainTransaction`: Cross-chain operations
- `SmartContractExecution`: Contract executions
- `UserRegistration`: New user onboarding
- `TierUpgrade`: User tier changes
- `PaymentProcessing`: Payment operations
- `ComplianceCheck`: Compliance evaluations
- `SystemConfiguration`: System changes
- `DataAccess`: Sensitive data access
- `SecurityEvent`: Security-related events

### **Audit Query Functions**

#### `get_enhanced_audit_log`
Retrieves paginated audit log entries.

```rust
#[query]
fn get_enhanced_audit_log(limit: Option<u64>) -> Vec<EnhancedAuditLogEntry>
```

#### `get_user_audit_history`
Gets audit history for specific user.

```rust
#[query]
fn get_user_audit_history(
    user: Principal,
    operation_types: Option<Vec<AuditOperationType>>,
    limit: Option<u64>
) -> Vec<EnhancedAuditLogEntry>
```

---

## 🔍 **Analytics & Reporting**

### **Compliance Analytics**

#### `get_compliance_metrics`
Retrieves compliance performance metrics.

```rust
#[query]
fn get_compliance_metrics(
    period_start: u64,
    period_end: u64
) -> ComplianceMetrics
```

**Metrics Included:**
- Compliance rule evaluations
- Pass/fail rates by regulation type
- Risk profile distributions
- Remediation actions taken
- Audit finding resolutions

### **Risk Analytics**

#### `get_platform_risk_overview`
Provides platform-wide risk assessment.

```rust
#[query]
fn get_platform_risk_overview() -> RiskOverview
```

**Risk Overview Includes:**
- User risk distribution
- High-risk user counts
- Risk trend analysis
- Risk factor frequencies
- Mitigation effectiveness

---

## 🛠️ **Integration Examples**

### **TypeScript SDK Integration**

```typescript
import { SipparSDK } from '@sippar/ck-algo-sdk';

// Initialize with enterprise features
const client = await SipparSDK.init({
  network: 'mainnet',
  enterpriseFeatures: true
});

// Check compliance before operation
const complianceResult = await client.compliance.evaluateOperation({
  operationType: 'CrossChainTransaction',
  amount: '50000000000000', // 50,000 ckALGO
  metadata: { destination: 'algorand_mainnet' }
});

if (complianceResult.overall_result === 'Failed') {
  console.error('Operation blocked by compliance rules');
  return;
}

// Proceed with operation if compliant
const operation = await client.crossChain.createOperation({
  operationType: 'Transfer',
  algorandAddress: 'ALGORAND_ADDRESS_HERE',
  amount: '50000000000000'
});

// Generate AI explanation for the decision
const explanation = await client.ai.generateExplanation({
  requestId: operation.operationId,
  explanationType: 'DecisionTree'
});

console.log('AI Decision Explanation:', explanation.explanationText);
```

### **React Component Integration**

```typescript
import React, { useState, useEffect } from 'react';
import { useSippar } from '@sippar/ck-algo-sdk/react';

export function ComplianceDashboard() {
  const { client, user } = useSippar();
  const [riskProfile, setRiskProfile] = useState(null);
  const [complianceStatus, setComplianceStatus] = useState('loading');

  useEffect(() => {
    async function loadComplianceData() {
      if (!client || !user) return;

      try {
        // Get user risk assessment
        const risk = await client.compliance.assessUserRisk();
        setRiskProfile(risk);

        // Check compliance status for recent operations
        const recent = await client.audit.getUserHistory({
          limit: 10,
          operationTypes: ['AIServiceRequest', 'CrossChainTransaction']
        });

        const hasRecentIssues = recent.some(entry => 
          entry.complianceChecks.some(check => 
            check.result === 'Failed' || check.result === 'RequiresReview'
          )
        );

        setComplianceStatus(hasRecentIssues ? 'issues' : 'compliant');
      } catch (error) {
        setComplianceStatus('error');
      }
    }

    loadComplianceData();
  }, [client, user]);

  return (
    <div className="compliance-dashboard">
      <div className="risk-profile">
        <h3>Risk Profile</h3>
        {riskProfile && (
          <div>
            <div className={`risk-score ${riskProfile.profileStatus.toLowerCase()}`}>
              Score: {riskProfile.overallRiskScore.toFixed(1)}
            </div>
            <div className="risk-factors">
              {riskProfile.riskFactors.map(factor => (
                <div key={factor.factorType} className="risk-factor">
                  <span>{factor.factorType}</span>
                  <span>+{factor.scoreImpact}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="compliance-status">
        <h3>Compliance Status</h3>
        <div className={`status ${complianceStatus}`}>
          {complianceStatus === 'compliant' && '✅ All Clear'}
          {complianceStatus === 'issues' && '⚠️ Review Required'}
          {complianceStatus === 'loading' && '⏳ Loading...'}
          {complianceStatus === 'error' && '❌ Error Loading'}
        </div>
      </div>
    </div>
  );
}
```

---

## 📋 **Enterprise Deployment Guide**

### **Tier Requirements**

**Enterprise Features Access:**
- **Advanced Compliance**: Professional+ tier
- **Custom Compliance Rules**: Enterprise tier only
- **Full Audit Access**: Enterprise tier only
- **Governance Proposal Creation**: Developer+ tier
- **Role Management**: Professional+ tier
- **System Configuration**: Enterprise tier only

### **Performance Considerations**

- **Compliance Evaluation**: ~50-100ms per operation
- **Risk Assessment**: ~200-500ms per user
- **AI Explanation**: ~1-3 seconds depending on type
- **Audit Log Queries**: Paginated, ~10-50ms per page
- **Governance Voting**: Near-instantaneous

### **Security Best Practices**

1. **Role Assignment**: Follow principle of least privilege
2. **Compliance Rules**: Test in development before production
3. **Audit Monitoring**: Set up automated alerts for compliance failures
4. **Risk Thresholds**: Configure appropriate risk score thresholds
5. **Regular Reviews**: Conduct monthly compliance and security reviews

---

## 🔗 **Related Documentation**

- [Core API Reference](/docs/api/endpoints.md)
- [TypeScript SDK Guide](/src/sdk/README.md)
- [Smart Contract Architecture](/docs/technical/smart-contracts.md)
- [Security & Compliance Overview](/docs/security/compliance-framework.md)
- [Enterprise Onboarding Guide](/docs/guides/enterprise-setup.md)

---

**Last Updated**: September 18, 2025
**Version**: 1.0.0 - Sprint 016 X402 Integration Complete
**Production URL**: https://nuru.network/api/sippar/x402/
**Contact**: Sippar Development Team
**Enterprise Support**: enterprise@sippar.ai