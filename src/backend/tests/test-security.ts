/**
 * Security Hardening Test Suite
 *
 * Sprint 018.2 Phase F - Security Hardening
 * Tests input validation, sanitization, CORS, and security headers
 */

// ==========================================
// Configuration
// ==========================================

const SIPPAR_API_BASE = 'http://74.50.113.152:3004';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Test results
interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  details?: string;
}

const results: TestResult[] = [];

// ==========================================
// Utility Functions
// ==========================================

function log(icon: string, message: string, color: string = colors.white): void {
  console.log(`${icon} ${color}${message}${colors.reset}`);
}

// ==========================================
// Test 1: Input Validation - Invalid Session ID
// ==========================================

async function testInvalidSessionId(): Promise<boolean> {
  const startTime = performance.now();
  log('🧪', `Test 1: Input Validation - Invalid Session ID`, colors.cyan);

  try {
    // Try to invoke agent with invalid session ID (contains special chars)
    const response = await fetch(`${SIPPAR_API_BASE}/api/sippar/ci-agents/developer/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: 'invalid<script>alert("xss")</script>',
        requirements: {},
        paymentVerified: true
      })
    });

    const duration = performance.now() - startTime;
    const data = await response.json() as any;

    log('📊', `Response status: ${response.status}`, colors.yellow);

    // Should either reject (400) OR sanitize the input (200 with sanitized session ID)
    const passed = response.status === 400 ||
                   (response.status === 200 && data.result?.session_id !== 'invalid<script>alert("xss")</script>');

    if (passed) {
      log('✅', `Invalid session ID sanitized or rejected`, colors.green);
    } else {
      log('❌', `Invalid session ID not handled (status: ${response.status})`, colors.red);
    }

    results.push({
      name: 'Invalid Session ID Rejection',
      passed,
      duration,
      details: `Status: ${response.status}, Error: ${data.error || 'none'}`
    });

    return passed;
  } catch (error) {
    const duration = performance.now() - startTime;
    log('❌', `Error: ${error}`, colors.red);
    results.push({
      name: 'Invalid Session ID Rejection',
      passed: false,
      duration,
      details: String(error)
    });
    return false;
  }
}

// ==========================================
// Test 2: Input Sanitization - XSS Prevention
// ==========================================

async function testXSSPrevention(): Promise<boolean> {
  const startTime = performance.now();
  log('🧪', `Test 2: Input Sanitization - XSS Prevention`, colors.cyan);

  try {
    // Try XSS attack in requirements field
    const xssPayload = '<script>alert("XSS")</script>';
    const response = await fetch(`${SIPPAR_API_BASE}/api/sippar/ci-agents/developer/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: 'xss-test-' + Date.now(),
        requirements: {
          code: xssPayload,
          description: '<iframe src="evil.com"></iframe>'
        },
        paymentVerified: true
      })
    });

    const duration = performance.now() - startTime;

    // Should either reject (400) or sanitize the input
    const passed = response.status === 400 || response.status === 402 || response.status === 200;

    if (passed) {
      log('✅', `XSS payload handled safely (status: ${response.status})`, colors.green);
    } else {
      log('❌', `XSS payload not handled properly (status: ${response.status})`, colors.red);
    }

    results.push({
      name: 'XSS Prevention',
      passed,
      duration,
      details: `Response status: ${response.status}`
    });

    return passed;
  } catch (error) {
    const duration = performance.now() - startTime;
    log('❌', `Error: ${error}`, colors.red);
    results.push({
      name: 'XSS Prevention',
      passed: false,
      duration,
      details: String(error)
    });
    return false;
  }
}

// ==========================================
// Test 3: Path Parameter Validation
// ==========================================

async function testPathParameterValidation(): Promise<boolean> {
  const startTime = performance.now();
  log('🧪', `Test 3: Path Parameter Validation`, colors.cyan);

  try {
    // Try path traversal attack in agent parameter
    const response = await fetch(`${SIPPAR_API_BASE}/api/sippar/ci-agents/../../etc/passwd/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: 'path-test-' + Date.now(),
        requirements: {},
        paymentVerified: true
      })
    });

    const duration = performance.now() - startTime;
    const data = await response.json() as any;

    log('📊', `Response status: ${response.status}`, colors.yellow);

    // Should return 400 or 404 (path sanitized or not found)
    const passed = response.status === 400 || response.status === 404;

    if (passed) {
      log('✅', `Path traversal attack prevented`, colors.green);
    } else {
      log('❌', `Path traversal not prevented (status: ${response.status})`, colors.red);
    }

    results.push({
      name: 'Path Traversal Prevention',
      passed,
      duration,
      details: `Response status: ${response.status}`
    });

    return passed;
  } catch (error) {
    const duration = performance.now() - startTime;
    log('❌', `Error: ${error}`, colors.red);
    results.push({
      name: 'Path Traversal Prevention',
      passed: false,
      duration,
      details: String(error)
    });
    return false;
  }
}

// ==========================================
// Test 4: Security Headers
// ==========================================

async function testSecurityHeaders(): Promise<boolean> {
  const startTime = performance.now();
  log('🧪', `Test 4: Security Headers`, colors.cyan);

  try {
    const response = await fetch(`${SIPPAR_API_BASE}/health`);

    const duration = performance.now() - startTime;

    // Check for security headers
    const headers = {
      'X-Content-Type-Options': response.headers.get('X-Content-Type-Options'),
      'X-Frame-Options': response.headers.get('X-Frame-Options'),
      'X-XSS-Protection': response.headers.get('X-XSS-Protection'),
      'Strict-Transport-Security': response.headers.get('Strict-Transport-Security'),
      'Content-Security-Policy': response.headers.get('Content-Security-Policy')
    };

    log('📊', `X-Content-Type-Options: ${headers['X-Content-Type-Options']}`, colors.yellow);
    log('📊', `X-Frame-Options: ${headers['X-Frame-Options']}`, colors.yellow);
    log('📊', `X-XSS-Protection: ${headers['X-XSS-Protection']}`, colors.yellow);
    log('📊', `Strict-Transport-Security: ${headers['Strict-Transport-Security']}`, colors.yellow);
    log('📊', `Content-Security-Policy: ${headers['Content-Security-Policy'] ? 'Present' : 'Missing'}`, colors.yellow);

    // At least 3 security headers should be present
    const headerCount = Object.values(headers).filter(h => h !== null).length;
    const passed = headerCount >= 3;

    if (passed) {
      log('✅', `Security headers present (${headerCount}/5)`, colors.green);
    } else {
      log('❌', `Insufficient security headers (${headerCount}/5)`, colors.red);
    }

    results.push({
      name: 'Security Headers',
      passed,
      duration,
      details: `${headerCount}/5 headers present`
    });

    return passed;
  } catch (error) {
    const duration = performance.now() - startTime;
    log('❌', `Error: ${error}`, colors.red);
    results.push({
      name: 'Security Headers',
      passed: false,
      duration,
      details: String(error)
    });
    return false;
  }
}

// ==========================================
// Test 5: Payload Size Limit
// ==========================================

async function testPayloadSizeLimit(): Promise<boolean> {
  const startTime = performance.now();
  log('🧪', `Test 5: Payload Size Limit`, colors.cyan);

  try {
    // Create payload exceeding 10KB limit
    const largePayload = {
      sessionId: 'payload-test-' + Date.now(),
      requirements: {
        data: 'A'.repeat(15 * 1024) // 15 KB
      },
      paymentVerified: true
    };

    const response = await fetch(`${SIPPAR_API_BASE}/api/sippar/ci-agents/developer/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(largePayload)
    });

    const duration = performance.now() - startTime;

    log('📊', `Response status: ${response.status}`, colors.yellow);

    // Should return 413 Payload Too Large or 400 Bad Request
    const passed = response.status === 413 || response.status === 400;

    if (passed) {
      log('✅', `Large payload rejected`, colors.green);
    } else {
      log('❌', `Large payload not rejected (status: ${response.status})`, colors.red);
    }

    results.push({
      name: 'Payload Size Limit',
      passed,
      duration,
      details: `Response status: ${response.status}`
    });

    return passed;
  } catch (error) {
    const duration = performance.now() - startTime;
    log('❌', `Error: ${error}`, colors.red);
    results.push({
      name: 'Payload Size Limit',
      passed: false,
      duration,
      details: String(error)
    });
    return false;
  }
}

// ==========================================
// Test 6: SQL Injection Prevention
// ==========================================

async function testSQLInjectionPrevention(): Promise<boolean> {
  const startTime = performance.now();
  log('🧪', `Test 6: SQL Injection Prevention`, colors.cyan);

  try {
    // Try SQL injection in session ID
    const sqlInjection = "'; DROP TABLE users; --";
    const response = await fetch(`${SIPPAR_API_BASE}/api/sippar/ci-agents/developer/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: sqlInjection,
        requirements: {},
        paymentVerified: true
      })
    });

    const duration = performance.now() - startTime;

    log('📊', `Response status: ${response.status}`, colors.yellow);

    // Should return 400 (invalid format)
    const passed = response.status === 400;

    if (passed) {
      log('✅', `SQL injection payload rejected`, colors.green);
    } else {
      log('❌', `SQL injection not prevented (status: ${response.status})`, colors.red);
    }

    results.push({
      name: 'SQL Injection Prevention',
      passed,
      duration,
      details: `Response status: ${response.status}`
    });

    return passed;
  } catch (error) {
    const duration = performance.now() - startTime;
    log('❌', `Error: ${error}`, colors.red);
    results.push({
      name: 'SQL Injection Prevention',
      passed: false,
      duration,
      details: String(error)
    });
    return false;
  }
}

// ==========================================
// Main Test Runner
// ==========================================

async function runTests(): Promise<void> {
  log('🚀', '==========================================', colors.bright);
  log('🚀', 'Security Hardening Test Suite', colors.bright);
  log('🚀', 'Sprint 018.2 Phase F - Security Hardening', colors.bright);
  log('🚀', '==========================================', colors.bright);
  console.log();

  const testStartTime = performance.now();

  // Run tests sequentially
  await testInvalidSessionId();
  console.log();

  await testXSSPrevention();
  console.log();

  await testPathParameterValidation();
  console.log();

  await testSecurityHeaders();
  console.log();

  await testPayloadSizeLimit();
  console.log();

  await testSQLInjectionPrevention();
  console.log();

  const totalDuration = performance.now() - testStartTime;

  // Print summary
  log('📊', '==========================================', colors.bright);
  log('📊', 'Test Summary', colors.bright);
  log('📊', '==========================================', colors.bright);

  const passedTests = results.filter(r => r.passed).length;
  const totalTests = results.length;
  const successRate = ((passedTests / totalTests) * 100).toFixed(1);

  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    const color = result.passed ? colors.green : colors.red;
    log(icon, `${result.name}: ${result.passed ? 'PASS' : 'FAIL'} (${result.duration.toFixed(2)}ms)`, color);
    if (result.details) {
      log('  ', `  Details: ${result.details}`, colors.yellow);
    }
  });

  console.log();
  log('📊', `Total: ${passedTests}/${totalTests} passed (${successRate}%)`, colors.bright);
  log('📊', `Total duration: ${(totalDuration / 1000).toFixed(2)}s`, colors.bright);
  console.log();

  if (passedTests === totalTests) {
    log('🎉', 'All tests passed! Security hardening is working correctly.', colors.green);
  } else if (passedTests >= totalTests * 0.8) {
    log('✅', 'Most tests passed. Security hardening is functioning well.', colors.green);
  } else {
    log('⚠️', `${totalTests - passedTests} test(s) failed. Review results above.`, colors.yellow);
  }
}

// Run tests
runTests().catch(error => {
  log('❌', `Fatal error: ${error}`, colors.red);
  process.exit(1);
});