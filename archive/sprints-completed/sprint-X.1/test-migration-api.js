/**
 * Test Migration API Endpoints
 * Tests the newly implemented migration system from Sprint X.1 Phase 1.1
 */

async function testMigrationAPI() {
  console.log('🧪 TESTING SPRINT X.1 MIGRATION API');
  console.log('=' .repeat(70));
  console.log('Testing migration endpoints and deposit monitoring fixes');
  console.log('');

  const baseUrl = 'https://nuru.network/api/sippar';
  const testPrincipal = '2vxsx-fae'; // Test principal

  const tests = [];

  // Test 1: Migration Status Endpoint
  tests.push({
    name: 'Migration Status - User Migration Check',
    test: async () => {
      console.log('📊 Testing migration status endpoint...');

      const migrationStatusResponse = await fetch(`${baseUrl}/migration/status/${testPrincipal}`);
      let migrationData = {};

      if (migrationStatusResponse.ok) {
        try {
          migrationData = await migrationStatusResponse.json();
        } catch (e) {
          migrationData = { error: 'Could not parse migration data' };
        }
      }

      console.log('   MIGRATION STATUS:');
      console.log(`     Status Endpoint: ${migrationStatusResponse.status}`);
      console.log(`     Service Response: ${migrationStatusResponse.ok ? 'Available' : 'Error'}`);

      if (migrationData.success) {
        console.log(`     Migration Options Available: ${Object.keys(migrationData.data.migrationOptions || {}).length}`);
        console.log(`     Recommended Path: ${migrationData.data.recommendedPath || 'Unknown'}`);
      }

      const statusWorking = migrationStatusResponse.status === 200;
      console.log(`   ✅ TEST RESULT: Migration status endpoint: ${statusWorking ? 'WORKING' : 'FAILED'}`);
      return statusWorking;
    }
  });

  // Test 2: Migration Statistics
  tests.push({
    name: 'Migration Statistics - Admin Dashboard Data',
    test: async () => {
      console.log('📈 Testing migration statistics endpoint...');

      const statsResponse = await fetch(`${baseUrl}/migration/stats`);
      let statsData = {};

      if (statsResponse.ok) {
        try {
          statsData = await statsResponse.json();
        } catch (e) {
          statsData = { error: 'Could not parse stats data' };
        }
      }

      console.log('   MIGRATION STATISTICS:');
      console.log(`     Stats Endpoint: ${statsResponse.status}`);
      console.log(`     Service Response: ${statsResponse.ok ? 'Available' : 'Error'}`);

      if (statsData.success) {
        const data = statsData.data || {};
        console.log(`     Total Users: ${data.totalUsers || 0}`);
        console.log(`     Reserve Ratio: ${data.migrationHealth?.reserveRatio || 'Unknown'}`);
      }

      const statsWorking = statsResponse.status === 200;
      console.log(`   ✅ TEST RESULT: Migration statistics endpoint: ${statsWorking ? 'WORKING' : 'FAILED'}`);
      return statsWorking;
    }
  });

  // Test 3: Deposit Monitoring Endpoints (Sprint X.1 fix)
  tests.push({
    name: 'Deposit Monitoring - 404 Fix Verification',
    test: async () => {
      console.log('🔍 Testing deposit monitoring endpoints (Sprint X.1 fix)...');

      // Test monitoring stats endpoint
      const monitoringResponse = await fetch(`${baseUrl}/deposits/monitoring-stats`);
      let monitoringData = {};

      if (monitoringResponse.ok) {
        try {
          monitoringData = await monitoringResponse.json();
        } catch (e) {
          monitoringData = { error: 'Could not parse monitoring data' };
        }
      }

      // Test start monitoring endpoint
      const startResponse = await fetch(`${baseUrl}/deposits/start-monitoring`, { method: 'POST' });
      let startData = {};

      if (startResponse.ok) {
        try {
          startData = await startResponse.json();
        } catch (e) {
          startData = { error: 'Could not parse start data' };
        }
      }

      console.log('   DEPOSIT MONITORING:');
      console.log(`     Monitoring Stats: ${monitoringResponse.status}`);
      console.log(`     Start Monitoring: ${startResponse.status}`);
      console.log(`     Stats Available: ${monitoringResponse.ok ? 'YES' : 'NO'}`);
      console.log(`     Start Available: ${startResponse.ok ? 'YES' : 'NO'}`);

      const monitoringFixed = monitoringResponse.status !== 404 && startResponse.status !== 404;
      console.log(`   ✅ TEST RESULT: Deposit monitoring 404 fix: ${monitoringFixed ? 'SUCCESSFUL' : 'STILL BROKEN'}`);
      return monitoringFixed;
    }
  });

  // Test 4: Fresh Start Migration
  tests.push({
    name: 'Fresh Start Migration - User Flow',
    test: async () => {
      console.log('🆕 Testing fresh start migration endpoint...');

      const freshStartResponse = await fetch(`${baseUrl}/migration/fresh-start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          principal: testPrincipal
        })
      });

      let migrationResult = {};

      if (freshStartResponse.ok) {
        try {
          migrationResult = await freshStartResponse.json();
        } catch (e) {
          migrationResult = { error: 'Could not parse migration result' };
        }
      }

      console.log('   FRESH START MIGRATION:');
      console.log(`     Migration Endpoint: ${freshStartResponse.status}`);
      console.log(`     Service Response: ${freshStartResponse.ok ? 'Available' : 'Error'}`);

      if (migrationResult.success) {
        const data = migrationResult.data || {};
        console.log(`     Migration ID: ${data.migrationId ? 'Generated' : 'Missing'}`);
        console.log(`     Steps Count: ${data.steps?.length || 0}`);
        console.log(`     Status: ${data.status || 'Unknown'}`);
      }

      const migrationWorking = freshStartResponse.status === 200;
      console.log(`   ✅ TEST RESULT: Fresh start migration: ${migrationWorking ? 'WORKING' : 'FAILED'}`);
      return migrationWorking;
    }
  });

  // Test 5: System Integration Status
  tests.push({
    name: 'System Integration - Overall Status',
    test: async () => {
      console.log('📊 Testing overall system integration...');

      // Test health endpoint to see if new endpoints are listed
      const healthResponse = await fetch(`${baseUrl}/health`);
      let healthData = {};

      if (healthResponse.ok) {
        try {
          healthData = await healthResponse.json();
        } catch (e) {
          healthData = { error: 'Could not parse health data' };
        }
      }

      console.log('   SYSTEM INTEGRATION:');
      console.log(`     Health Status: ${healthResponse.status}`);
      console.log(`     Service: ${healthData.service || 'Unknown'}`);

      // Check if new endpoints are listed
      const endpoints = healthData.available_endpoints || [];
      const migrationEndpoints = endpoints.filter(ep => ep.includes('migration')).length;
      const depositEndpoints = endpoints.filter(ep => ep.includes('deposits')).length;

      console.log(`     Migration Endpoints: ${migrationEndpoints}`);
      console.log(`     Deposit Endpoints: ${depositEndpoints}`);
      console.log(`     Total Endpoints: ${endpoints.length}`);

      const integrationGood = healthResponse.ok && (migrationEndpoints > 0 || depositEndpoints > 0);
      console.log(`   ✅ TEST RESULT: System integration: ${integrationGood ? 'ENHANCED' : 'BASELINE'}`);
      return integrationGood;
    }
  });

  // Run all tests
  console.log('🚀 Running Sprint X.1 Migration API Tests...\n');

  let passedTests = 0;
  let totalTests = tests.length;

  for (const testCase of tests) {
    console.log(`🧪 TEST: ${testCase.name}`);
    console.log('-'.repeat(70));

    try {
      const result = await testCase.test();
      if (result) {
        passedTests++;
        console.log(`✅ PASSED: ${testCase.name}\n`);
      } else {
        console.log(`❌ FAILED: ${testCase.name}\n`);
      }
    } catch (error) {
      console.log(`💥 ERROR: ${testCase.name} - ${error.message}\n`);
    }
  }

  // Final results
  console.log('='.repeat(70));
  console.log(`📊 SPRINT X.1 MIGRATION API RESULTS: ${passedTests} passed, ${totalTests - passedTests} failed`);
  console.log(`🎯 Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
  console.log('');

  if (passedTests === totalTests) {
    console.log('🎉 SPRINT X.1 MIGRATION API: All tests passed!');
    console.log('✅ Migration system fully operational');
    console.log('✅ Deposit monitoring 404 issues resolved');
  } else if (passedTests > totalTests / 2) {
    console.log('⚠️ SPRINT X.1 MIGRATION API: Partial success');
    console.log(`✅ ${passedTests} tests working correctly`);
    console.log(`🔧 ${totalTests - passedTests} tests need attention`);
  } else {
    console.log('❌ SPRINT X.1 MIGRATION API: Major issues detected');
    console.log(`❌ ${totalTests - passedTests} tests failing`);
    console.log('🔧 Review deployment and endpoint configuration');
  }

  console.log('\n🏁 Sprint X.1 migration API test completed');
}

// Run the test
testMigrationAPI().catch(console.error);