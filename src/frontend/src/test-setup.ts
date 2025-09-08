/**
 * Test Setup Configuration for Sprint 010.5
 * 
 * Global test environment setup for Vitest + React Testing Library
 * Mocks Internet Identity and external dependencies for testing
 */

import '@testing-library/jest-dom';
import { vi, beforeEach, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Mock Internet Identity for testing
global.AuthClient = vi.fn();

// Mock localStorage with proper implementation
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
});

// Mock fetch API for HTTP requests
global.fetch = vi.fn();

// Mock console methods to reduce noise in tests (optional)
global.console = {
  ...console,
  // Suppress console.log in tests unless specifically needed
  log: vi.fn(),
  // Keep error and warn for debugging
  error: console.error,
  warn: console.warn,
};

// Mock window.dispatchEvent for custom events
Object.defineProperty(window, 'dispatchEvent', {
  value: vi.fn(),
  writable: true,
});

// Mock navigator for biometric tests if needed
Object.defineProperty(navigator, 'userAgent', {
  value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  writable: true,
});

// Setup default fetch mock responses
beforeEach(() => {
  // Default fetch mock for API calls
  (global.fetch as any).mockImplementation((url: string) => {
    if (url.includes('/api/ai/status')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          status: 'offline',
          models: ['qwen2.5:0.5b', 'deepseek-r1', 'phi-3', 'mistral']
        })
      });
    }
    
    if (url.includes('/api/ai/auth-url')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          authUrl: 'https://mock-ai-chat-url.com'
        })
      });
    }
    
    // Default response for other API calls
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ status: 'success' })
    });
  });
});

// Setup cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});