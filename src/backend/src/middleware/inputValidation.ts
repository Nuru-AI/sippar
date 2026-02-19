/**
 * Input Validation Middleware for CI Agent Endpoints
 *
 * Sprint 018.2 Phase F - Security Hardening
 *
 * Features:
 * - Request body validation and sanitization
 * - SQL injection prevention
 * - XSS attack prevention
 * - Command injection prevention
 * - Path traversal prevention
 * - Payload size limits
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

/**
 * Maximum payload sizes (in bytes)
 */
const MAX_PAYLOAD_SIZE = {
  agent_invocation: 10 * 1024,      // 10 KB for agent invocations
  marketplace: 1 * 1024,             // 1 KB for marketplace queries
  analytics: 1 * 1024,               // 1 KB for analytics queries
  payment: 5 * 1024                  // 5 KB for payment data
};

/**
 * Validation schemas using Zod
 */

// Agent invocation request schema
const agentInvocationSchema = z.object({
  sessionId: z.string()
    .min(1, 'Session ID required')
    .max(100, 'Session ID too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid session ID format'),

  requirements: z.record(z.any()).optional(),

  paymentVerified: z.boolean().optional(),

  principal: z.string()
    .max(100, 'Principal too long')
    .optional(),

  userId: z.string()
    .max(100, 'User ID too long')
    .optional()
});

// Payment creation schema
const paymentCreationSchema = z.object({
  serviceType: z.enum(['agent_invocation', 'bulk_processing', 'enterprise']),

  agentId: z.string()
    .min(1, 'Agent ID required')
    .max(50, 'Agent ID too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid agent ID format'),

  principal: z.string()
    .max(100, 'Principal too long')
    .optional(),

  metadata: z.record(z.any()).optional()
});

// Smart routing request schema
const smartRoutingSchema = z.object({
  taskDescription: z.string()
    .min(1, 'Task description required')
    .max(1000, 'Task description too long'),

  sessionId: z.string()
    .min(1, 'Session ID required')
    .max(100, 'Session ID too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid session ID format'),

  userId: z.string()
    .max(100, 'User ID too long')
    .optional()
});

/**
 * Sanitize string to prevent injection attacks
 */
function sanitizeString(input: string): string {
  // Remove potential SQL injection patterns
  let sanitized = input.replace(/['";\\]/g, '');

  // Remove potential XSS patterns
  sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, '');
  sanitized = sanitized.replace(/<iframe[^>]*>.*?<\/iframe>/gi, '');
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=/gi, '');

  // Remove potential command injection patterns
  sanitized = sanitized.replace(/[|&;$`<>]/g, '');

  // Remove potential path traversal patterns
  sanitized = sanitized.replace(/\.\./g, '');
  sanitized = sanitized.replace(/~\//g, '');

  return sanitized.trim();
}

/**
 * Sanitize object recursively
 */
function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (obj !== null && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const sanitizedKey = sanitizeString(key);
      sanitized[sanitizedKey] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
}

/**
 * Check payload size
 */
function checkPayloadSize(req: Request, maxSize: number): boolean {
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  return contentLength <= maxSize;
}

/**
 * Create input validation middleware
 */
export function createInputValidator(schema: z.ZodSchema, maxPayloadSize?: number): (req: Request, res: Response, next: NextFunction) => void {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check payload size if specified
      if (maxPayloadSize && !checkPayloadSize(req, maxPayloadSize)) {
        return res.status(413).json({
          error: 'Payload Too Large',
          message: `Request body exceeds maximum size of ${maxPayloadSize} bytes`,
          max_size: maxPayloadSize
        });
      }

      // Sanitize request body
      if (req.body) {
        req.body = sanitizeObject(req.body);
      }

      // Validate against schema
      const validationResult = schema.safeParse(req.body);

      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));

        return res.status(400).json({
          error: 'Invalid Request',
          message: 'Request validation failed',
          errors
        });
      }

      // Replace body with validated data
      req.body = validationResult.data;

      next();
    } catch (error) {
      console.error('Input validation error:', error);
      return res.status(500).json({
        error: 'Validation Error',
        message: 'An error occurred during request validation'
      });
    }
  };
}

/**
 * Predefined validators for common endpoints
 */

// Agent invocation validator
export const validateAgentInvocation = createInputValidator(
  agentInvocationSchema,
  MAX_PAYLOAD_SIZE.agent_invocation
);

// Payment creation validator
export const validatePaymentCreation = createInputValidator(
  paymentCreationSchema,
  MAX_PAYLOAD_SIZE.payment
);

// Smart routing validator
export const validateSmartRouting = createInputValidator(
  smartRoutingSchema,
  MAX_PAYLOAD_SIZE.agent_invocation
);

/**
 * Query parameter validation middleware
 */
export function validateQueryParams(allowedParams: string[]): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const queryKeys = Object.keys(req.query);
      const invalidParams = queryKeys.filter(key => !allowedParams.includes(key));

      if (invalidParams.length > 0) {
        return res.status(400).json({
          error: 'Invalid Query Parameters',
          message: 'Request contains invalid query parameters',
          invalid_params: invalidParams,
          allowed_params: allowedParams
        });
      }

      // Sanitize query parameter values
      for (const key of queryKeys) {
        const value = req.query[key];
        if (typeof value === 'string') {
          req.query[key] = sanitizeString(value);
        }
      }

      next();
    } catch (error) {
      console.error('Query parameter validation error:', error);
      return res.status(500).json({
        error: 'Validation Error',
        message: 'An error occurred during query parameter validation'
      });
    }
  };
}

/**
 * Path parameter validation middleware
 */
export function validatePathParams(paramValidators: Record<string, (value: string) => boolean>): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      for (const [param, validator] of Object.entries(paramValidators)) {
        const value = req.params[param];

        if (value === undefined) {
          return res.status(400).json({
            error: 'Missing Path Parameter',
            message: `Required path parameter '${param}' is missing`,
            required_param: param
          });
        }

        // Sanitize path parameter
        const sanitized = sanitizeString(value);
        req.params[param] = sanitized;

        // Validate with custom validator
        if (!validator(sanitized)) {
          return res.status(400).json({
            error: 'Invalid Path Parameter',
            message: `Path parameter '${param}' has invalid format`,
            param: param,
            value: sanitized
          });
        }
      }

      next();
    } catch (error) {
      console.error('Path parameter validation error:', error);
      return res.status(500).json({
        error: 'Validation Error',
        message: 'An error occurred during path parameter validation'
      });
    }
  };
}

/**
 * Common path parameter validators
 */
export const pathValidators = {
  // Agent ID validator (alphanumeric, hyphen, underscore)
  agentId: (value: string): boolean => {
    return /^[a-zA-Z0-9_-]{1,50}$/.test(value);
  },

  // Service name validator (alphanumeric, hyphen, underscore)
  serviceName: (value: string): boolean => {
    return /^[a-zA-Z0-9_-]{1,50}$/.test(value);
  },

  // Principal validator (ICP principal format or 'anonymous')
  principal: (value: string): boolean => {
    return value === 'anonymous' || /^[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{3}$/.test(value);
  },

  // Session ID validator (alphanumeric, hyphen, underscore)
  sessionId: (value: string): boolean => {
    return /^[a-zA-Z0-9_-]{1,100}$/.test(value);
  },

  // UUID validator
  uuid: (value: string): boolean => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  }
};

/**
 * General request sanitization middleware
 * Apply to all routes for basic protection
 */
export function sanitizeRequest(req: Request, res: Response, next: NextFunction): void {
  try {
    // Sanitize headers (basic check)
    const dangerousHeaders = ['x-forwarded-host', 'x-original-url'];
    for (const header of dangerousHeaders) {
      if (req.headers[header]) {
        delete req.headers[header];
      }
    }

    // Sanitize body if present
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }

    next();
  } catch (error) {
    console.error('Request sanitization error:', error);
    // Don't block requests on sanitization errors, just log
    next();
  }
}