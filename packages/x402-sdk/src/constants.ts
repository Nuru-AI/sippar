/**
 * Constants and configuration for X402 Payment Protocol SDK
 */

import { X402Config } from './types';

/**
 * Default configuration for X402 Client
 */
export const DEFAULT_X402_CONFIG: Partial<X402Config> = {
  baseURL: 'https://nuru.network/api/sippar',
  timeout: 30000
};

/**
 * X402 API endpoints for different services
 */
export const X402_ENDPOINTS = {
  CREATE_PAYMENT: '/x402/create-payment',
  PAYMENT_STATUS: '/x402/payment-status',
  VERIFY_TOKEN: '/x402/verify-token',
  MARKETPLACE: '/x402/agent-marketplace',
  ANALYTICS: '/x402/analytics',
  ENTERPRISE_BILLING: '/x402/enterprise-billing',
  AI_QUERY: '/ai/query',
  AI_ENHANCED_QUERY: '/ai/enhanced-query'
} as const;

/**
 * Supported AI models in the X402 ecosystem
 */
export const SUPPORTED_AI_MODELS = [
  'deepseek-r1',
  'qwen2.5',
  'phi-3',
  'mistral'
] as const;

/**
 * Available services in the X402 marketplace
 */
export const SUPPORTED_SERVICES = {
  'ai-oracle-basic': {
    name: 'AI Oracle Basic',
    description: 'Basic AI processing with standard models',
    basePrice: 0.01
  },
  'ai-oracle-enhanced': {
    name: 'AI Oracle Enhanced',
    description: 'Advanced AI processing with reasoning capabilities',
    basePrice: 0.05
  },
  'market-analysis': {
    name: 'Market Analysis',
    description: 'Real-time cryptocurrency market analysis',
    basePrice: 0.03
  },
  'data-analytics': {
    name: 'Data Analytics',
    description: 'Advanced data processing and insights',
    basePrice: 0.02
  },
  'enterprise-ai': {
    name: 'Enterprise AI',
    description: 'High-performance AI for enterprise applications',
    basePrice: 0.10
  }
} as const;

/**
 * Payment and token configuration constants
 */
export const PAYMENT_CONFIG = {
  TOKEN_VALIDITY_HOURS: 24,
  MAX_PAYMENT_AMOUNT: 100.0,
  MIN_PAYMENT_AMOUNT: 0.01,
  DEFAULT_TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000
} as const;

/**
 * Algorand integration constants
 */
export const ALGORAND_CONFIG = {
  TESTNET_API: 'https://testnet-api.algonode.cloud',
  MAINNET_API: 'https://mainnet-api.algonode.cloud',
  ADDRESS_LENGTH: 58,
  TRANSACTION_TIMEOUT: 10000
} as const;

/**
 * X402 HTTP status codes and response handling
 */
export const HTTP_STATUS = {
  PAYMENT_REQUIRED: 402,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500
} as const;

/**
 * SDK version and user agent information
 */
export const SDK_INFO = {
  NAME: '@sippar/x402-sdk',
  VERSION: '1.0.0',
  USER_AGENT: '@sippar/x402-sdk/1.0.0',
  REPOSITORY: 'https://github.com/Nuru-AI/sippar',
  DOCUMENTATION: 'https://nuru.network/sippar/'
} as const;