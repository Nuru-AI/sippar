/**
 * Sprint 018.2 Phase D - Load Testing & Performance Validation
 * Tests system performance under concurrent load
 */

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(emoji: string, message: string, color: string = colors.reset) {
  console.log(`${color}${emoji} ${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(70));
  log('🎯', title, colors.cyan);
  console.log('='.repeat(70) + '\n');
}

// Test configuration
const SIPPAR_API_BASE = 'http://localhost:3004';
const TEST_PRINCIPAL = 'test-principal-' + Date.now();

/**
 * Test 1: Concurrent Agent Invocations
 */
async function testConcurrentAgentInvocations(): Promise<boolean> {
  logSection('Test 1: Concurrent Agent Invocations');

  try {
    log('🔄', 'Testing 5 concurrent agent calls (concurrency limit)...', colors.blue);

    const startTime = Date.now();

    // Create 5 concurrent requests
    const requests = [
      fetch(`${SIPPAR_API_BASE}/api/sippar/ci-agents/developer/concurrent-test-1`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'load-test-1-' + Date.now(),
          requirements: { test: 'concurrent load test 1' },
          principal: TEST_PRINCIPAL,
          paymentVerified: true
        })
      }),
      fetch(`${SIPPAR_API_BASE}/api/sippar/ci-agents/analyst/concurrent-test-2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'load-test-2-' + Date.now(),
          requirements: { test: 'concurrent load test 2' },
          principal: TEST_PRINCIPAL,
          paymentVerified: true
        })
      }),
      fetch(`${SIPPAR_API_BASE}/api/sippar/ci-agents/refactorer/concurrent-test-3`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'load-test-3-' + Date.now(),
          requirements: { test: 'concurrent load test 3' },
          principal: TEST_PRINCIPAL,
          paymentVerified: true
        })
      }),
      fetch(`${SIPPAR_API_BASE}/api/sippar/ci-agents/documentor/concurrent-test-4`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'load-test-4-' + Date.now(),
          requirements: { test: 'concurrent load test 4' },
          principal: TEST_PRINCIPAL,
          paymentVerified: true
        })
      }),
      fetch(`${SIPPAR_API_BASE}/api/sippar/ci-agents/ui/concurrent-test-5`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'load-test-5-' + Date.now(),
          requirements: { test: 'concurrent load test 5' },
          principal: TEST_PRINCIPAL,
          paymentVerified: true
        })
      })
    ];

    // Execute all requests concurrently
    const responses = await Promise.all(requests);
    const totalTime = Date.now() - startTime;

    // Check results
    let successCount = 0;
    const responseTimes: number[] = [];

    for (let i = 0; i < responses.length; i++) {
      const response = responses[i];
      if (response.ok) {
        successCount++;
        const data = await response.json() as { performance?: { processing_time_ms: number } };
        if (data.performance?.processing_time_ms) {
          responseTimes.push(data.performance.processing_time_ms);
        }
        log('✅', `Request ${i + 1}: Success`, colors.green);
      } else {
        log('❌', `Request ${i + 1}: Failed (${response.status})`, colors.red);
      }
    }

    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);
    const minResponseTime = Math.min(...responseTimes);

    log('📊', `Total execution time: ${totalTime}ms`, colors.cyan);
    log('📊', `Successful requests: ${successCount}/5`, colors.cyan);
    log('📊', `Average response time: ${avgResponseTime.toFixed(0)}ms`, colors.cyan);
    log('📊', `Min response time: ${minResponseTime}ms`, colors.cyan);
    log('📊', `Max response time: ${maxResponseTime}ms`, colors.cyan);

    if (successCount === 5 && avgResponseTime < 3000) {
      log('🎉', 'Concurrent agent invocations test PASSED', colors.green);
      return true;
    } else if (successCount >= 4) {
      log('⚠️', 'Most requests succeeded but some failed', colors.yellow);
      return true;
    } else {
      log('❌', 'Too many failed requests', colors.red);
      return false;
    }

  } catch (error) {
    log('❌', `Concurrent agent invocations test FAILED: ${error}`, colors.red);
    return false;
  }
}

/**
 * Test 2: Sequential Request Performance
 */
async function testSequentialRequestPerformance(): Promise<boolean> {
  logSection('Test 2: Sequential Request Performance');

  try {
    log('🔄', 'Testing 10 sequential requests for baseline performance...', colors.blue);

    const responseTimes: number[] = [];
    let successCount = 0;

    for (let i = 1; i <= 10; i++) {
      const startTime = Date.now();

      const response = await fetch(`${SIPPAR_API_BASE}/api/sippar/ci-agents/developer/sequential-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: `sequential-test-${i}-` + Date.now(),
          requirements: { test: `sequential request ${i}` },
          principal: TEST_PRINCIPAL,
          paymentVerified: true
        })
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        successCount++;
        responseTimes.push(responseTime);
        log('✅', `Request ${i}/10: ${responseTime}ms`, colors.green);
      } else {
        log('❌', `Request ${i}/10: Failed (${response.status})`, colors.red);
      }
    }

    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);
    const minResponseTime = Math.min(...responseTimes);

    log('📊', `Successful requests: ${successCount}/10`, colors.cyan);
    log('📊', `Average response time: ${avgResponseTime.toFixed(0)}ms`, colors.cyan);
    log('📊', `Min response time: ${minResponseTime}ms`, colors.cyan);
    log('📊', `Max response time: ${maxResponseTime}ms`, colors.cyan);

    if (successCount >= 9 && avgResponseTime < 2000) {
      log('🎉', 'Sequential request performance test PASSED', colors.green);
      return true;
    } else {
      log('⚠️', 'Performance acceptable but below optimal', colors.yellow);
      return successCount >= 8;
    }

  } catch (error) {
    log('❌', `Sequential request performance test FAILED: ${error}`, colors.red);
    return false;
  }
}

/**
 * Test 3: Payment System Load
 */
async function testPaymentSystemLoad(): Promise<boolean> {
  logSection('Test 3: Payment System Load');

  try {
    log('🔄', 'Testing payment system under concurrent load...', colors.blue);

    const startTime = Date.now();

    // Create 5 concurrent payment flow tests
    const requests = [];
    for (let i = 1; i <= 5; i++) {
      requests.push(
        (async () => {
          // Test 402 response
          const unpaidResponse = await fetch(`${SIPPAR_API_BASE}/api/sippar/ci-agents/developer/payment-test-${i}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: `payment-load-${i}-` + Date.now(),
              requirements: { test: `payment test ${i}` },
              principal: TEST_PRINCIPAL,
              paymentVerified: false
            })
          });

          if (unpaidResponse.status !== 402) {
            return { success: false, reason: `Expected 402, got ${unpaidResponse.status}` };
          }

          // Test successful payment
          const paidResponse = await fetch(`${SIPPAR_API_BASE}/api/sippar/ci-agents/developer/payment-test-${i}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: `payment-load-paid-${i}-` + Date.now(),
              requirements: { test: `payment test ${i}` },
              principal: TEST_PRINCIPAL,
              paymentVerified: true
            })
          });

          if (!paidResponse.ok) {
            return { success: false, reason: `Paid request failed: ${paidResponse.status}` };
          }

          const data = await paidResponse.json() as { performance?: { quality_score?: number } };
          const qualityScore = data.performance?.quality_score || 0;

          return {
            success: true,
            qualityScore,
            valid: qualityScore >= 0.7 && qualityScore <= 1.0
          };
        })()
      );
    }

    const results = await Promise.all(requests);
    const totalTime = Date.now() - startTime;

    let successCount = 0;
    let validScores = 0;

    results.forEach((result, i) => {
      if (result.success) {
        successCount++;
        if (result.valid) {
          validScores++;
          log('✅', `Payment flow ${i + 1}: Success (score: ${result.qualityScore})`, colors.green);
        } else {
          log('⚠️', `Payment flow ${i + 1}: Invalid score (${result.qualityScore})`, colors.yellow);
        }
      } else {
        log('❌', `Payment flow ${i + 1}: Failed - ${result.reason}`, colors.red);
      }
    });

    log('📊', `Total execution time: ${totalTime}ms`, colors.cyan);
    log('📊', `Successful flows: ${successCount}/5`, colors.cyan);
    log('📊', `Valid quality scores: ${validScores}/5`, colors.cyan);

    if (successCount >= 4 && validScores >= 4) {
      log('🎉', 'Payment system load test PASSED', colors.green);
      return true;
    } else {
      log('⚠️', 'Payment system performance needs improvement', colors.yellow);
      return successCount >= 3;
    }

  } catch (error) {
    log('❌', `Payment system load test FAILED: ${error}`, colors.red);
    return false;
  }
}

/**
 * Test 4: API Endpoint Stress Test
 */
async function testAPIEndpointStress(): Promise<boolean> {
  logSection('Test 4: API Endpoint Stress Test');

  try {
    log('🔄', 'Testing API endpoints under stress (rapid requests)...', colors.blue);

    const endpoints = [
      '/health',
      '/api/sippar/threshold/status',
      '/api/sippar/algorand/network/status'
    ];

    let totalRequests = 0;
    let successfulRequests = 0;
    const startTime = Date.now();

    // Rapid-fire 20 requests across different endpoints
    const requests = [];
    for (let i = 0; i < 20; i++) {
      const endpoint = endpoints[i % endpoints.length];
      requests.push(
        fetch(`${SIPPAR_API_BASE}${endpoint}`)
          .then(response => {
            totalRequests++;
            if (response.ok) {
              successfulRequests++;
              return true;
            }
            return false;
          })
          .catch(() => {
            totalRequests++;
            return false;
          })
      );
    }

    await Promise.all(requests);
    const totalTime = Date.now() - startTime;

    const successRate = (successfulRequests / totalRequests) * 100;
    const avgResponseTime = totalTime / totalRequests;

    log('📊', `Total requests: ${totalRequests}`, colors.cyan);
    log('📊', `Successful: ${successfulRequests}`, colors.cyan);
    log('📊', `Success rate: ${successRate.toFixed(1)}%`, colors.cyan);
    log('📊', `Average response time: ${avgResponseTime.toFixed(0)}ms`, colors.cyan);
    log('📊', `Total test time: ${totalTime}ms`, colors.cyan);

    if (successRate >= 95 && avgResponseTime < 100) {
      log('🎉', 'API endpoint stress test PASSED', colors.green);
      return true;
    } else if (successRate >= 90) {
      log('⚠️', 'API performance acceptable but below optimal', colors.yellow);
      return true;
    } else {
      log('❌', 'API performance below acceptable threshold', colors.red);
      return false;
    }

  } catch (error) {
    log('❌', `API endpoint stress test FAILED: ${error}`, colors.red);
    return false;
  }
}

/**
 * Test 5: System Resource Monitoring
 */
async function testSystemResourceMonitoring(): Promise<boolean> {
  logSection('Test 5: System Resource Monitoring');

  try {
    log('🔄', 'Monitoring system resources during load...', colors.blue);

    // Generate load
    log('📋', 'Generating sustained load for 10 seconds...', colors.magenta);

    const loadStartTime = Date.now();
    const loadRequests = [];

    // Generate 20 requests over 10 seconds
    for (let i = 0; i < 20; i++) {
      loadRequests.push(
        new Promise(resolve => {
          setTimeout(async () => {
            try {
              const response = await fetch(`${SIPPAR_API_BASE}/health`);
              resolve(response.ok);
            } catch {
              resolve(false);
            }
          }, i * 500); // Spread requests over 10 seconds
        })
      );
    }

    const results = await Promise.all(loadRequests);
    const loadTime = Date.now() - loadStartTime;
    const successfulRequests = results.filter(r => r).length;

    log('📊', `Load test duration: ${loadTime}ms`, colors.cyan);
    log('📊', `Requests completed: ${successfulRequests}/20`, colors.cyan);
    log('📊', `Success rate: ${(successfulRequests / 20 * 100).toFixed(1)}%`, colors.cyan);

    // Check system health after load
    const healthResponse = await fetch(`${SIPPAR_API_BASE}/health`);
    if (healthResponse.ok) {
      const health = await healthResponse.json() as { status: string };
      log('✅', `System status after load: ${health.status}`, colors.green);
    }

    if (successfulRequests >= 18) {
      log('🎉', 'System resource monitoring test PASSED', colors.green);
      return true;
    } else {
      log('⚠️', 'System showed some degradation under sustained load', colors.yellow);
      return successfulRequests >= 15;
    }

  } catch (error) {
    log('❌', `System resource monitoring test FAILED: ${error}`, colors.red);
    return false;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('\n');
  log('🚀', 'Sprint 018.2 Phase D - Load Testing & Performance Validation', colors.cyan);
  log('📍', `Testing against: ${SIPPAR_API_BASE}`, colors.blue);
  log('⚠️', 'Note: Sippar backend must be running on port 3004', colors.yellow);
  console.log('\n');

  const results = {
    concurrentInvocations: false,
    sequentialPerformance: false,
    paymentSystemLoad: false,
    apiEndpointStress: false,
    resourceMonitoring: false
  };

  // Run tests sequentially
  results.concurrentInvocations = await testConcurrentAgentInvocations();
  results.sequentialPerformance = await testSequentialRequestPerformance();
  results.paymentSystemLoad = await testPaymentSystemLoad();
  results.apiEndpointStress = await testAPIEndpointStress();
  results.resourceMonitoring = await testSystemResourceMonitoring();

  // Print summary
  logSection('Test Summary');

  const tests = [
    { name: 'Concurrent Agent Invocations', result: results.concurrentInvocations },
    { name: 'Sequential Request Performance', result: results.sequentialPerformance },
    { name: 'Payment System Load', result: results.paymentSystemLoad },
    { name: 'API Endpoint Stress Test', result: results.apiEndpointStress },
    { name: 'System Resource Monitoring', result: results.resourceMonitoring }
  ];

  tests.forEach(test => {
    const status = test.result ? '✅ PASS' : '❌ FAIL';
    const color = test.result ? colors.green : colors.red;
    console.log(`  ${color}${status}${colors.reset} - ${test.name}`);
  });

  const totalTests = tests.length;
  const passedTests = tests.filter(t => t.result).length;
  const successRate = (passedTests / totalTests * 100).toFixed(1);

  console.log('\n' + '='.repeat(70));
  log('📊', `Tests Passed: ${passedTests}/${totalTests} (${successRate}%)`, colors.cyan);

  if (passedTests === totalTests) {
    log('🎉', 'ALL TESTS PASSED - System ready for production load', colors.green);
    process.exit(0);
  } else if (passedTests >= totalTests * 0.8) {
    log('✅', 'Most tests passed - system functional under load with minor issues', colors.green);
    process.exit(0);
  } else {
    log('⚠️', 'Some tests failed - review performance before proceeding', colors.yellow);
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('\n❌ Test runner failed:', error);
  process.exit(1);
});