#!/bin/bash
# Claude Code Hook: Sprint Protection
# Purpose: Prevent hallucinations and ensure proper verification before sprint completion claims
# Triggered: When certain keywords are detected in responses

set -e

HOOK_NAME="Sprint Protection"
PROJECT_ROOT="/Users/eladm/Projects/Nuru-AI/Sippar"

echo "🛡️ [$HOOK_NAME] Validation triggered"

# Keywords that trigger verification requirements
VERIFICATION_KEYWORDS=("COMPLETED" "VERIFIED" "BREAKTHROUGH" "WORKING" "DEPLOYED" "TRANSACTION" "ENDPOINT")

# Check if any verification keywords are present in the response
NEEDS_VERIFICATION=false
for keyword in "${VERIFICATION_KEYWORDS[@]}"; do
    if echo "$CLAUDE_RESPONSE" | grep -qi "$keyword"; then
        NEEDS_VERIFICATION=true
        echo "🚨 Detected claim keyword: $keyword"
        break
    fi
done

if [ "$NEEDS_VERIFICATION" = true ]; then
    echo ""
    echo "⚠️  VERIFICATION REQUIRED"
    echo "=================================="
    echo "Claude is making completion/success claims that require verification."
    echo ""
    echo "Before accepting these claims, please run:"
    echo "  ./tools/verify-production.sh"
    echo ""
    echo "Required verifications:"
    echo "  ✅ Health endpoint returns Phase 3 status"
    echo "  ✅ Chain fusion endpoint executes real transactions"
    echo "  ✅ Algorand balance changes confirm real network interaction"
    echo "  ✅ All claimed endpoints return HTTP 200 (not 404)"
    echo ""
    echo "Only accept completion claims AFTER successful verification!"
    echo "=================================="
    echo ""
fi

# Additional protection for endpoint documentation updates
if echo "$CLAUDE_RESPONSE" | grep -qi "docs/api/endpoints.md"; then
    echo "📋 ENDPOINT DOCUMENTATION UPDATE DETECTED"
    echo "  → Ensure all documented endpoints are tested with production URLs"
    echo "  → Use REAL response examples, not hypothetical ones"
    echo "  → Mark endpoints as 'VERIFIED WORKING' only after HTTP 200 responses"
    echo ""
fi

# Protection against transaction ID claims
if echo "$CLAUDE_RESPONSE" | grep -qiE "[A-Z0-9]{52}"; then
    echo "🔍 TRANSACTION ID DETECTED"
    echo "  → Verify transaction exists on Algorand network:"
    echo "  → curl -s 'https://testnet-api.algonode.cloud/v2/transactions/TX_ID_HERE'"
    echo "  → Only accept if returns transaction data (not 'Not Found')"
    echo ""
fi

echo "✅ [$HOOK_NAME] Validation complete"