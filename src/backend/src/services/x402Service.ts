/**
 * X402 Payment Protocol Service - Real ICRC-1 Implementation
 * Integrates X402 micropayments with real ckALGO transfers on ICP
 *
 * Updated: 2026-02-20 - Added JWT signing and real payment support
 */

import jwt from 'jsonwebtoken';
import { Principal } from '@dfinity/principal';
import { paymentMiddleware, Network, RoutesConfig } from 'x402-express';
import { simplifiedBridgeService } from './simplifiedBridgeService.js';

// Environment configuration
const JWT_SECRET = process.env.X402_JWT_SECRET || 'dev-secret-change-in-production-32chars';
const TREASURY_PRINCIPAL = process.env.X402_TREASURY_PRINCIPAL || '';
const REAL_PAYMENTS_ENABLED = process.env.X402_REAL_PAYMENTS === 'true';

// JWT Payload Structure
export interface X402PaymentJWT {
  sub: string;           // payer principal
  svc: string;           // service endpoint
  amt: number;           // amount in ckALGO (6 decimals)
  txId: string;          // canister transfer index or simulated ID
  iat: number;           // issued at (seconds)
  exp: number;           // expiry (seconds)
  jti: string;           // unique token ID
  real: boolean;         // whether this is a real payment
}

export interface X402PaymentRequest {
  serviceEndpoint: string;
  paymentAmount: number;      // In ckALGO
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
  realPayment: boolean;
}

export interface X402ServiceMetrics {
  totalPayments: number;
  totalRevenue: number;
  averagePaymentAmount: number;
  successRate: number;
  realPaymentCount: number;
  simulatedPaymentCount: number;
  topServices: Array<{
    endpoint: string;
    payments: number;
    revenue: number;
  }>;
}

export interface X402TokenVerification {
  valid: boolean;
  payload?: X402PaymentJWT;
  error?: string;
}

class X402Service {
  private metrics: X402ServiceMetrics = {
    totalPayments: 0,
    totalRevenue: 0,
    averagePaymentAmount: 0,
    successRate: 0,
    realPaymentCount: 0,
    simulatedPaymentCount: 0,
    topServices: []
  };

  private paymentHistory: Array<{
    timestamp: Date;
    amount: number;
    service: string;
    status: string;
    principal: string;
    realPayment: boolean;
  }> = [];

  // Replay protection: track used token IDs
  private usedTokenIds = new Set<string>();

  // Payment records for audit
  private paymentRecords = new Map<string, {
    principal: string;
    service: string;
    amount: number;
    txId: string;
    timestamp: Date;
    confirmed: boolean;
    realPayment: boolean;
  }>();

  // Performance optimization
  private transactionIdCounter = 0;
  private instanceId = Math.random().toString(36).substr(2, 4);

  constructor() {
    if (REAL_PAYMENTS_ENABLED && !TREASURY_PRINCIPAL) {
      console.warn('X402_REAL_PAYMENTS is enabled but X402_TREASURY_PRINCIPAL is not set!');
    }
    console.log(`X402Service initialized (real payments: ${REAL_PAYMENTS_ENABLED})`);
  }

  /**
   * Get X402 middleware configuration for AI services
   */
  getAIServiceRoutes(): RoutesConfig {
    return {
      '/api/sippar/ai/query': { price: 0.01, network: 'base' as Network },
      '/api/sippar/ai/enhanced-query': { price: 0.05, network: 'base' as Network },
      '/api/sippar/ai/chat-auth': { price: 0.02, network: 'base' as Network }
    };
  }

  /**
   * Get X402 middleware configuration for ckALGO services
   */
  getCkAlgoServiceRoutes(): RoutesConfig {
    return {
      '/api/sippar/x402/mint-ckALGO': { price: 0.001, network: 'base' as Network },
      '/api/sippar/x402/redeem-ckALGO': { price: 0.001, network: 'base' as Network },
      '/api/sippar/x402/agent-marketplace': { price: 0.005, network: 'base' as Network }
    };
  }

  /**
   * Create X402 middleware for all protected routes
   */
  createMiddleware() {
    const protectedRoutes = {
      ...this.getAIServiceRoutes(),
      '/api/sippar/x402/mint-ckALGO': { price: 0.001, network: 'base' as Network },
      '/api/sippar/x402/redeem-ckALGO': { price: 0.001, network: 'base' as Network }
    };
    const payToAddress = '0x1234567890123456789012345678901234567890';
    return paymentMiddleware(payToAddress, protectedRoutes);
  }

  /**
   * Generate optimized transaction ID
   */
  private generateTransactionId(prefix: string = 'x402'): string {
    this.transactionIdCounter++;
    return `${prefix}-${this.instanceId}-${this.transactionIdCounter}-${Date.now()}`;
  }

  /**
   * Create payment with REAL ckALGO transfer
   */
  async createRealPayment(request: X402PaymentRequest): Promise<X402PaymentResponse> {
    const startTime = Date.now();

    // Validate treasury principal is configured
    if (!TREASURY_PRINCIPAL) {
      throw new Error('Treasury principal not configured (X402_TREASURY_PRINCIPAL env var)');
    }

    // Validate payer principal format
    let payerPrincipal: Principal;
    try {
      payerPrincipal = Principal.fromText(request.payerCredentials.principal);
    } catch {
      throw new Error(`Invalid payer principal: ${request.payerCredentials.principal}`);
    }

    let treasuryPrincipal: Principal;
    try {
      treasuryPrincipal = Principal.fromText(TREASURY_PRINCIPAL);
    } catch {
      throw new Error(`Invalid treasury principal: ${TREASURY_PRINCIPAL}`);
    }

    // Convert amount to microALGO (6 decimals)
    const amountMicroAlgo = BigInt(Math.floor(request.paymentAmount * 1_000_000));

    if (amountMicroAlgo <= 0n) {
      throw new Error('Payment amount must be positive');
    }

    // Execute real transfer on canister
    let transferIndex: bigint;
    try {
      transferIndex = await simplifiedBridgeService.adminTransferCkAlgo(
        payerPrincipal,
        treasuryPrincipal,
        amountMicroAlgo
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown transfer error';
      console.error(`X402 real payment failed: ${errorMsg}`);
      throw new Error(`Payment transfer failed: ${errorMsg}`);
    }

    const txId = `TX-${transferIndex.toString()}`;

    // Generate signed JWT token
    const tokenId = this.generateTransactionId('jti');
    const expiryTime = Date.now() + (24 * 60 * 60 * 1000); // 24 hours

    const payload: X402PaymentJWT = {
      sub: request.payerCredentials.principal,
      svc: request.serviceEndpoint,
      amt: request.paymentAmount,
      txId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(expiryTime / 1000),
      jti: tokenId,
      real: true
    };

    const token = jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256' });

    // Record payment
    this.paymentRecords.set(tokenId, {
      principal: request.payerCredentials.principal,
      service: request.serviceEndpoint,
      amount: request.paymentAmount,
      txId,
      timestamp: new Date(),
      confirmed: true,
      realPayment: true
    });

    // Update metrics
    this.updateMetrics(request, true);
    this.metrics.realPaymentCount++;

    const duration = Date.now() - startTime;
    console.log(`X402 real payment completed: ${txId} (${duration}ms)`);

    return {
      transactionId: txId,
      paymentStatus: 'confirmed',
      serviceAccessToken: token,
      expiryTime,
      realPayment: true
    };
  }

  /**
   * Create simulated payment (for testing/backwards compatibility)
   */
  async createSimulatedPayment(request: X402PaymentRequest): Promise<X402PaymentResponse> {
    const txId = this.generateTransactionId('SIM');
    const tokenId = this.generateTransactionId('jti');
    const expiryTime = Date.now() + (24 * 60 * 60 * 1000);

    const payload: X402PaymentJWT = {
      sub: request.payerCredentials.principal,
      svc: request.serviceEndpoint,
      amt: request.paymentAmount,
      txId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(expiryTime / 1000),
      jti: tokenId,
      real: false
    };

    const token = jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256' });

    // Record simulated payment
    this.paymentRecords.set(tokenId, {
      principal: request.payerCredentials.principal,
      service: request.serviceEndpoint,
      amount: request.paymentAmount,
      txId,
      timestamp: new Date(),
      confirmed: true,
      realPayment: false
    });

    // Update metrics
    this.updateMetrics(request, false);
    this.metrics.simulatedPaymentCount++;

    return {
      transactionId: txId,
      paymentStatus: 'confirmed',
      serviceAccessToken: token,
      expiryTime,
      realPayment: false
    };
  }

  /**
   * Create payment - routes to real or simulated based on config
   */
  async createEnterprisePayment(request: X402PaymentRequest): Promise<X402PaymentResponse> {
    if (REAL_PAYMENTS_ENABLED) {
      return this.createRealPayment(request);
    }
    return this.createSimulatedPayment(request);
  }

  /**
   * Verify JWT token with cryptographic signature check
   */
  verifyServiceToken(token: string): X402TokenVerification {
    try {
      // First try JWT verification
      const decoded = jwt.verify(token, JWT_SECRET) as X402PaymentJWT;

      // Check if token was already used (replay protection)
      if (this.usedTokenIds.has(decoded.jti)) {
        return { valid: false, error: 'Token already used' };
      }

      // Check expiry (jwt.verify already checks this, but be explicit)
      if (decoded.exp * 1000 < Date.now()) {
        return { valid: false, error: 'Token expired' };
      }

      return { valid: true, payload: decoded };
    } catch (jwtError) {
      // Fall back to legacy Base64 token verification for backwards compatibility
      try {
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
        if (decoded.expiry && decoded.expiry > Date.now()) {
          // Legacy token - create a pseudo-payload
          return {
            valid: true,
            payload: {
              sub: decoded.principal || 'legacy',
              svc: decoded.service || 'unknown',
              amt: 0,
              txId: decoded.txId || 'legacy',
              iat: Math.floor(Date.now() / 1000),
              exp: Math.floor(decoded.expiry / 1000),
              jti: `legacy-${Date.now()}`,
              real: false
            }
          };
        }
        return { valid: false, error: 'Legacy token expired' };
      } catch {
        const errorMsg = jwtError instanceof Error ? jwtError.message : 'Invalid token';
        return { valid: false, error: errorMsg };
      }
    }
  }

  /**
   * Mark token as used (call after successful service execution)
   * Prevents token replay attacks
   */
  consumeToken(tokenId: string): void {
    this.usedTokenIds.add(tokenId);

    // Clean up old used tokens (keep last 10000)
    if (this.usedTokenIds.size > 10000) {
      const tokens = Array.from(this.usedTokenIds);
      tokens.slice(0, -10000).forEach(t => this.usedTokenIds.delete(t));
    }
  }

  /**
   * Legacy compatibility - simple boolean verification
   */
  verifyServiceTokenLegacy(token: string): boolean {
    const result = this.verifyServiceToken(token);
    return result.valid;
  }

  /**
   * Get payment record by token ID
   */
  getPaymentRecord(tokenId: string) {
    return this.paymentRecords.get(tokenId);
  }

  /**
   * Update metrics
   */
  private updateMetrics(request: X402PaymentRequest, realPayment: boolean): void {
    this.metrics.totalPayments++;
    this.metrics.totalRevenue += request.paymentAmount;
    this.metrics.averagePaymentAmount = this.metrics.totalRevenue / this.metrics.totalPayments;

    this.paymentHistory.push({
      timestamp: new Date(),
      amount: request.paymentAmount,
      service: request.serviceEndpoint,
      status: 'success',
      principal: request.payerCredentials.principal,
      realPayment
    });

    // Update top services
    this.updateTopServices(request.serviceEndpoint, request.paymentAmount);
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
   * Check if real payments are enabled
   */
  isRealPaymentsEnabled(): boolean {
    return REAL_PAYMENTS_ENABLED;
  }

  /**
   * Get treasury principal (for debugging)
   */
  getTreasuryPrincipal(): string {
    return TREASURY_PRINCIPAL;
  }
}

export const x402Service = new X402Service();
