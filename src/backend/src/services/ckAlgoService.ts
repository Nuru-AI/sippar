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
    'admin_burn_ck_algo': IDL.Func([IDL.Principal, IDL.Nat, IDL.Text], [IDL.Variant({ 'Ok': IDL.Text, 'Err': IDL.Text })], []),
    'admin_transfer_ck_algo_by_string': IDL.Func([IDL.Text, IDL.Principal, IDL.Nat], [IDL.Variant({ 'Ok': IDL.Nat, 'Err': IDL.Text })], []),
    'admin_restore_balance': IDL.Func([IDL.Text, IDL.Nat], [IDL.Variant({ 'Ok': IDL.Nat, 'Err': IDL.Text })], []),
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
      console.log(`🔍 Querying ckALGO balance for principal: ${principal}`);

      const validPrincipal = Principal.fromText(principal);
      console.log(`✅ Principal parsed successfully: ${validPrincipal.toString()}`);

      const balance = await this.actor.icrc1_balance_of(validPrincipal);
      console.log(`✅ Raw balance from canister: ${balance} microckALGO`);

      // Convert from microckALGO to ckALGO (6 decimals)
      const balanceInAlgo = Number(balance) / 1_000_000;
      console.log(`📊 ckALGO balance for ${principal}: ${balanceInAlgo} ckALGO (${balance} microckALGO)`);

      return balanceInAlgo;
    } catch (error) {
      console.error('❌ Failed to query ckALGO balance:', error);
      console.error('❌ Error details:', error);
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
   * Burn (redeem) ckALGO tokens by transferring to canister (burn address)
   * @param principal - User's Internet Identity principal (the token owner)
   * @param microAlgos - Amount in microckALGO (6 decimals) to burn  
   * @param destinationAddress - Algorand address to send unlocked ALGO to
   * @returns Redemption result with success/error info
   */
  async burnCkAlgo(principal: string, microAlgos: number, destinationAddress: string) {
    try {
      console.log(`🔥 Burning ${microAlgos} microckALGO from ${principal} by transferring to canister (burn)`);
      
      // First, check what the actual balance is
      const currentBalance = await this.getBalance(principal);
      console.log(`📊 Current ckALGO balance for ${principal}: ${currentBalance} ckALGO`);
      
      const requestedAmount = microAlgos / 1_000_000;
      if (currentBalance < requestedAmount) {
        throw new Error(`Insufficient balance: User has ${currentBalance} ckALGO but trying to burn ${requestedAmount} ckALGO`);
      }
      
      // Call the enhanced canister's admin_burn_ck_algo function
      // Backend is authorized to burn tokens from user's balance via admin function
      console.log(`🔥 Calling enhanced canister admin_burn_ck_algo function`);
      console.log(`🔥 Burning ${microAlgos} microckALGO (${requestedAmount} ckALGO) from user ${principal} to ${destinationAddress}`);
      
      // Handle Chain Fusion principal format for admin burn
      let burnResult;
      try {
        const userPrincipal = Principal.fromText(principal);
        burnResult = await this.actor.admin_burn_ck_algo(userPrincipal, BigInt(microAlgos), destinationAddress);
        console.log('✅ Enhanced canister burn result:', burnResult);
      } catch (principalError) {
        console.error(`❌ Chain Fusion principal incompatible with ICRC-1 canister: ${principal.substring(0, 20)}...`);
        console.error(`💡 Chain Fusion principals need different handling for canister calls`);
        throw new Error(`CHAIN_FUSION_PRINCIPAL_INCOMPATIBLE: This principal format requires Chain Fusion specific canister integration. Standard ICRC-1 operations not supported.`);
      }
      
      // Handle Rust Result type: { Ok: value } or { Err: error }
      if (burnResult && typeof burnResult === 'object' && 'Ok' in burnResult) {
        const burnedAmount = microAlgos / 1_000_000; // Convert to ALGO
        console.log(`✅ Successfully burned ${burnedAmount} ckALGO via enhanced canister`);
        return {
          success: true,
          amount_burned: burnedAmount,
          raw_amount: microAlgos,
          principal,
          tx_id: (burnResult as any).Ok,
          method: "enhanced_canister",
          algorand_tx_id: (burnResult as any).Ok
        };
      } else if (burnResult && typeof burnResult === 'object' && 'Err' in burnResult) {
        console.error('❌ Enhanced canister burn failed:', (burnResult as any).Err);
        throw new Error(`Enhanced canister burn failed: ${(burnResult as any).Err}`);
      } else {
        throw new Error('Unknown result format from enhanced canister');
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
        const mintedAmount = microAlgos / 1_000_000; // Use requested amount, not canister response
        console.log(`✅ Successfully minted ${mintedAmount} ckALGO (canister returned: ${result.Ok})`);
        return {
          success: true,
          amount_minted: mintedAmount,
          transaction_id: String(result.Ok), // This is actually a transaction ID, not amount
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

  /**
   * Transfer ckALGO tokens to another ICP principal
   * @param fromPrincipal - Sender's principal (for logging)
   * @param toPrincipal - Recipient's principal
   * @param amount - Amount in ckALGO (will be converted to microckALGO)
   * @returns Transfer result with success/error info
   */
  async transferCkAlgo(fromPrincipal: string, toPrincipal: string, amount: number) {
    try {
      console.log(`💸 Transferring ${amount} ckALGO from ${fromPrincipal} to ${toPrincipal}`);
      
      const microAlgos = Math.floor(amount * 1_000_000); // Convert to microckALGO
      const toPrincipalObj = Principal.fromText(toPrincipal);
      
      // Use admin_transfer_ck_algo_by_string to handle Chain Fusion principals properly
      const result = await this.actor.admin_transfer_ck_algo_by_string(fromPrincipal, toPrincipalObj, BigInt(microAlgos));
      
      console.log('✅ ckALGO transfer result from canister:', result);
      
      // Handle Rust Result type: { Ok: value } or { Err: error }
      if ('Ok' in result) {
        console.log(`✅ Successfully transferred ${amount} ckALGO`);
        return {
          success: true,
          amount_transferred: amount,
          raw_amount: microAlgos,
          from_principal: fromPrincipal,
          to_principal: toPrincipal,
          transaction_index: Number(result.Ok)
        };
      } else {
        console.error(`❌ Transfer failed: ${result.Err}`);
        throw new Error(`Transfer failed: ${result.Err}`);
      }
    } catch (error) {
      console.error('❌ Failed to transfer ckALGO:', error);
      throw error;
    }
  }

  /**
   * Restore balance after canister upgrade (admin only)
   */
  async restoreBalance(accountStr: string, amount: number) {
    try {
      const microAlgos = Math.floor(amount * 1_000_000);
      const result = await this.actor.admin_restore_balance(accountStr, BigInt(microAlgos));
      
      if ('Ok' in result) {
        console.log(`✅ Successfully restored ${amount} ckALGO balance for ${accountStr}`);
        return { success: true, amount_restored: amount };
      } else {
        throw new Error(`Restore failed: ${result.Err}`);
      }
    } catch (error) {
      console.error('❌ Failed to restore balance:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const ckAlgoService = new CkAlgoService();