/**
 * Sippar Authentication Store
 * 
 * Zustand-based state management replacing manual localStorage caching
 * in useAlgorandIdentity hook. Provides reactive auth state with automatic
 * persistence and type safety.
 * 
 * Sprint 010: Frontend State Management with Zustand
 * Following Sprint 009 success methodology: quality-first, verification-driven
 */

import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import type { AuthUser, AlgorandChainFusionCredentials } from '../hooks/useAlgorandIdentity';

// Auth error interface
export interface AuthError {
  code: string;
  message: string;
}

// Auth state interface - matches existing useAlgorandIdentity patterns
interface AuthState {
  // Core auth data
  user: AuthUser | null;
  credentials: AlgorandChainFusionCredentials | null;
  isAuthenticated: boolean;
  
  // Loading and error states
  isLoading: boolean;
  error: AuthError | null;
  
  // Balance data (moved from Dashboard component local state)
  algoBalance: number;
  ckAlgoBalance: number;
  balancesLoading: boolean;
  balancesLastUpdated: number;
}

// Auth actions interface
interface AuthActions {
  // User management
  setUser: (user: AuthUser | null) => void;
  setCredentials: (credentials: AlgorandChainFusionCredentials | null) => void;
  
  // Loading and error management
  setLoading: (loading: boolean) => void;
  setError: (error: AuthError | null) => void;
  clearError: () => void;
  
  // Balance management
  setBalances: (algoBalance: number, ckAlgoBalance: number) => void;
  setBalancesLoading: (loading: boolean) => void;
  
  // Authentication actions
  logout: () => void;
  
  // Utilities
  hydrate: () => void; // Manual hydration if needed
  persist: () => void; // Manual persistence if needed
}

// Complete auth store type
type AuthStore = AuthState & AuthActions;

// Default state values
const initialState: AuthState = {
  user: null,
  credentials: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  algoBalance: 0,
  ckAlgoBalance: 0,
  balancesLoading: false,
  balancesLastUpdated: 0,
};

// Create the auth store with persistence and DevTools
export const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
    (set, get) => ({
      // Initial state
      ...initialState,
      
      // User management actions
      setUser: (user: AuthUser | null) => {
        set({ 
          user, 
          isAuthenticated: !!user?.isAuthenticated,
          error: null // Clear errors on successful user set
        });
      },
      
      setCredentials: (credentials: AlgorandChainFusionCredentials | null) => {
        set({ credentials });
      },
      
      // Loading and error management
      setLoading: (isLoading: boolean) => {
        set({ isLoading });
      },
      
      setError: (error: AuthError | null) => {
        set({ error, isLoading: false });
      },
      
      clearError: () => {
        set({ error: null });
      },
      
      // Balance management
      setBalances: (algoBalance: number, ckAlgoBalance: number) => {
        set({ 
          algoBalance, 
          ckAlgoBalance, 
          balancesLastUpdated: Date.now(),
          balancesLoading: false 
        });
      },
      
      setBalancesLoading: (balancesLoading: boolean) => {
        set({ balancesLoading });
      },
      
      // Authentication actions
      logout: () => {
        // Reset to initial state but keep guest user structure
        // Use valid test principal to prevent console errors in production
        const validTestPrincipal = '2mhjn-ayaae-bagba-faydq-qcikb-mga2d-qpcai-reeyu-culbo-gazdi-nry';
        const guestUser: AuthUser = {
          principal: validTestPrincipal,
          accountId: 'sippar-guest',
          isAuthenticated: false,
          isPremium: false,
          dailyMessagesUsed: parseInt(localStorage.getItem('sippar_daily_messages_used') || '0'),
          dailyLimit: 10, // DAILY_LIMIT_FREE from useAlgorandIdentity
        };
        
        set({
          user: guestUser,
          credentials: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
          algoBalance: 0,
          ckAlgoBalance: 0,
          balancesLoading: false,
          balancesLastUpdated: 0,
        });
        
        // Clear localStorage items (matching useAlgorandIdentity logout)
        localStorage.removeItem('sippar_ii_token');
        localStorage.removeItem('sippar_ii_user');
        localStorage.removeItem('sippar_algorand_credentials');
      },
      
      // Utility actions
      hydrate: () => {
        // Manual hydration - the persist middleware handles this automatically
        // This is for explicit re-hydration if needed
        console.log('🔄 Auth store hydrated from localStorage');
      },
      
      persist: () => {
        // Manual persistence - the persist middleware handles this automatically
        // This is for explicit persistence if needed
        console.log('💾 Auth store persisted to localStorage');
      },
    }),
    {
      // Persistence configuration
      name: 'sippar-auth-store', // localStorage key
      
      // Selective persistence - only persist essential data
      partialize: (state) => ({
        user: state.user,
        credentials: state.credentials,
        isAuthenticated: state.isAuthenticated,
        algoBalance: state.algoBalance,
        ckAlgoBalance: state.ckAlgoBalance,
        balancesLastUpdated: state.balancesLastUpdated,
        // Don't persist: loading states, errors (ephemeral)
      }),
      
      // Migration strategy for store updates
      version: 1,
      migrate: (persistedState: any, version: number) => {
        if (version === 0) {
          // Handle migration from version 0 to 1 if needed in future
          return persistedState;
        }
        return persistedState;
      },
      
      // Storage configuration
      storage: {
        getItem: (name: string) => {
          try {
            const item = localStorage.getItem(name);
            return item ? JSON.parse(item) : null;
          } catch (error) {
            console.error('❌ Auth store getItem error:', error);
            return null;
          }
        },
        setItem: (name: string, value: any) => {
          try {
            localStorage.setItem(name, JSON.stringify(value));
          } catch (error) {
            console.error('❌ Auth store setItem error:', error);
          }
        },
        removeItem: (name: string) => {
          try {
            localStorage.removeItem(name);
          } catch (error) {
            console.error('❌ Auth store removeItem error:', error);
          }
        },
      },
      
      // Skip hydration on server-side rendering
      skipHydration: typeof window === 'undefined',
    }
    ),
    {
      name: 'sippar-auth-store', // DevTools identifier
    }
  )
);

// Computed selectors for common use cases
export const authSelectors = {
  // Basic auth state
  user: (state: AuthStore) => state.user,
  credentials: (state: AuthStore) => state.credentials,
  isAuthenticated: (state: AuthStore) => state.isAuthenticated,
  isLoading: (state: AuthStore) => state.isLoading,
  error: (state: AuthStore) => state.error,
  
  // Balance state
  balances: (state: AuthStore) => ({
    algo: state.algoBalance,
    ckAlgo: state.ckAlgoBalance,
    loading: state.balancesLoading,
    lastUpdated: state.balancesLastUpdated,
  }),
  
  // Derived state
  isPremium: (state: AuthStore) => !!state.user?.isPremium,
  canSendMessage: (state: AuthStore) => {
    if (!state.user) return false;
    if (state.user.isPremium) return true;
    return state.user.dailyMessagesUsed < state.user.dailyLimit;
  },
  remainingMessages: (state: AuthStore) => {
    if (!state.user || state.user.isPremium) return -1;
    return Math.max(0, state.user.dailyLimit - state.user.dailyMessagesUsed);
  },
};

// Hook for common auth patterns (optional convenience)
export const useAuth = () => {
  const user = useAuthStore(authSelectors.user);
  const credentials = useAuthStore(authSelectors.credentials);
  const isAuthenticated = useAuthStore(authSelectors.isAuthenticated);
  const isLoading = useAuthStore(authSelectors.isLoading);
  const error = useAuthStore(authSelectors.error);
  
  return {
    user,
    credentials,
    isAuthenticated,
    isLoading,
    error,
  };
};

// Hook for balance data (optional convenience)
export const useBalances = () => {
  return useAuthStore(authSelectors.balances);
};

export default useAuthStore;