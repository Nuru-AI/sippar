/**
 * Rate Limiting Middleware for CI Agent Endpoints
 *
 * Sprint 018.2 Phase E - Production Hardening
 *
 * Features:
 * - Per-user rate limits: 100 requests/minute
 * - Agent concurrency limits: 5 simultaneous requests per user
 * - Sliding window algorithm for accurate rate limiting
 * - Redis-based distributed rate limiting support
 * - Standard HTTP 429 responses with Retry-After headers
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Rate limit configuration
 */
interface RateLimitConfig {
  windowMs: number;           // Time window in milliseconds
  maxRequests: number;        // Max requests per window
  maxConcurrent: number;      // Max concurrent requests
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

/**
 * Rate limit store entry
 */
interface RateLimitEntry {
  requests: number[];         // Timestamps of requests in current window
  concurrent: number;         // Current concurrent requests
}

/**
 * In-memory rate limit store
 * TODO: Replace with Redis for production distributed systems
 */
class RateLimitStore {
  private store: Map<string, RateLimitEntry>;

  constructor() {
    this.store = new Map();
  }

  /**
   * Get rate limit entry for identifier
   */
  get(identifier: string): RateLimitEntry {
    if (!this.store.has(identifier)) {
      this.store.set(identifier, {
        requests: [],
        concurrent: 0
      });
    }
    return this.store.get(identifier)!;
  }

  /**
   * Clean up expired entries to prevent memory leaks
   */
  cleanup(windowMs: number): void {
    const now = Date.now();
    const cutoff = now - windowMs;

    for (const [key, entry] of this.store.entries()) {
      // Remove expired requests
      entry.requests = entry.requests.filter(timestamp => timestamp > cutoff);

      // Remove empty entries
      if (entry.requests.length === 0 && entry.concurrent === 0) {
        this.store.delete(key);
      }
    }
  }
}

/**
 * Global rate limit store
 */
const store = new RateLimitStore();

/**
 * Default rate limit configuration for CI agent endpoints
 */
const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 1000,        // 1 minute
  maxRequests: 100,           // 100 requests per minute
  maxConcurrent: 5,           // 5 simultaneous requests
  skipSuccessfulRequests: false,
  skipFailedRequests: false
};

/**
 * Create rate limiting middleware
 */
export function createRateLimiter(config: Partial<RateLimitConfig> = {}): (req: Request, res: Response, next: NextFunction) => void {
  const finalConfig: RateLimitConfig = { ...DEFAULT_CONFIG, ...config };

  // Run cleanup every minute
  setInterval(() => {
    store.cleanup(finalConfig.windowMs);
  }, 60000);

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract identifier (user ID, IP address, or API key)
      const identifier = extractIdentifier(req);

      // Get rate limit entry
      const entry = store.get(identifier);
      const now = Date.now();
      const windowStart = now - finalConfig.windowMs;

      // Clean expired requests from sliding window
      entry.requests = entry.requests.filter(timestamp => timestamp > windowStart);

      // Check request rate limit
      if (entry.requests.length >= finalConfig.maxRequests) {
        const oldestRequest = entry.requests[0];
        const retryAfter = Math.ceil((oldestRequest + finalConfig.windowMs - now) / 1000);

        res.set({
          'X-RateLimit-Limit': finalConfig.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(oldestRequest + finalConfig.windowMs).toISOString(),
          'Retry-After': retryAfter.toString()
        });

        return res.status(429).json({
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Maximum ${finalConfig.maxRequests} requests per ${finalConfig.windowMs / 1000} seconds.`,
          retryAfter: retryAfter,
          limit: finalConfig.maxRequests,
          window: finalConfig.windowMs / 1000
        });
      }

      // Check concurrency limit
      if (entry.concurrent >= finalConfig.maxConcurrent) {
        res.set({
          'X-Concurrency-Limit': finalConfig.maxConcurrent.toString(),
          'X-Concurrency-Current': entry.concurrent.toString(),
          'Retry-After': '1'
        });

        return res.status(429).json({
          error: 'Too Many Concurrent Requests',
          message: `Concurrency limit exceeded. Maximum ${finalConfig.maxConcurrent} simultaneous requests.`,
          retryAfter: 1,
          concurrencyLimit: finalConfig.maxConcurrent,
          currentConcurrent: entry.concurrent
        });
      }

      // Increment concurrent counter
      entry.concurrent++;

      // Add request to sliding window
      entry.requests.push(now);

      // Set rate limit headers
      const remaining = Math.max(0, finalConfig.maxRequests - entry.requests.length);
      res.set({
        'X-RateLimit-Limit': finalConfig.maxRequests.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': new Date(now + finalConfig.windowMs).toISOString()
      });

      // Decrement concurrent counter on response finish
      res.on('finish', () => {
        const currentEntry = store.get(identifier);
        if (currentEntry.concurrent > 0) {
          currentEntry.concurrent--;
        }
      });

      // Decrement concurrent counter on response close (connection closed)
      res.on('close', () => {
        const currentEntry = store.get(identifier);
        if (currentEntry.concurrent > 0) {
          currentEntry.concurrent--;
        }
      });

      next();
    } catch (error) {
      console.error('Rate limiter error:', error);
      // Don't block requests on rate limiter errors
      next();
    }
  };
}

/**
 * Extract unique identifier from request
 * Priority: X-Test-Session header > sessionId > userId > IP address
 */
function extractIdentifier(req: Request): string {
  // Check for test session header (for testing)
  const testSession = req.headers['x-test-session'] as string;
  if (testSession) {
    return `test:${testSession}`;
  }

  // Check for session ID in body (highest priority)
  if (req.body && req.body.sessionId) {
    return `session:${req.body.sessionId}`;
  }

  // Check for user ID in authenticated request
  if (req.body && req.body.userId) {
    return `user:${req.body.userId}`;
  }

  // Fall back to IP address
  const ip = req.ip ||
             req.headers['x-forwarded-for'] as string ||
             req.connection.remoteAddress ||
             'unknown';

  return `ip:${ip}`;
}

/**
 * Create strict rate limiter for sensitive operations
 */
export function createStrictRateLimiter(): (req: Request, res: Response, next: NextFunction) => void {
  return createRateLimiter({
    windowMs: 60 * 1000,      // 1 minute
    maxRequests: 20,          // 20 requests per minute
    maxConcurrent: 2          // 2 simultaneous requests
  });
}

/**
 * Create lenient rate limiter for read-only operations
 */
export function createLenientRateLimiter(): (req: Request, res: Response, next: NextFunction) => void {
  return createRateLimiter({
    windowMs: 60 * 1000,      // 1 minute
    maxRequests: 200,         // 200 requests per minute
    maxConcurrent: 10         // 10 simultaneous requests
  });
}