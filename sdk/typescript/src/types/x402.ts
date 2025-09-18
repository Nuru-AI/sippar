/**
 * X402 Payment Protocol Types
 * Type definitions for X402 micropayment integration
 */

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

export interface MarketplaceService {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  endpoint: string;
}

export interface X402Metrics {
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

export interface PaymentHistoryItem {
  timestamp: string;
  amount: number;
  service: string;
  status: 'success' | 'failed' | 'pending';
  principal: string;
}

export interface X402Analytics {
  metrics: X402Metrics;
  recentPayments: PaymentHistoryItem[];
  timestamp: string;
}

export interface EnterpriseBilling {
  principal: string;
  billingPeriod: string;
  services: string[];
  totalUsage: number;
  totalCost: number;
  currency: string;
  paymentStatus: string;
  nextBillingDate: string;
}

/**
 * X402 Service Configuration
 */
export interface X402Config {
  /** Payment recipient address */
  payToAddress?: string;
  /** Default network for payments */
  network?: 'base' | 'base-sepolia' | 'ethereum' | 'polygon';
  /** Default currency for payments */
  currency?: 'USD' | 'USDC' | 'ETH';
  /** Timeout for payment operations in milliseconds */
  paymentTimeout?: number;
}

/**
 * X402 Payment Flow Events
 */
export interface X402PaymentEvents {
  onPaymentStarted?: (paymentRequest: X402PaymentRequest) => void;
  onPaymentSuccess?: (payment: X402PaymentResponse) => void;
  onPaymentFailure?: (error: string, paymentRequest: X402PaymentRequest) => void;
  onServiceAccessGranted?: (serviceToken: string, service: string) => void;
}

/**
 * X402 Service Usage Statistics
 */
export interface X402ServiceStats {
  serviceId: string;
  serviceName: string;
  totalCalls: number;
  totalSpent: number;
  averageCost: number;
  lastUsed: string;
  successRate: number;
}

/**
 * X402 AI Service Integration
 */
export interface X402AIServiceCall {
  service: MarketplaceService;
  query: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  paymentMethod?: 'automatic' | 'manual';
}

/**
 * X402 Batch Payment for multiple services
 */
export interface X402BatchPayment {
  services: Array<{
    endpoint: string;
    amount: number;
    metadata?: Record<string, any>;
  }>;
  totalAmount: number;
  payerCredentials: {
    principal: string;
    algorandAddress: string;
  };
  batchId: string;
}

/**
 * X402 Subscription Model (for future enterprise features)
 */
export interface X402Subscription {
  subscriptionId: string;
  principal: string;
  plan: 'basic' | 'premium' | 'enterprise';
  services: string[];
  monthlyLimit: number;
  currentUsage: number;
  nextBillingDate: string;
  status: 'active' | 'paused' | 'cancelled';
}