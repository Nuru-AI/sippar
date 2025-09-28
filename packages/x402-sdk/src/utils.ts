/**
 * Utility functions for X402 Payment Protocol SDK
 */

/**
 * Validates if a payment token has the correct format
 * @param token Service token to validate
 * @returns true if token format is valid
 */
export function validatePaymentToken(token: string): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }

  // Basic JWT format check (header.payload.signature)
  const parts = token.split('.');
  if (parts.length !== 3) {
    return false;
  }

  // Check if each part is base64url encoded (basic validation)
  const base64UrlPattern = /^[A-Za-z0-9_-]+$/;
  return parts.every(part => part.length > 0 && base64UrlPattern.test(part));
}

/**
 * Validates Algorand address format
 * @param address Algorand address to validate
 * @returns true if address format is valid
 */
export function isValidAlgorandAddress(address: string): boolean {
  if (!address || typeof address !== 'string') {
    return false;
  }

  // Algorand addresses are 58 characters, base32 encoded
  if (address.length !== 58) {
    return false;
  }

  // Base32 alphabet (no 0, 1, 8, 9)
  const base32Pattern = /^[A-Z2-7]+$/;
  return base32Pattern.test(address);
}

/**
 * Formats payment amount for display
 * @param amount Amount in USD
 * @returns Formatted amount string
 */
export function formatPaymentAmount(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  }).format(amount);
}

/**
 * Validates Internet Identity principal format
 * @param principal ICP principal to validate
 * @returns true if principal format is valid
 */
export function isValidICPPrincipal(principal: string): boolean {
  if (!principal || typeof principal !== 'string') {
    return false;
  }

  // ICP principals are base32 encoded with specific format
  // Length typically 27-63 characters with dashes
  const principalPattern = /^[a-z0-9-]+$/;
  return principal.length >= 27 &&
         principal.length <= 63 &&
         principalPattern.test(principal) &&
         principal.includes('-');
}

/**
 * Creates a delay for retrying operations
 * @param ms Milliseconds to delay
 * @returns Promise that resolves after delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retries an async operation with exponential backoff
 * @param operation Function to retry
 * @param maxRetries Maximum number of retry attempts
 * @param baseDelay Base delay in milliseconds
 * @returns Promise with operation result
 */
export async function retry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        throw lastError;
      }

      // Exponential backoff: 1s, 2s, 4s...
      const delayMs = baseDelay * Math.pow(2, attempt);
      await delay(delayMs);
    }
  }

  throw lastError!;
}

/**
 * Sanitizes user input for API requests
 * @param input User input to sanitize
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML
    .substring(0, 1000); // Limit length
}

/**
 * Generates a unique request ID for tracking
 * @returns Unique identifier string
 */
export function generateRequestId(): string {
  return `x402_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}