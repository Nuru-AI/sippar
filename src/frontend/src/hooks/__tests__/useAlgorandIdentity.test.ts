/**
 * useAlgorandIdentity Hook Tests - Sprint 010.5 Frontend Testing Infrastructure
 * 
 * Demonstrates hook testing patterns with Zustand store integration:
 * - Hook rendering with renderHook
 * - Store integration verification
 * - Backward compatibility testing
 * - Mock strategies for external dependencies
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAlgorandIdentity } from '../useAlgorandIdentity';
import { useAuthStore } from '../../stores/authStore';
import type { AuthUser, AlgorandChainFusionCredentials } from '../useAlgorandIdentity';

// Mock AuthClient for Internet Identity
const mockAuthClient = {
  create: vi.fn(),
  isAuthenticated: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  getIdentity: vi.fn(),
};

vi.mock('@dfinity/auth-client', () => ({
  AuthClient: mockAuthClient,
}));

// Mock SipparAPIService
vi.mock('../../services/SipparAPIService', () => ({
  default: {
    deriveAlgorandAddress: vi.fn().mockResolvedValue({
      status: 'success',
      data: {
        address: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567890ABCDEFGHIJKLMNOP',
        public_key: 'mock-public-key',
        canister_id: 'vj7ly-diaaa-aaaae-abvoq-cai',
      }
    }),
  }
}));

// Mock Principal
vi.mock('@dfinity/principal', () => ({
  Principal: {
    fromText: vi.fn(),
  }
}));

// Test utilities
const createMockUser = (overrides: Partial<AuthUser> = {}): AuthUser => ({
  principal: 'test-principal-123',
  accountId: 'test-account-456',
  isAuthenticated: true,
  isPremium: false,
  dailyMessagesUsed: 0,
  dailyLimit: 10,
  ...overrides,
});

const createMockCredentials = (overrides: Partial<AlgorandChainFusionCredentials> = {}): AlgorandChainFusionCredentials => ({
  algorandAddress: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567890ABCDEFGHIJKLMNOP',
  signature: 'sippar_threshold_test-principal_123456789',
  timestamp: Date.now(),
  addresses: { algorand: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567890ABCDEFGHIJKLMNOP' },
  ...overrides,
});

describe('useAlgorandIdentity Hook', () => {
  beforeEach(() => {
    // Reset store and mocks
    useAuthStore.getState().logout();
    vi.clearAllMocks();
    
    // Setup default mock behaviors
    mockAuthClient.create.mockResolvedValue(mockAuthClient);
    mockAuthClient.isAuthenticated.mockResolvedValue(false);
  });

  describe('Hook API Backward Compatibility', () => {
    it('maintains exact API structure from Sprint 010', () => {
      const { result } = renderHook(() => useAlgorandIdentity());

      // Verify all expected properties are present
      expect(result.current).toHaveProperty('user');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('credentials');
      expect(result.current).toHaveProperty('login');
      expect(result.current).toHaveProperty('logout');
      expect(result.current).toHaveProperty('checkAuthStatus');
      expect(result.current).toHaveProperty('incrementMessageCount');
      expect(result.current).toHaveProperty('canSendMessage');
      expect(result.current).toHaveProperty('getRemainingMessages');
      expect(result.current).toHaveProperty('isAuthenticated');
      expect(result.current).toHaveProperty('isPremium');
    });

    it('returns correct types for all properties', () => {
      const { result } = renderHook(() => useAlgorandIdentity());

      // Type checking through runtime verification
      expect(typeof result.current.login).toBe('function');
      expect(typeof result.current.logout).toBe('function');
      expect(typeof result.current.checkAuthStatus).toBe('function');
      expect(typeof result.current.incrementMessageCount).toBe('function');
      expect(typeof result.current.canSendMessage).toBe('function');
      expect(typeof result.current.getRemainingMessages).toBe('function');
      expect(typeof result.current.isAuthenticated).toBe('boolean');
      expect(typeof result.current.isPremium).toBe('boolean');
      expect(typeof result.current.isLoading).toBe('boolean');
    });

    it('provides same interface as pre-Sprint 010 implementation', () => {
      const mockUser = createMockUser();
      const mockCredentials = createMockCredentials();
      
      useAuthStore.getState().setUser(mockUser);
      useAuthStore.getState().setCredentials(mockCredentials);
      
      const { result } = renderHook(() => useAlgorandIdentity());
      
      // Should return same data structure as before Zustand migration
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.credentials).toEqual(mockCredentials);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isPremium).toBe(false);
    });
  });

  describe('Store Integration', () => {
    it('correctly reads from Zustand auth store', () => {
      const mockUser = createMockUser({
        principal: 'store-integration-test',
        isPremium: true,
      });
      
      useAuthStore.getState().setUser(mockUser);
      
      const { result } = renderHook(() => useAlgorandIdentity());
      
      expect(result.current.user?.principal).toBe('store-integration-test');
      expect(result.current.isPremium).toBe(true);
    });

    it('reacts to store changes automatically', async () => {
      const { result } = renderHook(() => useAlgorandIdentity());
      
      // Initially guest user
      expect(result.current.isAuthenticated).toBe(false);
      
      // Change store state
      act(() => {
        const mockUser = createMockUser();
        useAuthStore.getState().setUser(mockUser);
      });
      
      // Hook should reflect store changes
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });
    });

    it('updates store when using hook actions', async () => {
      const { result } = renderHook(() => useAlgorandIdentity());
      
      // Use hook action
      act(() => {
        result.current.incrementMessageCount();
      });
      
      // Store should be updated
      const state = useAuthStore.getState();
      expect(state.user?.dailyMessagesUsed).toBeGreaterThan(0);
    });

    it('handles store loading states correctly', () => {
      useAuthStore.getState().setLoading(true);
      
      const { result } = renderHook(() => useAlgorandIdentity());
      
      expect(result.current.isLoading).toBe(true);
    });

    it('handles store error states correctly', () => {
      const testError = {
        code: 'TEST_ERROR',
        message: 'Test error message',
      };
      
      useAuthStore.getState().setError(testError);
      
      const { result } = renderHook(() => useAlgorandIdentity());
      
      expect(result.current.error).toEqual(testError);
    });
  });

  describe('Authentication Functions', () => {
    it('canSendMessage function works correctly', () => {
      const { result } = renderHook(() => useAlgorandIdentity());
      
      // Guest user should be able to send messages
      expect(result.current.canSendMessage()).toBe(true);
      
      // Set user at limit
      act(() => {
        const mockUser = createMockUser({
          dailyMessagesUsed: 10,
          dailyLimit: 10,
          isPremium: false,
        });
        useAuthStore.getState().setUser(mockUser);
      });
      
      expect(result.current.canSendMessage()).toBe(false);
    });

    it('getRemainingMessages function works correctly', () => {
      const { result } = renderHook(() => useAlgorandIdentity());
      
      // Guest user should have 10 remaining
      expect(result.current.getRemainingMessages()).toBe(10);
      
      // Set premium user
      act(() => {
        const mockUser = createMockUser({ isPremium: true });
        useAuthStore.getState().setUser(mockUser);
      });
      
      expect(result.current.getRemainingMessages()).toBe(-1); // Unlimited
    });

    it('incrementMessageCount updates store correctly', () => {
      const mockUser = createMockUser({
        dailyMessagesUsed: 5,
        isPremium: false,
      });
      
      useAuthStore.getState().setUser(mockUser);
      
      const { result } = renderHook(() => useAlgorandIdentity());
      
      act(() => {
        result.current.incrementMessageCount();
      });
      
      const state = useAuthStore.getState();
      expect(state.user?.dailyMessagesUsed).toBe(6);
    });

    it('incrementMessageCount does not affect premium users', () => {
      const mockUser = createMockUser({
        dailyMessagesUsed: 5,
        isPremium: true,
      });
      
      useAuthStore.getState().setUser(mockUser);
      
      const { result } = renderHook(() => useAlgorandIdentity());
      
      act(() => {
        result.current.incrementMessageCount();
      });
      
      const state = useAuthStore.getState();
      expect(state.user?.dailyMessagesUsed).toBe(5); // Should not change
    });
  });

  describe('Authentication Status Computed Properties', () => {
    it('isAuthenticated reflects store authentication state', () => {
      const { result } = renderHook(() => useAlgorandIdentity());
      
      // Initially guest (not authenticated)
      expect(result.current.isAuthenticated).toBe(false);
      
      act(() => {
        const mockUser = createMockUser();
        useAuthStore.getState().setUser(mockUser);
      });
      
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('isPremium reflects store premium status', () => {
      const { result } = renderHook(() => useAlgorandIdentity());
      
      // Initially not premium
      expect(result.current.isPremium).toBe(false);
      
      act(() => {
        const mockUser = createMockUser({ isPremium: true });
        useAuthStore.getState().setUser(mockUser);
      });
      
      expect(result.current.isPremium).toBe(true);
    });
  });

  describe('Login/Logout Functions', () => {
    it('login function is callable', async () => {
      const { result } = renderHook(() => useAlgorandIdentity());
      
      // Should not throw when called
      expect(typeof result.current.login).toBe('function');
      
      // Note: Full login testing would require more complex mocking
      // of Internet Identity and network requests
    });

    it('logout function resets store correctly', async () => {
      // Set authenticated state
      const mockUser = createMockUser();
      const mockCredentials = createMockCredentials();
      
      useAuthStore.getState().setUser(mockUser);
      useAuthStore.getState().setCredentials(mockCredentials);
      
      const { result } = renderHook(() => useAlgorandIdentity());
      
      expect(result.current.isAuthenticated).toBe(true);
      
      // Call logout
      await act(async () => {
        await result.current.logout();
      });
      
      // Should reset to guest state
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.credentials).toBeNull();
    });

    it('checkAuthStatus function is callable', async () => {
      const { result } = renderHook(() => useAlgorandIdentity());
      
      expect(typeof result.current.checkAuthStatus).toBe('function');
      
      // Should not throw when called
      await act(async () => {
        await result.current.checkAuthStatus();
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles missing localStorage gracefully', () => {
      // Mock localStorage to return null
      const mockGetItem = vi.spyOn(Storage.prototype, 'getItem');
      mockGetItem.mockReturnValue(null);
      
      const { result } = renderHook(() => useAlgorandIdentity());
      
      // Should still render without errors
      expect(result.current).toBeDefined();
      expect(result.current.user).toBeDefined();
      
      mockGetItem.mockRestore();
    });

    it('handles rapid state changes gracefully', () => {
      const { result } = renderHook(() => useAlgorandIdentity());
      
      act(() => {
        // Rapid state changes
        const user1 = createMockUser({ principal: 'user-1' });
        const user2 = createMockUser({ principal: 'user-2' });
        
        useAuthStore.getState().setUser(user1);
        useAuthStore.getState().setUser(user2);
        useAuthStore.getState().setUser(null);
      });
      
      // Should handle changes without errors
      expect(result.current).toBeDefined();
    });

    it('handles malformed user data gracefully', () => {
      const incompleteUser = {
        principal: 'test-principal',
        // Missing required fields
      } as AuthUser;
      
      act(() => {
        useAuthStore.getState().setUser(incompleteUser);
      });
      
      const { result } = renderHook(() => useAlgorandIdentity());
      
      // Should not crash
      expect(result.current).toBeDefined();
      expect(result.current.user).toBeDefined();
    });
  });

  describe('Memory and Performance', () => {
    it('does not create new functions on every render', () => {
      const { result, rerender } = renderHook(() => useAlgorandIdentity());
      
      const firstLogin = result.current.login;
      const firstLogout = result.current.logout;
      const firstCheckAuth = result.current.checkAuthStatus;
      
      rerender();
      
      // Functions should be stable across rerenders
      expect(result.current.login).toBe(firstLogin);
      expect(result.current.logout).toBe(firstLogout);
      expect(result.current.checkAuthStatus).toBe(firstCheckAuth);
    });
  });
});