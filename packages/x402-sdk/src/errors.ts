/**
 * Error classes for X402 Payment Protocol SDK
 */

export class X402Error extends Error {
  public code?: string;
  public readonly details?: any;

  constructor(message: string, details?: any) {
    super(message);
    this.name = 'X402Error';
    this.details = details;

    if (details?.code) {
      this.code = details.code;
    }
  }
}

export class PaymentRequiredError extends X402Error {
  constructor(message: string = 'Payment Required', details?: any) {
    super(message, details);
    this.name = 'PaymentRequiredError';
    this.code = 'PAYMENT_REQUIRED';
  }
}

export class InvalidTokenError extends X402Error {
  constructor(message: string = 'Invalid or expired token', details?: any) {
    super(message, details);
    this.name = 'InvalidTokenError';
    this.code = 'INVALID_TOKEN';
  }
}

export class ServiceNotFoundError extends X402Error {
  constructor(service: string, details?: any) {
    super(`Service '${service}' not found in marketplace`, details);
    this.name = 'ServiceNotFoundError';
    this.code = 'SERVICE_NOT_FOUND';
  }
}

export class InsufficientFundsError extends X402Error {
  constructor(required: number, available: number, details?: any) {
    super(`Insufficient funds: required $${required}, available $${available}`, details);
    this.name = 'InsufficientFundsError';
    this.code = 'INSUFFICIENT_FUNDS';
  }
}

export class NetworkError extends X402Error {
  constructor(message: string = 'Network request failed', details?: any) {
    super(message, details);
    this.name = 'NetworkError';
    this.code = 'NETWORK_ERROR';
  }
}