/**
 * Sippar Store Index
 * 
 * Central exports for all Zustand stores
 * Sprint 010: Frontend State Management with Zustand
 */

// Auth store exports
export { 
  useAuthStore,
  authSelectors,
  useAuth,
  useBalances 
} from './authStore';

export type { AuthError } from './authStore';

// Re-export types from hooks for convenience
export type { 
  AuthUser, 
  AlgorandChainFusionCredentials 
} from '../hooks/useAlgorandIdentity';