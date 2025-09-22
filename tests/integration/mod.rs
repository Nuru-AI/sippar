// Integration tests module for ckALGO enterprise features

pub mod enterprise_features_test;

// Test utilities and common setup functions
use candid::Principal;
use std::collections::HashMap;

/// Common test utilities
pub struct TestUtils;

impl TestUtils {
    /// Create a test principal for integration testing
    pub fn test_principal() -> Principal {
        Principal::from_text("rdmx6-jaaaa-aaaah-qcaiq-cai").unwrap()
    }
    
    /// Create test metadata for operations
    pub fn test_metadata() -> HashMap<String, String> {
        let mut metadata = HashMap::new();
        metadata.insert("test_environment".to_string(), "integration".to_string());
        metadata.insert("test_timestamp".to_string(), ic_cdk::api::time().to_string());
        metadata
    }
    
    /// Validate enterprise feature response format
    pub fn validate_response_format(response: &str) -> bool {
        // Basic validation for JSON response format
        response.starts_with('{') && response.ends_with('}')
    }
}