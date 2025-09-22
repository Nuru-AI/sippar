#!/bin/bash

# Sprint X Phase 4.1: Production Deployment Verification Script
# Verifies that the simplified bridge canister and all systems are production-ready
# Date: September 15, 2025

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SIMPLIFIED_BRIDGE_CANISTER="hldvt-2yaaa-aaaak-qulxa-cai"
BACKEND_URL="https://nuru.network/api/sippar"
FRONTEND_URL="https://nuru.network/sippar"
DFX_NETWORK="ic"

echo -e "${BLUE}🚀 Sprint X Phase 4.1: Production Deployment Verification${NC}"
echo "================================================================"
echo ""

# Verification counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# Helper function to run a check
run_check() {
    local check_name="$1"
    local check_command="$2"
    local expected_pattern="$3"

    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    echo -e "${YELLOW}🧪 Checking: $check_name${NC}"

    if output=$(eval "$check_command" 2>&1); then
        if [[ -z "$expected_pattern" ]] || echo "$output" | grep -q "$expected_pattern"; then
            echo -e "   ${GREEN}✅ PASSED${NC}"
            PASSED_CHECKS=$((PASSED_CHECKS + 1))
            return 0
        else
            echo -e "   ${RED}❌ FAILED: Pattern '$expected_pattern' not found${NC}"
            echo "   Output: $output"
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
            return 1
        fi
    else
        echo -e "   ${RED}❌ FAILED: Command failed${NC}"
        echo "   Error: $output"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi
}

# Helper function for API checks
check_api() {
    local endpoint="$1"
    local expected_key="$2"

    run_check "API Endpoint $endpoint" \
              "curl -s --max-time 10 \"$BACKEND_URL$endpoint\"" \
              "$expected_key"
}

# Helper function for canister checks
check_canister() {
    local method="$1"
    local expected_pattern="$2"

    run_check "Canister Method $method" \
              "dfx canister call $SIMPLIFIED_BRIDGE_CANISTER $method --network $DFX_NETWORK" \
              "$expected_pattern"
}

echo -e "${BLUE}1. SIMPLIFIED BRIDGE CANISTER VERIFICATION${NC}"
echo "=============================================="

# Check canister status
run_check "Canister Status" \
          "dfx canister status $SIMPLIFIED_BRIDGE_CANISTER --network $DFX_NETWORK" \
          "Status: Running"

# Check basic ICRC-1 functionality
check_canister "icrc1_name" "Chain-Key ALGO"
check_canister "icrc1_symbol" "ckALGO"
check_canister "icrc1_decimals" "6"
check_canister "icrc1_total_supply" "0"

# Check bridge-specific functionality
check_canister "get_reserve_ratio" "reserve_ratio"
check_canister "get_canister_status" ""

echo ""
echo -e "${BLUE}2. BACKEND API VERIFICATION${NC}"
echo "=============================="

# Check backend health
check_api "/health" "success"

# Check reserve verification service
check_api "/reserves/status" "reserveRatio"

# Check Algorand integration
check_api "/algorand/status" "success"

# Check ckALGO endpoints
check_api "/ck-algo/generate-deposit-address" "success"

echo ""
echo -e "${BLUE}3. FRONTEND VERIFICATION${NC}"
echo "========================="

# Check frontend accessibility (follow redirects)
run_check "Frontend Load Test" \
          "curl -s --max-time 10 -L -I \"$FRONTEND_URL\"" \
          "200"

# Check that frontend assets are accessible (follow redirects)
run_check "Frontend Assets" \
          "curl -s --max-time 10 -L \"$FRONTEND_URL\" | head -20" \
          "html"

echo ""
echo -e "${BLUE}4. INTEGRATION VERIFICATION${NC}"
echo "============================"

# Verify that backend can reach ICP canister
run_check "Backend→ICP Integration" \
          "curl -s --max-time 15 \"$BACKEND_URL/reserves/status\"" \
          "reserveRatio"

# Verify cross-system compatibility
run_check "Cross-System Health" \
          "curl -s --max-time 10 \"$BACKEND_URL/health\"" \
          "threshold_signatures"

echo ""
echo -e "${BLUE}5. SECURITY VERIFICATION${NC}"
echo "========================="

# Check canister controllers
run_check "Canister Controllers" \
          "dfx canister info $SIMPLIFIED_BRIDGE_CANISTER --network $DFX_NETWORK" \
          "Controllers:"

# Verify no admin endpoints are publicly accessible
ADMIN_ENDPOINT_SECURE=true
for endpoint in "/reserves/emergency-pause" "/reserves/admin-dashboard" "/admin/system-status"; do
    response=$(curl -s --max-time 5 "$BACKEND_URL$endpoint")
    if echo "$response" | grep -q '"success":true'; then
        echo -e "   ${RED}❌ SECURITY RISK: $endpoint publicly accessible${NC}"
        ADMIN_ENDPOINT_SECURE=false
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
done

if [ "$ADMIN_ENDPOINT_SECURE" = true ]; then
    echo -e "   ${GREEN}✅ PASSED: Admin endpoints properly secured${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
fi

echo ""
echo -e "${BLUE}6. PERFORMANCE VERIFICATION${NC}"
echo "==========================="

# Check API response times
start_time=$(date +%s%N)
curl -s --max-time 5 "$BACKEND_URL/health" > /dev/null
end_time=$(date +%s%N)
response_time=$(( (end_time - start_time) / 1000000 ))

TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if [ $response_time -lt 2000 ]; then
    echo -e "   ${GREEN}✅ PASSED: API response time ${response_time}ms < 2000ms${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo -e "   ${RED}❌ FAILED: API response time ${response_time}ms > 2000ms${NC}"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# Check canister query speed
start_time=$(date +%s%N)
dfx canister call $SIMPLIFIED_BRIDGE_CANISTER icrc1_name --network $DFX_NETWORK > /dev/null 2>&1
end_time=$(date +%s%N)
canister_time=$(( (end_time - start_time) / 1000000 ))

TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if [ $canister_time -lt 8000 ]; then
    echo -e "   ${GREEN}✅ PASSED: Canister query time ${canister_time}ms < 8000ms${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo -e "   ${RED}❌ FAILED: Canister query time ${canister_time}ms > 8000ms${NC}"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

echo ""
echo -e "${BLUE}7. SPRINT X REGRESSION VERIFICATION${NC}"
echo "===================================="

# Verify simplified architecture (canister size should be reasonable)
canister_info=$(dfx canister status $SIMPLIFIED_BRIDGE_CANISTER --network $DFX_NETWORK)
memory_size=$(echo "$canister_info" | grep "Memory Size:" | awk '{print $3}')

TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if [[ "$memory_size" =~ ^[0-9,_]+$ ]] && [ "${memory_size//[,_]}" -lt 10000000 ]; then
    echo -e "   ${GREEN}✅ PASSED: Simplified canister size ${memory_size} bytes < 10MB${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo -e "   ${RED}❌ FAILED: Canister too large: ${memory_size} bytes${NC}"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# Verify 1:1 backing compliance
reserves_data=$(curl -s --max-time 10 "$BACKEND_URL/reserves/status")
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if echo "$reserves_data" | grep -q '"reserveRatio":1'; then
    echo -e "   ${GREEN}✅ PASSED: 1:1 backing ratio maintained${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo -e "   ${RED}❌ FAILED: 1:1 backing ratio not maintained${NC}"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

echo ""
echo "================================================================"
echo -e "${BLUE}🏁 VERIFICATION SUMMARY${NC}"
echo "================================================================"
echo -e "✅ Passed: ${GREEN}$PASSED_CHECKS${NC}"
echo -e "❌ Failed: ${RED}$FAILED_CHECKS${NC}"
echo -e "📊 Total:  $TOTAL_CHECKS"

# Calculate success rate
success_rate=$(( (PASSED_CHECKS * 100) / TOTAL_CHECKS ))
echo -e "🎯 Success Rate: $success_rate%"

echo ""
if [ $FAILED_CHECKS -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL VERIFICATIONS PASSED - PRODUCTION READY!${NC}"
    echo ""
    echo "Sprint X Phase 4.1 Deployment Status: ✅ COMPLETE"
    echo "Simplified Bridge Canister: $SIMPLIFIED_BRIDGE_CANISTER"
    echo "Backend API: $BACKEND_URL"
    echo "Frontend: $FRONTEND_URL"
    echo ""
    echo "✅ 1:1 Backing: Enforced"
    echo "✅ Reserve Verification: Operational"
    echo "✅ Frontend Transparency: Deployed"
    echo "✅ Simplified Architecture: Confirmed"
    echo ""
    exit 0
elif [ $success_rate -ge 90 ]; then
    echo -e "${YELLOW}⚠️  MINOR ISSUES DETECTED - Review failed checks${NC}"
    exit 1
else
    echo -e "${RED}🚨 CRITICAL ISSUES DETECTED - Production deployment not recommended${NC}"
    exit 2
fi