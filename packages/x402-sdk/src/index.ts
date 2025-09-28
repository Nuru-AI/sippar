/**
 * @sippar/x402-sdk
 *
 * TypeScript SDK for X402 Payment Protocol with ICP Chain Fusion integration
 * World's first autonomous AI-to-AI payment system with mathematical security backing
 *
 * @author Sippar Development Team
 * @version 1.0.0
 * @license MIT
 */

export { X402Client } from './X402Client';

// Type exports
export type {
  X402Config,
  X402PaymentRequest,
  X402PaymentResponse,
  X402ServiceToken,
  X402PaymentStatus,
  X402ServiceInfo,
  X402MarketplaceResponse,
  X402AnalyticsResponse,
  X402ErrorResponse,
  X402ServiceCallOptions,
  X402AIRequest,
  X402AIResponse,
  X402EnterpriseBillingRequest,
  X402EnterpriseBillingResponse
} from './types';

// Utility exports
export {
  X402Error,
  PaymentRequiredError,
  InvalidTokenError,
  ServiceNotFoundError,
  InsufficientFundsError,
  NetworkError
} from './errors';
export { validatePaymentToken, isValidAlgorandAddress, formatPaymentAmount } from './utils';

// Constants
export { X402_ENDPOINTS, DEFAULT_X402_CONFIG, SUPPORTED_SERVICES } from './constants';

/**
 * Quick start example:
 *
 * ```typescript
 * import { X402Client } from '@sippar/x402-sdk';
 *
 * const client = new X402Client({
 *   baseURL: 'https://nuru.network/api/sippar',
 *   principal: 'your-internet-identity-principal',
 *   algorandAddress: 'your-algorand-address'
 * });
 *
 * // Create payment for AI service
 * const payment = await client.createPayment({
 *   service: 'ai-oracle-enhanced',
 *   amount: 0.05
 * });
 *
 * // Use AI service with payment token
 * const response = await client.queryAI({
 *   query: 'Analyze market conditions',
 *   model: 'deepseek-r1'
 * }, payment.serviceToken);
 * ```
 */