use reqwest;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::error::Error;
use std::time::Duration;

/// Configuration for the X402 client
#[derive(Debug, Clone)]
pub struct X402Config {
    pub principal: String,
    pub algorand_address: String,
    pub base_url: String,
    pub timeout: Duration,
}

impl Default for X402Config {
    fn default() -> Self {
        Self {
            principal: String::new(),
            algorand_address: String::new(),
            base_url: "https://nuru.network/api/sippar/x402".to_string(),
            timeout: Duration::from_secs(30),
        }
    }
}

/// Request structure for creating X402 payments
#[derive(Debug, Serialize)]
pub struct X402PaymentRequest {
    pub service: String,
    pub amount: f64,
    pub principal: String,
    #[serde(rename = "algorandAddress")]
    pub algorand_address: String,
    pub metadata: Option<HashMap<String, serde_json::Value>>,
}

/// Response structure for X402 payment creation
#[derive(Debug, Deserialize)]
pub struct X402PaymentResponse {
    pub success: bool,
    pub payment: PaymentDetails,
    pub performance: PerformanceInfo,
}

#[derive(Debug, Deserialize)]
pub struct PaymentDetails {
    #[serde(rename = "transactionId")]
    pub transaction_id: String,
    #[serde(rename = "serviceAccessToken")]
    pub service_access_token: String,
    #[serde(rename = "expiryTime")]
    pub expiry_time: i64,
}

#[derive(Debug, Deserialize)]
pub struct PerformanceInfo {
    #[serde(rename = "processingTime")]
    pub processing_time: String,
}

/// Response structure for marketplace data
#[derive(Debug, Deserialize)]
pub struct MarketplaceResponse {
    pub success: bool,
    pub marketplace: MarketplaceData,
}

#[derive(Debug, Deserialize)]
pub struct MarketplaceData {
    #[serde(rename = "totalServices")]
    pub total_services: u32,
    pub categories: Vec<String>,
    pub services: Vec<ServiceInfo>,
}

#[derive(Debug, Deserialize)]
pub struct ServiceInfo {
    pub id: String,
    pub name: String,
    pub description: String,
    pub price: f64,
    pub category: String,
}

/// Rust client for Sippar X402 payment protocol
pub struct X402Client {
    config: X402Config,
    client: reqwest::Client,
}

impl X402Client {
    /// Create a new X402 client instance
    pub fn new(config: X402Config) -> Self {
        let client = reqwest::Client::builder()
            .timeout(config.timeout)
            .build()
            .expect("Failed to create HTTP client");

        Self { config, client }
    }

    /// Create a new X402 payment for a service
    pub async fn create_payment(
        &self,
        service: &str,
        amount: f64,
        metadata: Option<HashMap<String, serde_json::Value>>,
    ) -> Result<X402PaymentResponse, Box<dyn Error>> {
        let request = X402PaymentRequest {
            service: service.to_string(),
            amount,
            principal: self.config.principal.clone(),
            algorand_address: self.config.algorand_address.clone(),
            metadata,
        };

        let response = self
            .client
            .post(&format!("{}/create-payment", self.config.base_url))
            .json(&request)
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(format!("HTTP error: {}", response.status()).into());
        }

        let payment_response: X402PaymentResponse = response.json().await?;

        if !payment_response.success {
            return Err("Payment creation failed".into());
        }

        Ok(payment_response)
    }

    /// Query AI service using X402 payment token
    pub async fn query_ai_service(
        &self,
        query: &str,
        model: &str,
        _service_token: &str,
    ) -> Result<HashMap<String, serde_json::Value>, Box<dyn Error>> {
        // In a real implementation, this would call the actual AI service
        // with the service token for authentication
        let mut response = HashMap::new();
        response.insert("query".to_string(), serde_json::Value::String(query.to_string()));
        response.insert("model".to_string(), serde_json::Value::String(model.to_string()));
        response.insert(
            "response".to_string(),
            serde_json::Value::String(format!("AI response for: {}", query)),
        );
        response.insert("status".to_string(), serde_json::Value::String("success".to_string()));

        Ok(response)
    }

    /// Get available services from the X402 marketplace
    pub async fn get_marketplace(&self) -> Result<MarketplaceResponse, Box<dyn Error>> {
        let response = self
            .client
            .get(&format!("{}/agent-marketplace", self.config.base_url))
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(format!("HTTP error: {}", response.status()).into());
        }

        let marketplace: MarketplaceResponse = response.json().await?;
        Ok(marketplace)
    }

    /// Verify if a service token is valid
    pub async fn verify_token(&self, token: &str) -> Result<bool, Box<dyn Error>> {
        let mut request_body = HashMap::new();
        request_body.insert("token", token);

        let response = self
            .client
            .post(&format!("{}/verify-token", self.config.base_url))
            .json(&request_body)
            .send()
            .await?;

        Ok(response.status().is_success())
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    println!("🦀 Sippar X402 Rust Client Example");
    println!("===================================");

    // Initialize client
    let config = X402Config {
        principal: "rdmx6-jaaaa-aaaah-qcaiq-cai".to_string(),
        algorand_address: "6W47GCLXWEIEZ2LRQCXF7HGLOYSXYCXOPXJ5YE55EULFHB7O4RWIM3JDCI".to_string(),
        ..Default::default()
    };

    let client = X402Client::new(config);

    // 1. Get marketplace information
    println!("📊 Fetching marketplace...");
    let marketplace = client.get_marketplace().await?;
    println!("Available services: {}", marketplace.marketplace.total_services);

    // 2. Create payment for AI service
    println!("\n💳 Creating payment for AI service...");
    let mut metadata = HashMap::new();
    metadata.insert("client".to_string(), serde_json::Value::String("rust".to_string()));
    metadata.insert("version".to_string(), serde_json::Value::String("1.0".to_string()));

    let payment = client
        .create_payment("ai-oracle-enhanced", 0.05, Some(metadata))
        .await?;

    println!("✅ Payment created: {}", payment.payment.transaction_id);
    println!("⚡ Processing time: {}", payment.performance.processing_time);

    // 3. Use the service token
    println!("\n🤖 Querying AI service...");
    let ai_response = client
        .query_ai_service(
            "What are the benefits of blockchain technology?",
            "deepseek-r1",
            &payment.payment.service_access_token,
        )
        .await?;

    if let Some(serde_json::Value::String(response)) = ai_response.get("response") {
        println!("🔮 AI Response: {}", response);
    }

    // 4. Verify token
    println!("\n🔐 Verifying token...");
    let is_valid = client.verify_token(&payment.payment.service_access_token).await?;
    println!("Token valid: {}", is_valid);

    println!("\n🎉 Rust X402 integration successful!");
    Ok(())
}

// Cargo.toml dependencies needed for this example:
/*
[dependencies]
reqwest = { version = "0.11", features = ["json"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tokio = { version = "1.0", features = ["full"] }
*/