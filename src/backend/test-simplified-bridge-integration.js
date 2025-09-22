/**
 * Sprint X Phase A.1.5: Integration Test for SimplifiedBridgeService
 * Tests real connection to deployed simplified bridge canister
 * Run: node test-simplified-bridge-integration.js
 */

import { simplifiedBridgeService } from './dist/services/simplifiedBridgeService.js';

async function testSimplifiedBridgeIntegration() {
  console.log('🧪 Testing SimplifiedBridgeService Integration (Phase A.1.5)');
  console.log('=' .repeat(60));

  const tests = [
    {
      name: 'Health Check',
      test: async () => {
        const health = await simplifiedBridgeService.healthCheck();
        console.log('📊 Health Check Result:', health);
        return health.connected;
      }
    },
    {
      name: 'Token Name Query',
      test: async () => {
        const name = await simplifiedBridgeService.getTokenName();
        console.log('🏷️ Token Name:', name);
        return name === 'Chain-Key ALGO';
      }
    },
    {
      name: 'Token Symbol Query',
      test: async () => {
        const symbol = await simplifiedBridgeService.getTokenSymbol();
        console.log('🔤 Token Symbol:', symbol);
        return symbol === 'ckALGO';
      }
    },
    {
      name: 'Token Decimals Query',
      test: async () => {
        const decimals = await simplifiedBridgeService.getDecimals();
        console.log('🔢 Token Decimals:', decimals);
        return decimals === 6;
      }
    },
    {
      name: 'Total Supply Query',
      test: async () => {
        const totalSupply = await simplifiedBridgeService.getTotalSupply();
        console.log('💰 Total Supply (microalgos):', totalSupply.toString());
        console.log('💰 Total Supply (ALGO):', Number(totalSupply) / 1_000_000);
        return typeof totalSupply === 'bigint';
      }
    },
    {
      name: 'Reserve Status Query',
      test: async () => {
        const reserveStatus = await simplifiedBridgeService.getReserveStatus();
        console.log('🏦 Reserve Status:', {
          totalSupply: Number(reserveStatus.total_ck_algo_supply) / 1_000_000,
          lockedReserves: Number(reserveStatus.locked_algo_reserves) / 1_000_000,
          reserveRatio: reserveStatus.reserve_ratio,
          isHealthy: reserveStatus.is_healthy,
          lastVerification: new Date(Number(reserveStatus.last_verification))
        });
        return reserveStatus.reserve_ratio >= 0;
      }
    },
    {
      name: 'Canister Status Query',
      test: async () => {
        const status = await simplifiedBridgeService.getCanisterStatus();
        console.log('🔍 Canister Status:', status);
        return typeof status === 'string';
      }
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`\n🧪 Running test: ${test.name}`);
      const result = await test.test();

      if (result) {
        console.log(`✅ PASS: ${test.name}`);
        passed++;
      } else {
        console.log(`❌ FAIL: ${test.name} - Test returned false`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ERROR: ${test.name} - ${error.message}`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  console.log(`🎯 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);

  if (failed === 0) {
    console.log('🎉 All tests passed! SimplifiedBridgeService integration is working.');
    return true;
  } else {
    console.log('⚠️ Some tests failed. Check the output above for details.');
    return false;
  }
}

// Run the integration test
testSimplifiedBridgeIntegration()
  .then(success => {
    console.log('\n🏁 Integration test completed');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Integration test crashed:', error);
    process.exit(1);
  });