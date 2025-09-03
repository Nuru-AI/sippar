/**
 * Utility functions for Sippar Algorand Bridge
 * Based on Nuru AI Design System from Agent Forge
 * 
 * Provides comprehensive utilities for Algorand Chain Fusion integration
 */

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines class names with clsx and merges Tailwind classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format currency values
 */
export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount)
}

/**
 * Format large numbers with K, M, B suffixes
 */
export function formatCompactNumber(
  number: number,
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(number)
}

/**
 * Format Algorand amounts (microAlgos to ALGO)
 */
export function formatAlgorandAmount(
  microAlgos: number | bigint,
  decimals: number = 6,
  showSymbol: boolean = true
): string {
  const algos = Number(microAlgos) / (10 ** decimals)
  const formatted = formatCompactNumber(algos)
  return showSymbol ? `${formatted} ALGO` : formatted
}

/**
 * Format percentages
 */
export function formatPercentage(
  value: number,
  decimals: number = 1,
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100)
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

/**
 * Truncate Algorand address for display
 */
export function truncateAlgorandAddress(address: string, startChars: number = 8, endChars: number = 6): string {
  if (!address || address.length <= startChars + endChars) return address
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`
}

/**
 * Generate a unique ID
 */
export function generateId(prefix: string = 'sippar'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Throttle function calls
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

/**
 * Check if code is running in browser
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

/**
 * Check if running in Telegram WebApp
 */
export function isTelegramWebApp(): boolean {
  return isBrowser() && !!(window as any).Telegram?.WebApp
}

/**
 * Get Telegram theme parameters
 */
export function getTelegramTheme(): Record<string, string> | null {
  if (!isTelegramWebApp()) return null
  return (window as any).Telegram.WebApp.themeParams || null
}

/**
 * Send haptic feedback (Telegram WebApp)
 */
export function sendHapticFeedback(
  type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error'
): void {
  if (!isTelegramWebApp()) return

  const telegram = (window as any).Telegram
  if (!telegram?.WebApp?.HapticFeedback) return

  switch (type) {
    case 'light':
    case 'medium':
    case 'heavy':
      telegram.WebApp.HapticFeedback.impactOccurred(type)
      break
    case 'success':
    case 'warning':
    case 'error':
      telegram.WebApp.HapticFeedback.notificationOccurred(type)
      break
  }
}

/**
 * Validate email address
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate Algorand address
 */
export function isValidAlgorandAddress(address: string): boolean {
  // Algorand addresses are 58 characters long and start with specific letters
  const algorandRegex = /^[A-Z2-7]{58}$/
  return algorandRegex.test(address)
}

/**
 * Validate Cardano address (from Agent Forge)
 */
export function isValidCardanoAddress(address: string): boolean {
  // Basic Cardano address validation
  const cardanoRegex = /^addr1[a-z0-9]{58}$|^stake1[a-z0-9]{53}$/
  return cardanoRegex.test(address)
}

/**
 * Validate URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Get initials from name
 */
export function getInitials(name: string, maxLength: number = 2): string {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .slice(0, maxLength)
}

/**
 * Calculate reading time (words per minute)
 */
export function calculateReadingTime(
  text: string,
  wordsPerMinute: number = 200
): number {
  const wordCount = text.trim().split(/\s+/).length
  return Math.ceil(wordCount / wordsPerMinute)
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Deep merge objects
 */
export function deepMerge<T extends Record<string, any>>(
  target: T,
  ...sources: Partial<T>[]
): T {
  if (!sources.length) return target
  const source = sources.shift()

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} })
        deepMerge(target[key], source[key])
      } else {
        Object.assign(target, { [key]: source[key] })
      }
    }
  }

  return deepMerge(target, ...sources)
}

/**
 * Check if value is an object
 */
function isObject(item: any): item is Record<string, any> {
  return item && typeof item === 'object' && !Array.isArray(item)
}

/**
 * Capitalize first letter
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Convert camelCase to kebab-case
 */
export function camelToKebab(str: string): string {
  return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase()
}

/**
 * Convert kebab-case to camelCase
 */
export function kebabToCamel(str: string): string {
  return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T>(
  json: string,
  fallback: T
): T {
  try {
    return JSON.parse(json)
  } catch {
    return fallback
  }
}

/**
 * Get nested object property safely
 */
export function getNestedProperty<T>(
  obj: any,
  path: string,
  defaultValue: T
): T {
  const keys = path.split('.')
  let result = obj

  for (const key of keys) {
    if (result?.[key] === undefined) {
      return defaultValue
    }
    result = result[key]
  }

  return result ?? defaultValue
}

/**
 * Create range of numbers
 */
export function range(start: number, end: number, step: number = 1): number[] {
  const result: number[] = []
  for (let i = start; i < end; i += step) {
    result.push(i)
  }
  return result
}

/**
 * Wait for specified time (Promise-based delay)
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Retry function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      if (attempt === maxAttempts) {
        throw lastError
      }

      const delay = initialDelay * Math.pow(2, attempt - 1)
      await wait(delay)
    }
  }

  throw lastError!
}

/**
 * Local storage helpers with error handling
 */
export const storage = {
  get: <T>(key: string, defaultValue: T): T => {
    if (!isBrowser()) return defaultValue

    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch {
      return defaultValue
    }
  },

  set: <T>(key: string, value: T): void => {
    if (!isBrowser()) return

    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.warn('Failed to save to localStorage:', error)
    }
  },

  remove: (key: string): void => {
    if (!isBrowser()) return

    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error)
    }
  },

  clear: (): void => {
    if (!isBrowser()) return

    try {
      localStorage.clear()
    } catch (error) {
      console.warn('Failed to clear localStorage:', error)
    }
  },
}

/**
 * Color manipulation utilities
 */
export const color = {
  /**
   * Convert hex to RGB
   */
  hexToRgb: (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null
  },

  /**
   * Convert RGB to hex
   */
  rgbToHex: (r: number, g: number, b: number): string => {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16)
      return hex.length === 1 ? '0' + hex : hex
    }).join('')
  },

  /**
   * Add opacity to hex color
   */
  withOpacity: (hex: string, opacity: number): string => {
    const rgb = color.hexToRgb(hex)
    if (!rgb) return hex

    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`
  },
}

/**
 * Algorand-specific utilities
 */
export const algorand = {
  /**
   * Convert microAlgos to ALGO
   */
  microAlgosToAlgo: (microAlgos: number | bigint): number => {
    return Number(microAlgos) / 1000000
  },

  /**
   * Convert ALGO to microAlgos
   */
  algoToMicroAlgos: (algo: number): bigint => {
    return BigInt(Math.floor(algo * 1000000))
  },

  /**
   * Format transaction ID for display
   */
  formatTxId: (txId: string, startChars: number = 8, endChars: number = 6): string => {
    return truncateText(txId, startChars + endChars)
  },

  /**
   * Check if transaction is confirmed
   */
  isTxConfirmed: (confirmedRound: number): boolean => {
    return confirmedRound > 0
  },

  /**
   * Calculate transaction fee in ALGO
   */
  calculateFeeInAlgo: (feeInMicroAlgos: number): number => {
    return algorand.microAlgosToAlgo(feeInMicroAlgos)
  }
}

/**
 * Export all utilities as default
 */
export default {
  cn,
  formatCurrency,
  formatCompactNumber,
  formatAlgorandAmount,
  formatPercentage,
  truncateText,
  truncateAlgorandAddress,
  generateId,
  debounce,
  throttle,
  isBrowser,
  isTelegramWebApp,
  getTelegramTheme,
  sendHapticFeedback,
  isValidEmail,
  isValidAlgorandAddress,
  isValidCardanoAddress,
  isValidUrl,
  getInitials,
  calculateReadingTime,
  formatFileSize,
  deepMerge,
  capitalize,
  camelToKebab,
  kebabToCamel,
  safeJsonParse,
  getNestedProperty,
  range,
  wait,
  retry,
  storage,
  color,
  algorand,
}