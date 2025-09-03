/**
 * Algorand Chain Fusion API Client - Phase 1
 * Based on Rabbi's ChainFusionAPI.ts with Algorand-specific adaptations
 * 
 * Simple API client for Sippar Algorand Bridge following proven Rabbi patterns
 */

import { BaseAPIService } from './BaseAPIService';

// Algorand Chain Fusion API Configuration - Phase 1 with local backend
const getAlgorandChainFusionAPIEndpoints = (): string[] => {
  return [
    'http://localhost:3001',                     // Local backend for Phase 1 development
    'https://nuru.network/api/sippar',           // Future Sippar API (production)
    '/api/sippar',                               // Relative proxy path (fallback)
  ];
};

const ALGORAND_CHAIN_FUSION_API_ENDPOINTS = getAlgorandChainFusionAPIEndpoints();
const ALGORAND_CHAIN_FUSION_BASE_URL = ALGORAND_CHAIN_FUSION_API_ENDPOINTS[0];
const API_TIMEOUT = 15000; // 15 seconds

// Algorand Chain Fusion Type Definitions - Simple Phase 1 types
export interface AlgorandChainFusionHealthResponse {
  status: string;
  service: string;
  version: string;
  deployment: string;
  components: {
    chain_fusion_engine: boolean;
    threshold_ed25519: boolean;
    algorand_integration: boolean;
    ck_algo_minting: boolean;
  };
  capabilities: {
    supported_chains: number;
    chain_key_tokens: number;
    threshold_signatures: boolean;
    milkomeda_integration: boolean;
  };
  metrics: {
    total_transactions: number;
    avg_processing_time_ms: number;
    success_rate: number;
  };
  timestamp: string;
}

export interface AlgorandCredentialResponse {
  success: boolean;
  principal: string;
  addresses: {
    algorand: string;
    ethereum?: string; // For future Milkomeda integration
  };
  timestamp: number;
}

export interface CkAlgoBalance {
  algorand_balance: number; // Native ALGO balance
  ck_algo_balance: number;  // Chain-key ALGO balance on ICP
  ck_algo_address: string;  // ICP principal/account for ckALGO
  last_updated: string;
}

export interface CkAlgoMintRequest {
  amount: number;           // Amount in ALGO (not microALGOS)
  algorand_address: string; // User's Algorand address
  icp_principal: string;    // User's ICP principal
}

export interface CkAlgoMintResponse {
  success: boolean;
  transaction_id: string;   // Algorand transaction ID
  ck_algo_minted: number;   // Amount of ckALGO minted
  processing_time_ms: number;
  timestamp: number;
}

export interface CkAlgoRedeemRequest {
  amount: number;           // Amount in ckALGO
  algorand_address: string; // Destination Algorand address
  icp_principal: string;    // User's ICP principal
}

export interface CkAlgoRedeemResponse {
  success: boolean;
  transaction_id: string;   // Algorand transaction ID
  algo_redeemed: number;    // Amount of ALGO redeemed
  processing_time_ms: number;
  timestamp: number;
}

export interface AlgorandTransactionStatus {
  transaction_id: string;
  status: 'pending' | 'confirmed' | 'failed';
  block_number?: number;
  confirmation_time?: number;
  error_message?: string;
}

// Simple Algorand Chain Fusion API extending BaseAPIService pattern
class AlgorandChainFusionAPI extends BaseAPIService {
  private baseUrl: string;
  private timeout: number;

  constructor() {
    super('AlgorandChainFusion');
    this.baseUrl = ALGORAND_CHAIN_FUSION_BASE_URL;
    this.timeout = API_TIMEOUT;
  }

  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      // Try multiple endpoints in order (Rabbi pattern)
      let lastError: Error | null = null;
      
      for (const baseUrl of ALGORAND_CHAIN_FUSION_API_ENDPOINTS) {
        try {
          const url = `${baseUrl}${endpoint}`;
          const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              ...options.headers,
            },
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();
          clearTimeout(timeoutId);
          return data;
        } catch (error) {
          lastError = error as Error;
          console.log(`Algorand Chain Fusion API endpoint ${baseUrl} failed:`, error);
          continue;
        }
      }

      throw lastError || new Error('All Algorand Chain Fusion API endpoints failed');
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  // Health Check
  async getHealth(): Promise<AlgorandChainFusionHealthResponse> {
    return this.makeRequest<AlgorandChainFusionHealthResponse>('/health');
  }

  // Derive Algorand credentials from Internet Identity principal
  async deriveAlgorandCredentials(principal: string): Promise<AlgorandCredentialResponse> {
    return this.makeRequest<AlgorandCredentialResponse>('/derive-algorand-credentials', {
      method: 'POST',
      body: JSON.stringify({
        principal,
        timestamp: Date.now(),
        blockchain: 'algorand'
      }),
      headers: {
        'X-Principal-ID': principal,
      }
    });
  }

  // Get ckALGO balance for user
  async getCkAlgoBalance(principal: string): Promise<CkAlgoBalance> {
    return this.makeRequest<CkAlgoBalance>(`/ck-algo/balance/${principal}`);
  }

  // Mint ckALGO from ALGO
  async mintCkAlgo(request: CkAlgoMintRequest): Promise<CkAlgoMintResponse> {
    return this.makeRequest<CkAlgoMintResponse>('/ck-algo/mint', {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  // Redeem ALGO from ckALGO
  async redeemCkAlgo(request: CkAlgoRedeemRequest): Promise<CkAlgoRedeemResponse> {
    return this.makeRequest<CkAlgoRedeemResponse>('/ck-algo/redeem', {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  // Get Algorand transaction status
  async getTransactionStatus(txId: string): Promise<AlgorandTransactionStatus> {
    return this.makeRequest<AlgorandTransactionStatus>(`/algorand/transaction/${txId}`);
  }

  // Test Connection
  async testConnection(): Promise<boolean> {
    try {
      const health = await this.getHealth();
      return health.status === 'healthy';
    } catch (error) {
      console.error('Algorand Chain Fusion API connection test failed:', error);
      return false;
    }
  }

  // Get Current Base URL
  getCurrentEndpoint(): string {
    return this.baseUrl;
  }

  // Switch to different endpoint
  switchEndpoint(index: number): void {
    if (index >= 0 && index < ALGORAND_CHAIN_FUSION_API_ENDPOINTS.length) {
      this.baseUrl = ALGORAND_CHAIN_FUSION_API_ENDPOINTS[index];
    }
  }

  // BaseAPIService required health check implementation
  async healthCheck(): Promise<any> {
    const startTime = Date.now();
    
    try {
      const health = await this.getHealth();
      const responseTime = Date.now() - startTime;
      
      const healthy = health.status === 'healthy' && health.components.chain_fusion_engine;
      
      return this.createSuccessResponse({
        healthy,
        responseTime,
        service: health.service,
        version: health.version,
        algorandSupported: health.components.algorand_integration,
        thresholdEd25519: health.components.threshold_ed25519,
        ckAlgoSupported: health.components.ck_algo_minting
      });
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      return this.createErrorResponse(
        `Algorand Chain Fusion health check failed: ${error.message}`,
        {
          healthy: false,
          responseTime,
          lastError: error.message
        }
      );
    }
  }
}

// Export singleton instance (Rabbi pattern)
const algorandChainFusionAPI = new AlgorandChainFusionAPI();
export default algorandChainFusionAPI;

// Simple utility functions using BaseAPIService pattern
export const formatAlgoAmount = (amount: number): string => {
  const tempService = new (class extends BaseAPIService { 
    constructor() { super('Utility'); } 
    async healthCheck() { return this.createSuccessResponse({ healthy: true }); }
  })();
  
  return `${tempService.safeFormat(amount, 6, '0.000000')} ALGO`;
};

export const formatCkAlgoAmount = (amount: number): string => {
  const tempService = new (class extends BaseAPIService { 
    constructor() { super('Utility'); } 
    async healthCheck() { return this.createSuccessResponse({ healthy: true }); }
  })();
  
  return `${tempService.safeFormat(amount, 6, '0.000000')} ckALGO`;
};

export const formatProcessingTime = (timeMs: number): string => {
  const tempService = new (class extends BaseAPIService { 
    constructor() { super('Utility'); } 
    async healthCheck() { return this.createSuccessResponse({ healthy: true }); }
  })();
  
  if ((timeMs || 0) < 1000) {
    return `${tempService.safeFormat(timeMs, 1, '0.0')}ms`;
  }
  return `${tempService.safeFormat((timeMs || 0) / 1000, 2, '0.00')}s`;
};

export const getTransactionStatusColor = (status: string): string => {
  switch (status) {
    case 'confirmed': return 'text-green-400';
    case 'pending': return 'text-yellow-400';
    case 'failed': return 'text-red-400';
    default: return 'text-gray-400';
  }
};