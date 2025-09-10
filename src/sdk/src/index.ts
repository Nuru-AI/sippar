// ckALGO SDK - Main Entry Point
// Sprint 012.5 Day 15-16: Developer SDK Foundation

// Export main client
export { SipparClient, createSipparClient, DefaultConfigs } from './client';

// Export authentication
export { SipparAuth, createAuth } from './auth';

// Export services
export { AIService } from './services/ai';
export { SmartContractService } from './services/smart-contracts';
export { CrossChainService } from './services/cross-chain';
export { PaymentService } from './services/payments';

// Export all types
export * from './types';

// Export utilities
export * from './utils';

// Version info
export const SDK_VERSION = '0.1.0';

// Quick start helper
export async function quickStart(network: 'mainnet' | 'testnet' | 'local' = 'testnet') {
  const { createSipparClient, DefaultConfigs } = await import('./client');
  
  const config = DefaultConfigs[network];
  const client = await createSipparClient({
    config,
    autoLogin: false
  });

  return client;
}

// Error handling utilities
export class SipparSDKError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'SipparSDKError';
  }
}

// Helper function to handle SDK responses
export function handleSDKResponse<T>(response: any): T {
  if (response.success) {
    return response.data;
  } else {
    throw new SipparSDKError(
      response.error || 'SDK operation failed',
      'SDK_ERROR',
      { timestamp: response.timestamp, requestId: response.requestId }
    );
  }
}

// Convenience functions for common operations
export namespace SipparSDK {
  /**
   * Initialize SDK with minimal configuration
   */
  export async function init(options: {
    network?: 'mainnet' | 'testnet' | 'local';
    canisterId?: string;
    autoLogin?: boolean;
  } = {}) {
    const { createSipparClient, DefaultConfigs } = await import('./client');
    
    const config = options.canisterId 
      ? { ...DefaultConfigs[options.network || 'testnet'], canisterId: options.canisterId }
      : DefaultConfigs[options.network || 'testnet'];

    return await createSipparClient({
      config,
      autoLogin: options.autoLogin || false
    });
  }

  /**
   * Quick AI query without full client setup
   */
  export async function queryAI(
    query: string,
    options: {
      network?: 'mainnet' | 'testnet' | 'local';
      serviceType?: 'AlgorandOracle' | 'OpenWebUIChat';
      model?: string;
    } = {}
  ) {
    const client = await init({ network: options.network });
    
    // Auto-login for convenience
    const loginResult = await client.login();
    if (!loginResult.success) {
      throw new SipparSDKError('Authentication required', 'AUTH_REQUIRED');
    }

    const result = await client.ai.query({
      serviceType: options.serviceType === 'OpenWebUIChat' ? 'OpenWebUIChat' as any : 'AlgorandOracle' as any,
      query,
      model: options.model
    });

    return handleSDKResponse(result);
  }

  /**
   * Quick balance check
   */
  export async function getBalance(options: {
    network?: 'mainnet' | 'testnet' | 'local';
  } = {}) {
    const client = await init({ network: options.network });
    
    const loginResult = await client.login();
    if (!loginResult.success) {
      throw new SipparSDKError('Authentication required', 'AUTH_REQUIRED');
    }

    const result = await client.getBalance();
    return handleSDKResponse(result);
  }

  /**
   * Quick cross-chain state read
   */
  export async function readAlgorandState(
    address: string,
    options: {
      network?: 'mainnet' | 'testnet' | 'local';
      stateType?: 'account' | 'asset' | 'application';
      assetId?: number;
      appId?: number;
    } = {}
  ) {
    const client = await init({ network: options.network });
    
    const result = await client.crossChain.readState({
      address,
      stateType: options.stateType || 'account',
      assetId: options.assetId,
      appId: options.appId
    });

    return handleSDKResponse(result);
  }
}

// Default export
export default SipparSDK;