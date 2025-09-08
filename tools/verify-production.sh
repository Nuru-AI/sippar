#!/bin/bash
# Sippar Production Verification Script
# Purpose: Prevent routing mistakes and verify all endpoints work correctly
# Created: September 8, 2025

echo "🔍 Sippar Production Verification"
echo "================================"
echo "$(date): Starting verification..."
echo ""

# 1. Health check
echo "1. Testing health endpoint..."
HEALTH=$(curl -s "https://nuru.network/api/sippar/health")
if [ $? -eq 0 ]; then
    echo "✅ Health endpoint accessible"
    echo "   Service: $(echo $HEALTH | jq -r '.service')"
    echo "   Deployment: $(echo $HEALTH | jq -r '.deployment')"
    echo "   Canister: $(echo $HEALTH | jq -r '.canister_info.canister_id')"
else
    echo "❌ Health endpoint failed"
    exit 1
fi
echo ""

# 2. Available endpoints
echo "2. Getting available endpoints..."
ENDPOINTS=$(curl -s "https://nuru.network/api/sippar/invalid" | jq -r '.available_endpoints[]')
if [ $? -eq 0 ]; then
    echo "✅ Available endpoints discovered:"
    echo "$ENDPOINTS" | while read endpoint; do
        echo "   - $endpoint"
    done
else
    echo "❌ Could not get endpoints list"
fi
echo ""

# 3. Chain fusion test (0.001 ALGO)
echo "3. Testing chain fusion with 0.001 ALGO..."
CHAIN_FUSION=$(curl -s -X POST "https://nuru.network/api/sippar/chain-fusion/transfer-algo" \
  -H "Content-Type: application/json" \
  -d '{"principal":"vj7ly-diaaa-aaaae-abvoq-cai","toAddress":"GD64YIY3TWGDMCNPP553DZPPR6LDUSFQOIJVFDPPXWEG3FVOJCCDBBHU5A","amount":0.001,"note":"production verification"}')

if [ $? -eq 0 ]; then
    SUCCESS=$(echo $CHAIN_FUSION | jq -r '.success')
    if [ "$SUCCESS" = "true" ]; then
        echo "✅ Chain fusion successful"
        echo "   TX ID: $(echo $CHAIN_FUSION | jq -r '.algorand_tx_id')"
        echo "   Round: $(echo $CHAIN_FUSION | jq -r '.confirmed_round')"
        echo "   Balance Change: $(echo $CHAIN_FUSION | jq -r '.algo_moved') ALGO"
    else
        echo "❌ Chain fusion failed"
        echo "   Error: $(echo $CHAIN_FUSION | jq -r '.error')"
    fi
else
    echo "❌ Chain fusion request failed"
fi
echo ""

# 4. Balance verification
echo "4. Verifying custody address balance..."
CUSTODY_ADDRESS="AC4ZYO4CYWNEWATOZETFXJHDE3GRM7CSPDSZHZADZU7HGJKPKV7JBQLHDM"
BALANCE=$(curl -s "https://testnet-api.algonode.cloud/v2/accounts/$CUSTODY_ADDRESS" | jq -r '.amount')
if [ $? -eq 0 ] && [ "$BALANCE" != "null" ]; then
    ALGO_BALANCE=$(echo "scale=6; $BALANCE / 1000000" | bc)
    echo "✅ Custody balance verified: $ALGO_BALANCE ALGO"
else
    echo "❌ Could not verify custody balance"
fi
echo ""

echo "🎯 Production verification complete"
echo "$(date): Verification finished"