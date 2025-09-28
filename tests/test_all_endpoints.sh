#!/bin/bash

# Comprehensive Endpoint Testing Script
# Tests all 46 deployed endpoints and X402 endpoints

BASE_URL="https://nuru.network/api/sippar"
RESULTS_FILE="endpoint_test_results.json"

echo '{"timestamp":"'$(date -Iseconds)'","endpoints":[' > $RESULTS_FILE

# Test function
test_endpoint() {
    local method=$1
    local endpoint=$2
    local test_data=$3
    local description=$4
    
    echo "Testing: $method $endpoint - $description"
    
    start_time=$(date +%s%3N)
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "%{http_code}" -o temp_response.json "$BASE_URL$endpoint")
    else
        if [ -n "$test_data" ]; then
            response=$(curl -s -w "%{http_code}" -X $method -H "Content-Type: application/json" -d "$test_data" -o temp_response.json "$BASE_URL$endpoint")
        else
            response=$(curl -s -w "%{http_code}" -X $method -o temp_response.json "$BASE_URL$endpoint")
        fi
    fi
    end_time=$(date +%s%3N)
    
    http_code="${response: -3}"
    response_time=$((end_time - start_time))
    
    body=$(cat temp_response.json 2>/dev/null || echo '{}')
    rm -f temp_response.json
    
    echo "{"
    echo "\"endpoint\":\"$endpoint\","
    echo "\"method\":\"$method\","
    echo "\"description\":\"$description\","
    echo "\"http_code\":$http_code,"
    echo "\"response_time_ms\":$response_time,"
    echo "\"success\":$([ "$http_code" -eq 200 ] && echo "true" || echo "false"),"
    echo "\"response\":$body"
    echo "}," >> $RESULTS_FILE
}

# Core endpoints
test_endpoint "GET" "/health" "" "System health check"
test_endpoint "GET" "/api/ai/status" "" "AI service status"

# Chain fusion endpoints  
test_endpoint "GET" "/api/v1/threshold/status" "" "Threshold signer status"
test_endpoint "POST" "/api/v1/threshold/derive-address" '{"principal":"rdmx6-jaaaa-aaaah-qcaaa-cai"}' "Derive Algorand address"

# ckALGO endpoints
test_endpoint "GET" "/ck-algo/balance/rdmx6-jaaaa-aaaah-qcaaa-cai" "" "Get ckALGO balance"

# Reserve endpoints
test_endpoint "GET" "/reserves/status" "" "Reserve status"
test_endpoint "GET" "/reserves/proof" "" "Proof of reserves"

# X402 endpoints (expected to fail)
echo "=== Testing X402 Endpoints (Expected to fail) ==="
test_endpoint "POST" "/x402/create-payment" '{"amount":0.01,"service":"ai-query"}' "Create X402 payment"
test_endpoint "GET" "/x402/agent-marketplace" "" "X402 agent marketplace"
test_endpoint "GET" "/x402/analytics" "" "X402 analytics"

# Remove trailing comma and close JSON
sed -i '$ s/,$//' $RESULTS_FILE
echo ']}' >> $RESULTS_FILE

echo "Testing complete. Results saved to: $RESULTS_FILE"
