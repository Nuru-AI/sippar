// ckALGO SDK Authentication & Authorization
// Sprint 012.5 Day 15-16: Developer SDK Foundation

import { AuthClient } from '@dfinity/auth-client';
import { Principal } from '@dfinity/principal';
import { UserIdentity, UserTier, SDKResponse } from '../types';

export interface AuthConfig {
  identityProvider?: string;
  maxTimeToLive?: bigint;
  derivationOrigin?: string;
  windowOpenerFeatures?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  identity?: UserIdentity;
  authClient?: AuthClient;
  expiresAt?: Date;
}

export class SipparAuth {
  private authClient?: AuthClient;
  private authState: AuthState = { isAuthenticated: false };
  private config: AuthConfig;
  private listeners: Array<(state: AuthState) => void> = [];

  constructor(config: AuthConfig = {}) {
    this.config = {
      identityProvider: 'https://identity.ic0.app',
      maxTimeToLive: BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000), // 7 days
      ...config
    };
  }

  /**
   * Initialize the authentication client
   */
  async init(): Promise<void> {
    this.authClient = await AuthClient.create({
      idleOptions: {
        disableIdle: true,
        disableDefaultIdleCallback: true
      }
    });

    // Check if already authenticated
    const isAuthenticated = await this.authClient.isAuthenticated();
    if (isAuthenticated) {
      await this.updateAuthState();
    }
  }

  /**
   * Login with Internet Identity
   */
  async login(): Promise<SDKResponse<UserIdentity>> {
    try {
      if (!this.authClient) {
        throw new Error('Auth client not initialized. Call init() first.');
      }

      return new Promise((resolve) => {
        this.authClient!.login({
          identityProvider: this.config.identityProvider,
          maxTimeToLive: this.config.maxTimeToLive,
          derivationOrigin: this.config.derivationOrigin,
          windowOpenerFeatures: this.config.windowOpenerFeatures,
          onSuccess: async () => {
            await this.updateAuthState();
            resolve({
              success: true,
              data: this.authState.identity,
              timestamp: Date.now()
            });
          },
          onError: (error) => {
            resolve({
              success: false,
              error: error || 'Authentication failed',
              timestamp: Date.now()
            });
          }
        });
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Logout and clear authentication state
   */
  async logout(): Promise<SDKResponse<void>> {
    try {
      if (this.authClient) {
        await this.authClient.logout();
      }
      
      this.authState = { isAuthenticated: false };
      this.notifyListeners();

      return {
        success: true,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Logout failed',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Get current authentication state
   */
  getAuthState(): AuthState {
    return { ...this.authState };
  }

  /**
   * Get current user identity
   */
  getCurrentUser(): UserIdentity | undefined {
    return this.authState.identity;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.authState.isAuthenticated;
  }

  /**
   * Get the principal of the authenticated user
   */
  getPrincipal(): Principal | undefined {
    return this.authState.identity?.principal;
  }

  /**
   * Get the Internet Computer identity for making calls
   */
  getIdentity() {
    return this.authClient?.getIdentity();
  }

  /**
   * Check user authorization level for specific operations
   */
  async checkAuthorization(operation: string, requiredTier?: UserTier): Promise<SDKResponse<boolean>> {
    try {
      if (!this.isAuthenticated()) {
        return {
          success: false,
          error: 'User not authenticated',
          timestamp: Date.now()
        };
      }

      const userTier = this.authState.identity?.tier;
      if (!userTier) {
        return {
          success: false,
          error: 'User tier not determined',
          timestamp: Date.now()
        };
      }

      // Check tier requirements
      if (requiredTier) {
        const tierHierarchy = {
          [UserTier.Free]: 0,
          [UserTier.Developer]: 1,
          [UserTier.Professional]: 2,
          [UserTier.Enterprise]: 3
        };

        const userLevel = tierHierarchy[userTier];
        const requiredLevel = tierHierarchy[requiredTier];

        if (userLevel < requiredLevel) {
          return {
            success: false,
            error: `Operation requires ${requiredTier} tier. Current tier: ${userTier}`,
            timestamp: Date.now()
          };
        }
      }

      // Operation-specific authorization checks
      const authorized = await this.checkOperationPermission(operation, userTier);

      return {
        success: true,
        data: authorized,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authorization check failed',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Add listener for authentication state changes
   */
  onAuthStateChange(listener: (state: AuthState) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Refresh user information from the backend
   */
  async refreshUserInfo(): Promise<SDKResponse<UserIdentity>> {
    try {
      if (!this.isAuthenticated()) {
        throw new Error('User not authenticated');
      }

      // This would typically make a call to your backend to get updated user info
      // For now, we'll return the current identity
      // TODO: Implement actual backend call to fetch user tier and other info

      return {
        success: true,
        data: this.authState.identity,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to refresh user info',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Private method to update authentication state
   */
  private async updateAuthState(): Promise<void> {
    if (!this.authClient) return;

    const isAuthenticated = await this.authClient.isAuthenticated();
    
    if (isAuthenticated) {
      const identity = this.authClient.getIdentity();
      const principal = identity.getPrincipal();

      // TODO: Fetch user tier from backend
      // For now, default to Free tier
      const userTier = UserTier.Free;

      this.authState = {
        isAuthenticated: true,
        identity: {
          principal,
          tier: userTier,
          isAuthenticated: true
        },
        authClient: this.authClient
      };
    } else {
      this.authState = { isAuthenticated: false };
    }

    this.notifyListeners();
  }

  /**
   * Private method to notify all listeners of state changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.authState));
  }

  /**
   * Private method to check operation-specific permissions
   */
  private async checkOperationPermission(operation: string, userTier: UserTier): Promise<boolean> {
    // Define operation permissions by tier
    const permissions = {
      [UserTier.Free]: [
        'ai.basic_query',
        'balance.check',
        'account.view'
      ],
      [UserTier.Developer]: [
        'ai.basic_query',
        'ai.advanced_query',
        'smart_contract.create',
        'smart_contract.execute',
        'cross_chain.read_state',
        'balance.check',
        'account.view',
        'account.manage'
      ],
      [UserTier.Professional]: [
        'ai.basic_query',
        'ai.advanced_query',
        'ai.batch_processing',
        'smart_contract.create',
        'smart_contract.execute',
        'smart_contract.template',
        'cross_chain.read_state',
        'cross_chain.write_state',
        'revenue.view',
        'balance.check',
        'account.view',
        'account.manage'
      ],
      [UserTier.Enterprise]: [
        '*' // All operations allowed
      ]
    };

    const userPermissions = permissions[userTier] || [];
    
    // Enterprise tier has access to everything
    if (userPermissions.includes('*')) {
      return true;
    }

    // Check if operation is in allowed list
    return userPermissions.includes(operation);
  }
}

// Export convenience functions
export async function createAuth(config?: AuthConfig): Promise<SipparAuth> {
  const auth = new SipparAuth(config);
  await auth.init();
  return auth;
}

export { UserTier };