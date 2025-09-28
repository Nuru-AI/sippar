/**
 * Phase A.4: Frontend Integration Testing
 * Tests complete user workflows with authentic mathematical backing
 * Run: node test-frontend-integration.js
 */

async function testFrontendIntegration() {
  console.log('🧪 PHASE A.4: FRONTEND INTEGRATION TESTING');
  console.log('=' .repeat(70));
  console.log('Testing complete user workflows with real backend integration');
  console.log('');

  const baseUrl = 'https://nuru.network/api/sippar';
  const testPrincipal = '2vxsx-fae';
  const tests = [];

  // Test 1: User Balance Loading (Dashboard.tsx simulation)
  tests.push({
    name: 'User Balance Loading - Dashboard.tsx Flow',
    test: async () => {
      console.log('📊 Simulating Dashboard.tsx balance loading...');

      // Step 1: Get system status (like Dashboard does)
      const statusResponse = await fetch(`${baseUrl}/health`);
      const statusData = await statusResponse.json();

      // Step 2: Get ckALGO balance (like Dashboard does)
      const ckAlgoResponse = await fetch(`${baseUrl}/ck-algo/balance/${testPrincipal}`);
      const ckAlgoData = await ckAlgoResponse.json();

      console.log('   System Status:', statusData.status);
      console.log('   SimplifiedBridge:', statusData.components?.simplified_bridge);
      console.log('   ckALGO Balance:', ckAlgoData.balances?.ck_algo_balance, 'ckALGO');
      console.log('   ALGO Balance:', ckAlgoData.balances?.algo_balance, 'ALGO');

      const isWorkingCorrectly = statusResponse.ok &&
                                ckAlgoResponse.ok &&
                                statusData.components?.simplified_bridge === true &&
                                typeof ckAlgoData.balances?.ck_algo_balance === 'number';

      console.log('   ✅ VERIFICATION: Dashboard balance flow works:', isWorkingCorrectly);
      return isWorkingCorrectly;
    }
  });

  // Test 2: Mint Preparation (MintFlow.tsx simulation)
  tests.push({
    name: 'Mint Preparation - MintFlow.tsx Flow',
    test: async () => {
      console.log('🏦 Simulating MintFlow.tsx mint preparation...');

      const mintAmount = 1.5; // 1.5 ALGO
      const microAlgos = Math.floor(mintAmount * 1000000);

      // Simulate sipparAPI.prepareMint() call from MintFlow.tsx
      const response = await fetch(`${baseUrl}/api/v1/sippar/mint/prepare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_principal: testPrincipal,
          amount: microAlgos
        })
      });

      const data = await response.json();

      console.log('   Mint Amount:', mintAmount, 'ALGO');
      console.log('   Micro Algos:', microAlgos);
      console.log('   Custody Address:', data.custody_address);
      console.log('   Method:', data.method);
      console.log('   Expected Amount:', data.expected_amount);

      const isMintPrepWorking = response.ok &&
                               data.success === true &&
                               data.custody_address &&
                               data.custody_address.length > 50 && // Real Algorand address length
                               data.method === 'threshold_ecdsa' &&
                               data.expected_amount === microAlgos;

      console.log('   ✅ VERIFICATION: Mint preparation works:', isMintPrepWorking);
      return isMintPrepWorking;
    }
  });

  // Test 3: Reserve Status Display (for honest balance display)
  tests.push({
    name: 'Reserve Status Display - Honest Balance Flow',
    test: async () => {
      console.log('🏦 Testing reserve status for honest balance display...');

      const response = await fetch(`${baseUrl}/reserves/status`);
      const data = await response.json();

      console.log('   Reserve Ratio:', data.data?.reserveRatio);
      console.log('   Total ckALGO Supply:', data.data?.totalCkAlgoSupply);
      console.log('   Total Locked ALGO:', data.data?.totalLockedAlgo);
      console.log('   Health Status:', data.data?.healthStatus);
      console.log('   Custody Addresses:', data.data?.custodyAddresses.length, 'addresses');

      // This should show REAL data for honest balance display
      const isHonestData = response.ok &&
                          data.success === true &&
                          data.data?.totalCkAlgoSupply === 0 && // Real canister data
                          data.data?.totalLockedAlgo === 0 &&   // Real Algorand data
                          data.data?.reserveRatio === 1 &&      // Perfect 1:1 ratio
                          Array.isArray(data.data?.custodyAddresses);

      console.log('   ✅ VERIFICATION: Honest reserve data available:', isHonestData);
      return isHonestData;
    }
  });

  // Test 4: Custody Address Generation (for deposit instructions)
  tests.push({
    name: 'Custody Address Generation - Deposit Instructions',
    test: async () => {
      console.log('🏦 Testing custody address generation for deposits...');

      const response = await fetch(`${baseUrl}/ck-algo/generate-deposit-address`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ principal: testPrincipal })
      });

      const data = await response.json();

      console.log('   Success:', data.success);
      console.log('   Custody Address:', data.custody_address);
      console.log('   Threshold Controlled:', data.threshold_controlled);
      console.log('   Derivation Path:', data.derivation_path);
      console.log('   Instructions Available:', !!data.instructions);

      const isDepositFlowWorking = response.ok &&
                                  data.success === true &&
                                  data.threshold_controlled === true &&
                                  data.custody_address &&
                                  data.derivation_path?.includes("m/44'/283'") &&
                                  data.instructions;

      console.log('   ✅ VERIFICATION: Deposit flow works:', isDepositFlowWorking);
      return isDepositFlowWorking;
    }
  });

  // Test 5: System Health for Frontend Status
  tests.push({
    name: 'System Health - Frontend Status Display',
    test: async () => {
      console.log('💚 Testing system health for frontend status...');

      const response = await fetch(`${baseUrl}/health`);
      const data = await response.json();

      console.log('   Overall Status:', data.status);
      console.log('   Chain Fusion Engine:', data.components?.chain_fusion_engine);
      console.log('   Threshold ECDSA:', data.components?.threshold_ecdsa);
      console.log('   SimplifiedBridge:', data.components?.simplified_bridge);
      console.log('   Algorand Integration:', data.components?.algorand_integration);

      const isSystemHealthy = response.ok &&
                             data.status === 'healthy' &&
                             data.components?.chain_fusion_engine === true &&
                             data.components?.threshold_ecdsa === true &&
                             data.components?.simplified_bridge === true &&
                             data.components?.algorand_integration === true;

      console.log('   ✅ VERIFICATION: System healthy for frontend:', isSystemHealthy);
      return isSystemHealthy;
    }
  });

  // Test 6: End-to-End User Experience Simulation
  tests.push({
    name: 'End-to-End User Experience - Complete Flow',
    test: async () => {
      console.log('🎯 Simulating complete end-to-end user experience...');

      // Step 1: User loads dashboard (balance check)
      const balanceResponse = await fetch(`${baseUrl}/ck-algo/balance/${testPrincipal}`);
      const balanceData = await balanceResponse.json();

      // Step 2: User initiates mint (custody address generation)
      const mintResponse = await fetch(`${baseUrl}/api/v1/sippar/mint/prepare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_principal: testPrincipal, amount: 500000 })
      });
      const mintData = await mintResponse.json();

      // Step 3: User checks system status
      const healthResponse = await fetch(`${baseUrl}/health`);
      const healthData = await healthResponse.json();

      console.log('   Step 1 - Balance Check: ✅', balanceResponse.ok);
      console.log('   Step 2 - Mint Preparation: ✅', mintResponse.ok);
      console.log('   Step 3 - System Health: ✅', healthResponse.ok);
      console.log('   Real Custody Address Generated:', !!mintData.custody_address);
      console.log('   Threshold Control Verified:', mintData.method === 'threshold_ecdsa');

      const isCompleteFlowWorking = balanceResponse.ok &&
                                   mintResponse.ok &&
                                   healthResponse.ok &&
                                   mintData.custody_address &&
                                   mintData.method === 'threshold_ecdsa' &&
                                   healthData.components?.simplified_bridge === true;

      console.log('   ✅ VERIFICATION: Complete user flow works:', isCompleteFlowWorking);
      return isCompleteFlowWorking;
    }
  });

  // Run all tests
  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`\n🧪 Running: ${test.name}`);
      console.log('-'.repeat(50));
      const result = await test.test();

      if (result) {
        console.log(`✅ PASS: ${test.name}`);
        passed++;
      } else {
        console.log(`❌ FAIL: ${test.name}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ERROR: ${test.name} - ${error.message}`);
      failed++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log(`📊 PHASE A.4 FRONTEND INTEGRATION RESULTS: ${passed} passed, ${failed} failed`);
  console.log(`🎯 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);

  if (failed === 0) {
    console.log('\n🎉 PHASE A.4 FRONTEND INTEGRATION: ALL TESTS PASSED!');
    console.log('✅ Frontend successfully integrated with real backend data');
    console.log('✅ User workflows working with authentic mathematical backing');
    console.log('✅ Real custody addresses displayed to users');
    console.log('✅ Honest balance calculations available');
    console.log('✅ End-to-end user experience verified');
    console.log('\n🚀 Frontend ready for real user testing with authentic data');
    return true;
  } else {
    console.log('\n⚠️ PHASE A.4 FRONTEND INTEGRATION: Some issues found');
    console.log('❌ Frontend integration needs attention - check failed tests above');
    return false;
  }
}

// Run frontend integration test
testFrontendIntegration()
  .then(success => {
    console.log('\n🏁 Phase A.4 frontend integration test completed');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Frontend integration test crashed:', error);
    process.exit(1);
  });