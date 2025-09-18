/**
 * X402 Payment Protocol Service
 * Handles micropayments for AI services and cross-chain operations
 */

import { SipparError, ErrorCode } from '../utils/errors';
import { X402PaymentRequest, X402PaymentResponse, X402Analytics, MarketplaceService } from '../types/x402';

export class X402Service {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, ''); // Remove trailing slashes
  }

  /**
   * Create a new X402 payment for a service
   */
  async createPayment(request: X402PaymentRequest): Promise<X402PaymentResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/sippar/x402/create-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const result = await response.json();

      if (!result.success) {
        throw new SipparError(
          ErrorCode.X402_PAYMENT_FAILED,
          result.error || 'Failed to create X402 payment'
        );
      }

      return result.payment;
    } catch (error) {
      if (error instanceof SipparError) throw error;

      throw new SipparError(
        ErrorCode.NETWORK_ERROR,
        `X402 payment creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get payment status by transaction ID
   */
  async getPaymentStatus(transactionId: string): Promise<{
    paymentId: string;
    status: 'pending' | 'confirmed' | 'failed';
    amount: number;
    timestamp: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/sippar/x402/payment-status/${transactionId}`);
      const result = await response.json();

      if (!result.success) {
        throw new SipparError(
          ErrorCode.X402_PAYMENT_FAILED,
          result.error || 'Failed to get payment status'
        );
      }

      return {
        paymentId: result.paymentId,
        status: result.status,
        amount: result.amount,
        timestamp: result.timestamp
      };
    } catch (error) {
      if (error instanceof SipparError) throw error;

      throw new SipparError(
        ErrorCode.NETWORK_ERROR,
        `Payment status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Verify a service access token
   */
  async verifyServiceToken(token: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/sippar/x402/verify-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const result = await response.json();

      if (!result.success) {
        return false;
      }

      return result.valid;
    } catch (error) {
      console.warn('Token verification failed:', error);
      return false;
    }
  }

  /**
   * Get available services in the X402 marketplace
   */
  async getMarketplace(): Promise<{
    services: MarketplaceService[];
    totalServices: number;
    timestamp: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/sippar/x402/agent-marketplace`);
      const result = await response.json();

      if (!result.success) {
        throw new SipparError(
          ErrorCode.API_ERROR,
          result.error || 'Failed to fetch marketplace data'
        );
      }

      return result.marketplace;
    } catch (error) {
      if (error instanceof SipparError) throw error;

      throw new SipparError(
        ErrorCode.NETWORK_ERROR,
        `Marketplace fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get X402 payment analytics and metrics
   */
  async getAnalytics(): Promise<X402Analytics> {
    try {
      const response = await fetch(`${this.baseUrl}/api/sippar/x402/analytics`);
      const result = await response.json();

      if (!result.success) {
        throw new SipparError(
          ErrorCode.API_ERROR,
          result.error || 'Failed to fetch analytics'
        );
      }

      return result.analytics;
    } catch (error) {
      if (error instanceof SipparError) throw error;

      throw new SipparError(
        ErrorCode.NETWORK_ERROR,
        `Analytics fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Process enterprise billing for B2B usage
   */
  async processEnterpriseBilling(data: {
    principal: string;
    services: string[];
    billingPeriod: string;
  }): Promise<{
    principal: string;
    billingPeriod: string;
    services: string[];
    totalUsage: number;
    totalCost: number;
    currency: string;
    paymentStatus: string;
    nextBillingDate: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/sippar/x402/enterprise-billing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!result.success) {
        throw new SipparError(
          ErrorCode.API_ERROR,
          result.error || 'Failed to process enterprise billing'
        );
      }

      return result.billing;
    } catch (error) {
      if (error instanceof SipparError) throw error;

      throw new SipparError(
        ErrorCode.NETWORK_ERROR,
        `Enterprise billing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Pay for and call an AI service in one operation
   */
  async payAndCallAIService(options: {
    serviceEndpoint: string;
    paymentAmount: number;
    payerCredentials: {
      principal: string;
      algorandAddress: string;
    };
    aiQuery?: string;
    aiModel?: string;
  }): Promise<{
    payment: X402PaymentResponse;
    serviceResponse?: any;
  }> {
    try {
      // Step 1: Create payment
      const paymentRequest: X402PaymentRequest = {
        serviceEndpoint: options.serviceEndpoint,
        paymentAmount: options.paymentAmount,
        aiModel: options.aiModel || 'default',
        requestId: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        payerCredentials: options.payerCredentials
      };

      const payment = await this.createPayment(paymentRequest);

      // Step 2: Call the AI service if payment succeeded
      let serviceResponse;
      if (payment.paymentStatus === 'confirmed' && options.aiQuery) {
        try {
          const aiResponse = await fetch(`${this.baseUrl}${options.serviceEndpoint}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${payment.serviceAccessToken}`,
            },
            body: JSON.stringify({
              query: options.aiQuery,
              model: options.aiModel || 'default'
            }),
          });

          if (aiResponse.ok) {
            serviceResponse = await aiResponse.json();
          }
        } catch (serviceError) {
          console.warn('AI service call failed after payment:', serviceError);
          // Payment succeeded but service call failed - still return payment info
        }
      }

      return {
        payment,
        serviceResponse
      };
    } catch (error) {
      if (error instanceof SipparError) throw error;

      throw new SipparError(
        ErrorCode.X402_PAYMENT_FAILED,
        `Pay-and-call operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}