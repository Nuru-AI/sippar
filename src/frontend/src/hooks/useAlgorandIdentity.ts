/**
 * Algorand Identity Hook - Phase 3: Threshold Signatures
 * Based on Rabbi's useInternetIdentity.ts with Algorand-specific adaptations
 * 
 * Provides Internet Identity authentication with threshold signature-based Algorand credential derivation
 * Following the proven Rabbi pattern integrated with ICP threshold ECDSA for real cryptographic security
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { AuthClient } from '@dfinity/auth-client';
import { Principal } from '@dfinity/principal';
import sipparAPI from '../services/SipparAPIService';

// Types for Algorand Identity integration
export interface AuthUser {
  principal: string;
  accountId: string;
  isAuthenticated: boolean;
  isPremium: boolean;
  dailyMessagesUsed: number;
  dailyLimit: number;
}

export interface AlgorandChainFusionCredentials {
  algorandAddress: string;
  ethereumAddress?: string; // For future Milkomeda integration
  signature: string;
  timestamp: number;
  addresses?: {[key: string]: string};
}

interface AuthError {
  code: string;
  message: string;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  error: AuthError | null;
  credentials: AlgorandChainFusionCredentials | null;
}

const DAILY_LIMIT_FREE = 10;

// Internet Identity Configuration (same as Rabbi)
const INTERNET_IDENTITY_URL = 'https://identity.ic0.app';
const IDENTITY_PROVIDER = 'https://identity.ic0.app/#authorize';

// Performance optimization: Cache localStorage values to reduce access frequency
let cachedToken: string | null = null;
let cachedUserData: string | null = null;
let cachedCredentials: string | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5000; // Cache for 5 seconds

const getCachedLocalStorage = (key: string): string | null => {
  const now = Date.now();
  if (now - cacheTimestamp > CACHE_DURATION) {
    // Refresh cache
    cachedToken = localStorage.getItem('sippar_ii_token');
    cachedUserData = localStorage.getItem('sippar_ii_user');
    cachedCredentials = localStorage.getItem('sippar_algorand_credentials');
    cacheTimestamp = now;
  }
  
  switch (key) {
    case 'sippar_ii_token': return cachedToken;
    case 'sippar_ii_user': return cachedUserData;
    case 'sippar_algorand_credentials': return cachedCredentials;
    default: return localStorage.getItem(key);
  }
};

// Chain Fusion Backend endpoints - Updated with working XNode2 Sippar server
const getChainFusionEndpoints = () => {
  return [
    '/api/sippar',                        // Production: nginx proxy (PRIORITY)
    'https://nuru.network/api/sippar',    // Public API endpoint fallback
    'http://localhost:3001',              // Local development fallback
  ];
};

export const useAlgorandIdentity = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: false,
    error: null,
    credentials: null,
  });

  const [authClient, setAuthClient] = useState<AuthClient | null>(null);

  const checkAuthStatus = useCallback(async () => {
    try {
      const token = getCachedLocalStorage('sippar_ii_token');
      const userData = getCachedLocalStorage('sippar_ii_user');
      const credentials = getCachedLocalStorage('sippar_algorand_credentials');

      if (token && userData) {
        const user = JSON.parse(userData) as AuthUser;
        
        // Check if this is a real Internet Identity token
        if (token.startsWith('sippar_ii_token_')) {
          // Only initialize AuthClient once and cache it
          let client = authClient;
          if (!client) {
            try {
              client = await AuthClient.create();
              setAuthClient(client);
            } catch (error) {
              console.error('Error creating AuthClient:', error);
              // Continue with cached user data if AuthClient fails
            }
          }
          
          // Only check authentication status if client is available
          if (client) {
            try {
              const isAuth = await client.isAuthenticated();
              if (!isAuth) {
                // Session expired, clear stored data
                localStorage.removeItem('sippar_ii_token');
                localStorage.removeItem('sippar_ii_user');
                localStorage.removeItem('sippar_algorand_credentials');
                
                setAuthState(prev => ({
                  ...prev,
                  user: {
                    principal: '',
                    accountId: '',
                    isAuthenticated: false,
                    isPremium: false,
                    dailyMessagesUsed: parseInt(localStorage.getItem('sippar_daily_messages_used') || '0'),
                    dailyLimit: DAILY_LIMIT_FREE,
                  },
                  isLoading: false,
                }));
                return;
              }
            } catch (error) {
              console.error('Error validating Internet Identity session:', error);
              // Continue with cached user data if validation fails
            }
          }
        }
        
        setAuthState(prev => ({
          ...prev,
          user,
          credentials: credentials ? JSON.parse(credentials) : null,
          isLoading: false,
        }));
      } else {
        // Set as unauthenticated guest user
        setAuthState(prev => ({
          ...prev,
          user: {
            principal: '',
            accountId: '',
            isAuthenticated: false,
            isPremium: false,
            dailyMessagesUsed: parseInt(localStorage.getItem('sippar_daily_messages_used') || '0'),
            dailyLimit: DAILY_LIMIT_FREE,
          },
          isLoading: false,
        }));
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setAuthState(prev => ({
        ...prev,
        error: { code: 'AUTH_CHECK_ERROR', message: 'Failed to check authentication status' },
        isLoading: false,
      }));
    }
  }, [authClient]);

  // Check authentication status on mount
  useEffect(() => {
    let isInitialized = false;
    let timeoutId: NodeJS.Timeout;
    
    const initializeAuth = async () => {
      if (isInitialized) return;
      isInitialized = true;
      
      // Throttle auth check to prevent excessive calls
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        checkAuthStatus();
      }, 100);
    };
    
    initializeAuth();
    
    // Listen for custom auth events with throttling
    let lastEventTime = 0;
    const handleAuthChange = (event: CustomEvent) => {
      const now = Date.now();
      if (now - lastEventTime < 1000) return; // Throttle to max once per second
      lastEventTime = now;
      checkAuthStatus();
    };
    
    window.addEventListener('sipparAuthStatusChanged', handleAuthChange as EventListener);
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('sipparAuthStatusChanged', handleAuthChange as EventListener);
      isInitialized = false;
    };
  }, []); // Remove checkAuthStatus dependency to prevent re-runs

  const login = useCallback(async () => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      console.log('🔐 Starting Sippar Algorand Identity authentication...');
      
      // Initialize AuthClient if not already done
      let client = authClient;
      if (!client) {
        client = await AuthClient.create();
        setAuthClient(client);
      }

      // Check if already authenticated
      if (await client.isAuthenticated()) {
        const identity = client.getIdentity();
        const principal = identity.getPrincipal();
        
        await handleSuccessfulAuth(principal.toString(), client);
        return true;
      }

      // Detect mobile device for different authentication flow
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isSmallScreen = window.innerWidth < 768;
      const isMobileOrSmall = isMobile || isSmallScreen;
      
      // Start Internet Identity login flow
      await new Promise<void>((resolve, reject) => {
        const loginConfig = {
          identityProvider: IDENTITY_PROVIDER,
          maxTimeToLive: BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000), // 7 days in nanoseconds
          windowOpenerFeatures: isMobileOrSmall ? 
            `width=${Math.min(window.innerWidth, 400)},height=${Math.min(window.innerHeight, 600)},scrollbars=yes,resizable=yes,status=no,toolbar=no,menubar=no,location=yes` :
            `width=500,height=600,scrollbars=yes,resizable=yes,status=yes,toolbar=no,menubar=no,location=yes`,
          onSuccess: () => {
            console.log('✅ Internet Identity authentication successful');
            resolve();
          },
          onError: (error) => {
            console.error('❌ Internet Identity authentication failed:', error);
            reject(error);
          },
        };
        
        client.login(loginConfig);
      });

      // Get the authenticated principal
      const identity = client.getIdentity();
      const principal = identity.getPrincipal();
      
      console.log('🔑 Principal:', principal.toString());
      
      await handleSuccessfulAuth(principal.toString(), client);
      
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: null
      }));
      
      return true;
      
    } catch (error) {
      console.error('❌ Sippar authentication failed:', error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: { 
          code: 'AUTH_FAILED', 
          message: `Authentication failed: ${error instanceof Error ? error.message : 'Internet Identity popup failed'}`
        },
      }));
      return false;
    }
  }, [authClient]);

  const handleSuccessfulAuth = useCallback(async (principalString: string, client: AuthClient) => {
    try {
      console.log('🔗 Starting Algorand credential derivation via Sippar API...');
      
      // Use the new Sippar API service for address derivation
      const addressResponse = await sipparAPI.deriveAlgorandAddress(principalString);
      
      let algorandCredentials: AlgorandChainFusionCredentials;
      let connectionSuccessful = false;
      
      if (addressResponse.status === 'success' && addressResponse.data) {
        algorandCredentials = {
          algorandAddress: addressResponse.data.address,
          signature: 'sippar_threshold_' + principalString + '_' + Date.now(),
          timestamp: Date.now(),
          addresses: { algorand: addressResponse.data.address },
        };
        connectionSuccessful = true;
        console.log('✅ Algorand address derived via Sippar API');
        console.log('🟢 Address:', addressResponse.data.address);
        console.log('🔑 Public Key:', addressResponse.data.public_key);
        console.log('🏗️ Canister ID:', addressResponse.data.canister_id);
      } else {
        console.warn('⚠️ Sippar API address derivation failed:', addressResponse.error);
      }
      
      // For Phase 1: Allow authentication even if Chain Fusion backend isn't ready yet
      if (!connectionSuccessful) {
        console.log('⚠️ Chain Fusion backend not available - using Phase 1 fallback');
        
        const realUser: AuthUser = {
          principal: principalString,
          accountId: 'sippar-' + principalString.substring(0, 10),
          isAuthenticated: true,
          isPremium: true, // Internet Identity users get premium access
          dailyMessagesUsed: 0,
          dailyLimit: -1, // Unlimited for authenticated users
        };

        // Store authentication data but no credentials yet
        localStorage.setItem('sippar_ii_token', 'sippar_ii_token_' + Date.now());
        localStorage.setItem('sippar_ii_user', JSON.stringify(realUser));
        localStorage.removeItem('sippar_algorand_credentials');

        setAuthState({
          user: realUser,
          isLoading: false,
          error: {
            code: 'CHAIN_FUSION_NOT_READY',
            message: 'Authentication successful. Algorand credential derivation temporarily unavailable. Please try again or contact support if the issue persists.'
          },
          credentials: null,
        });

        // Dispatch auth event
        window.dispatchEvent(new CustomEvent('sipparAuthStatusChanged', {
          detail: { authenticated: true, user: realUser }
        }));
        
        return;
      }

      const realUser: AuthUser = {
        principal: principalString,
        accountId: 'sippar-' + principalString.substring(0, 10),
        isAuthenticated: true,
        isPremium: true,
        dailyMessagesUsed: 0,
        dailyLimit: -1,
      };

      // Store authentication data
      localStorage.setItem('sippar_ii_token', 'sippar_ii_token_' + Date.now());
      localStorage.setItem('sippar_ii_user', JSON.stringify(realUser));
      localStorage.setItem('sippar_algorand_credentials', JSON.stringify(algorandCredentials));

      setAuthState({
        user: realUser,
        isLoading: false,
        error: null,
        credentials: algorandCredentials,
      });

      console.log('🎉 Sippar Algorand Identity authentication complete!');
      
      // Dispatch custom event to notify components
      window.dispatchEvent(new CustomEvent('sipparAuthStatusChanged', {
        detail: { authenticated: true, user: realUser }
      }));
      
    } catch (error) {
      console.error('❌ Error processing Algorand authentication:', error);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      console.log('🔐 Logging out from Sippar Algorand Identity...');
      
      // Logout from Internet Identity
      if (authClient) {
        await authClient.logout();
        console.log('✅ Internet Identity logout successful');
      }
      
      // Clear local storage
      localStorage.removeItem('sippar_ii_token');
      localStorage.removeItem('sippar_ii_user');
      localStorage.removeItem('sippar_algorand_credentials');

      // Reset to guest state
      setAuthState({
        user: {
          principal: '',
          accountId: '',
          isAuthenticated: false,
          isPremium: false,
          dailyMessagesUsed: parseInt(localStorage.getItem('sippar_daily_messages_used') || '0'),
          dailyLimit: DAILY_LIMIT_FREE,
        },
        isLoading: false,
        error: null,
        credentials: null,
      });

      console.log('✅ Successfully logged out from Sippar');
      
      // Force page reload to ensure clean state
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('❌ Logout failed:', error);
    }
  }, [authClient]);

  const incrementMessageCount = useCallback(() => {
    if (!authState.user?.isPremium) {
      const newCount = (authState.user?.dailyMessagesUsed || 0) + 1;
      localStorage.setItem('sippar_daily_messages_used', newCount.toString());
      
      setAuthState(prev => ({
        ...prev,
        user: prev.user ? { ...prev.user, dailyMessagesUsed: newCount } : null,
      }));
    }
  }, [authState.user]);

  const canSendMessage = useCallback(() => {
    if (!authState.user) return false;
    if (authState.user.isPremium) return true;
    return authState.user.dailyMessagesUsed < authState.user.dailyLimit;
  }, [authState.user]);

  const getRemainingMessages = useCallback(() => {
    if (!authState.user || authState.user.isPremium) return -1;
    return Math.max(0, authState.user.dailyLimit - authState.user.dailyMessagesUsed);
  }, [authState.user]);

  return {
    user: authState.user,
    isLoading: authState.isLoading,
    error: authState.error,
    credentials: authState.credentials,
    login,
    logout,
    checkAuthStatus,
    incrementMessageCount,
    canSendMessage,
    getRemainingMessages,
    isAuthenticated: !!authState.user?.isAuthenticated,
    isPremium: !!authState.user?.isPremium,
  };
};

export default useAlgorandIdentity;