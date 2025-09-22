/**
 * X402 Payment Protocol Service
 * Integrates X402 micropayments with Sippar's AI services and ckALGO ecosystem
 */

import { paymentMiddleware, Money, Network, RouteConfig, RoutesConfig } from 'x402-express';
import { simplifiedBridgeService } from './simplifiedBridgeService.js';
import { ckAlgoService } from './ckAlgoService.js';

export interface X402PaymentRequest {
  serviceEndpoint: string;
  paymentAmount: number;
  aiModel: string;
  requestId: string;
  payerCredentials: {
    principal: string;
    algorandAddress: string;
  };
}

export interface X402PaymentResponse {
  transactionId: string;
  paymentStatus: 'pending' | 'confirmed' | 'failed';
  serviceAccessToken: string;
  expiryTime: number;
}

export interface X402ServiceMetrics {
  totalPayments: number;
  totalRevenue: number;
  averagePaymentAmount: number;
  successRate: number;
  topServices: Array<{
    endpoint: string;
    payments: number;
    revenue: number;
  }>;
}

class X402Service {
  private metrics: X402ServiceMetrics = {
    totalPayments: 0,
    totalRevenue: 0,
    averagePaymentAmount: 0,
    successRate: 0,
    topServices: []
  };

  private paymentHistory: Array<{
    timestamp: Date;
    amount: number;
    service: string;
    status: string;
    principal: string;
  }> = [];

  // Performance optimization: Cache for frequent payment tokens
  private tokenCache = new Map<string, {
    token: string;
    expiry: number;
    created: number;
  }>();

  // Performance optimization: Pre-computed transaction ID components
  private transactionIdCounter = 0;
  private instanceId = Math.random().toString(36).substr(2, 4);

  /**
   * Get X402 middleware configuration for AI services
   */
  getAIServiceRoutes(): RoutesConfig {
    return {
      '/api/sippar/ai/query': {
        price: 0.01,
        network: 'base' as Network
      },
      '/api/sippar/ai/enhanced-query': {
        price: 0.05,
        network: 'base' as Network
      },
      '/api/sippar/ai/chat-auth': {
        price: 0.02,
        network: 'base' as Network
      }
    };
  }

  /**
   * Get X402 middleware configuration for ckALGO services
   */
  getCkAlgoServiceRoutes(): RoutesConfig {
    return {
      '/api/sippar/x402/mint-ckALGO': {
        price: 0.001,
        network: 'base' as Network
      },
      '/api/sippar/x402/redeem-ckALGO': {
        price: 0.001,
        network: 'base' as Network
      },
      '/api/sippar/x402/agent-marketplace': {
        price: 0.005,
        network: 'base' as Network
      }
    };
  }

  /**
   * Create X402 middleware for all protected routes
   */
  createMiddleware() {
    const protectedRoutes = {
      ...this.getAIServiceRoutes(),
      // Only include the actual service endpoints, not the management endpoints
      '/api/sippar/x402/mint-ckALGO': {
        price: 0.001,
        network: 'base' as Network
      },
      '/api/sippar/x402/redeem-ckALGO': {
        price: 0.001,
        network: 'base' as Network
      }
    };

    // For now, we'll use a placeholder address - in production this would be configured
    const payToAddress = '0x1234567890123456789012345678901234567890';

    return paymentMiddleware(payToAddress, protectedRoutes);
  }

  /**
   * Handle successful X402 payment
   */
  private async handlePaymentSuccess(paymentInfo: any) {
    console.log('✅ X402 Payment successful:', paymentInfo);

    this.metrics.totalPayments++;
    this.metrics.totalRevenue += paymentInfo.amount;
    this.metrics.averagePaymentAmount = this.metrics.totalRevenue / this.metrics.totalPayments;

    this.paymentHistory.push({
      timestamp: new Date(),
      amount: paymentInfo.amount,
      service: paymentInfo.route,
      status: 'success',
      principal: paymentInfo.userPrincipal || 'unknown'
    });

    // Update top services
    this.updateTopServices(paymentInfo.route, paymentInfo.amount);

    // Trigger any additional business logic
    await this.processSuccessfulPayment(paymentInfo);
  }

  /**
   * Handle failed X402 payment
   */
  private async handlePaymentFailure(paymentInfo: any) {
    console.warn('❌ X402 Payment failed:', paymentInfo);

    this.paymentHistory.push({
      timestamp: new Date(),
      amount: paymentInfo.amount || 0,
      service: paymentInfo.route,
      status: 'failed',
      principal: paymentInfo.userPrincipal || 'unknown'
    });

    // Update success rate
    const successfulPayments = this.paymentHistory.filter(p => p.status === 'success').length;
    this.metrics.successRate = successfulPayments / this.paymentHistory.length;
  }

  /**
   * Process additional business logic for successful payments
   */
  private async processSuccessfulPayment(paymentInfo: any) {
    try {
      // For ckALGO services, integrate with bridge service
      if (paymentInfo.route.includes('ckALGO')) {
        console.log('🔗 Processing ckALGO service payment integration');
        // Could trigger automatic ckALGO operations here
      }

      // For AI services, log usage for analytics
      if (paymentInfo.route.includes('/ai/')) {
        console.log('🤖 Processing AI service payment integration');
        // Could trigger AI service usage tracking here
      }

    } catch (error) {
      console.error('⚠️ Error processing successful payment:', error);
    }
  }

  /**
   * Update top services tracking
   */
  private updateTopServices(route: string, amount: number) {
    const existing = this.metrics.topServices.find(s => s.endpoint === route);
    if (existing) {
      existing.payments++;
      existing.revenue += amount;
    } else {
      this.metrics.topServices.push({
        endpoint: route,
        payments: 1,
        revenue: amount
      });
    }

    // Keep only top 10 services
    this.metrics.topServices.sort((a, b) => b.revenue - a.revenue);
    this.metrics.topServices = this.metrics.topServices.slice(0, 10);
  }

  /**
   * Get current X402 metrics
   */
  getMetrics(): X402ServiceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get payment history
   */
  getPaymentHistory(limit: number = 100) {
    return this.paymentHistory
      .slice(-limit)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Generate optimized transaction ID (faster than random generation)
   */
  private generateTransactionId(): string {
    this.transactionIdCounter++;
    return `x402-${this.instanceId}-${this.transactionIdCounter}-${Date.now()}`;
  }

  /**
   * Create cached service token for repeated requests
   */
  private createServiceToken(principal: string, service: string, txId: string): { token: string; expiry: number } {
    const cacheKey = `${principal}-${service}`;
    const now = Date.now();

    // Check if we have a valid cached token (reuse for 10 minutes for same principal/service)
    const cached = this.tokenCache.get(cacheKey);
    if (cached && cached.expiry > now + (10 * 60 * 1000)) {
      return { token: cached.token, expiry: cached.expiry };
    }

    // Create new token (24 hour expiry)
    const expiryTime = now + (24 * 60 * 60 * 1000);
    const serviceAccessToken = Buffer.from(JSON.stringify({
      principal,
      service,
      expiry: expiryTime,
      txId
    })).toString('base64');

    // Cache the token
    this.tokenCache.set(cacheKey, {
      token: serviceAccessToken,
      expiry: expiryTime,
      created: now
    });

    // Clean old cache entries (keep only last 100)
    if (this.tokenCache.size > 100) {
      const entries = Array.from(this.tokenCache.entries());
      entries.sort((a, b) => a[1].created - b[1].created);
      entries.slice(0, -100).forEach(([key]) => this.tokenCache.delete(key));
    }

    return { token: serviceAccessToken, expiry: expiryTime };
  }

  /**
   * Create enterprise payment for B2B usage (optimized for speed)
   */
  async createEnterprisePayment(request: X402PaymentRequest): Promise<X402PaymentResponse> {
    const startTime = performance.now();

    try {
      // Fast transaction ID generation
      const transactionId = this.generateTransactionId();

      // Fast token creation with caching
      const { token, expiry } = this.createServiceToken(
        request.payerCredentials.principal,
        request.serviceEndpoint,
        transactionId
      );

      // Async metrics update (don't block response)
      setImmediate(() => {
        this.updateMetricsAsync(request, startTime);
      });

      return {
        transactionId,
        paymentStatus: 'confirmed',
        serviceAccessToken: token,
        expiryTime: expiry
      };

    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(`❌ Enterprise payment creation failed (${duration.toFixed(2)}ms):`, error);
      throw new Error(`Failed to create enterprise payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update metrics asynchronously to avoid blocking payment creation
   */
  private updateMetricsAsync(request: X402PaymentRequest, startTime: number): void {
    try {
      const duration = performance.now() - startTime;

      this.metrics.totalPayments++;
      this.metrics.totalRevenue += request.paymentAmount;
      this.metrics.averagePaymentAmount = this.metrics.totalRevenue / this.metrics.totalPayments;

      this.paymentHistory.push({
        timestamp: new Date(),
        amount: request.paymentAmount,
        service: request.serviceEndpoint,
        status: 'success',
        principal: request.payerCredentials.principal
      });

      // Update top services
      this.updateTopServices(request.serviceEndpoint, request.paymentAmount);

      // Log performance (only log slow operations)
      if (duration > 50) {
        console.log(`⚡ X402 payment created in ${duration.toFixed(2)}ms for ${request.serviceEndpoint}`);
      }

    } catch (error) {
      console.error('⚠️ Error updating X402 metrics:', error);
    }
  }

  /**
   * Verify service access token
   */
  verifyServiceToken(token: string): boolean {
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
      return decoded.expiry > Date.now();
    } catch {
      return false;
    }
  }
}

export const x402Service = new X402Service();