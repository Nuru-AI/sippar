/**
 * Auth Store Tests - Sprint 010.5 Frontend Testing Infrastructure
 * 
 * Comprehensive unit tests for Zustand auth store covering:
 * - All 12 store actions
 * - 8 state properties  
 * - 6 computed selectors
 * - Persistence logic
 * - Error handling and edge cases
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore, authSelectors } from '../authStore';
import type { AuthUser, AlgorandChainFusionCredentials, AuthError } from '../../hooks/useAlgorandIdentity';

// Mock localStorage for persistence testing
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

describe('Auth Store Actions', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.getState().logout();
    vi.clearAllMocks();
  });

  describe('User Management Actions', () => {
    it('setUser should update user state and authentication status', () => {
      const mockUser: AuthUser = {
        principal: 'test-principal-123',
        accountId: 'test-account-456', 
        isAuthenticated: true,
        isPremium: false,
        dailyMessagesUsed: 5,
        dailyLimit: 10,
      };

      const { setUser } = useAuthStore.getState();
      setUser(mockUser);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.error).toBeNull(); // Should clear errors on successful user set
    });

    it('setUser with null should set isAuthenticated to false', () => {
      const { setUser } = useAuthStore.getState();
      setUser(null);

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('setUser with isAuthenticated false should set isAuthenticated to false', () => {
      const mockUser: AuthUser = {
        principal: 'test-principal',
        accountId: 'test-account',
        isAuthenticated: false, // Not authenticated
        isPremium: false,
        dailyMessagesUsed: 0,
        dailyLimit: 10,
      };

      const { setUser } = useAuthStore.getState();
      setUser(mockUser);

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
    });

    it('setCredentials should update credentials', () => {
      const mockCredentials: AlgorandChainFusionCredentials = {
        algorandAddress: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567890ABCDEFGHIJKLMNOP',
        signature: 'test-signature',
        timestamp: Date.now(),
        addresses: { algorand: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567890ABCDEFGHIJKLMNOP' },
      };

      const { setCredentials } = useAuthStore.getState();
      setCredentials(mockCredentials);

      const state = useAuthStore.getState();
      expect(state.credentials).toEqual(mockCredentials);
    });

    it('setCredentials with null should clear credentials', () => {
      const { setCredentials } = useAuthStore.getState();
      setCredentials(null);

      const state = useAuthStore.getState();
      expect(state.credentials).toBeNull();
    });
  });

  describe('Loading and Error Management Actions', () => {
    it('setLoading should update loading state', () => {
      const { setLoading } = useAuthStore.getState();
      
      setLoading(true);
      expect(useAuthStore.getState().isLoading).toBe(true);
      
      setLoading(false);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('setError should update error state and clear loading', () => {
      const mockError: AuthError = {
        code: 'TEST_ERROR',
        message: 'Test error message',
      };

      // Set loading first
      const { setLoading, setError } = useAuthStore.getState();
      setLoading(true);
      
      setError(mockError);

      const state = useAuthStore.getState();
      expect(state.error).toEqual(mockError);
      expect(state.isLoading).toBe(false); // Should clear loading
    });

    it('setError with null should clear error', () => {
      const { setError } = useAuthStore.getState();
      setError(null);

      const state = useAuthStore.getState();
      expect(state.error).toBeNull();
    });

    it('clearError should clear error state', () => {
      const mockError: AuthError = {
        code: 'TEST_ERROR',
        message: 'Test error message',
      };

      const { setError, clearError } = useAuthStore.getState();
      setError(mockError);
      clearError();

      const state = useAuthStore.getState();
      expect(state.error).toBeNull();
    });
  });

  describe('Balance Management Actions', () => {
    it('setBalances should update balance state with timestamp', () => {
      const { setBalances } = useAuthStore.getState();
      const beforeTime = Date.now();
      
      setBalances(1.5, 2.3);

      const state = useAuthStore.getState();
      expect(state.algoBalance).toBe(1.5);
      expect(state.ckAlgoBalance).toBe(2.3);
      expect(state.balancesLoading).toBe(false);
      expect(state.balancesLastUpdated).toBeGreaterThanOrEqual(beforeTime);
    });

    it('setBalancesLoading should update loading state', () => {
      const { setBalancesLoading } = useAuthStore.getState();
      
      setBalancesLoading(true);
      expect(useAuthStore.getState().balancesLoading).toBe(true);
      
      setBalancesLoading(false);
      expect(useAuthStore.getState().balancesLoading).toBe(false);
    });
  });

  describe('Authentication Actions', () => {
    it('logout should reset to guest user state', () => {
      // Set up authenticated state first
      const mockUser: AuthUser = {
        principal: 'test-principal',
        accountId: 'test-account', 
        isAuthenticated: true,
        isPremium: true,
        dailyMessagesUsed: 5,
        dailyLimit: -1,
      };

      const mockCredentials: AlgorandChainFusionCredentials = {
        algorandAddress: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567890ABCDEFGHIJKLMNOP',
        signature: 'test-signature',
        timestamp: Date.now(),
      };

      const { setUser, setCredentials, setBalances, logout } = useAuthStore.getState();
      setUser(mockUser);
      setCredentials(mockCredentials);
      setBalances(1.5, 2.3);

      // Mock localStorage to return daily messages
      mockLocalStorage.getItem.mockReturnValue('7');

      logout();

      const state = useAuthStore.getState();
      
      // Should create guest user
      expect(state.user).toEqual({
        principal: '',
        accountId: '',
        isAuthenticated: false,
        isPremium: false,
        dailyMessagesUsed: 7, // From localStorage
        dailyLimit: 10,
      });
      
      // Should clear other state
      expect(state.credentials).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.algoBalance).toBe(0);
      expect(state.ckAlgoBalance).toBe(0);
      expect(state.balancesLoading).toBe(false);
      expect(state.balancesLastUpdated).toBe(0);

      // Should clear localStorage
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('sippar_ii_token');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('sippar_ii_user');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('sippar_algorand_credentials');
    });

    it('logout should handle missing localStorage gracefully', () => {
      // Mock localStorage to return null
      mockLocalStorage.getItem.mockReturnValue(null);

      const { logout } = useAuthStore.getState();
      logout();

      const state = useAuthStore.getState();
      expect(state.user?.dailyMessagesUsed).toBe(0); // Default when no localStorage
    });
  });

  describe('Utility Actions', () => {
    it('hydrate should log hydration message', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const { hydrate } = useAuthStore.getState();
      hydrate();

      expect(consoleSpy).toHaveBeenCalledWith('🔄 Auth store hydrated from localStorage');
      consoleSpy.mockRestore();
    });

    it('persist should log persistence message', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const { persist } = useAuthStore.getState();
      persist();

      expect(consoleSpy).toHaveBeenCalledWith('💾 Auth store persisted to localStorage');
      consoleSpy.mockRestore();
    });
  });
});

describe('Auth Store Selectors', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
  });

  describe('Basic Selectors', () => {
    it('should return correct user state', () => {
      const mockUser: AuthUser = {
        principal: 'test-principal',
        accountId: 'test-account',
        isAuthenticated: true,
        isPremium: false,
        dailyMessagesUsed: 0,
        dailyLimit: 10,
      };

      useAuthStore.getState().setUser(mockUser);
      const state = useAuthStore.getState();
      const user = authSelectors.user(state);
      expect(user).toEqual(mockUser);
    });

    it('should return correct credentials state', () => {
      const mockCredentials: AlgorandChainFusionCredentials = {
        algorandAddress: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567890ABCDEFGHIJKLMNOP',
        signature: 'test-signature',
        timestamp: Date.now(),
      };

      useAuthStore.getState().setCredentials(mockCredentials);
      const state = useAuthStore.getState();
      const credentials = authSelectors.credentials(state);
      expect(credentials).toEqual(mockCredentials);
    });

    it('should return correct authentication status', () => {
      const mockUser: AuthUser = {
        principal: 'test-principal',
        accountId: 'test-account',
        isAuthenticated: true,
        isPremium: false,
        dailyMessagesUsed: 0,
        dailyLimit: 10,
      };

      useAuthStore.getState().setUser(mockUser);
      const state = useAuthStore.getState();
      const isAuthenticated = authSelectors.isAuthenticated(state);
      expect(isAuthenticated).toBe(true);
    });

    it('should return correct balances state', () => {
      useAuthStore.getState().setBalances(1.5, 2.3);
      useAuthStore.getState().setBalancesLoading(true);
      
      const state = useAuthStore.getState();
      const balances = authSelectors.balances(state);
      expect(balances.algo).toBe(1.5);
      expect(balances.ckAlgo).toBe(2.3);
      expect(balances.loading).toBe(true);
      expect(balances.lastUpdated).toBeGreaterThan(0);
    });
  });

  describe('Derived State Selectors', () => {
    it('isPremium should return true for premium users', () => {
      const mockUser: AuthUser = {
        principal: 'test-principal',
        accountId: 'test-account', 
        isAuthenticated: true,
        isPremium: true,
        dailyMessagesUsed: 0,
        dailyLimit: -1,
      };

      useAuthStore.getState().setUser(mockUser);
      const state = useAuthStore.getState();
      const isPremium = authSelectors.isPremium(state);
      expect(isPremium).toBe(true);
    });

    it('isPremium should return false for non-premium users', () => {
      const mockUser: AuthUser = {
        principal: 'test-principal',
        accountId: 'test-account',
        isAuthenticated: true,
        isPremium: false,
        dailyMessagesUsed: 0,
        dailyLimit: 10,
      };

      useAuthStore.getState().setUser(mockUser);
      const state = useAuthStore.getState();
      const isPremium = authSelectors.isPremium(state);
      expect(isPremium).toBe(false);
    });

    it('canSendMessage should return false when user is actually null', () => {
      // Force user to null (bypassing normal logout flow)
      useAuthStore.getState().setUser(null);
      const state = useAuthStore.getState();
      const canSend = authSelectors.canSendMessage(state);
      expect(canSend).toBe(false);
    });

    it('canSendMessage should return true for guest users under limit', () => {
      // After logout, we have a guest user with dailyMessagesUsed: 0, dailyLimit: 10
      useAuthStore.getState().logout();
      const state = useAuthStore.getState();
      const canSend = authSelectors.canSendMessage(state);
      expect(canSend).toBe(true); // Guest user can send messages (0 < 10)
    });

    it('canSendMessage should return true for premium users', () => {
      const mockUser: AuthUser = {
        principal: 'test-principal',
        accountId: 'test-account',
        isAuthenticated: true,
        isPremium: true,
        dailyMessagesUsed: 100, // High usage
        dailyLimit: -1,
      };

      useAuthStore.getState().setUser(mockUser);
      const state = useAuthStore.getState();
      const canSend = authSelectors.canSendMessage(state);
      expect(canSend).toBe(true);
    });

    it('canSendMessage should return true for free users under limit', () => {
      const mockUser: AuthUser = {
        principal: 'test-principal',
        accountId: 'test-account',
        isAuthenticated: true,
        isPremium: false,
        dailyMessagesUsed: 5,
        dailyLimit: 10,
      };

      useAuthStore.getState().setUser(mockUser);
      const state = useAuthStore.getState();
      const canSend = authSelectors.canSendMessage(state);
      expect(canSend).toBe(true);
    });

    it('canSendMessage should return false for free users at limit', () => {
      const mockUser: AuthUser = {
        principal: 'test-principal', 
        accountId: 'test-account',
        isAuthenticated: true,
        isPremium: false,
        dailyMessagesUsed: 10,
        dailyLimit: 10,
      };

      useAuthStore.getState().setUser(mockUser);
      const state = useAuthStore.getState();
      const canSend = authSelectors.canSendMessage(state);
      expect(canSend).toBe(false);
    });

    it('remainingMessages should return -1 when user is actually null', () => {
      // Force user to null (bypassing normal logout flow)
      useAuthStore.getState().setUser(null);
      const state = useAuthStore.getState();
      const remaining = authSelectors.remainingMessages(state);
      expect(remaining).toBe(-1);
    });

    it('remainingMessages should calculate correctly for guest users', () => {
      // After logout, we have a guest user with dailyMessagesUsed: 0, dailyLimit: 10
      useAuthStore.getState().logout();
      const state = useAuthStore.getState();
      const remaining = authSelectors.remainingMessages(state);
      expect(remaining).toBe(10); // Guest user has 10 remaining messages
    });

    it('remainingMessages should return -1 for premium users', () => {
      const mockUser: AuthUser = {
        principal: 'test-principal',
        accountId: 'test-account',
        isAuthenticated: true,
        isPremium: true,
        dailyMessagesUsed: 5,
        dailyLimit: -1,
      };

      useAuthStore.getState().setUser(mockUser);
      const state = useAuthStore.getState();
      const remaining = authSelectors.remainingMessages(state);
      expect(remaining).toBe(-1);
    });

    it('remainingMessages should calculate correctly for free users', () => {
      const mockUser: AuthUser = {
        principal: 'test-principal',
        accountId: 'test-account',
        isAuthenticated: true,
        isPremium: false,
        dailyMessagesUsed: 3,
        dailyLimit: 10,
      };

      useAuthStore.getState().setUser(mockUser);
      const state = useAuthStore.getState();
      const remaining = authSelectors.remainingMessages(state);
      expect(remaining).toBe(7);
    });

    it('remainingMessages should not go below 0', () => {
      const mockUser: AuthUser = {
        principal: 'test-principal',
        accountId: 'test-account',
        isAuthenticated: true,
        isPremium: false,
        dailyMessagesUsed: 15, // Over limit
        dailyLimit: 10,
      };

      useAuthStore.getState().setUser(mockUser);
      const state = useAuthStore.getState();
      const remaining = authSelectors.remainingMessages(state);
      expect(remaining).toBe(0);
    });
  });
});

describe('Auth Store Initial State', () => {
  it('should have correct initial state', () => {
    // Get fresh store state
    const state = useAuthStore.getState();
    
    // Reset to ensure we're testing initial state
    state.logout();
    const initialState = useAuthStore.getState();

    // Check all initial state values
    expect(initialState.user?.principal).toBe('');
    expect(initialState.user?.accountId).toBe('');
    expect(initialState.user?.isAuthenticated).toBe(false);
    expect(initialState.user?.isPremium).toBe(false);
    expect(initialState.user?.dailyLimit).toBe(10);
    expect(initialState.credentials).toBeNull();
    expect(initialState.isAuthenticated).toBe(false);
    expect(initialState.isLoading).toBe(false);
    expect(initialState.error).toBeNull();
    expect(initialState.algoBalance).toBe(0);
    expect(initialState.ckAlgoBalance).toBe(0);
    expect(initialState.balancesLoading).toBe(false);
    expect(initialState.balancesLastUpdated).toBe(0);
  });
});