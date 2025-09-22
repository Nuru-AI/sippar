// HTTP Outcall Test Helpers
// Addressing Sprint 012.5 gaps - HTTP outcall testing

use crate::{ExplanationType, AIServiceType};
use serde_json::json;
use std::collections::HashMap;

/// Mock HTTP outcall request builder for AI services
pub struct MockAIServiceRequest {
    pub service_type: AIServiceType,
    pub endpoint: String,
    pub headers: HashMap<String, String>,
    pub body: String,
    pub max_response_bytes: u64,
}

impl MockAIServiceRequest {
    /// Create a mock AI explanation request
    pub fn ai_explanation_request(explanation_type: ExplanationType, request_data: &str) -> Self {
        let mut headers = HashMap::new();
        headers.insert("Content-Type".to_string(), "application/json".to_string());
        headers.insert("Authorization".to_string(), "Bearer mock_token".to_string());
        
        let body = json!({
            "explanation_type": format!("{:?}", explanation_type),
            "request_data": request_data,
            "timestamp": 1694102400000000000u64,
            "user_tier": "Enterprise"
        }).to_string();
        
        Self {
            service_type: AIServiceType::ComplianceCheck,
            endpoint: "https://nuru.network/api/sippar/ai/explain".to_string(),
            headers,
            body,
            max_response_bytes: 2_000_000,
        }
    }
    
    /// Create a mock AI query request
    pub fn ai_query_request(query: &str, context: &str) -> Self {
        let mut headers = HashMap::new();
        headers.insert("Content-Type".to_string(), "application/json".to_string());
        headers.insert("Authorization".to_string(), "Bearer mock_token".to_string());
        
        let body = json!({
            "query": query,
            "context": context,
            "timestamp": 1694102400000000000u64,
            "max_tokens": 500
        }).to_string();
        
        Self {
            service_type: AIServiceType::OpenWebUIChat,
            endpoint: "https://nuru.network/api/sippar/ai/query".to_string(),
            headers,
            body,
            max_response_bytes: 1_000_000,
        }
    }
    
    /// Create a mock bias check request
    pub fn bias_check_request(decision_data: &str) -> Self {
        let mut headers = HashMap::new();
        headers.insert("Content-Type".to_string(), "application/json".to_string());
        headers.insert("Authorization".to_string(), "Bearer mock_token".to_string());
        
        let body = json!({
            "decision_data": decision_data,
            "check_type": "comprehensive_bias_analysis",
            "demographic_factors": ["age", "gender", "location", "income"],
            "timestamp": 1694102400000000000u64
        }).to_string();
        
        Self {
            service_type: AIServiceType::RiskAssessment,
            endpoint: "https://nuru.network/api/sippar/ai/bias-check".to_string(),
            headers,
            body,
            max_response_bytes: 500_000,
        }
    }
    
    /// Validate HTTP request structure (what would be sent to ICP HTTP outcall)
    pub fn validate_request_structure(&self) -> Result<(), String> {
        // Validate URL format
        if !self.endpoint.starts_with("https://") {
            return Err("Endpoint must use HTTPS".to_string());
        }
        
        // Validate headers
        if !self.headers.contains_key("Content-Type") {
            return Err("Content-Type header required".to_string());
        }
        
        if !self.headers.contains_key("Authorization") {
            return Err("Authorization header required".to_string());
        }
        
        // Validate body is valid JSON
        if let Err(_) = serde_json::from_str::<serde_json::Value>(&self.body) {
            return Err("Body must be valid JSON".to_string());
        }
        
        // Validate response size limits
        if self.max_response_bytes > 2_000_000 {
            return Err("Response size limit exceeds ICP maximum".to_string());
        }
        
        Ok(())
    }
    
    /// Get cycles cost estimate for this request
    pub fn estimate_cycles_cost(&self) -> u128 {
        let base_cost = 20_000_000_000u128; // 20B cycles base cost
        let size_cost = (self.body.len() as u128) * 1_000_000; // 1M cycles per byte
        let response_size_cost = (self.max_response_bytes as u128) * 500; // 500 cycles per response byte
        
        base_cost + size_cost + response_size_cost
    }
}

/// Mock HTTP response for AI services
pub struct MockAIServiceResponse {
    pub status_code: u16,
    pub headers: HashMap<String, String>,
    pub body: String,
    pub processing_time_ms: u64,
}

impl MockAIServiceResponse {
    /// Create a successful AI explanation response
    pub fn successful_explanation_response() -> Self {
        let mut headers = HashMap::new();
        headers.insert("Content-Type".to_string(), "application/json".to_string());
        headers.insert("X-Processing-Time".to_string(), "45ms".to_string());
        
        let body = json!({
            "status": "success",
            "explanation": {
                "type": "BiasCheck",
                "result": "No significant bias detected",
                "confidence": 0.87,
                "factors": [
                    {"factor": "transaction_amount", "weight": 0.6, "bias_score": 0.1},
                    {"factor": "user_history", "weight": 0.3, "bias_score": 0.05},
                    {"factor": "time_of_day", "weight": 0.1, "bias_score": 0.02}
                ],
                "recommendations": [
                    "Continue monitoring demographic patterns",
                    "Validate decision consistency across user segments"
                ]
            },
            "metadata": {
                "request_id": "bias_check_123",
                "timestamp": 1694102400000000000u64,
                "model_version": "bias_detector_v2.1"
            }
        }).to_string();
        
        Self {
            status_code: 200,
            headers,
            body,
            processing_time_ms: 45,
        }
    }
    
    /// Create an error response
    pub fn error_response(error_message: &str) -> Self {
        let mut headers = HashMap::new();
        headers.insert("Content-Type".to_string(), "application/json".to_string());
        
        let body = json!({
            "status": "error",
            "error": {
                "code": "AI_SERVICE_ERROR",
                "message": error_message,
                "timestamp": 1694102400000000000u64
            }
        }).to_string();
        
        Self {
            status_code: 500,
            headers,
            body,
            processing_time_ms: 10,
        }
    }
    
    /// Validate response structure
    pub fn validate_response_structure(&self) -> Result<(), String> {
        // Check status code range
        if self.status_code < 200 || self.status_code >= 600 {
            return Err("Invalid HTTP status code".to_string());
        }
        
        // Validate headers
        if !self.headers.contains_key("Content-Type") {
            return Err("Content-Type header required in response".to_string());
        }
        
        // Validate body is valid JSON
        if let Err(_) = serde_json::from_str::<serde_json::Value>(&self.body) {
            return Err("Response body must be valid JSON".to_string());
        }
        
        // Parse and validate response structure
        let parsed: serde_json::Value = serde_json::from_str(&self.body)
            .map_err(|_| "Failed to parse response JSON")?;
        
        if !parsed.get("status").is_some() {
            return Err("Response must contain 'status' field".to_string());
        }
        
        Ok(())
    }
    
    /// Extract AI explanation from response
    pub fn extract_explanation(&self) -> Result<String, String> {
        if self.status_code != 200 {
            return Err(format!("HTTP error: {}", self.status_code));
        }
        
        let parsed: serde_json::Value = serde_json::from_str(&self.body)
            .map_err(|_| "Failed to parse response JSON")?;
        
        if let Some(explanation) = parsed.get("explanation") {
            if let Some(result) = explanation.get("result") {
                if let Some(result_str) = result.as_str() {
                    return Ok(result_str.to_string());
                }
            }
        }
        
        Err("Explanation not found in response".to_string())
    }
}

/// HTTP outcall performance metrics
pub struct HTTPOutcallMetrics {
    pub request_size_bytes: usize,
    pub response_size_bytes: usize,
    pub processing_time_ms: u64,
    pub cycles_consumed: u128,
    pub success_rate: f64,
}

impl HTTPOutcallMetrics {
    pub fn calculate_metrics(
        requests: &[MockAIServiceRequest],
        responses: &[MockAIServiceResponse]
    ) -> Self {
        let total_requests = requests.len();
        let successful_responses = responses.iter()
            .filter(|r| r.status_code >= 200 && r.status_code < 300)
            .count();
        
        let avg_request_size = if total_requests > 0 {
            requests.iter().map(|r| r.body.len()).sum::<usize>() / total_requests
        } else { 0 };
        
        let avg_response_size = if responses.len() > 0 {
            responses.iter().map(|r| r.body.len()).sum::<usize>() / responses.len()
        } else { 0 };
        
        let avg_processing_time = if responses.len() > 0 {
            responses.iter().map(|r| r.processing_time_ms).sum::<u64>() / responses.len() as u64
        } else { 0 };
        
        let total_cycles = requests.iter().map(|r| r.estimate_cycles_cost()).sum::<u128>();
        
        let success_rate = if total_requests > 0 {
            successful_responses as f64 / total_requests as f64
        } else { 0.0 };
        
        Self {
            request_size_bytes: avg_request_size,
            response_size_bytes: avg_response_size,
            processing_time_ms: avg_processing_time,
            cycles_consumed: total_cycles,
            success_rate,
        }
    }
}

#[cfg(test)]
mod http_outcall_tests {
    use super::*;
    
    #[test]
    fn test_ai_explanation_request_structure() {
        let request = MockAIServiceRequest::ai_explanation_request(
            ExplanationType::BiasCheck,
            "test_decision_data"
        );
        
        // Validate request structure
        assert!(request.validate_request_structure().is_ok());
        assert!(request.endpoint.contains("explain"));
        assert!(request.headers.contains_key("Authorization"));
        assert!(request.body.contains("BiasCheck"));
        
        // Test cycles cost estimation
        let cycles_cost = request.estimate_cycles_cost();
        assert!(cycles_cost > 20_000_000_000); // Should be more than base cost
        
        println!("✅ AI explanation request structure validated");
    }
    
    #[test]
    fn test_ai_service_response_parsing() {
        let response = MockAIServiceResponse::successful_explanation_response();
        
        // Validate response structure
        assert!(response.validate_response_structure().is_ok());
        assert_eq!(response.status_code, 200);
        assert!(response.body.contains("bias_score"));
        
        // Test explanation extraction
        let explanation = response.extract_explanation().unwrap();
        assert!(explanation.contains("No significant bias detected"));
        
        println!("✅ AI service response parsing validated");
    }
    
    #[test]
    fn test_http_error_handling() {
        let error_response = MockAIServiceResponse::error_response("Service unavailable");
        
        assert!(error_response.validate_response_structure().is_ok());
        assert_eq!(error_response.status_code, 500);
        
        // Should fail to extract explanation from error response
        let explanation_result = error_response.extract_explanation();
        assert!(explanation_result.is_err());
        
        println!("✅ HTTP error handling validated");
    }
    
    #[test]
    fn test_outcall_performance_metrics() {
        let requests = vec![
            MockAIServiceRequest::ai_explanation_request(ExplanationType::BiasCheck, "test1"),
            MockAIServiceRequest::ai_query_request("test query", "test context"),
            MockAIServiceRequest::bias_check_request("test decision"),
        ];
        
        let responses = vec![
            MockAIServiceResponse::successful_explanation_response(),
            MockAIServiceResponse::successful_explanation_response(),
            MockAIServiceResponse::error_response("timeout"),
        ];
        
        let metrics = HTTPOutcallMetrics::calculate_metrics(&requests, &responses);
        
        assert!(metrics.request_size_bytes > 0);
        assert!(metrics.response_size_bytes > 0);
        assert!(metrics.processing_time_ms > 0);
        assert!(metrics.cycles_consumed > 60_000_000_000); // 3 requests * base cost
        assert!(metrics.success_rate > 0.5); // 2/3 success rate
        
        println!("✅ HTTP outcall performance metrics calculated");
        println!("   Success rate: {:.2}%", metrics.success_rate * 100.0);
        println!("   Avg processing time: {}ms", metrics.processing_time_ms);
        println!("   Total cycles: {}", metrics.cycles_consumed);
    }
    
    #[test]
    fn test_request_validation_edge_cases() {
        // Test invalid endpoint
        let mut invalid_request = MockAIServiceRequest::ai_query_request("test", "context");
        invalid_request.endpoint = "http://insecure.example.com".to_string();
        assert!(invalid_request.validate_request_structure().is_err());
        
        // Test missing headers
        let mut no_auth_request = MockAIServiceRequest::ai_query_request("test", "context");
        no_auth_request.headers.remove("Authorization");
        assert!(no_auth_request.validate_request_structure().is_err());
        
        // Test invalid JSON body
        let mut invalid_json_request = MockAIServiceRequest::ai_query_request("test", "context");
        invalid_json_request.body = "invalid json {".to_string();
        assert!(invalid_json_request.validate_request_structure().is_err());
        
        // Test response size limit
        let mut oversized_request = MockAIServiceRequest::ai_query_request("test", "context");
        oversized_request.max_response_bytes = 3_000_000; // Over ICP limit
        assert!(oversized_request.validate_request_structure().is_err());
        
        println!("✅ Request validation edge cases tested");
    }
}