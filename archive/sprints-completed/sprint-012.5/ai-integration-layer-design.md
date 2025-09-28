# AI Integration Layer Design

**Sprint 012.5 - Week 1 Foundation**  
**Created**: September 10, 2025  
**Status**: 🤖 **DESIGN PHASE**

---

## 🎯 **Integration Strategy**

Connect enhanced ckALGO canister to existing AI infrastructure:
- **Existing AI Oracle**: App ID 745336394 (operational on Algorand testnet)
- **OpenWebUI Integration**: chat.nuru.network with 4 models (qwen2.5, deepseek-r1, phi-3, mistral)
- **Threshold Signer**: Proven ICP-Algorand Chain Fusion bridge

---

## 🏗️ **AI Integration Architecture**

### **Current AI Infrastructure Analysis**
```typescript
// Existing AI Services (backend/src/services/)
SipparAIService           // OpenWebUI integration (chat.nuru.network)
SipparAIOracleService     // Algorand Oracle monitoring & callbacks  
OracleMonitoringService   // Performance tracking & metrics
ThresholdSignerService    // ICP-Algorand transaction signing
```

### **Enhanced ckALGO AI Integration**
```rust
// New AI Integration Layer in ckALGO Canister
pub struct AIIntegrationLayer {
    // Service registry
    pub ai_services: HashMap<AIServiceType, AIServiceConfig>,
    pub ai_request_queue: Vec<AIRequest>,
    pub ai_response_cache: HashMap<String, CachedAIResponse>,
    
    // Integration endpoints
    pub backend_canister: Option<Principal>,  // Backend API canister
    pub oracle_app_id: Option<u64>,          // Algorand Oracle App ID
    pub openwebui_endpoint: Option<String>,   // Direct OpenWebUI access
    
    // Performance tracking
    pub request_metrics: AIRequestMetrics,
    pub service_health: HashMap<AIServiceType, ServiceHealthStatus>,
}
```

---

## 🔌 **AI Service Integration Points**

### **1. Algorand AI Oracle Integration**
```rust
// Connect to existing Algorand Oracle (App ID 745336394)
#[derive(Clone, Debug)]
pub struct AlgorandOracleRequest {
    pub request_id: String,
    pub query: String,
    pub model: String,           // qwen2.5, deepseek-r1, phi-3, mistral
    pub callback_method: String, // ckALGO canister method to call
    pub payment: Nat,           // ckALGO payment for service
    pub timestamp: u64,
}

// Oracle response handling
async fn process_oracle_response(
    &self,
    request_id: String,
    ai_response: AlgorandOracleResponse,
) -> Result<AIDecision, Error> {
    // Parse Oracle response
    let response_data: OracleResponseData = serde_json::from_str(&ai_response.formatted_response)?;
    
    // Create AI decision with explanation
    let ai_decision = AIDecision {
        response: response_data.result,
        confidence: response_data.confidence,
        processing_time: response_data.processing_time,
        explanation: AIDecisionExplanation {
            reasoning: format!("Oracle analysis using model {}", ai_response.model),
            confidence_score: response_data.confidence as f64,
            data_sources: vec![DataSource::AlgorandOracle],
            compliance_verification: self.verify_oracle_compliance(&response_data)?,
        },
        created_at: ic_cdk::api::time(),
    };
    
    // Cache response for future use
    self.cache_ai_response(request_id, &ai_decision).await?;
    
    Ok(ai_decision)
}
```

### **2. Backend API Integration**
```rust
// Call backend AI services via inter-canister calls
async fn call_backend_ai_service(
    &self,
    service_type: AIServiceType,
    request: AIServiceRequest,
) -> Result<AIResponse, Error> {
    let backend_canister = self.backend_canister
        .ok_or("Backend canister not configured")?;
    
    // Make inter-canister call to backend
    let result: (Result<String, String>,) = ic_cdk::call(
        backend_canister,
        "process_ai_request",
        (service_type, request,)
    ).await.map_err(|e| Error::InterCanisterCall(e.1))?;
    
    match result.0 {
        Ok(response_json) => {
            let ai_response: AIResponse = serde_json::from_str(&response_json)?;
            Ok(ai_response)
        },
        Err(error) => Err(Error::AIServiceError(error)),
    }
}
```

### **3. Direct OpenWebUI Integration (Future)**
```rust
// Future: Direct HTTP outcalls to OpenWebUI (when ICP supports HTTPS outcalls to custom domains)
async fn call_openwebui_direct(
    &self,
    query: String,
    model: String,
) -> Result<AIResponse, Error> {
    // This would require ICP HTTPS outcalls feature
    // For now, route through backend API
    self.call_backend_ai_service(
        AIServiceType::OpenWebUIChat,
        AIServiceRequest {
            query,
            model: Some(model),
            context: None,
        }
    ).await
}
```

---

## 🤖 **AI Service Types & Configurations**

### **Available AI Services**
```rust
#[derive(Clone, Debug, PartialEq, Eq, Hash)]
pub enum AIServiceType {
    // Existing services
    AlgorandOracle,      // Algorand AI Oracle (App ID 745336394)
    OpenWebUIChat,       // chat.nuru.network integration
    
    // Future services
    RiskAssessment,      // Financial risk analysis
    MarketAnalysis,      // Trading intelligence
    ComplianceCheck,     // Regulatory verification
    CodeAnalysis,        // Smart contract analysis
}

#[derive(Clone, Debug)]
pub struct AIServiceConfig {
    pub service_id: String,
    pub description: String,
    pub fee_per_request: Nat,
    pub max_query_length: usize,
    pub response_timeout_seconds: u64,
    pub supported_models: Vec<String>,
    pub compliance_level: ComplianceLevel,
}
```

### **Service Configuration Initialization**
```rust
// Initialize AI services during canister init
fn initialize_ai_services() -> HashMap<AIServiceType, AIServiceConfig> {
    let mut services = HashMap::new();
    
    // Algorand Oracle service
    services.insert(AIServiceType::AlgorandOracle, AIServiceConfig {
        service_id: "algorand_oracle".to_string(),
        description: "Algorand AI Oracle with 4 model support".to_string(),
        fee_per_request: Nat::from(10_000u64), // 0.01 ckALGO
        max_query_length: 1024,
        response_timeout_seconds: 30,
        supported_models: vec![
            "qwen2.5:0.5b".to_string(),
            "deepseek-r1".to_string(),
            "phi-3".to_string(),
            "mistral".to_string(),
        ],
        compliance_level: ComplianceLevel::Standard,
    });
    
    // OpenWebUI Chat service
    services.insert(AIServiceType::OpenWebUIChat, AIServiceConfig {
        service_id: "openwebui_chat".to_string(),
        description: "Direct OpenWebUI integration via backend".to_string(),
        fee_per_request: Nat::from(5_000u64), // 0.005 ckALGO
        max_query_length: 2048,
        response_timeout_seconds: 15,
        supported_models: vec![
            "qwen2.5:0.5b".to_string(),
            "deepseek-r1".to_string(),
            "phi-3".to_string(),
            "mistral".to_string(),
        ],
        compliance_level: ComplianceLevel::Basic,
    });
    
    services
}
```

---

## 💰 **AI Service Payment System**

### **Payment Processing**
```rust
#[derive(Clone, Debug)]
pub struct AIServicePayment {
    pub payer: Principal,
    pub service_type: AIServiceType,
    pub amount: Nat,
    pub request_id: String,
    pub timestamp: u64,
}

// Process payment for AI service
async fn process_ai_service_payment(
    &self,
    payer: Principal,
    service_type: AIServiceType,
    request_id: String,
) -> Result<AIServicePayment, Error> {
    // Get service configuration
    let service_config = self.ai_services.get(&service_type)
        .ok_or("AI service not available")?;
    
    let fee = service_config.fee_per_request.clone();
    
    // Check payer balance
    let payer_balance = self.get_balance(payer);
    if payer_balance < fee {
        return Err(Error::InsufficientFunds);
    }
    
    // Deduct payment
    self.deduct_balance(payer, fee.clone())?;
    
    // Create payment record
    let payment = AIServicePayment {
        payer,
        service_type,
        amount: fee,
        request_id,
        timestamp: ic_cdk::api::time(),
    };
    
    // Update revenue metrics
    self.update_revenue_metrics(&payment);
    
    Ok(payment)
}
```

### **Usage-Based Pricing**
```rust
// Calculate dynamic pricing based on usage
fn calculate_dynamic_pricing(
    &self,
    service_type: AIServiceType,
    user: Principal,
    query_complexity: QueryComplexity,
) -> Nat {
    let base_fee = self.ai_services.get(&service_type)
        .map(|config| config.fee_per_request.clone())
        .unwrap_or(Nat::from(10_000u64));
    
    let mut final_fee = base_fee;
    
    // Query complexity multiplier
    match query_complexity {
        QueryComplexity::Simple => {}, // No change
        QueryComplexity::Medium => final_fee = final_fee * 2u64,
        QueryComplexity::Complex => final_fee = final_fee * 5u64,
    }
    
    // Volume discount for frequent users
    let user_usage = self.get_user_monthly_usage(user);
    if user_usage > 100 {
        final_fee = final_fee * 80u64 / 100u64; // 20% discount
    } else if user_usage > 50 {
        final_fee = final_fee * 90u64 / 100u64; // 10% discount
    }
    
    final_fee
}
```

---

## 🔄 **AI Request Processing Workflow**

### **Request Lifecycle**
```rust
// Complete AI service request workflow
async fn process_ai_request(
    &self,
    requester: Principal,
    service_type: AIServiceType,
    query: String,
    options: AIRequestOptions,
) -> Result<AIRequestResult, Error> {
    let request_id = self.generate_request_id();
    
    // 1. Validate request
    self.validate_ai_request(&service_type, &query, &options)?;
    
    // 2. Process payment
    let payment = self.process_ai_service_payment(
        requester,
        service_type.clone(),
        request_id.clone(),
    ).await?;
    
    // 3. Route to appropriate AI service
    let ai_response = match service_type {
        AIServiceType::AlgorandOracle => {
            self.call_algorand_oracle(query, options).await?
        },
        AIServiceType::OpenWebUIChat => {
            self.call_backend_ai_service(service_type, AIServiceRequest {
                query,
                model: options.model,
                context: options.context,
            }).await?
        },
        _ => return Err(Error::ServiceNotImplemented),
    };
    
    // 4. Create audit trail
    self.record_ai_request_audit(AIRequestAudit {
        request_id: request_id.clone(),
        requester,
        service_type,
        query: query.clone(),
        response: ai_response.response.clone(),
        payment: payment.amount.clone(),
        timestamp: ic_cdk::api::time(),
    });
    
    // 5. Return result
    Ok(AIRequestResult {
        request_id,
        response: ai_response.response,
        confidence: ai_response.confidence,
        processing_time: ai_response.processing_time_ms,
        cost: payment.amount,
        service_used: service_type,
    })
}
```

---

## 📊 **Performance Monitoring & Health Checks**

### **Service Health Monitoring**
```rust
#[derive(Clone, Debug)]
pub struct ServiceHealthStatus {
    pub is_healthy: bool,
    pub last_check: u64,
    pub avg_response_time_ms: u64,
    pub success_rate_percent: u8,
    pub total_requests: u64,
    pub failed_requests: u64,
}

// Health check for AI services
async fn check_ai_service_health(&self, service_type: AIServiceType) -> ServiceHealthStatus {
    let start_time = ic_cdk::api::time();
    
    // Test simple query
    let test_result = self.process_ai_request(
        ic_cdk::caller(),
        service_type.clone(),
        "Health check test".to_string(),
        AIRequestOptions::default(),
    ).await;
    
    let response_time = (ic_cdk::api::time() - start_time) / 1_000_000; // Convert to ms
    
    let is_healthy = test_result.is_ok();
    
    // Update metrics
    let mut health_status = self.service_health.get(&service_type)
        .cloned()
        .unwrap_or(ServiceHealthStatus {
            is_healthy: false,
            last_check: 0,
            avg_response_time_ms: 0,
            success_rate_percent: 0,
            total_requests: 0,
            failed_requests: 0,
        });
    
    health_status.is_healthy = is_healthy;
    health_status.last_check = ic_cdk::api::time();
    health_status.total_requests += 1;
    
    if !is_healthy {
        health_status.failed_requests += 1;
    }
    
    health_status.success_rate_percent = 
        ((health_status.total_requests - health_status.failed_requests) * 100 
         / health_status.total_requests) as u8;
    
    // Update average response time
    health_status.avg_response_time_ms = 
        (health_status.avg_response_time_ms + response_time) / 2;
    
    self.service_health.insert(service_type, health_status.clone());
    
    health_status
}
```

---

## 🚀 **Implementation Plan**

### **Week 1: Core Integration (Sept 11-18)**
- [ ] **AI Service Registry**: Implement basic service configuration system
- [ ] **Payment System**: Add AI service fee collection to ckALGO canister
- [ ] **Backend Integration**: Set up inter-canister calls to existing backend
- [ ] **Basic Oracle Connection**: Connect to Algorand Oracle (App ID 745336394)

### **Week 2: Advanced Features (Sept 18-25)**
- [ ] **Request Processing**: Complete AI request workflow implementation
- [ ] **Response Caching**: Implement AI response caching system
- [ ] **Health Monitoring**: Add service health checks and performance tracking
- [ ] **Error Handling**: Robust error handling and retry logic

### **Week 3: Testing & Optimization (Sept 25 - Oct 2)**
- [ ] **Integration Testing**: End-to-end testing with existing AI infrastructure
- [ ] **Performance Tuning**: Optimize response times and resource usage
- [ ] **Documentation**: Complete technical documentation for AI integration
- [ ] **Monitoring Dashboard**: Create AI service monitoring interface

---

## 📋 **Integration Success Criteria**

### **Technical Integration**
- [ ] ckALGO canister can call existing AI Oracle (App ID 745336394)
- [ ] Inter-canister calls to backend API working
- [ ] AI service payment system functional
- [ ] Response caching and performance monitoring operational

### **Performance Targets**
- [ ] AI query response time < 200ms (cached) / < 2000ms (fresh)
- [ ] Payment processing < 100ms
- [ ] Service health check < 500ms
- [ ] 99%+ uptime for AI service integration layer

### **Business Logic**
- [ ] Fee collection system working with ckALGO payments
- [ ] Usage-based pricing implemented
- [ ] Audit trail for all AI requests
- [ ] Compliance framework for enterprise features

---

**AI Integration Layer Design Complete** ✅  
**Ready for Implementation Phase** 🤖

This design leverages existing AI infrastructure while adding intelligent automation capabilities to the ckALGO platform.