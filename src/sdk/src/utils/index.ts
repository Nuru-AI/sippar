// ckALGO SDK Utilities
// Sprint 012.5 Day 15-16: Developer SDK Foundation

import { Principal } from '@dfinity/principal';
import { UserTier } from '../types';

/**
 * Format ckALGO amounts for display
 */
export function formatCkALGO(amount: string | number, decimals: number = 8): string {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;
  const divisor = Math.pow(10, decimals);
  const formatted = (value / divisor).toFixed(decimals);
  
  // Remove trailing zeros
  return parseFloat(formatted).toString();
}

/**
 * Parse ckALGO amounts from user input
 */
export function parseCkALGO(amount: string, decimals: number = 8): string {
  const value = parseFloat(amount);
  if (isNaN(value)) {
    throw new Error('Invalid amount format');
  }
  
  const multiplier = Math.pow(10, decimals);
  return Math.floor(value * multiplier).toString();
}

/**
 * Validate Algorand address format
 */
export function isValidAlgorandAddress(address: string): boolean {
  // Basic Algorand address validation
  if (!address || address.length !== 58) {
    return false;
  }
  
  // Check if it contains only valid base32 characters
  const base32Regex = /^[A-Z2-7]+$/;
  return base32Regex.test(address);
}

/**
 * Validate ICP Principal format
 */
export function isValidPrincipal(principal: string): boolean {
  try {
    Principal.fromText(principal);
    return true;
  } catch {
    return false;
  }
}

/**
 * Convert Principal to text with validation
 */
export function principalToText(principal: Principal | string): string {
  if (typeof principal === 'string') {
    if (!isValidPrincipal(principal)) {
      throw new Error('Invalid principal format');
    }
    return principal;
  }
  return principal.toText();
}

/**
 * Convert text to Principal with validation
 */
export function textToPrincipal(text: string): Principal {
  if (!isValidPrincipal(text)) {
    throw new Error('Invalid principal format');
  }
  return Principal.fromText(text);
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: number, options: {
  format?: 'date' | 'datetime' | 'time' | 'relative';
  locale?: string;
} = {}): string {
  const date = new Date(timestamp);
  const locale = options.locale || 'en-US';
  
  switch (options.format) {
    case 'date':
      return date.toLocaleDateString(locale);
    case 'time':
      return date.toLocaleTimeString(locale);
    case 'relative':
      return formatRelativeTime(timestamp);
    case 'datetime':
    default:
      return date.toLocaleString(locale);
  }
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  
  if (years > 0) return `${years} year${years > 1 ? 's' : ''} ago`;
  if (months > 0) return `${months} month${months > 1 ? 's' : ''} ago`;
  if (weeks > 0) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  if (seconds > 10) return `${seconds} seconds ago`;
  return 'Just now';
}

/**
 * Calculate user tier benefits
 */
export function getTierBenefits(tier: UserTier): {
  aiQueryDiscount: number;
  smartContractsAllowed: boolean;
  crossChainOperations: boolean;
  batchProcessing: boolean;
  revenueAnalytics: boolean;
  prioritySupport: boolean;
  maxGasLimit: number;
  monthlyQueryLimit: number;
} {
  switch (tier) {
    case UserTier.Free:
      return {
        aiQueryDiscount: 0,
        smartContractsAllowed: false,
        crossChainOperations: false,
        batchProcessing: false,
        revenueAnalytics: false,
        prioritySupport: false,
        maxGasLimit: 1000,
        monthlyQueryLimit: 100
      };
    
    case UserTier.Developer:
      return {
        aiQueryDiscount: 25,
        smartContractsAllowed: true,
        crossChainOperations: true,
        batchProcessing: false,
        revenueAnalytics: false,
        prioritySupport: false,
        maxGasLimit: 10000,
        monthlyQueryLimit: 1000
      };
    
    case UserTier.Professional:
      return {
        aiQueryDiscount: 50,
        smartContractsAllowed: true,
        crossChainOperations: true,
        batchProcessing: true,
        revenueAnalytics: true,
        prioritySupport: true,
        maxGasLimit: 100000,
        monthlyQueryLimit: 10000
      };
    
    case UserTier.Enterprise:
      return {
        aiQueryDiscount: 75,
        smartContractsAllowed: true,
        crossChainOperations: true,
        batchProcessing: true,
        revenueAnalytics: true,
        prioritySupport: true,
        maxGasLimit: 1000000,
        monthlyQueryLimit: -1 // Unlimited
      };
    
    default:
      throw new Error(`Unknown user tier: ${tier}`);
  }
}

/**
 * Generate unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Sleep utility for async operations
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry utility for failed operations
 */
export async function retry<T>(
  operation: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delay?: number;
    backoffMultiplier?: number;
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delay = 1000,
    backoffMultiplier = 2,
    onRetry
  } = options;

  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts) {
        throw lastError;
      }
      
      if (onRetry) {
        onRetry(attempt, lastError);
      }
      
      const waitTime = delay * Math.pow(backoffMultiplier, attempt - 1);
      await sleep(waitTime);
    }
  }
  
  throw lastError!;
}

/**
 * Debounce utility for limiting function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle utility for limiting function calls
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let lastFunc: NodeJS.Timeout;
  let lastRan: number;
  
  return (...args: Parameters<T>) => {
    if (!lastRan) {
      func(...args);
      lastRan = Date.now();
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(() => {
        if ((Date.now() - lastRan) >= limit) {
          func(...args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  };
}

/**
 * Event emitter utility for SDK events
 */
export class EventEmitter<T extends Record<string, any[]>> {
  private listeners: Map<keyof T, Set<(...args: any[]) => void>> = new Map();

  on<K extends keyof T>(event: K, listener: (...args: T[K]) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    
    this.listeners.get(event)!.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(listener);
    };
  }

  emit<K extends keyof T>(event: K, ...args: T[K]): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          console.error(`Error in event listener for ${String(event)}:`, error);
        }
      });
    }
  }

  removeAllListeners(event?: keyof T): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

/**
 * Local storage wrapper with error handling
 */
export class SafeLocalStorage {
  static set(key: string, value: any): boolean {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
      return false;
    }
  }

  static get<T>(key: string, defaultValue?: T): T | undefined {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Failed to read from localStorage:', error);
      return defaultValue;
    }
  }

  static remove(key: string): boolean {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Failed to remove from localStorage:', error);
      return false;
    }
  }

  static clear(): boolean {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
      return false;
    }
  }
}

// Export commonly used constants
export const CONSTANTS = {
  CKAGO_DECIMALS: 8,
  ALGO_DECIMALS: 6,
  MAX_MEMO_LENGTH: 1000,
  DEFAULT_GAS_LIMIT: 5000,
  ALGORAND_ADDRESS_LENGTH: 58,
  MIN_BALANCE_ALGO: 100000, // 0.1 ALGO in microALGO
} as const;