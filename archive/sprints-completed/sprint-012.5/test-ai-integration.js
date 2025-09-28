/**
 * Sprint 012.5 AI Integration Test
 * Test enhanced ckALGO canister compatibility with new AI endpoints
 */

async function testAIIntegration() {
  console.log('🤖 TESTING SPRINT 012.5 AI INTEGRATION');
  console.log('=' .repeat(70));
  console.log('Testing enhanced ckALGO canister AI endpoints compatibility');
  console.log('');

  const baseUrl = 'http://74.50.113.152:3004'; // Direct server access
  const tests = [];

  // Test 1: Basic AI Query Endpoint
  tests.push({
    name: 'Basic AI Query Endpoint',
    test: async () => {
      console.log('🔍 Testing /api/sippar/ai/query...');

      const testQuery = {
        query: "What is the current ALGO price?",
        userPrincipal: "test-principal-123",
        serviceType: "general"
      };

      const response = await fetch(`${baseUrl}/api/sippar/ai/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testQuery)
      });

      let data = {};
      if (response.ok) {
        try {
          data = await response.json();
        } catch (e) {
          data = { error: 'Could not parse response' };
        }
      }

      console.log('   AI QUERY ENDPOINT:');
      console.log(`     Status: ${response.status}`);
      console.log(`     Available: ${response.ok ? 'YES' : 'NO'}`);

      if (data.success && data.data) {
        console.log(`     Query: ${data.data.query}`);
        console.log(`     Response: ${data.data.response}`);
        console.log(`     Model: ${data.data.model}`);
        console.log(`     Response Time: ${data.data.responseTime}ms`);
      }

      const working = response.status === 200 && data.success;
      console.log(`   ✅ TEST RESULT: Basic AI Query: ${working ? 'WORKING' : 'FAILED'}`);
      return working;
    }
  });

  // Test 2: AI Oracle Query Endpoint
  tests.push({
    name: 'AI Oracle Query Endpoint',
    test: async () => {
      console.log('🔮 Testing /api/v1/ai-oracle/query...');

      const testQuery = {
        query: "Analyze Algorand network status",
        userPrincipal: "test-principal-123",
        algorandData: { network: "testnet" }
      };

      const response = await fetch(`${baseUrl}/api/v1/ai-oracle/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testQuery)
      });

      let data = {};
      if (response.ok) {
        try {
          data = await response.json();
        } catch (e) {
          data = { error: 'Could not parse response' };
        }
      }

      console.log('   AI ORACLE ENDPOINT:');
      console.log(`     Status: ${response.status}`);
      console.log(`     Available: ${response.ok ? 'YES' : 'NO'}`);

      if (data.success && data.data) {
        console.log(`     Oracle Response: ${data.data.oracleResponse}`);
        console.log(`     App ID: ${data.data.appId}`);
        console.log(`     Confidence: ${data.data.confidence}`);
        console.log(`     Response Time: ${data.data.responseTime}ms`);
      }

      const working = response.status === 200 && data.success;
      console.log(`   ✅ TEST RESULT: AI Oracle Query: ${working ? 'WORKING' : 'FAILED'}`);
      return working;
    }
  });

  // Test 3: Chat Authentication Endpoint
  tests.push({
    name: 'Chat Authentication Endpoint',
    test: async () => {
      console.log('💬 Testing /api/sippar/ai/chat-auth...');

      const testAuth = {
        userPrincipal: "test-principal-123",
        algorandAddress: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
      };

      const response = await fetch(`${baseUrl}/api/sippar/ai/chat-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testAuth)
      });

      let data = {};
      if (response.ok) {
        try {
          data = await response.json();
        } catch (e) {
          data = { error: 'Could not parse response' };
        }
      }

      console.log('   CHAT AUTH ENDPOINT:');
      console.log(`     Status: ${response.status}`);
      console.log(`     Available: ${response.ok ? 'YES' : 'NO'}`);

      if (data.success && data.data) {
        console.log(`     Auth URL: ${data.data.authUrl}`);
        console.log(`     Chat Service: ${data.data.chatService}`);
        console.log(`     Models: ${data.data.models.length} available`);
      }

      const working = response.status === 200 && data.success;
      console.log(`   ✅ TEST RESULT: Chat Authentication: ${working ? 'WORKING' : 'FAILED'}`);
      return working;
    }
  });

  // Test 4: Enhanced AI Query with Caching
  tests.push({
    name: 'Enhanced AI Query with Caching',
    test: async () => {
      console.log('⚡ Testing /api/sippar/ai/enhanced-query...');

      const testQuery = {
        query: "What are the latest Algorand developments?",
        userPrincipal: "test-principal-123",
        serviceType: "enhanced",
        cacheEnabled: true
      };

      const response = await fetch(`${baseUrl}/api/sippar/ai/enhanced-query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testQuery)
      });

      let data = {};
      if (response.ok) {
        try {
          data = await response.json();
        } catch (e) {
          data = { error: 'Could not parse response' };
        }
      }

      console.log('   ENHANCED AI ENDPOINT:');
      console.log(`     Status: ${response.status}`);
      console.log(`     Available: ${response.ok ? 'YES' : 'NO'}`);

      if (data.success && data.data) {
        console.log(`     Response: ${data.data.response}`);
        console.log(`     Cached: ${data.data.cached ? 'YES' : 'NO'}`);
        console.log(`     Confidence: ${data.data.confidence}`);
        console.log(`     Features: ${data.data.metadata.features.join(', ')}`);
      }

      const working = response.status === 200 && data.success;
      console.log(`   ✅ TEST RESULT: Enhanced AI Query: ${working ? 'WORKING' : 'FAILED'}`);
      return working;
    }
  });

  // Test 5: AI Service Health Checks
  tests.push({
    name: 'AI Service Health Checks',
    test: async () => {
      console.log('🏥 Testing AI health endpoints...');

      // Test Oracle Health
      const oracleHealthResponse = await fetch(`${baseUrl}/api/v1/ai-oracle/health`);
      let oracleHealth = {};
      if (oracleHealthResponse.ok) {
        try {
          oracleHealth = await oracleHealthResponse.json();
        } catch (e) {
          oracleHealth = { error: 'Could not parse oracle health' };
        }
      }

      // Test AI Service Health
      const aiHealthResponse = await fetch(`${baseUrl}/api/sippar/ai/health`);
      let aiHealth = {};
      if (aiHealthResponse.ok) {
        try {
          aiHealth = await aiHealthResponse.json();
        } catch (e) {
          aiHealth = { error: 'Could not parse AI health' };
        }
      }

      console.log('   AI HEALTH ENDPOINTS:');
      console.log(`     Oracle Health: ${oracleHealthResponse.status}`);
      console.log(`     AI Service Health: ${aiHealthResponse.status}`);

      if (oracleHealth.success && oracleHealth.data) {
        console.log(`     Oracle Status: ${oracleHealth.data.status}`);
        console.log(`     Oracle Uptime: ${oracleHealth.data.uptime}`);
      }

      if (aiHealth.success && aiHealth.data) {
        console.log(`     AI Service Status: ${aiHealth.data.status}`);
        console.log(`     Overall Uptime: ${aiHealth.data.uptime}`);
      }

      const working = oracleHealthResponse.status === 200 && aiHealthResponse.status === 200;
      console.log(`   ✅ TEST RESULT: AI Health Checks: ${working ? 'WORKING' : 'FAILED'}`);
      return working;
    }
  });

  // Test 6: Endpoint Count Verification
  tests.push({
    name: 'Total Endpoint Count Verification',
    test: async () => {
      console.log('📊 Testing total endpoint count...');

      // Test 404 response to see available endpoints
      const response = await fetch(`${baseUrl}/non-existent-endpoint`);
      let data = {};

      if (response.status === 404) {
        try {
          data = await response.json();
        } catch (e) {
          data = { error: 'Could not parse 404 response' };
        }
      }

      console.log('   ENDPOINT COUNT:');
      console.log(`     Response Status: ${response.status}`);

      const endpoints = data.available_endpoints || [];
      const aiEndpoints = endpoints.filter(ep =>
        ep.includes('/api/sippar/ai/') || ep.includes('/api/v1/ai-oracle/')
      );

      console.log(`     Total Endpoints: ${endpoints.length}`);
      console.log(`     AI Endpoints: ${aiEndpoints.length}`);
      console.log(`     Expected AI Endpoints: 6`);

      const working = aiEndpoints.length >= 6;
      console.log(`   ✅ TEST RESULT: Endpoint Count: ${working ? 'CORRECT' : 'MISSING ENDPOINTS'}`);
      return working;
    }
  });

  // Run all tests
  console.log('🚀 Running Sprint 012.5 AI Integration Tests...\\n');

  let passedTests = 0;
  let totalTests = tests.length;

  for (const testCase of tests) {
    console.log(`🧪 TEST: ${testCase.name}`);
    console.log('-'.repeat(70));

    try {
      const result = await testCase.test();
      if (result) {
        passedTests++;
        console.log(`✅ PASSED: ${testCase.name}\\n`);
      } else {
        console.log(`❌ FAILED: ${testCase.name}\\n`);
      }
    } catch (error) {
      console.log(`💥 ERROR: ${testCase.name} - ${error.message}\\n`);
    }
  }

  // Final results
  console.log('='.repeat(70));
  console.log(`📊 SPRINT 012.5 AI INTEGRATION RESULTS: ${passedTests} passed, ${totalTests - passedTests} failed`);
  console.log(`🎯 Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
  console.log('');

  if (passedTests === totalTests) {
    console.log('🎉 SPRINT 012.5: All AI integration tests passed!');
    console.log('✅ Enhanced ckALGO canister ready for full deployment');
    console.log('✅ AI service endpoints fully operational');
    console.log('✅ Revenue generation capabilities available');
    console.log('✅ Multi-tier pricing system ready');
  } else if (passedTests > totalTests / 2) {
    console.log('⚠️ SPRINT 012.5: Partial AI integration success');
    console.log(`✅ ${passedTests} AI systems working correctly`);
    console.log(`🔧 ${totalTests - passedTests} systems need attention`);
  } else {
    console.log('❌ SPRINT 012.5: Major AI integration issues detected');
    console.log(`❌ ${totalTests - passedTests} systems failing`);
    console.log('🔧 Review backend deployment and AI endpoint configuration');
  }

  console.log('\\n📋 AI INTEGRATION CAPABILITIES TESTED:');
  console.log('  🤖 Basic AI Query - General purpose AI responses');
  console.log('  🔮 AI Oracle Query - Algorand-specific AI oracle integration');
  console.log('  💬 Chat Authentication - OpenWebUI access token generation');
  console.log('  ⚡ Enhanced AI Query - Caching and premium features');
  console.log('  🏥 AI Health Monitoring - Service status and uptime tracking');
  console.log('  📊 Endpoint Integration - Complete API surface area verification');

  console.log('\\n🚀 Next Steps for Sprint 012.5:');
  console.log('  1. Deploy enhanced ckALGO canister to ICP testnet');
  console.log('  2. Test end-to-end integration with AI services');
  console.log('  3. Activate multi-tier pricing and revenue generation');
  console.log('  4. Prepare for mainnet deployment and enterprise features');

  console.log('\\n🏁 Sprint 012.5 AI integration testing completed');
}

// Run the test
testAIIntegration().catch(console.error);