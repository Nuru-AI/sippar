# Sprint 012.5: ckALGO Smart Contract Enhancement - Technical Design

**Sprint ID**: 012.5  
**Created**: September 10, 2025  
**Status**: ✅ **DAYS 12-13 COMPLETE** - Cross-Chain Operations Implementation  
**Team**: Claude + User

---

## <� **Technical Architecture Overview**

### **Current State Analysis**
```rust
// Current ckALGO Canister (src/canisters/ck_algo/src/lib.rs)
thread_local! {
    static BALANCES: RefCell<HashMap<String, Nat>> = RefCell::new(HashMap::new());
    static TOTAL_SUPPLY: RefCell<Nat> = RefCell::new(Nat::from(0u64));
    static AUTHORIZED_MINTERS: RefCell<Vec<Principal>> = RefCell::new(Vec::new());
    // Basic ICRC-1 token functionality only
}
```

### **Target Enhanced Architecture**
```rust
// Enhanced ckALGO Canister (Sprint 012.5 Target)
thread_local! {
    // Core token (preserve existing)
    static BALANCES: RefCell<HashMap<String, Nat>> = RefCell::new(HashMap::new());
    static TOTAL_SUPPLY: RefCell<Nat> = RefCell::new(Nat::from(0u64));
    static AUTHORIZED_MINTERS: RefCell<Vec<Principal>> = RefCell::new(Vec::new());
    
    // NEW: Smart contract capabilities
    static AI_SERVICES: RefCell<HashMap<AIServiceType, AIServiceConfig>> = RefCell::new(HashMap::new());
    static AI_REQUEST_QUEUE: RefCell<Vec<AIRequest>> = RefCell::new(Vec::new());
    static AI_RESPONSE_CACHE: RefCell<HashMap<String, CachedAIResponse>> = RefCell::new(HashMap::new());
    
    // NEW: Cross-chain state
    static ALGORAND_STATE_CACHE: RefCell<HashMap<String, AlgorandStateData>> = RefCell::new(HashMap::new());
    static CROSS_CHAIN_OPERATIONS: RefCell<Vec<CrossChainOperation>> = RefCell::new(Vec::new());
    
    // NEW: Revenue and audit
    static PAYMENT_HISTORY: RefCell<Vec<PaymentRecord>> = RefCell::new(Vec::new());
    static AUDIT_TRAIL: RefCell<Vec<AuditLogEntry>> = RefCell::new(Vec::new());
}
```

---

## =' **Component Design Specifications**

### **Component 1: AI Integration Layer**

#### **Data Structures**
```rust
#[derive(Clone, Debug, CandidType, Deserialize)]
pub enum AIServiceType {
    AlgorandOracle,      // Existing App ID 745336394
    OpenWebUIChat,       // Backend integration
    RiskAssessment,      // Future expansion
    MarketAnalysis,      // Future expansion
}

#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct AIServiceConfig {
    pub service_id: String,
    pub endpoint: Option<String>,
    pub fee_per_request: Nat,
    pub max_query_length: usize,
    pub response_timeout_seconds: u64,
    pub supported_models: Vec<String>,
    pub is_active: bool,
}

#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct AIRequest {
    pub request_id: String,
    pub requester: Principal,
    pub service_type: AIServiceType,
    pub query: String,
    pub model: Option<String>,
    pub payment: Nat,
    pub created_at: u64,
    pub status: AIRequestStatus,
}
```

#### **Core Functions**
```rust
// AI service management
#[update]
async fn process_ai_request(
    service_type: AIServiceType,
    query: String,
    model: Option<String>
) -> Result<AIRequestResult, String>;

#[query]
fn get_ai_service_config(service_type: AIServiceType) -> Option<AIServiceConfig>;

#[update]
fn update_ai_service_config(
    service_type: AIServiceType, 
    config: AIServiceConfig
) -> Result<(), String>;

// AI request processing
async fn call_algorand_oracle(
    query: String,
    model: String
) -> Result<AIResponse, String>;

async fn call_backend_ai_service(
    service_type: AIServiceType,
    request: AIServiceRequest
) -> Result<AIResponse, String>;
```

### **Component 2: Cross-Chain State Management**

#### **Data Structures**
```rust
#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct AlgorandStateData {
    pub address: String,
    pub balance: u64,
    pub assets: Vec<AlgorandAsset>,
    pub apps: Vec<u64>,
    pub last_updated: u64,
    pub round: u64,
}

#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct CrossChainOperation {
    pub operation_id: String,
    pub operation_type: CrossChainOperationType,
    pub algorand_address: String,
    pub icp_principal: Principal,
    pub amount: Option<u64>,
    pub status: OperationStatus,
    pub created_at: u64,
    pub completed_at: Option<u64>,
    pub transaction_id: Option<String>,
}

#[derive(Clone, Debug, CandidType, Deserialize)]
pub enum CrossChainOperationType {
    ReadState,
    WriteState,
    TransferALGO,
    OptIntoAsset,
    CallSmartContract,
}
```

#### **Core Functions**
```rust
// Cross-chain operations
#[update]
async fn read_algorand_state(
    address: String,
    state_type: StateType
) -> Result<AlgorandStateData, String>;

#[update]
async fn write_algorand_state(
    operation: AlgorandOperation,
    authorization: ckALGOAuthorization
) -> Result<String, String>; // Returns transaction ID

// State synchronization
#[update]
async fn sync_cross_chain_state(
    addresses: Vec<String>
) -> Result<Vec<AlgorandStateData>, String>;

#[query]
fn get_cached_algorand_state(address: String) -> Option<AlgorandStateData>;
```

### **Component 3: Revenue Generation System**

#### **Data Structures**
```rust
#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct FeeStructure {
    pub service_type: ServiceType,
    pub base_fee: Nat,
    pub per_operation_fee: Nat,
    pub enterprise_multiplier: f64,
    pub volume_discounts: Vec<VolumeDiscount>,
}

#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct PaymentRecord {
    pub payment_id: String,
    pub payer: Principal,
    pub service_type: ServiceType,
    pub amount: Nat,
    pub timestamp: u64,
    pub transaction_details: PaymentDetails,
}

#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct RevenueMetrics {
    pub total_revenue: Nat,
    pub monthly_revenue: Nat,
    pub revenue_by_service: HashMap<ServiceType, Nat>,
    pub total_transactions: u64,
    pub active_users: u64,
}
```

#### **Core Functions**
```rust
// Payment processing
#[update]
fn process_service_payment(
    payer: Principal,
    service_type: ServiceType,
    usage_metrics: UsageMetrics
) -> Result<PaymentRecord, String>;

#[query]
fn calculate_service_fee(
    service_type: ServiceType,
    usage_metrics: UsageMetrics,
    user: Principal
) -> Nat;

// Revenue tracking
#[query]
fn get_revenue_metrics() -> RevenueMetrics;

#[query]
fn get_payment_history(user: Principal) -> Vec<PaymentRecord>;
```

---

## = **Integration Architecture**

### **External Service Integrations**

#### **1. Algorand AI Oracle Integration**
```rust
// Integration with existing Oracle (App ID 745336394)
pub struct AlgorandOracleClient {
    pub app_id: u64,
    pub oracle_account: Option<String>,
    pub backend_canister: Principal,
}

impl AlgorandOracleClient {
    // Submit oracle request via backend
    async fn submit_oracle_request(&self, request: OracleRequest) -> Result<String, String>;
    
    // Process oracle callback
    async fn process_oracle_callback(&self, response: OracleResponse) -> Result<(), String>;
}
```

#### **2. Backend API Integration**
```rust
// Inter-canister calls to backend services
pub struct BackendAPIClient {
    pub backend_canister: Principal,
    pub timeout_seconds: u64,
}

impl BackendAPIClient {
    // Call AI services
    async fn call_ai_service(&self, request: AIServiceRequest) -> Result<AIResponse, String>;
    
    // Submit cross-chain transactions
    async fn submit_cross_chain_transaction(&self, tx: CrossChainTransaction) -> Result<String, String>;
}
```

#### **3. Threshold Signer Integration**
```rust
// Use existing threshold signer for Algorand operations
pub struct ThresholdSignerClient {
    pub signer_canister: Principal, // vj7ly-diaaa-aaaae-abvoq-cai
}

impl ThresholdSignerClient {
    // Sign Algorand transactions
    async fn sign_algorand_transaction(&self, principal: String, tx_bytes: Vec<u8>) -> Result<SignedTransaction, String>;
    
    // Derive Algorand addresses
    async fn derive_algorand_address(&self, principal: String) -> Result<DerivedAddress, String>;
}
```

---

## =� **Technical Success Criteria**

### **Code Quality Metrics**
- [ ] 80%+ test coverage for all new functionality
- [ ] Zero compilation warnings in Rust code
- [ ] All new functions documented with rustdoc
- [ ] Code review completed for all components

### **Performance Benchmarks**
- [ ] AI request processing < 200ms (cached) / < 2000ms (fresh)
- [ ] Cross-chain state read < 5 seconds
- [ ] Payment processing < 100ms
- [ ] Canister upgrade time < 30 seconds

### **Integration Validation**
- [ ] Algorand Oracle integration functional
- [ ] Backend API inter-canister calls working
- [ ] Threshold signer integration preserved
- [ ] All existing ICRC-1 functions still operational

---

**Technical Design Complete**   
**Ready for Timeline Planning** =�