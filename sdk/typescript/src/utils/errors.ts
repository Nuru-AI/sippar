/**
 * Sippar SDK Error Handling
 */

export enum ErrorCode {
  // General Errors
  UNKNOWN = 'UNKNOWN',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  INVALID_CONFIG = 'INVALID_CONFIG',

  // Authentication Errors
  NOT_AUTHENTICATED = 'NOT_AUTHENTICATED',
  INVALID_PRINCIPAL = 'INVALID_PRINCIPAL',
  AUTH_FAILED = 'AUTH_FAILED',

  // AI Service Errors
  AI_QUERY_FAILED = 'AI_QUERY_FAILED',
  AI_ORACLE_FAILED = 'AI_ORACLE_FAILED',
  AI_ENHANCED_FAILED = 'AI_ENHANCED_FAILED',
  AI_CHAT_AUTH_FAILED = 'AI_CHAT_AUTH_FAILED',
  AI_HEALTH_FAILED = 'AI_HEALTH_FAILED',
  AI_ORACLE_HEALTH_FAILED = 'AI_ORACLE_HEALTH_FAILED',

  // ckALGO Service Errors
  CKALGO_MINT_FAILED = 'CKALGO_MINT_FAILED',
  CKALGO_REDEEM_FAILED = 'CKALGO_REDEEM_FAILED',
  CKALGO_BALANCE_FAILED = 'CKALGO_BALANCE_FAILED',
  CKALGO_TRANSFER_FAILED = 'CKALGO_TRANSFER_FAILED',

  // Cross-Chain Errors
  CROSS_CHAIN_FAILED = 'CROSS_CHAIN_FAILED',
  ALGORAND_CONNECTION_FAILED = 'ALGORAND_CONNECTION_FAILED',
  ICP_CONNECTION_FAILED = 'ICP_CONNECTION_FAILED',
  THRESHOLD_SIGNATURE_FAILED = 'THRESHOLD_SIGNATURE_FAILED',

  // Validation Errors
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',

  // X402 Payment Protocol Errors
  X402_PAYMENT_FAILED = 'X402_PAYMENT_FAILED',
  X402_PAYMENT_TIMEOUT = 'X402_PAYMENT_TIMEOUT',
  X402_TOKEN_INVALID = 'X402_TOKEN_INVALID',
  X402_SERVICE_UNAVAILABLE = 'X402_SERVICE_UNAVAILABLE',
  X402_MARKETPLACE_FAILED = 'X402_MARKETPLACE_FAILED',
  X402_ANALYTICS_FAILED = 'X402_ANALYTICS_FAILED',
  X402_BILLING_FAILED = 'X402_BILLING_FAILED',

  // API Errors
  API_ERROR = 'API_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED'
}

export class SipparError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: any;

  constructor(code: ErrorCode, message: string, details?: any) {
    super(message);
    this.name = 'SipparError';
    this.code = code;
    this.details = details;
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details
    };
  }
}

/**
 * Create a SipparError from an unknown error
 */
export function createSipparError(error: unknown, fallbackCode: ErrorCode = ErrorCode.UNKNOWN): SipparError {
  if (error instanceof SipparError) {
    return error;
  }

  if (error instanceof Error) {
    return new SipparError(fallbackCode, error.message);
  }

  return new SipparError(fallbackCode, String(error));
}