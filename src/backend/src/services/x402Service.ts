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
   * Create enterprise payment for B2B usage
   */
  async createEnterprisePayment(request: X402PaymentRequest): Promise<X402PaymentResponse> {
    try {
      // Generate unique transaction ID
      const transactionId = `x402-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create service access token (24 hour expiry)
      const expiryTime = Date.now() + (24 * 60 * 60 * 1000);
      const serviceAccessToken = Buffer.from(JSON.stringify({
        principal: request.payerCredentials.principal,
        service: request.serviceEndpoint,
        expiry: expiryTime,
        txId: transactionId
      })).toString('base64');

      console.log(`💼 Enterprise X402 payment created: ${transactionId} for ${request.serviceEndpoint}`);

      return {
        transactionId,
        paymentStatus: 'confirmed',
        serviceAccessToken,
        expiryTime
      };

    } catch (error) {
      console.error('❌ Enterprise payment creation failed:', error);
      throw new Error(`Failed to create enterprise payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
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