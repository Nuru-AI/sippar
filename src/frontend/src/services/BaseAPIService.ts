/**
 * BaseAPIService.ts - Foundation for Sippar API Services
 * Copied from Rabbi's proven BaseAPIService pattern
 * 
 * Provides bulletproof error handling, null safety, and timeout management
 * All Sippar API services must extend this base class
 */

// ================================
// CORE INTERFACES
// ================================

/**
 * Standardized response interface for all API services
 * Provides consistent error handling and metadata across all services
 */
export interface SafeServiceResponse<T> {
  data?: T;
  error?: string;
  status: 'success' | 'error' | 'partial';
  timestamp: number;
  source?: string; // For debugging which service provided data
  responseTime?: number; // For performance monitoring
  cached?: boolean; // Indicates if response came from cache
}

/**
 * Configuration options for service calls
 */
export interface ServiceCallOptions {
  timeout?: number;
  retries?: number;
  useCache?: boolean;
  cacheTTL?: number;
}

// ================================
// BASE API SERVICE CLASS
// ================================

/**
 * Abstract base class that all API services MUST extend
 * Provides bulletproof error handling and null safety patterns
 */
export abstract class BaseAPIService {
  protected serviceName: string;
  protected defaultTimeout: number = 5000; // 5 seconds default
  protected defaultRetries: number = 2;
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  // ================================
  // CRITICAL SAFETY METHODS
  // ================================

  /**
   * CRITICAL: Safe formatting for ALL .toFixed() calls
   * This method prevents ALL TypeError crashes from undefined values
   * 
   * @param value - Any value that might be undefined/null
   * @param decimals - Number of decimal places
   * @param fallback - Safe fallback string
   * @returns Safely formatted string
   */
  protected safeFormat(
    value: any, 
    decimals: number, 
    fallback: string
  ): string {
    try {
      // Handle all possible edge cases
      if (value === null || value === undefined) {
        return fallback;
      }
      
      if (typeof value === 'string') {
        const parsed = parseFloat(value);
        if (isNaN(parsed)) return fallback;
        return parsed.toFixed(decimals);
      }
      
      if (typeof value === 'number') {
        if (isNaN(value) || !isFinite(value)) return fallback;
        return value.toFixed(decimals);
      }
      
      // Try to convert other types
      const numericValue = Number(value);
      if (isNaN(numericValue) || !isFinite(numericValue)) return fallback;
      return numericValue.toFixed(decimals);
      
    } catch (error) {
      console.warn(`⚠️ ${this.serviceName}: safeFormat failed for value:`, value, error);
      return fallback;
    }
  }

  /**
   * CRITICAL: Safe API call with timeout and comprehensive error handling
   * This method handles ALL external API failures gracefully
   * 
   * @param apiCall - Function that makes the API call
   * @param fallback - Fallback data to return on failure
   * @param options - Service call configuration
   */
  protected async safeApiCall<T>(
    apiCall: () => Promise<T>,
    fallback: T,
    options: ServiceCallOptions = {}
  ): Promise<SafeServiceResponse<T>> {
    const {
      timeout = this.defaultTimeout,
      retries = this.defaultRetries,
      useCache = false,
      cacheTTL = 30000
    } = options;

    const startTime = Date.now();
    let lastError: Error | null = null;

    // Check cache first if enabled
    if (useCache) {
      const cached = this.getFromCache<T>(`${this.serviceName}-${apiCall.toString().slice(0, 50)}`);
      if (cached) {
        return {
          data: cached,
          status: 'success',
          timestamp: Date.now(),
          source: this.serviceName,
          responseTime: Date.now() - startTime,
          cached: true
        };
      }
    }

    // Retry loop with exponential backoff
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const data = await Promise.race([
          apiCall(),
          new Promise<T>((_, reject) => 
            setTimeout(
              () => reject(new Error(`${this.serviceName} timeout after ${timeout}ms`)), 
              timeout
            )
          )
        ]);
        
        const responseTime = Date.now() - startTime;
        
        // Cache successful response if enabled
        if (useCache) {
          this.setCache(`${this.serviceName}-${apiCall.toString().slice(0, 50)}`, data, cacheTTL);
        }
        
        return {
          data,
          status: 'success',
          timestamp: Date.now(),
          source: this.serviceName,
          responseTime,
          cached: false
        };
        
      } catch (error: any) {
        lastError = error;
        const responseTime = Date.now() - startTime;
        
        console.warn(`⚠️ ${this.serviceName}: API call failed (attempt ${attempt + 1}/${retries + 1}):`, error.message);
        
        // If not the last attempt, wait before retrying (exponential backoff)
        if (attempt < retries) {
          const backoffDelay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s, etc.
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
          continue;
        }
        
        // Final failure - return fallback with error details
        console.error(`❌ ${this.serviceName}: All retry attempts failed, using fallback data`);
        
        return {
          data: fallback,
          status: 'error',
          error: lastError?.message || 'Unknown API error',
          timestamp: Date.now(),
          source: this.serviceName,
          responseTime
        };
      }
    }

    // This should never be reached, but TypeScript requires it
    return {
      data: fallback,
      status: 'error',
      error: lastError?.message || 'Unknown error in retry loop',
      timestamp: Date.now(),
      source: this.serviceName,
      responseTime: Date.now() - startTime
    };
  }

  /**
   * Safe property access with null checking
   * Prevents TypeError: Cannot read properties of undefined
   */
  protected safeAccess<T>(obj: any, path: string, fallback: T): T {
    try {
      const keys = path.split('.');
      let current = obj;
      
      for (const key of keys) {
        if (current === null || current === undefined) {
          return fallback;
        }
        current = current[key];
      }
      
      return current !== undefined ? current : fallback;
    } catch (error) {
      console.warn(`⚠️ ${this.serviceName}: safeAccess failed for path '${path}':`, error);
      return fallback;
    }
  }

  // ================================
  // CACHE MANAGEMENT
  // ================================

  private getCacheKey(identifier: string): string {
    return `${this.serviceName}-${identifier}`;
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  protected clearServiceCache(): void {
    this.cache.clear();
  }

  // ================================
  // ABSTRACT METHODS
  // ================================

  /**
   * Health check method that all services MUST implement
   * Used for monitoring service availability and performance
   */
  abstract async healthCheck(): Promise<SafeServiceResponse<{ 
    healthy: boolean;
    responseTime?: number;
    lastError?: string;
  }>>;

  // ================================
  // UTILITY METHODS
  // ================================

  /**
   * Create standardized error response
   */
  protected createErrorResponse<T>(
    error: string, 
    fallbackData: T
  ): SafeServiceResponse<T> {
    return {
      data: fallbackData,
      status: 'error',
      error,
      timestamp: Date.now(),
      source: this.serviceName
    };
  }

  /**
   * Create standardized success response
   */
  protected createSuccessResponse<T>(
    data: T, 
    responseTime?: number
  ): SafeServiceResponse<T> {
    return {
      data,
      status: 'success',
      timestamp: Date.now(),
      source: this.serviceName,
      responseTime
    };
  }
}

// ================================
// EXPORT TYPES AND CONSTANTS
// ================================

export type ServiceStatus = 'success' | 'error' | 'partial';

export const SERVICE_TIMEOUTS = {
  FAST: 2000,      // 2 seconds for quick operations
  NORMAL: 5000,    // 5 seconds for standard operations  
  SLOW: 10000,     // 10 seconds for blockchain operations
  VERY_SLOW: 30000 // 30 seconds for complex operations
} as const;

export const SERVICE_CACHE_TTL = {
  SHORT: 10000,    // 10 seconds for rapidly changing data
  MEDIUM: 30000,   // 30 seconds for moderate data
  LONG: 300000,    // 5 minutes for stable data
  VERY_LONG: 3600000 // 1 hour for very stable data
} as const;