#!/bin/bash
# Sippar ICP Cycle Management Setup Script
set -e

echo "🔄 Sippar ICP Cycle Management Setup"
echo "===================================="

# Configuration
THRESHOLD_SIGNER_CANISTER="vj7ly-diaaa-aaaae-abvoq-cai"
CKALGO_CANISTER="gbmxj-yiaaa-aaaak-qulqa-cai"
DFX_NETWORK="ic"

echo ""
echo "📊 Current System Status:"
echo "------------------------"

# Check current identity
echo "🔑 Current Identity:"
dfx identity --network $DFX_NETWORK get-principal

# Check ICP balance
echo "💰 ICP Balance:"
dfx ledger --network $DFX_NETWORK balance

echo ""
echo "🧪 Testing Canister Health:"
echo "----------------------------"

# Test threshold signer canister
echo "Testing Threshold Signer Canister ($THRESHOLD_SIGNER_CANISTER):"
TEST_RESULT=$(curl -s "https://nuru.network/api/sippar/api/v1/threshold/derive-address" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"principal": "test-principal"}' | jq -r '.error // "SUCCESS"')

if [[ "$TEST_RESULT" == "SUCCESS" ]]; then
  echo "✅ Threshold Signer: HEALTHY"
elif [[ "$TEST_RESULT" == *"Code: 2"* ]]; then
  echo "❌ Threshold Signer: OUT OF CYCLES"
else
  echo "⚠️ Threshold Signer: ERROR - $TEST_RESULT"
fi

echo ""
echo "🎯 CycleOps Automatic Setup Instructions:"
echo "==========================================="

cat << 'EOF'

📋 STEP 1: Create CycleOps Account
- Visit: https://cycleops.dev
- Click "Login with Internet Identity"  
- Use your current identity: 2vxsx-fae

📋 STEP 2: Add Canister Monitoring

For Threshold Signer Canister:
- Canister ID: vj7ly-diaaa-aaaae-abvoq-cai
- Display Name: "Sippar Threshold Signer"
- Monitoring Type: "Blackhole Monitoring" (private metrics)
- Cycles Threshold: 50 (trillion)
- Top-up Amount: 100 (trillion)

For ckALGO Token Canister:
- Canister ID: gbmxj-yiaaa-aaaak-qulqa-cai  
- Display Name: "Sippar ckALGO Token"
- Monitoring Type: "Blackhole Monitoring"
- Cycles Threshold: 20 (trillion)
- Top-up Amount: 50 (trillion)

📋 STEP 3: Fund Your Account
- Minimum: 0.1 ICP
- Recommended: 0.5 ICP (provides ~1,500T cycles)
- Click "Deposit" and transfer ICP to provided address

📋 STEP 4: Configure Notifications
- Add your email address
- Enable "Top-up Success" notifications
- Enable "Top-up Failure" notifications  
- Verify email through confirmation link

EOF

echo ""
echo "💡 Manual Top-up Commands (if needed now):"
echo "==========================================="

cat << 'EOF'

If you need immediate manual top-up:

# Top-up Threshold Signer (most critical)
dfx ledger --network ic top-up vj7ly-diaaa-aaaae-abvoq-cai --amount 0.1

# Top-up ckALGO Token (less urgent)  
dfx ledger --network ic top-up gbmxj-yiaaa-aaaak-qulqa-cai --amount 0.05

# Check results
curl "https://nuru.network/api/sippar/api/v1/threshold/derive-address" \
  -X POST -H "Content-Type: application/json" \
  -d '{"principal": "test-principal"}'

EOF

echo ""
echo "📈 Expected Results After Setup:"
echo "=================================="

cat << 'EOF'

✅ Automated monitoring every 6 hours
✅ Automatic top-ups when cycles < threshold  
✅ Email notifications for all operations
✅ No more "Phase 1 Mode" wallet derivation failures
✅ Consistent service availability
✅ Monthly cost: $10-50 depending on usage

EOF

echo ""
echo "🔍 Verification Commands:"
echo "========================="

cat << 'EOF'

# Check if setup worked (run after CycleOps is active):
curl "https://nuru.network/api/sippar/api/v1/threshold/derive-address" \
  -X POST -H "Content-Type: application/json" \
  -d '{"principal": "7renf-5svak-mtapl-juxhw-3hv7d-zzfzs-hjlxv-p7wsv-e2zje-kkswt-aae"}'

# Should return address instead of cycle error

EOF

echo "✅ Setup script complete!"
echo ""
echo "Next: Follow the manual steps above to complete CycleOps setup"
echo "Documentation: /Users/eladm/Projects/Nuru-AI/Sippar/docs/operations/CYCLE_MANAGEMENT_STRATEGY.md"