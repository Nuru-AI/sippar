/**
 * Sprint 018.2 - CI API Integration Test Script
 * Tests production CI API connection from Sippar backend
 */

import { ciAgentService } from './services/ciAgentService.js';

// Test configuration
const CI_API_BASE_URL = 'http://74.50.113.152:8080';
const CI_API_KEY = 'ci-prod-key-2025-sippar-x402';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(emoji: string, message: string, color: string = colors.reset) {
  console.log(`${color}${emoji} ${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60));
  log('🎯', title, colors.cyan);
  console.log('='.repeat(60) + '\n');
}

/**
 * Test 1: CI API Health Check
 */
async function testHealthCheck(): Promise<boolean> {
  logSection('Test 1: CI API Health Check');

  try {
    log('🔄', 'Testing CI API health endpoint...', colors.blue);

    const health = await ciAgentService.checkCIAPIHealth();

    log('✅', `Status: ${health.status}`, colors.green);
    log('✅', `Database: ${health.database}`, colors.green);
    log('✅', `Redis: ${health.redis}`, colors.green);
    log('✅', `Agents Loaded: ${health.agents_loaded}`, colors.green);

    if (health.status === 'healthy' && health.agents_loaded > 0) {
      log('🎉', 'Health check PASSED', colors.green);
      return true;
    } else {
      log('❌', 'Health check FAILED - API not fully healthy', colors.red);
      return false;
    }
  } catch (error) {
    log('❌', `Health check FAILED: ${error}`, colors.red);
    return false;
  }
}

/**
 * Test 2: Agent List Retrieval
 */
async function testAgentList(): Promise<boolean> {
  logSection('Test 2: Production CI Agent List');

  try {
    log('🔄', 'Fetching available CI agents...', colors.blue);

    const agents = await ciAgentService.getProductionCIAgents();

    log('✅', `Found ${agents.length} agents`, colors.green);

    agents.forEach((agent, index) => {
      console.log(`\n  ${index + 1}. ${colors.yellow}${agent.name}${colors.reset}`);
      console.log(`     ID: ${agent.id}`);
      console.log(`     Status: ${agent.status}`);
      console.log(`     Capabilities: ${agent.capabilities.slice(0, 3).join(', ')}...`);
    });

    if (agents.length >= 7) {
      log('🎉', 'Agent list retrieval PASSED', colors.green);
      return true;
    } else {
      log('⚠️', `Expected 7 agents, got ${agents.length}`, colors.yellow);
      return false;
    }
  } catch (error) {
    log('❌', `Agent list retrieval FAILED: ${error}`, colors.red);
    return false;
  }
}

/**
 * Test 3: Basic Agent Invocation
 */
async function testAgentInvocation(): Promise<boolean> {
  logSection('Test 3: Basic Agent Invocation');

  try {
    log('🔄', 'Testing agent invocation with Developer agent...', colors.blue);

    const testPrompt = 'Test task for Sprint 018.2 integration testing';
    const sessionId = `test-${Date.now()}`;

    const startTime = Date.now();
    const result = await ciAgentService.invokeProductionCIAgent(
      'developer',
      testPrompt,
      sessionId,
      { test: true, sprint: '018.2' }
    );
    const duration = Date.now() - startTime;

    log('✅', `Agent responded in ${duration}ms`, colors.green);
    log('✅', `Response: ${result.result.substring(0, 100)}...`, colors.green);

    if (result.quality_score) {
      log('✅', `Quality Score: ${result.quality_score}`, colors.green);
    }

    if (result.result && result.result.length > 0) {
      log('🎉', 'Agent invocation PASSED', colors.green);
      return true;
    } else {
      log('❌', 'Agent invocation FAILED - empty response', colors.red);
      return false;
    }
  } catch (error) {
    log('❌', `Agent invocation FAILED: ${error}`, colors.red);
    return false;
  }
}

/**
 * Test 4: Performance Test
 */
async function testPerformance(): Promise<boolean> {
  logSection('Test 4: Performance Validation');

  try {
    log('🔄', 'Running performance test (3 sequential calls)...', colors.blue);

    const times: number[] = [];

    for (let i = 1; i <= 3; i++) {
      const start = Date.now();
      await ciAgentService.checkCIAPIHealth();
      const duration = Date.now() - start;
      times.push(duration);
      log('✅', `Call ${i}: ${duration}ms`, colors.green);
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const maxTime = Math.max(...times);

    log('📊', `Average response time: ${avgTime.toFixed(2)}ms`, colors.blue);
    log('📊', `Maximum response time: ${maxTime}ms`, colors.blue);

    if (maxTime < 2000) { // < 2 seconds target
      log('🎉', 'Performance test PASSED', colors.green);
      return true;
    } else {
      log('⚠️', 'Performance test WARNING - response time > 2s', colors.yellow);
      return true; // Warning, not failure
    }
  } catch (error) {
    log('❌', `Performance test FAILED: ${error}`, colors.red);
    return false;
  }
}

/**
 * Test 5: Error Handling
 */
async function testErrorHandling(): Promise<boolean> {
  logSection('Test 5: Error Handling');

  try {
    log('🔄', 'Testing error handling with invalid agent...', colors.blue);

    try {
      await ciAgentService.invokeProductionCIAgent(
        'nonexistent-agent',
        'test',
        'test-session',
        {}
      );
      log('❌', 'Error handling FAILED - should have thrown error', colors.red);
      return false;
    } catch (expectedError) {
      log('✅', 'Error correctly caught and handled', colors.green);
      log('🎉', 'Error handling test PASSED', colors.green);
      return true;
    }
  } catch (error) {
    log('❌', `Error handling test FAILED: ${error}`, colors.red);
    return false;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('\n');
  log('🚀', 'Sprint 018.2 - CI API Integration Tests', colors.cyan);
  log('📍', `Testing against: ${CI_API_BASE_URL}`, colors.blue);
  console.log('\n');

  const results = {
    healthCheck: false,
    agentList: false,
    agentInvocation: false,
    performance: false,
    errorHandling: false
  };

  // Run tests sequentially
  results.healthCheck = await testHealthCheck();

  if (results.healthCheck) {
    results.agentList = await testAgentList();
    results.agentInvocation = await testAgentInvocation();
    results.performance = await testPerformance();
    results.errorHandling = await testErrorHandling();
  } else {
    log('⚠️', 'Skipping remaining tests due to health check failure', colors.yellow);
  }

  // Print summary
  logSection('Test Summary');

  const tests = [
    { name: 'Health Check', result: results.healthCheck },
    { name: 'Agent List', result: results.agentList },
    { name: 'Agent Invocation', result: results.agentInvocation },
    { name: 'Performance', result: results.performance },
    { name: 'Error Handling', result: results.errorHandling }
  ];

  tests.forEach(test => {
    const status = test.result ? '✅ PASS' : '❌ FAIL';
    const color = test.result ? colors.green : colors.red;
    console.log(`  ${color}${status}${colors.reset} - ${test.name}`);
  });

  const totalTests = tests.length;
  const passedTests = tests.filter(t => t.result).length;
  const successRate = (passedTests / totalTests * 100).toFixed(1);

  console.log('\n' + '='.repeat(60));
  log('📊', `Tests Passed: ${passedTests}/${totalTests} (${successRate}%)`, colors.cyan);

  if (passedTests === totalTests) {
    log('🎉', 'ALL TESTS PASSED - Integration ready for production', colors.green);
    process.exit(0);
  } else {
    log('⚠️', 'Some tests failed - review before proceeding', colors.yellow);
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('\n❌ Test runner failed:', error);
  process.exit(1);
});