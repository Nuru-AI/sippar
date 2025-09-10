// ckALGO SDK Client
// Sprint 012.5 Day 15-16: Developer SDK Foundation

import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { SipparAuth, AuthConfig } from '../auth';
import { AIService } from '../services/ai';
import { SmartContractService } from '../services/smart-contracts';
import { CrossChainService } from '../services/cross-chain';
import { PaymentService } from '../services/payments';
import { 
  SipparConfig, 
  SDKConfig, 
  UserIdentity, 
  UserTier,
  SDKResponse,
  AlgorandAccount,
  SmartContract,
  AIResponse,
  CrossChainOperation
} from '../types';

export interface SipparClientOptions {
  config: SipparConfig;
  authConfig?: AuthConfig;
  autoLogin?: boolean;
}

export class SipparClient {
  private config: SipparConfig;
  private agent?: HttpAgent;
  private auth: SipparAuth;
  
  // Service instances
  public ai: AIService;
  public smartContracts: SmartContractService;
  public crossChain: CrossChainService;
  public payments: PaymentService;

  constructor(options: SipparClientOptions) {
    this.config = options.config;
    this.auth = new SipparAuth(options.authConfig);

    // Initialize services
    this.ai = new AIService(this);
    this.smartContracts = new SmartContractService(this);
    this.crossChain = new CrossChainService(this);
    this.payments = new PaymentService(this);
  }

  /**
   * Initialize the SDK client
   */
  async init(): Promise<SDKResponse<void>> {
    try {
      // Initialize authentication
      await this.auth.init();

      // Create HTTP agent for ICP communication
      this.agent = new HttpAgent({
        host: this.config.network === 'local' ? 'http://localhost:4943' : 'https://ic0.app'
      });

      // Fetch root key for local development
      if (this.config.network === 'local') {
        await this.agent.fetchRootKey();
      }

      return {
        success: true,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Initialization failed',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Login with Internet Identity
   */
  async login(): Promise<SDKResponse<UserIdentity>> {
    return await this.auth.login();
  }

  /**
   * Logout
   */
  async logout(): Promise<SDKResponse<void>> {
    return await this.auth.logout();
  }

  /**
   * Get current user
   */
  getCurrentUser(): UserIdentity | undefined {
    return this.auth.getCurrentUser();
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.auth.isAuthenticated();
  }

  /**
   * Get user's ckALGO balance
   */
  async getBalance(): Promise<SDKResponse<string>> {
    try {
      if (!this.isAuthenticated()) {
        return {
          success: false,
          error: 'User not authenticated',
          timestamp: Date.now()
        };
      }

      // Call the ckALGO canister to get balance
      const actor = await this.getCanisterActor();
      const principal = this.auth.getPrincipal()!;
      const balance = await actor.icrc1_balance_of({ owner: principal, subaccount: [] });

      return {
        success: true,
        data: balance.toString(),
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get balance',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Transfer ckALGO tokens
   */
  async transfer(to: Principal, amount: string, memo?: string): Promise<SDKResponse<string>> {
    try {
      if (!this.isAuthenticated()) {
        return {
          success: false,
          error: 'User not authenticated',
          timestamp: Date.now()
        };
      }

      const actor = await this.getCanisterActor();
      const transferArgs = {
        to: { owner: to, subaccount: [] },
        amount: BigInt(amount),
        fee: [],
        memo: memo ? [Array.from(new TextEncoder().encode(memo))] : [],
        from_subaccount: [],
        created_at_time: []
      };

      const result = await actor.icrc1_transfer(transferArgs);
      
      if ('Ok' in result) {
        return {
          success: true,
          data: result.Ok.toString(),
          timestamp: Date.now()
        };
      } else {
        return {
          success: false,
          error: `Transfer failed: ${JSON.stringify(result.Err)}`,
          timestamp: Date.now()
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transfer failed',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Get Algorand account information
   */
  async getAlgorandAccount(address?: string): Promise<SDKResponse<AlgorandAccount>> {
    try {
      const targetAddress = address || this.getCurrentUser()?.algorandAddress;
      if (!targetAddress) {
        return {
          success: false,
          error: 'No Algorand address available',
          timestamp: Date.now()
        };
      }

      const actor = await this.getCanisterActor();
      const result = await actor.get_cached_algorand_state(targetAddress);

      if (result.length > 0) {
        const state = result[0];
        return {
          success: true,
          data: {
            address: state.address,
            balance: Number(state.balance),
            assets: state.assets.map((asset: any) => ({
              assetId: Number(asset.asset_id),
              amount: Number(asset.amount),
              unitName: asset.unit_name?.[0],
              name: asset.name?.[0],
              decimals: Number(asset.decimals)
            })),
            applications: state.apps.map((app: any) => Number(app)),
            round: Number(state.round),
            lastUpdated: Number(state.last_updated)
          },
          timestamp: Date.now()
        };
      } else {
        return {
          success: false,
          error: 'Account not found or not cached',
          timestamp: Date.now()
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get Algorand account',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Get user tier information
   */
  async getUserTier(): Promise<SDKResponse<UserTier>> {
    try {
      const user = this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated',
          timestamp: Date.now()
        };
      }

      return {
        success: true,
        data: user.tier,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user tier',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Upgrade user tier
   */
  async upgradeTier(newTier: UserTier): Promise<SDKResponse<string>> {
    try {
      if (!this.isAuthenticated()) {
        return {
          success: false,
          error: 'User not authenticated',
          timestamp: Date.now()
        };
      }

      const actor = await this.getCanisterActor();
      const result = await actor.upgrade_user_tier(newTier);

      return {
        success: true,
        data: result,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upgrade tier',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Listen to authentication state changes
   */
  onAuthStateChange(callback: (user: UserIdentity | undefined) => void): () => void {
    return this.auth.onAuthStateChange((state) => {
      callback(state.identity);
    });
  }

  /**
   * Get the HTTP agent for making calls
   */
  getAgent(): HttpAgent | undefined {
    return this.agent;
  }

  /**
   * Get the authentication instance
   */
  getAuth(): SipparAuth {
    return this.auth;
  }

  /**
   * Get the current configuration
   */
  getConfig(): SipparConfig {
    return { ...this.config };
  }

  /**
   * Create an actor for the ckALGO canister
   */
  async getCanisterActor(): Promise<any> {
    if (!this.agent) {
      throw new Error('Agent not initialized');
    }

    const identity = this.auth.getIdentity();
    if (identity) {
      this.agent.replaceIdentity(identity);
    }

    // TODO: Import the actual candid interface
    // For now, we'll use a simplified interface
    const idlFactory = ({ IDL }: any) => {
      return IDL.Service({
        'icrc1_balance_of': IDL.Func(
          [IDL.Record({ 'owner': IDL.Principal, 'subaccount': IDL.Opt(IDL.Vec(IDL.Nat8)) })],
          [IDL.Nat],
          ['query']
        ),
        'icrc1_transfer': IDL.Func(
          [IDL.Record({
            'to': IDL.Record({ 'owner': IDL.Principal, 'subaccount': IDL.Opt(IDL.Vec(IDL.Nat8)) }),
            'amount': IDL.Nat,
            'fee': IDL.Opt(IDL.Nat),
            'memo': IDL.Opt(IDL.Vec(IDL.Nat8)),
            'from_subaccount': IDL.Opt(IDL.Vec(IDL.Nat8)),
            'created_at_time': IDL.Opt(IDL.Nat64)
          })],
          [IDL.Variant({ 'Ok': IDL.Nat, 'Err': IDL.Text })],
          []
        ),
        'get_cached_algorand_state': IDL.Func([IDL.Text], [IDL.Vec(IDL.Any)], ['query']),
        'upgrade_user_tier': IDL.Func([IDL.Text], [IDL.Text], [])
      });
    };

    return Actor.createActor(idlFactory, {
      agent: this.agent,
      canisterId: this.config.canisterId
    });
  }
}

// Factory function for creating SDK client
export async function createSipparClient(options: SipparClientOptions): Promise<SipparClient> {
  const client = new SipparClient(options);
  await client.init();
  return client;
}

// Default configurations for different networks
export const DefaultConfigs = {
  mainnet: {
    network: 'mainnet' as const,
    canisterId: 'rdmx6-jaaaa-aaaah-qcaiq-cai', // Replace with actual mainnet canister ID
    backendUrl: 'https://nuru.network',
    algorandNodeUrl: 'https://mainnet-api.algonode.cloud',
    thresholdSignerCanisterId: 'vj7ly-diaaa-aaaae-abvoq-cai'
  },
  testnet: {
    network: 'testnet' as const,
    canisterId: 'rdmx6-jaaaa-aaaah-qcaiq-cai', // Replace with actual testnet canister ID
    backendUrl: 'https://nuru.network',
    algorandNodeUrl: 'https://testnet-api.algonode.cloud',
    thresholdSignerCanisterId: 'vj7ly-diaaa-aaaae-abvoq-cai'
  },
  local: {
    network: 'local' as const,
    canisterId: 'rdmx6-jaaaa-aaaah-qcaiq-cai',
    backendUrl: 'http://localhost:3004',
    algorandNodeUrl: 'https://testnet-api.algonode.cloud',
    thresholdSignerCanisterId: 'vj7ly-diaaa-aaaae-abvoq-cai'
  }
};

export { SipparAuth, type AuthConfig } from '../auth';
export * from '../types';