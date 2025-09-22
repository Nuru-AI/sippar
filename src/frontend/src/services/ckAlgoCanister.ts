/**
 * ckALGO Canister Service
 * Handles minting and redeeming of chain-key ALGO tokens
 * Phase 3 implementation - integrated with ICP threshold signatures
 */

export interface CkAlgoMintRequest {
  amount: number; // Amount in ALGO
  algorandTxId: string; // Algorand transaction ID
  userPrincipal: string; // Internet Identity principal
  depositAddress: string; // Source Algorand address
}

export interface CkAlgoMintResponse {
  success: boolean;
  ckAlgoAmount: number;
  icpTxId?: string;
  error?: string;
}

export class CkAlgoCanisterService {
  private canisterUrl: string;

  constructor() {
    // Phase 3: Use production API endpoint
    this.canisterUrl = 'https://nuru.network/api/sippar/ck-algo'; // Production: absolute URL
  }

  private async tryEndpoints(endpoint: string, options: RequestInit): Promise<Response> {
    // Try production API endpoint first, then fallback
    const endpoints = [
      `https://nuru.network/api/sippar${endpoint}`, // Production: absolute URL
      `http://localhost:3004${endpoint}`, // Local dev fallback (correct port)
    ];
    
    for (const url of endpoints) {
      try {
        const response = await fetch(url, options);
        if (response.ok) {
          return response;
        }
      } catch (error) {
        console.log(`⚠️ Endpoint ${url} failed, trying next...`);
      }
    }
    
    // If all fail, return the last attempt
    return fetch(endpoints[endpoints.length - 1], options);
  }

  /**
   * Mint ckALGO tokens after ALGO deposit is confirmed
   */
  async mintCkAlgo(request: CkAlgoMintRequest): Promise<CkAlgoMintResponse> {
    try {
      console.log('🪙 Minting ckALGO tokens:', request);

      // Phase 3: Use threshold signature backend with fallback
      const response = await this.tryEndpoints('/ck-algo/mint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          principal: request.userPrincipal,
          amount: request.amount,
          algorandTxId: request.algorandTxId,
          depositAddress: request.depositAddress,
        }),
      });

      if (!response.ok) {
        throw new Error(`Minting failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ ckALGO minted successfully:', result);

      return result;
    } catch (error) {
      console.error('❌ ckALGO minting error:', error);
      
      // Phase 3: No simulation fallback - return actual error
      return {
        success: false,
        ckAlgoAmount: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get user's ckALGO balance
   */
  async getBalance(principal: string): Promise<number> {
    try {
      const response = await fetch(`https://nuru.network/api/sippar/ck-algo/balance/${principal}`);
      if (!response.ok) {
        throw new Error(`Balance query failed: ${response.status}`);
      }
      
      const data = await response.json();
      return data.ckAlgoBalance || 0;
    } catch (error) {
      console.error('❌ Balance query error:', error);
      return 0;
    }
  }

  /**
   * Redeem ckALGO tokens for native ALGO
   */
  async redeemAlgo(amount: number, targetAddress: string, principal: string): Promise<CkAlgoMintResponse> {
    try {
      console.log('🔄 Redeeming ckALGO for ALGO:', { amount, targetAddress, principal });

      const response = await fetch(`${this.canisterUrl}/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          targetAddress,
          principal,
        }),
      });

      if (!response.ok) {
        throw new Error(`Redemption failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ ALGO redeemed successfully:', result);

      return result;
    } catch (error) {
      console.error('❌ ALGO redemption error:', error);
      
      // Phase 3: No simulation fallback - return actual error
      return {
        success: false,
        ckAlgoAmount: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

export const ckAlgoCanister = new CkAlgoCanisterService();