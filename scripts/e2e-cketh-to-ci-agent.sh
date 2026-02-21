#!/bin/bash

# End-to-End Flow: ckETH -> ckALGO -> X402 Payment -> CI Agent
#
# This script demonstrates the complete autonomous agent payment flow:
# 1. Swap ckETH for ckALGO
# 2. Create X402 payment and get JWT token
# 3. Invoke CI agent with payment token
#
# Usage: ./e2e-cketh-to-ci-agent.sh <principal> <cketh_tx_id> <cketh_amount>
#
# Prerequisites:
# - Agent must have transferred ckETH to custody subaccount BEFORE running
# - Backend must be running on VPS
# - X402_TREASURY_PRINCIPAL must be configured
#
# Created: 2026-02-21 by Cartographer Agent

set -e

# Configuration
API_BASE="${API_BASE:-http://74.50.113.152:3004}"
PRINCIPAL="${1:-2vxsx-fae}"
CKETH_TX_ID="${2:-12345}"
CKETH_AMOUNT="${3:-1000000000000000}"  # 0.001 ETH in wei (default)

# Target CI agent (can be customized)
CI_AGENT="${CI_AGENT:-athena}"
CI_SERVICE="${CI_SERVICE:-memory-optimization}"
SERVICE_AMOUNT="${SERVICE_AMOUNT:-10}"  # ckALGO for this service

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "E2E Flow: ckETH -> CI Agent"
echo "=========================================="
echo "API Base: $API_BASE"
echo "Principal: $PRINCIPAL"
echo "ckETH TX ID: $CKETH_TX_ID"
echo "ckETH Amount: $CKETH_AMOUNT"
echo "Target Agent: $CI_AGENT/$CI_SERVICE"
echo "Service Cost: $SERVICE_AMOUNT ckALGO"
echo ""

# ==========================================
# STEP 0: Get custody account (prerequisite)
# ==========================================
echo -e "${YELLOW}STEP 0: Getting custody account...${NC}"
CUSTODY_RESPONSE=$(curl -s -X GET "$API_BASE/swap/custody-account/$PRINCIPAL")

CUSTODY_SUCCESS=$(echo "$CUSTODY_RESPONSE" | jq -r '.success')
if [ "$CUSTODY_SUCCESS" != "true" ]; then
  echo -e "${RED}ERROR: Failed to get custody account${NC}"
  echo "$CUSTODY_RESPONSE" | jq .
  exit 1
fi

CUSTODY_OWNER=$(echo "$CUSTODY_RESPONSE" | jq -r '.custodyAccount.owner')
CUSTODY_SUBACCOUNT=$(echo "$CUSTODY_RESPONSE" | jq -r '.custodyAccount.subaccount')

echo -e "${GREEN}Custody Account:${NC}"
echo "  Owner: $CUSTODY_OWNER"
echo "  Subaccount: $CUSTODY_SUBACCOUNT"
echo ""

echo "NOTE: Agent must have transferred ckETH to custody using:"
echo "  dfx canister call ss2fx-dyaaa-aaaar-qacoq-cai icrc1_transfer \\"
echo "    '(record { to = record { owner = principal \"$CUSTODY_OWNER\"; subaccount = opt blob \"...\" }; amount = $CKETH_AMOUNT })'"
echo ""

# ==========================================
# STEP 1: Execute swap
# ==========================================
echo -e "${YELLOW}STEP 1: Executing ckETH -> ckALGO swap...${NC}"
SWAP_RESPONSE=$(curl -s -X POST "$API_BASE/swap/execute" \
  -H "Content-Type: application/json" \
  -d "{
    \"principal\": \"$PRINCIPAL\",
    \"ckethAmount\": \"$CKETH_AMOUNT\",
    \"ckethTxId\": \"$CKETH_TX_ID\"
  }")

SWAP_SUCCESS=$(echo "$SWAP_RESPONSE" | jq -r '.success')
if [ "$SWAP_SUCCESS" != "true" ]; then
  echo -e "${RED}ERROR: Swap failed${NC}"
  echo "Error: $(echo "$SWAP_RESPONSE" | jq -r '.error')"
  echo "Full response:"
  echo "$SWAP_RESPONSE" | jq .
  exit 1
fi

CKALGO_OUT=$(echo "$SWAP_RESPONSE" | jq -r '.swap.ckalgoOut')
CKALGO_FORMATTED=$(echo "$SWAP_RESPONSE" | jq -r '.swap.ckalgoOutFormatted')
RATE_USED=$(echo "$SWAP_RESPONSE" | jq -r '.swap.rateUsed')

echo -e "${GREEN}Swap successful!${NC}"
echo "  ckALGO received: $CKALGO_FORMATTED"
echo "  Rate used: $RATE_USED"
echo ""

# ==========================================
# STEP 2: Create X402 payment
# ==========================================
echo -e "${YELLOW}STEP 2: Creating X402 payment...${NC}"
PAYMENT_RESPONSE=$(curl -s -X POST "$API_BASE/api/sippar/x402/create-payment" \
  -H "Content-Type: application/json" \
  -d "{
    \"service\": \"/ci-agents/$CI_AGENT/$CI_SERVICE\",
    \"amount\": $SERVICE_AMOUNT,
    \"principal\": \"$PRINCIPAL\",
    \"algorandAddress\": \"7KJLCGZSMYMF6CKUGSTHRU75TN6CHJQZEUJZPSAO3AQLTMVLFPL6W5YX7I\",
    \"aiModel\": \"grok\"
  }")

PAYMENT_SUCCESS=$(echo "$PAYMENT_RESPONSE" | jq -r '.success')
if [ "$PAYMENT_SUCCESS" != "true" ]; then
  echo -e "${RED}ERROR: Payment failed${NC}"
  echo "Error: $(echo "$PAYMENT_RESPONSE" | jq -r '.error')"
  echo "Details: $(echo "$PAYMENT_RESPONSE" | jq -r '.details // empty')"
  echo ""
  echo "Check if X402_TREASURY_PRINCIPAL is configured on VPS"
  exit 1
fi

SERVICE_TOKEN=$(echo "$PAYMENT_RESPONSE" | jq -r '.payment.serviceAccessToken')
TX_ID=$(echo "$PAYMENT_RESPONSE" | jq -r '.payment.transactionId')
REAL_PAYMENT=$(echo "$PAYMENT_RESPONSE" | jq -r '.payment.realPayment')

echo -e "${GREEN}Payment successful!${NC}"
echo "  Transaction ID: $TX_ID"
echo "  Real Payment: $REAL_PAYMENT"
echo "  Token (first 50 chars): ${SERVICE_TOKEN:0:50}..."
echo ""

# ==========================================
# STEP 3: Invoke CI agent
# ==========================================
SESSION_ID="session-$(date +%s)-$$"
echo -e "${YELLOW}STEP 3: Invoking CI agent $CI_AGENT/$CI_SERVICE...${NC}"
echo "  Session ID: $SESSION_ID"

CI_RESPONSE=$(curl -s -X POST "$API_BASE/api/sippar/ci-agents/$CI_AGENT/$CI_SERVICE" \
  -H "Content-Type: application/json" \
  -d "{
    \"sessionId\": \"$SESSION_ID\",
    \"requirements\": {
      \"task\": \"Analyze memory optimization strategies for AI systems\"
    },
    \"paymentToken\": \"$SERVICE_TOKEN\",
    \"principal\": \"$PRINCIPAL\"
  }")

CI_SUCCESS=$(echo "$CI_RESPONSE" | jq -r '.success')
if [ "$CI_SUCCESS" != "true" ]; then
  echo -e "${RED}ERROR: CI Agent invocation failed${NC}"
  echo "Error: $(echo "$CI_RESPONSE" | jq -r '.error')"
  echo "Details: $(echo "$CI_RESPONSE" | jq -r '.details // empty')"
  echo ""
  echo "Check if CI API is running on VPS port 8080"
  exit 1
fi

RESULT=$(echo "$CI_RESPONSE" | jq -r '.result.result')
QUALITY=$(echo "$CI_RESPONSE" | jq -r '.result.quality_score')
PROCESSING_TIME=$(echo "$CI_RESPONSE" | jq -r '.result.processing_time_ms')
AGENT_SIG=$(echo "$CI_RESPONSE" | jq -r '.result.agent_signature')

echo ""
echo -e "${GREEN}=========================================="
echo "SUCCESS! Full E2E flow completed"
echo "==========================================${NC}"
echo ""
echo "Summary:"
echo "  1. Swap: $CKETH_AMOUNT ckETH -> $CKALGO_FORMATTED"
echo "  2. Payment: $SERVICE_AMOUNT ckALGO (TX: $TX_ID)"
echo "  3. Agent: $CI_AGENT/$CI_SERVICE"
echo ""
echo "Results:"
echo "  Quality Score: $QUALITY"
echo "  Processing Time: ${PROCESSING_TIME}ms"
echo "  Agent Signature: $AGENT_SIG"
echo ""
echo "Agent Response:"
echo "---"
echo "$RESULT"
echo "---"
echo ""

# Output JSON summary
echo ""
echo "JSON Summary:"
jq -n \
  --arg principal "$PRINCIPAL" \
  --arg ckalgo "$CKALGO_FORMATTED" \
  --arg txId "$TX_ID" \
  --arg agent "$CI_AGENT/$CI_SERVICE" \
  --arg quality "$QUALITY" \
  --arg time "$PROCESSING_TIME" \
  --arg session "$SESSION_ID" \
  '{
    principal: $principal,
    ckalgo_received: $ckalgo,
    payment_tx: $txId,
    agent_invoked: $agent,
    quality_score: ($quality | tonumber),
    processing_time_ms: ($time | tonumber),
    session_id: $session
  }'
