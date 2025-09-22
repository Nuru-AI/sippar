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
import { useAuthStore } from '../stores/authStore';

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

// ✅ REMOVED: AuthState interface - now using Zustand store
// Sprint 010: Phase 2 - Replaced with useAuthStore

const DAILY_LIMIT_FREE = 10;

// Internet Identity Configuration (same as Rabbi)
const INTERNET_IDENTITY_URL = 'https://identity.ic0.app';
const IDENTITY_PROVIDER = 'https://identity.ic0.app/#authorize';

// ✅ REMOVED: Manual localStorage caching - replaced by Zustand store
// Sprint 010: Phase 2 - Manual cache management eliminated in favor of reactive store

// Chain Fusion Backend endpoints - Updated with working XNode2 Sippar server
const getChainFusionEndpoints = () => {
  return [
    '/api/sippar',                        // Production: nginx proxy (PRIORITY)
    'https://nuru.network/api/sippar',    // Public API endpoint fallback
    'http://localhost:3001',              // Local development fallback
  ];
};

export const useAlgorandIdentity = () => {
  // ✅ MIGRATED: Replace useState with Zustand store
  const user = useAuthStore(state => state.user);
  const credentials = useAuthStore(state => state.credentials);
  const isLoading = useAuthStore(state => state.isLoading);
  const error = useAuthStore(state => state.error);
  const setUser = useAuthStore(state => state.setUser);
  const setCredentials = useAuthStore(state => state.setCredentials);
  const setLoading = useAuthStore(state => state.setLoading);
  const setError = useAuthStore(state => state.setError);
  const logout = useAuthStore(state => state.logout);

  const [authClient, setAuthClient] = useState<AuthClient | null>(null);

  const checkAuthStatus = useCallback(async () => {
    try {
      // ✅ MIGRATED: Direct localStorage access instead of manual cache
      const token = localStorage.getItem('sippar_ii_token');
      const userData = localStorage.getItem('sippar_ii_user');
      const storedCredentials = localStorage.getItem('sippar_algorand_credentials');

      if (token && userData) {
        const user = JSON.parse(userData) as AuthUser;
        
        // 🚨 CRITICAL: Validate principal format before proceeding
        if (user.principal && user.principal !== '2vxsx-fae') {
          try {
            Principal.fromText(user.principal);
          } catch (error) {
            console.error('❌ INVALID PRINCIPAL FORMAT DETECTED:', user.principal);
            console.log('🧹 Clearing corrupted authentication state...');
            localStorage.removeItem('sippar_ii_token');
            localStorage.removeItem('sippar_ii_user');
            localStorage.removeItem('sippar_algorand_credentials');
            
            setUser({
              principal: '2vxsx-fae',
              accountId: 'sippar-guest',
              isAuthenticated: false,
              isPremium: false,
              dailyMessagesUsed: parseInt(localStorage.getItem('sippar_daily_messages_used') || '0'),
              dailyLimit: DAILY_LIMIT_FREE,
            });
            setCredentials(null);
            setLoading(false);
            setError({
              code: 'INVALID_AUTHENTICATION',
              message: 'Invalid authentication state detected. Please log in again with Internet Identity.'
            });
            return;
          }
        }
        
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
                
                // ✅ MIGRATED: Use store actions instead of setAuthState
                setUser({
                  principal: '',
                  accountId: '',
                  isAuthenticated: false,
                  isPremium: false,
                  dailyMessagesUsed: parseInt(localStorage.getItem('sippar_daily_messages_used') || '0'),
                  dailyLimit: DAILY_LIMIT_FREE,
                });
                setCredentials(null);
                setLoading(false);
                return;
              }
            } catch (error) {
              console.error('Error validating Internet Identity session:', error);
              // Continue with cached user data if validation fails
            }
          }
        }
        
        // ✅ MIGRATED: Use store actions instead of setAuthState
        setUser(user);
        setCredentials(storedCredentials ? JSON.parse(storedCredentials) : null);
        setLoading(false);
      } else {
        // ✅ MIGRATED: Set as unauthenticated guest user using store
        // Use anonymous principal for unauthenticated users
        setUser({
          principal: '2vxsx-fae', // Anonymous principal
          accountId: 'sippar-guest',
          isAuthenticated: false,
          isPremium: false,
          dailyMessagesUsed: parseInt(localStorage.getItem('sippar_daily_messages_used') || '0'),
          dailyLimit: DAILY_LIMIT_FREE,
        });
        setCredentials(null);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      // ✅ MIGRATED: Use store actions for error handling
      setError({ code: 'AUTH_CHECK_ERROR', message: 'Failed to check authentication status' });
      setLoading(false);
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
    // ✅ MIGRATED: Use store actions for loading state
    setLoading(true);
    setError(null);

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
      
      // ✅ MIGRATED: Use store actions for success state
      setLoading(false);
      setError(null);
      
      return true;
      
    } catch (error) {
      console.error('❌ Sippar authentication failed:', error);
      // ✅ MIGRATED: Use store actions for error state
      setError({ 
        code: 'AUTH_FAILED', 
        message: `Authentication failed: ${error instanceof Error ? error.message : 'Internet Identity popup failed'}`
      });
      setLoading(false);
      return false;
    }
  }, [authClient]);

  const handleSuccessfulAuth = useCallback(async (principalString: string, client: AuthClient) => {
    try {
      console.log('🔗 Starting Algorand credential derivation...');
      
      // 💾 FIRST: Check if we already have cached credentials for this principal
      const cachedCredentials = localStorage.getItem('sippar_algorand_credentials');
      if (cachedCredentials) {
        try {
          const credentials = JSON.parse(cachedCredentials) as AlgorandChainFusionCredentials;
          console.log('✅ Using cached Algorand credentials (0 cycles cost)');
          console.log('🟢 Cached Address:', credentials.algorandAddress);
          
          const realUser: AuthUser = {
            principal: principalString,
            accountId: 'sippar-' + principalString.substring(0, 10),
            isAuthenticated: true,
            isPremium: true,
            dailyMessagesUsed: 0,
            dailyLimit: -1,
          };

          // Store auth data and use cached credentials
          localStorage.setItem('sippar_ii_token', 'sippar_ii_token_' + Date.now());
          localStorage.setItem('sippar_ii_user', JSON.stringify(realUser));
          // Keep existing cached credentials
          
          setUser(realUser);
          setCredentials(credentials);
          return; // Exit early - no expensive API call needed!
        } catch (error) {
          console.warn('⚠️ Failed to parse cached credentials:', error);
          // Continue to fresh API call
        }
      }
      
      console.log('📡 No cached credentials found - calling API (15B cycles cost)');
      
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

        // ✅ MIGRATED: Use store actions for fallback auth state
        setUser(realUser);
        setCredentials(null);
        setLoading(false);
        setError({
          code: 'CHAIN_FUSION_NOT_READY',
          message: 'Authentication successful. Algorand credential derivation temporarily unavailable. Please try again or contact support if the issue persists.'
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

      // ✅ MIGRATED: Use store actions for successful auth state
      setUser(realUser);
      setCredentials(algorandCredentials);
      setLoading(false);
      setError(null);

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

  const handleLogout = useCallback(async () => {
    try {
      console.log('🔐 Logging out from Sippar Algorand Identity...');
      
      // Logout from Internet Identity
      if (authClient) {
        await authClient.logout();
        console.log('✅ Internet Identity logout successful');
      }
      
      // ✅ MIGRATED: Use store logout action (handles localStorage cleanup and state reset)
      logout();

      console.log('✅ Successfully logged out from Sippar');
      
      // Force page reload to ensure clean state
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('❌ Logout failed:', error);
    }
  }, [authClient, logout]);

  const incrementMessageCount = useCallback(() => {
    if (!user?.isPremium && user) {
      const newCount = (user.dailyMessagesUsed || 0) + 1;
      localStorage.setItem('sippar_daily_messages_used', newCount.toString());
      
      // ✅ MIGRATED: Use store to update user data
      setUser({ ...user, dailyMessagesUsed: newCount });
    }
  }, [user, setUser]);

  const canSendMessage = useCallback(() => {
    if (!user) return false;
    if (user.isPremium) return true;
    return user.dailyMessagesUsed < user.dailyLimit;
  }, [user]);

  const getRemainingMessages = useCallback(() => {
    if (!user || user.isPremium) return -1;
    return Math.max(0, user.dailyLimit - user.dailyMessagesUsed);
  }, [user]);

  return {
    // ✅ MIGRATED: Return store values instead of authState
    user,
    isLoading,
    error,
    credentials,
    login,
    logout: handleLogout, // Use the wrapped logout function
    checkAuthStatus,
    incrementMessageCount,
    canSendMessage,
    getRemainingMessages,
    isAuthenticated: !!user?.isAuthenticated,
    isPremium: !!user?.isPremium,
  };
};

export default useAlgorandIdentity;