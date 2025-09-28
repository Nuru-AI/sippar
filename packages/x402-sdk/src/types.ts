/**
 * Core type definitions for X402 Payment Protocol SDK
 */

export interface X402Config {
  /** Base URL for Sippar X402 API (default: https://nuru.network/api/sippar) */
  baseURL?: string;
  /** Internet Identity principal for payment authentication */
  principal: string;
  /** Algorand address derived from threshold signatures */
  algorandAddress: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** API key for enterprise accounts (optional) */
  apiKey?: string;
}

export interface X402PaymentRequest {
  /** Service identifier from marketplace */
  service: string;
  /** Payment amount in USD */
  amount: number;
  /** Optional metadata for payment tracking */
  metadata?: Record<string, any>;
}

export interface X402PaymentResponse {
  /** Whether payment creation was successful */
  success: boolean;
  /** Unique payment identifier */
  paymentId: string;
  /** Service access token (24-hour validity) */
  serviceToken: string;
  /** Payment expiration timestamp */
  expiresAt: string;
  /** Algorand integration proof */
  algorandIntegration: {
    backingAddress: string;
    thresholdControlled: boolean;
    canisterId: string;
    mathematicalProof: string;
  };
}

export interface X402ServiceToken {
  /** JWT token for service access */
  token: string;
  /** Token validity status */
  valid: boolean;
  /** Service identifier */
  service: string;
  /** Token expiration timestamp */
  expiresAt: string;
  /** Remaining usage count (if applicable) */
  remainingUses?: number;
}

export interface X402PaymentStatus {
  /** Payment identifier */
  paymentId: string;
  /** Current payment status */
  status: 'pending' | 'completed' | 'failed' | 'expired';
  /** Payment amount */
  amount: number;
  /** Service identifier */
  service: string;
  /** Creation timestamp */
  createdAt: string;
  /** Status update timestamp */
  updatedAt: string;
  /** Service token (if payment completed) */
  serviceToken?: string;
}

export interface X402ServiceInfo {
  /** Service unique identifier */
  id: string;
  /** Human-readable service name */
  name: string;
  /** Service description */
  description: string;
  /** Price per use in USD */
  price: number;
  /** API endpoint path */
  endpoint: string;
  /** Service capabilities */
  capabilities: string[];
  /** Algorand-specific features */
  algorand_features?: {
    threshold_backed: boolean;
    address_derivation: boolean;
    smart_contract_integration: boolean;
    transaction_proof: boolean;
    mathematical_verification: boolean;
  };
}

export interface X402MarketplaceResponse {
  /** Request success status */
  success: boolean;
  /** Service marketplace data */
  marketplace: {
    /** Total number of available services */
    totalServices: number;
    /** Array of available services */
    services: X402ServiceInfo[];
    /** Integration status */
    algorand_integration: string;
  };
}

export interface X402AnalyticsResponse {
  /** Request success status */
  success: boolean;
  /** Analytics data */
  analytics: {
    /** Overall payment metrics */
    metrics: {
      totalPayments: number;
      totalRevenue: number;
      averagePaymentAmount: number;
      successRate: number;
    };
    /** Algorand-specific metrics */
    algorand_integration_metrics: {
      threshold_signatures_used: number;
      algorand_addresses_derived: number;
      successful_algo_transactions: number;
      average_transaction_time: string;
      network_success_rate: number;
    };
    /** Service usage breakdown */
    service_usage: Record<string, {
      calls: number;
      algorand_addresses?: number;
      algo_amount?: number;
    }>;
    /** Threshold signature performance */
    threshold_signature_performance: {
      success_rate: number;
      average_signature_time: string;
      canister_cycles_used: number;
    };
  };
}

export interface X402ErrorResponse {
  /** Request success status (always false for errors) */
  success: false;
  /** Error message */
  error: string;
  /** Error code for programmatic handling */
  code?: string;
  /** Additional error details */
  details?: Record<string, any>;
}

/**
 * Service call options for X402-protected endpoints
 */
export interface X402ServiceCallOptions {
  /** Service access token */
  token: string;
  /** Request timeout override */
  timeout?: number;
  /** Additional headers */
  headers?: Record<string, string>;
}

/**
 * AI service specific request format
 */
export interface X402AIRequest {
  /** AI query string */
  query: string;
  /** AI model to use (optional) */
  model?: 'deepseek-r1' | 'qwen2.5' | 'phi-3' | 'mistral';
  /** Response format preferences */
  options?: {
    explanation?: boolean;
    confidence_score?: boolean;
    reasoning_steps?: boolean;
  };
}

/**
 * AI service response format
 */
export interface X402AIResponse {
  /** Request success status */
  success: boolean;
  /** AI-generated response */
  ai_response: string;
  /** Confidence score (0-1) */
  confidence?: number;
  /** Model used for processing */
  model_used?: string;
  /** Algorand integration proof */
  algorand_integration?: {
    user_address: string;
    threshold_controlled: boolean;
    mathematical_backing: boolean;
    canister_id: string;
  };
}

/**
 * Enterprise billing request format
 */
export interface X402EnterpriseBillingRequest {
  /** Usage amount or service calls */
  usage: number;
  /** Billing period (optional) */
  period?: string;
  /** Additional billing metadata */
  metadata?: Record<string, any>;
}

/**
 * Enterprise billing response format
 */
export interface X402EnterpriseBillingResponse {
  /** Request success status */
  success: boolean;
  /** Billing information */
  billing: {
    /** Supported services */
    services: string[];
    /** Total usage amount */
    totalUsage: number;
    /** Total cost in USD */
    totalCost: number;
    /** Currency */
    currency: string;
    /** Payment status */
    paymentStatus: string;
    /** Next billing date */
    nextBillingDate: string;
  };
}