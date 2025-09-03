/**
 * SipparAPIService.ts - Sippar Threshold Signature API Integration
 * Extends BaseAPIService for bulletproof error handling and null safety
 * 
 * Connects to production Sippar API at http://74.50.113.152:8203
 */

import { 
  BaseAPIService, 
  SafeServiceResponse, 
  ServiceCallOptions,
  SERVICE_TIMEOUTS,
  SERVICE_CACHE_TTL 
} from './BaseAPIService';

// ================================
// SIPPAR-SPECIFIC INTERFACES
// ================================

export interface AlgorandAddress {
  address: string;
  public_key: string;
  canister_id: string;
}

export interface SipparSystemStatus {
  canister_id: string;
  network: string;
  integration_status: string;
  healthy: boolean;
  response_time?: number;
}

export interface MintPreparation {
  custody_address: string;
  expected_amount: number;
  deposit_deadline: number;
  transaction_id: string;
}

export interface RedeemPreparation {
  recipient_address: string;
  amount: number;
  estimated_fees: number;
  transaction_id: string;
}

export interface SignedTransaction {
  signed_transaction: string;
  transaction_id: string;
  algorand_tx_id?: string;
}

// ================================
// SIPPAR API SERVICE
// ================================

class SipparAPIService extends BaseAPIService {
  private readonly API_BASE = window.location.hostname === 'localhost' 
    ? 'http://74.50.113.152:8203'  // Development: direct to API server
    : '/api/sippar';               // Production: use nginx proxy
  
  constructor() {
    super('SipparAPI');
    this.defaultTimeout = SERVICE_TIMEOUTS.NORMAL;
    this.defaultRetries = 3;
  }

  // ================================
  // CORE API METHODS
  // ================================

  /**
   * Derive Algorand address from user principal using threshold signatures
   */
  async deriveAlgorandAddress(
    principal: string,
    options?: ServiceCallOptions
  ): Promise<SafeServiceResponse<AlgorandAddress>> {
    return this.safeApiCall(
      async () => {
        const response = await fetch(`${this.API_BASE}/api/v1/threshold/derive-address`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ principal }),
        });

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Address derivation failed');
        }

        return {
          address: data.address,
          public_key: data.public_key,
          canister_id: data.canister_id
        };
      },
      {
        address: 'FAILED_TO_DERIVE_ADDRESS',
        public_key: '',
        canister_id: 'unknown'
      },
      {
        ...options,
        useCache: true,
        cacheTTL: SERVICE_CACHE_TTL.LONG // Cache addresses for 5 minutes
      }
    );
  }

  /**
   * Get system status and health information
   */
  async getSystemStatus(
    options?: ServiceCallOptions
  ): Promise<SafeServiceResponse<SipparSystemStatus>> {
    return this.safeApiCall(
      async () => {
        const response = await fetch(`${this.API_BASE}/api/v1/threshold/status`, {
          method: 'GET',
        });

        if (!response.ok) {
          throw new Error(`Status request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        return {
          canister_id: data.canister_id || 'unknown',
          network: data.network || 'unknown',
          integration_status: data.integration_status || 'unknown',
          healthy: data.healthy !== false,
          response_time: data.response_time
        };
      },
      {
        canister_id: 'unknown',
        network: 'unknown', 
        integration_status: 'error',
        healthy: false
      },
      {
        ...options,
        useCache: true,
        cacheTTL: SERVICE_CACHE_TTL.SHORT // Fresh status every 10 seconds
      }
    );
  }

  /**
   * Prepare ckALGO minting process
   */
  async prepareMint(
    principal: string,
    amount: number,
    options?: ServiceCallOptions
  ): Promise<SafeServiceResponse<MintPreparation>> {
    return this.safeApiCall(
      async () => {
        const response = await fetch(`${this.API_BASE}/api/v1/sippar/mint/prepare`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ principal, amount }),
        });

        if (!response.ok) {
          throw new Error(`Mint preparation failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Mint preparation failed');
        }

        return {
          custody_address: data.custody_address,
          expected_amount: data.expected_amount,
          deposit_deadline: data.deposit_deadline,
          transaction_id: data.transaction_id
        };
      },
      {
        custody_address: 'MINT_PREPARATION_FAILED',
        expected_amount: 0,
        deposit_deadline: 0,
        transaction_id: 'failed'
      },
      options
    );
  }

  /**
   * Prepare ckALGO redemption process
   */
  async prepareRedeem(
    principal: string,
    amount: number,
    recipient_address: string,
    options?: ServiceCallOptions
  ): Promise<SafeServiceResponse<RedeemPreparation>> {
    return this.safeApiCall(
      async () => {
        const response = await fetch(`${this.API_BASE}/api/v1/sippar/redeem/prepare`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            principal, 
            amount,
            recipient_address 
          }),
        });

        if (!response.ok) {
          throw new Error(`Redeem preparation failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Redeem preparation failed');
        }

        return {
          recipient_address: data.recipient_address,
          amount: data.amount,
          estimated_fees: data.estimated_fees,
          transaction_id: data.transaction_id
        };
      },
      {
        recipient_address: '',
        amount: 0,
        estimated_fees: 0,
        transaction_id: 'failed'
      },
      options
    );
  }

  /**
   * Sign Algorand transaction using threshold signatures
   */
  async signTransaction(
    principal: string,
    transaction_bytes: string,
    options?: ServiceCallOptions
  ): Promise<SafeServiceResponse<SignedTransaction>> {
    return this.safeApiCall(
      async () => {
        const response = await fetch(`${this.API_BASE}/api/v1/threshold/sign-transaction`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            principal,
            transaction_bytes 
          }),
        });

        if (!response.ok) {
          throw new Error(`Transaction signing failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Transaction signing failed');
        }

        return {
          signed_transaction: data.signed_transaction,
          transaction_id: data.transaction_id,
          algorand_tx_id: data.algorand_tx_id
        };
      },
      {
        signed_transaction: '',
        transaction_id: 'failed',
        algorand_tx_id: undefined
      },
      {
        ...options,
        timeout: SERVICE_TIMEOUTS.SLOW // Signing can take longer
      }
    );
  }

  // ================================
  // REQUIRED HEALTH CHECK
  // ================================

  async healthCheck(): Promise<SafeServiceResponse<{ 
    healthy: boolean;
    responseTime?: number;
    lastError?: string;
  }>> {
    return this.safeApiCall(
      async () => {
        const startTime = Date.now();
        const response = await fetch(`${this.API_BASE}/health`, {
          method: 'GET',
        });

        const responseTime = Date.now() - startTime;

        if (!response.ok) {
          throw new Error(`Health check failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        return {
          healthy: data.status === 'healthy',
          responseTime,
          lastError: data.status !== 'healthy' ? 'API not healthy' : undefined
        };
      },
      {
        healthy: false,
        lastError: 'Health check failed'
      },
      {
        timeout: SERVICE_TIMEOUTS.FAST,
        retries: 1 // Don't retry health checks extensively
      }
    );
  }

  // ================================
  // UTILITY METHODS
  // ================================

  /**
   * Format Algorand address for display (truncated with ellipsis)
   */
  formatAlgorandAddress(address: string, truncate = true): string {
    if (!address || address === 'FAILED_TO_DERIVE_ADDRESS') {
      return 'Address derivation failed';
    }

    if (!truncate || address.length <= 20) {
      return address;
    }

    return `${address.slice(0, 10)}...${address.slice(-10)}`;
  }

  /**
   * Format ALGO amount with proper decimal places
   */
  formatAlgoAmount(microAlgos: number): string {
    return this.safeFormat(microAlgos / 1_000_000, 6, '0.000000');
  }

  /**
   * Convert ALGO to microALGOs
   */
  algoToMicroAlgos(algos: number): number {
    return Math.floor(algos * 1_000_000);
  }

  /**
   * Convert microALGOs to ALGO
   */
  microAlgosToAlgo(microAlgos: number): number {
    return microAlgos / 1_000_000;
  }

  /**
   * Validate Algorand address format
   */
  isValidAlgorandAddress(address: string): boolean {
    if (!address || typeof address !== 'string') {
      return false;
    }
    
    // Basic format check: 58 characters, uppercase alphanumeric
    const formatRegex = /^[A-Z2-7]{58}$/;
    return formatRegex.test(address);
  }
}

// Export singleton instance
export const sipparAPI = new SipparAPIService();
export default sipparAPI;