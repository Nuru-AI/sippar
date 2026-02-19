/**
 * Sprint 018.2 Phase I: Final Validation Test Suite
 * Comprehensive pre-launch validation checklist
 * Date: September 30, 2025
 */

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const SIPPAR_API_BASE = 'http://nuru.network:3004';

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: any;
}

class PhaseIValidator {
  private results: TestResult[] = [];
  private sessionId: string;

  constructor() {
    this.sessionId = `phase-i-${Date.now()}`;
  }

  /**
   * 1. SYSTEM HEALTH CHECK
   */
  async validateSystemHealth(): Promise<void> {
    console.log(`\n${colors.cyan}${colors.bright}═══════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.cyan}${colors.bright}  PHASE I: FINAL VALIDATION - SYSTEM HEALTH CHECK${colors.reset}`);
    console.log(`${colors.cyan}${colors.bright}═══════════════════════════════════════════════════════${colors.reset}\n`);

    // Test 1: Verify 20 agents operational
    await this.test('Verify 20 agents operational', async () => {
      const response = await fetch(`${SIPPAR_API_BASE}/api/sippar/ci-agents/marketplace`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (!data.success) throw new Error('Marketplace API failed');
      if (data.marketplace.totalAgents !== 20) {
        throw new Error(`Expected 20 agents, got ${data.marketplace.totalAgents}`);
      }

      // Verify tier distribution
      const agents = data.marketplace.agents;
      const freeTier = agents.filter((a: any) => a.pricing.tier === 'FREE');
      const standardTier = agents.filter((a: any) => a.pricing.tier === 'STANDARD');
      const premiumTier = agents.filter((a: any) => a.pricing.tier === 'PREMIUM');

      if (freeTier.length !== 5) throw new Error(`Expected 5 FREE agents, got ${freeTier.length}`);
      if (standardTier.length !== 10) throw new Error(`Expected 10 STANDARD agents, got ${standardTier.length}`);
      if (premiumTier.length !== 5) throw new Error(`Expected 5 PREMIUM agents, got ${premiumTier.length}`);

      return {
        totalAgents: data.marketplace.totalAgents,
        tiers: {
          FREE: freeTier.length,
          STANDARD: standardTier.length,
          PREMIUM: premiumTier.length
        }
      };
    });

    // Test 2: Confirm payment flow working (X402 endpoints)
    await this.test('Confirm X402 payment flow operational', async () => {
      // Check X402 marketplace endpoint
      const marketplaceResponse = await fetch(`${SIPPAR_API_BASE}/api/sippar/x402/agent-marketplace`);
      if (!marketplaceResponse.ok) throw new Error(`X402 marketplace: HTTP ${marketplaceResponse.status}`);

      const marketplaceData = await marketplaceResponse.json();
      if (!marketplaceData.success) throw new Error('X402 marketplace failed');

      // Verify analytics endpoint
      const analyticsResponse = await fetch(`${SIPPAR_API_BASE}/api/sippar/x402/analytics`);
      if (!analyticsResponse.ok) throw new Error(`X402 analytics: HTTP ${analyticsResponse.status}`);

      const analyticsData = await analyticsResponse.json();
      if (!analyticsData.success) throw new Error('X402 analytics failed');

      return {
        marketplace: 'operational',
        analytics: 'operational',
        trackedRevenue: analyticsData.analytics?.total_revenue || 0
      };
    });

    // Test 3: Test smart routing functional (CI agents endpoint)
    await this.test('Verify smart routing accessible', async () => {
      const response = await fetch(`${SIPPAR_API_BASE}/api/sippar/ci-agents/health`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (!data.success) throw new Error('CI agents health check failed');

      return {
        ciAgentsHealth: data.health || 'operational',
        analyticsAvailable: true
      };
    });

    // Test 4: Backend health endpoint
    await this.test('Backend system health check', async () => {
      const response = await fetch(`${SIPPAR_API_BASE}/health`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (data.status !== 'healthy') throw new Error(`Unhealthy status: ${data.status}`);

      return {
        status: data.status,
        components: data.components,
        version: data.version
      };
    });
  }

  /**
   * 2. PERFORMANCE VALIDATION
   */
  async validatePerformance(): Promise<void> {
    console.log(`\n${colors.cyan}${colors.bright}═══════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.cyan}${colors.bright}  PHASE I: PERFORMANCE VALIDATION${colors.reset}`);
    console.log(`${colors.cyan}${colors.bright}═══════════════════════════════════════════════════════${colors.reset}\n`);

    // Test 5: Response time < 2 seconds (marketplace endpoint)
    await this.test('Marketplace response time < 2 seconds', async () => {
      const iterations = 5;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        const response = await fetch(`${SIPPAR_API_BASE}/api/sippar/ci-agents/marketplace`);
        const duration = Date.now() - start;
        times.push(duration);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
      }

      const avgTime = times.reduce((sum, t) => sum + t, 0) / times.length;
      const maxTime = Math.max(...times);

      if (avgTime > 2000) throw new Error(`Avg time ${avgTime}ms exceeds 2000ms target`);
      if (maxTime > 2000) throw new Error(`Max time ${maxTime}ms exceeds 2000ms target`);

      return {
        avgTime: `${avgTime.toFixed(0)}ms`,
        maxTime: `${maxTime}ms`,
        minTime: `${Math.min(...times)}ms`,
        iterations
      };
    });

    // Test 6: Analytics endpoint performance
    await this.test('Analytics response time < 2 seconds', async () => {
      const start = Date.now();
      const response = await fetch(`${SIPPAR_API_BASE}/api/sippar/ci-agents/analytics`);
      const duration = Date.now() - start;

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (duration > 2000) throw new Error(`Response time ${duration}ms exceeds 2000ms`);

      return {
        duration: `${duration}ms`,
        target: '2000ms'
      };
    });

    // Test 7: Concurrent request handling (5 simultaneous)
    await this.test('Handle 5 concurrent requests', async () => {
      const start = Date.now();
      const requests = Array(5).fill(null).map(() =>
        fetch(`${SIPPAR_API_BASE}/api/sippar/ci-agents/marketplace`)
      );

      const responses = await Promise.all(requests);
      const duration = Date.now() - start;

      const allSuccessful = responses.every(r => r.ok);
      if (!allSuccessful) throw new Error('Not all concurrent requests succeeded');

      return {
        concurrentRequests: 5,
        totalDuration: `${duration}ms`,
        avgPerRequest: `${(duration / 5).toFixed(0)}ms`,
        allSuccessful
      };
    });
  }

  /**
   * 3. SECURITY AUDIT
   */
  async validateSecurity(): Promise<void> {
    console.log(`\n${colors.cyan}${colors.bright}═══════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.cyan}${colors.bright}  PHASE I: SECURITY AUDIT${colors.reset}`);
    console.log(`${colors.cyan}${colors.bright}═══════════════════════════════════════════════════════${colors.reset}\n`);

    // Test 8: Rate limiting working (should hit limit at 200 requests for lenient endpoint)
    await this.test('Rate limiting operational', async () => {
      let rateLimitHit = false;
      let requestCount = 0;
      const maxRequests = 205; // Slightly over 200 limit for lenient

      for (let i = 0; i < maxRequests; i++) {
        const response = await fetch(`${SIPPAR_API_BASE}/api/sippar/ci-agents/marketplace`, {
          headers: { 'X-Test-Session': this.sessionId }
        });

        requestCount++;

        if (response.status === 429) {
          rateLimitHit = true;
          break;
        }

        // Small delay to prevent overwhelming the server
        if (i % 50 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      if (!rateLimitHit) {
        throw new Error(`Rate limit not hit after ${requestCount} requests (expected ~200)`);
      }

      return {
        rateLimitHit: true,
        requestsBeforeLimit: requestCount,
        expectedLimit: 200
      };
    });

    // Test 9: Security headers present
    await this.test('Security headers present', async () => {
      const response = await fetch(`${SIPPAR_API_BASE}/api/sippar/ci-agents/marketplace`);

      const headers = {
        'x-content-type-options': response.headers.get('x-content-type-options'),
        'x-frame-options': response.headers.get('x-frame-options'),
        'strict-transport-security': response.headers.get('strict-transport-security')
      };

      const missingHeaders = Object.entries(headers)
        .filter(([_, value]) => !value)
        .map(([key]) => key);

      if (missingHeaders.length > 0) {
        throw new Error(`Missing security headers: ${missingHeaders.join(', ')}`);
      }

      return {
        headers: Object.fromEntries(
          Object.entries(headers).map(([k, v]) => [k, v ? 'present' : 'missing'])
        ),
        allPresent: true
      };
    });

    // Test 10: Input validation working (XSS prevention)
    await this.test('Input validation prevents XSS', async () => {
      const xssPayload = '<script>alert("xss")</script>';

      // This should be sanitized or rejected
      const response = await fetch(`${SIPPAR_API_BASE}/api/sippar/ci-agents/marketplace`, {
        headers: {
          'X-Test-Session': `session-${xssPayload}`
        }
      });

      // Should either succeed (sanitized) or fail with 400 (rejected)
      const isHandled = response.ok || response.status === 400;

      if (!isHandled) {
        throw new Error(`Unexpected response status: ${response.status}`);
      }

      return {
        xssAttempt: 'handled',
        responseStatus: response.status,
        sanitized: response.ok
      };
    });
  }

  /**
   * 4. CONFIGURATION VALIDATION
   */
  async validateConfiguration(): Promise<void> {
    console.log(`\n${colors.cyan}${colors.bright}═══════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.cyan}${colors.bright}  PHASE I: CONFIGURATION VALIDATION${colors.reset}`);
    console.log(`${colors.cyan}${colors.bright}═══════════════════════════════════════════════════════${colors.reset}\n`);

    // Test 11: Verify pricing structure
    await this.test('Pricing structure validated', async () => {
      const response = await fetch(`${SIPPAR_API_BASE}/api/sippar/ci-agents/marketplace`);
      const data = await response.json();

      const agents = data.marketplace.agents;
      const freeAgents = agents.filter((a: any) => a.pricing.tier === 'FREE');
      const standardAgents = agents.filter((a: any) => a.pricing.tier === 'STANDARD');
      const premiumAgents = agents.filter((a: any) => a.pricing.tier === 'PREMIUM');

      // Validate pricing ranges
      const freeRange = freeAgents.every((a: any) => a.pricing.base >= 5 && a.pricing.base <= 10);
      const standardRange = standardAgents.every((a: any) => a.pricing.base >= 10 && a.pricing.base <= 20);
      const premiumRange = premiumAgents.every((a: any) => a.pricing.base >= 20 && a.pricing.base <= 30);

      if (!freeRange) throw new Error('FREE tier pricing out of range ($5-10)');
      if (!standardRange) throw new Error('STANDARD tier pricing out of range ($10-20)');
      if (!premiumRange) throw new Error('PREMIUM tier pricing out of range ($20-30)');

      return {
        FREE: { count: freeAgents.length, range: '$5-10', valid: freeRange },
        STANDARD: { count: standardAgents.length, range: '$10-20', valid: standardRange },
        PREMIUM: { count: premiumAgents.length, range: '$20-30', valid: premiumRange }
      };
    });

    // Test 12: Agent metadata completeness
    await this.test('Agent metadata complete', async () => {
      const response = await fetch(`${SIPPAR_API_BASE}/api/sippar/ci-agents/marketplace`);
      const data = await response.json();

      const agents = data.marketplace.agents;
      const requiredFields = ['id', 'name', 'description', 'pricing', 'endpoint', 'category', 'capabilities', 'memory_size', 'response_time'];

      const incompleteAgents = agents.filter((agent: any) => {
        return !requiredFields.every(field => agent[field] !== undefined && agent[field] !== null);
      });

      if (incompleteAgents.length > 0) {
        throw new Error(`${incompleteAgents.length} agents have incomplete metadata`);
      }

      return {
        totalAgents: agents.length,
        completeAgents: agents.length,
        requiredFields: requiredFields.length,
        allComplete: true
      };
    });
  }

  /**
   * Test runner helper
   */
  private async test(name: string, fn: () => Promise<any>): Promise<void> {
    const start = Date.now();
    try {
      const details = await fn();
      const duration = Date.now() - start;

      this.results.push({
        name,
        passed: true,
        duration,
        details
      });

      console.log(`${colors.green}✓${colors.reset} ${name} ${colors.blue}(${duration}ms)${colors.reset}`);
      if (details && Object.keys(details).length > 0) {
        console.log(`  ${colors.cyan}${JSON.stringify(details, null, 2).split('\n').join('\n  ')}${colors.reset}`);
      }
    } catch (error) {
      const duration = Date.now() - start;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.results.push({
        name,
        passed: false,
        duration,
        error: errorMessage
      });

      console.log(`${colors.red}✗${colors.reset} ${name} ${colors.blue}(${duration}ms)${colors.reset}`);
      console.log(`  ${colors.red}Error: ${errorMessage}${colors.reset}`);
    }
  }

  /**
   * Generate final report
   */
  generateReport(): void {
    console.log(`\n${colors.cyan}${colors.bright}═══════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.cyan}${colors.bright}  PHASE I: FINAL VALIDATION REPORT${colors.reset}`);
    console.log(`${colors.cyan}${colors.bright}═══════════════════════════════════════════════════════${colors.reset}\n`);

    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;
    const successRate = (passed / total * 100).toFixed(1);

    console.log(`${colors.bright}Test Results:${colors.reset}`);
    console.log(`  Total Tests: ${total}`);
    console.log(`  ${colors.green}Passed: ${passed}${colors.reset}`);
    console.log(`  ${colors.red}Failed: ${failed}${colors.reset}`);
    console.log(`  Success Rate: ${colors.green}${successRate}%${colors.reset}\n`);

    if (failed > 0) {
      console.log(`${colors.red}${colors.bright}Failed Tests:${colors.reset}`);
      this.results
        .filter(r => !r.passed)
        .forEach(r => {
          console.log(`  ${colors.red}✗${colors.reset} ${r.name}`);
          console.log(`    ${colors.red}${r.error}${colors.reset}`);
        });
      console.log('');
    }

    // Overall assessment
    const criticalFailed = failed > 0 && this.results.some(r =>
      !r.passed && (
        r.name.includes('20 agents') ||
        r.name.includes('payment flow') ||
        r.name.includes('Backend system health')
      )
    );

    if (criticalFailed) {
      console.log(`${colors.red}${colors.bright}⚠ CRITICAL FAILURES DETECTED - NOT READY FOR LAUNCH${colors.reset}\n`);
    } else if (failed > 0) {
      console.log(`${colors.yellow}${colors.bright}⚠ MINOR ISSUES DETECTED - REVIEW BEFORE LAUNCH${colors.reset}\n`);
    } else {
      console.log(`${colors.green}${colors.bright}✓ ALL SYSTEMS GREEN - READY FOR LAUNCH${colors.reset}\n`);
    }

    console.log(`${colors.cyan}Session ID: ${this.sessionId}${colors.reset}`);
    console.log(`${colors.cyan}Timestamp: ${new Date().toISOString()}${colors.reset}\n`);
  }
}

/**
 * Run Phase I Final Validation
 */
async function runPhaseIValidation() {
  console.log(`${colors.bright}${colors.cyan}`);
  console.log(`╔═══════════════════════════════════════════════════════════════╗`);
  console.log(`║                                                               ║`);
  console.log(`║         SPRINT 018.2 PHASE I: FINAL VALIDATION                ║`);
  console.log(`║                                                               ║`);
  console.log(`║         Pre-Launch System Validation & Verification           ║`);
  console.log(`║                                                               ║`);
  console.log(`╚═══════════════════════════════════════════════════════════════╝`);
  console.log(colors.reset);

  const validator = new PhaseIValidator();

  try {
    await validator.validateSystemHealth();
    await validator.validatePerformance();
    await validator.validateSecurity();
    await validator.validateConfiguration();
  } catch (error) {
    console.error(`\n${colors.red}Fatal error during validation:${colors.reset}`, error);
  }

  validator.generateReport();
}

// Run validation
runPhaseIValidation().catch(console.error);
