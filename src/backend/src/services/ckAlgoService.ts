/**
 * ckALGO Canister Service - ICRC-1 Token Operations
 * Handles real balance queries and token operations with deployed canister
 */

import { HttpAgent, Actor } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';

// ICRC-1 IDL for ckALGO canister
const ckAlgoIdl = ({ IDL }: any) => {
  return IDL.Service({
    'icrc1_name': IDL.Func([], [IDL.Text], ['query']),
    'icrc1_symbol': IDL.Func([], [IDL.Text], ['query']),
    'icrc1_decimals': IDL.Func([], [IDL.Nat8], ['query']),
    'icrc1_total_supply': IDL.Func([], [IDL.Nat], ['query']),
    'icrc1_balance_of': IDL.Func([IDL.Principal], [IDL.Nat], ['query']),
    'icrc1_transfer': IDL.Func([IDL.Principal, IDL.Nat], [IDL.Variant({ 'Ok': IDL.Nat, 'Err': IDL.Text })], []),
    'mint_ck_algo': IDL.Func([IDL.Principal, IDL.Nat], [IDL.Variant({ 'Ok': IDL.Nat, 'Err': IDL.Text })], []),
    'redeem_ck_algo': IDL.Func([IDL.Nat, IDL.Text], [IDL.Variant({ 'Ok': IDL.Text, 'Err': IDL.Text })], []),
    'get_reserves': IDL.Func([], [IDL.Nat, IDL.Nat, IDL.Float32], ['query']),
    'get_caller': IDL.Func([], [IDL.Principal], ['query'])
  });
};

export class CkAlgoService {
  private agent: HttpAgent;
  private actor: any;
  private canisterId: string;

  constructor() {
    this.canisterId = 'gbmxj-yiaaa-aaaak-qulqa-cai';
    
    // Create HTTP agent for mainnet with proper anonymous configuration
    this.agent = new HttpAgent({ 
      host: 'https://ic0.app',
      verifyQuerySignatures: false // Required for anonymous calls in production
    });
    
    // Fetch root key for certificate validation (required for mainnet)
    this.agent.fetchRootKey().catch(err => {
      console.warn('Failed to fetch root key:', err);
    });
    
    // Create actor using the canister ID and IDL
    this.actor = Actor.createActor(ckAlgoIdl, {
      agent: this.agent,
      canisterId: this.canisterId
    });
  }

  /**
   * Get ckALGO balance for a principal
   * @param principal - User's Internet Identity principal
   * @returns Balance in microckALGO (6 decimals)
   */
  async getBalance(principal: string): Promise<number> {
    try {
      const principalObj = Principal.fromText(principal);
      const balance = await this.actor.icrc1_balance_of(principalObj);
      
      // Convert from microckALGO to ckALGO (6 decimals)
      const balanceInAlgo = Number(balance) / 1_000_000;
      console.log(`📊 ckALGO balance for ${principal}: ${balanceInAlgo} ckALGO (${balance} microckALGO)`);
      
      return balanceInAlgo;
    } catch (error) {
      console.error('❌ Failed to query ckALGO balance:', error);
      throw error;
    }
  }

  /**
   * Get total supply of ckALGO
   */
  async getTotalSupply(): Promise<number> {
    try {
      const totalSupply = await this.actor.icrc1_total_supply();
      return Number(totalSupply) / 1_000_000; // Convert to ckALGO
    } catch (error) {
      console.error('❌ Failed to query ckALGO total supply:', error);
      throw error;
    }
  }

  /**
   * Get token metadata
   */
  async getTokenInfo() {
    try {
      const [name, symbol, decimals] = await Promise.all([
        this.actor.icrc1_name(),
        this.actor.icrc1_symbol(),
        this.actor.icrc1_decimals()
      ]);

      return {
        name,
        symbol,
        decimals: Number(decimals)
      };
    } catch (error) {
      console.error('❌ Failed to query ckALGO token info:', error);
      throw error;
    }
  }

  /**
   * Get reserve information
   */
  async getReserves() {
    try {
      const [totalSupply, algoBalance, ratio] = await this.actor.get_reserves();
      
      return {
        totalSupply: Number(totalSupply) / 1_000_000,
        algoBalance: Number(algoBalance) / 1_000_000,
        ratio: Number(ratio)
      };
    } catch (error) {
      console.error('❌ Failed to query ckALGO reserves:', error);
      throw error;
    }
  }

  /**
   * Burn (redeem) ckALGO tokens from specific user's balance
   * @param principal - User's Internet Identity principal (the token owner)
   * @param microAlgos - Amount in microckALGO (6 decimals) to burn  
   * @param destinationAddress - Algorand address to send unlocked ALGO to
   * @returns Redemption result with success/error info
   */
  async burnCkAlgo(principal: string, microAlgos: number, destinationAddress: string) {
    try {
      console.log(`🔥 Burning ${microAlgos} microckALGO from ${principal} (destination: ${destinationAddress})`);
      
      // Create agent authenticated as the user principal for this specific call
      const userAgent = new HttpAgent({ 
        host: 'https://ic0.app',
        identity: { getPrincipal: () => Principal.fromText(principal) } as any
      });
      
      // Fetch root key for certificate validation
      await userAgent.fetchRootKey();
      
      // Create actor authenticated as the user
      const userActor = Actor.createActor(ckAlgoIdl, {
        agent: userAgent,
        canisterId: this.canisterId
      });
      
      const result = await userActor.redeem_ck_algo(BigInt(microAlgos), destinationAddress);
      
      console.log('✅ ckALGO burn result from canister:', result);
      
      // Handle Rust Result type: { Ok: value } or { Err: error }
      if (result && typeof result === 'object' && 'Ok' in result) {
        const burnedAmount = microAlgos / 1_000_000; // Convert to ALGO
        console.log(`✅ Successfully burned ${burnedAmount} ckALGO`);
        return {
          success: true,
          amount_burned: burnedAmount,
          raw_amount: microAlgos,
          principal,
          tx_id: (result as any).Ok
        };
      } else if (result && typeof result === 'object' && 'Err' in result) {
        console.error('❌ ckALGO burning failed:', (result as any).Err);
        throw new Error(`ckALGO burning failed: ${(result as any).Err}`);
      } else {
        throw new Error('Unknown result format from ckALGO canister');
      }
      
    } catch (error) {
      console.error('❌ Failed to burn ckALGO:', error);
      throw error;
    }
  }

  /**
   * Mint ckALGO tokens to a user's principal
   * @param principal - User's Internet Identity principal (string)
   * @param microAlgos - Amount in microALGO (6 decimals)
   * @returns Minting result with success/error info
   */
  async mintCkAlgo(principal: string, microAlgos: number) {
    try {
      console.log(`🪙 Minting ${microAlgos} microckALGO to principal: ${principal}`);
      
      const principalObj = Principal.fromText(principal);
      const result = await this.actor.mint_ck_algo(principalObj, BigInt(microAlgos));
      
      console.log('✅ ckALGO mint result from canister:', result);
      
      // Handle Rust Result type: { Ok: value } or { Err: error }
      if ('Ok' in result) {
        const mintedAmount = Number(result.Ok) / 1_000_000; // Convert back to ALGO
        console.log(`✅ Successfully minted ${mintedAmount} ckALGO`);
        return {
          success: true,
          amount_minted: mintedAmount,
          raw_amount: Number(result.Ok),
          principal
        };
      } else if ('Err' in result) {
        console.error('❌ ckALGO minting failed:', result.Err);
        throw new Error(`ckALGO minting failed: ${result.Err}`);
      } else {
        throw new Error('Unknown result format from ckALGO canister');
      }
      
    } catch (error) {
      console.error('❌ Failed to mint ckALGO:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const ckAlgoService = new CkAlgoService();