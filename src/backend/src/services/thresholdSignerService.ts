/**
 * Threshold Signer Service
 * Integrates with the ICP threshold signature canister for Algorand address derivation and transaction signing
 */

import { HttpAgent, Actor } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import crypto from 'crypto';

// Threshold Signer Types (copied from canister declarations)
export interface AlgorandAddress {
  public_key: Uint8Array | number[];
  address: string;
}

export interface SignedTransaction {
  signature: Uint8Array | number[];
  transaction_bytes: Uint8Array | number[];
  signed_tx_id: string;
}

export interface SigningError { 
  code: number; 
  message: string; 
}

export type SigningResult = { 'Ok': AlgorandAddress } | { 'Err': SigningError };
export type TransactionSigningResult = { 'Ok': SignedTransaction } | { 'Err': SigningError };

// Service Interface (copied from canister declarations)
interface ThresholdSignerService {
  derive_algorand_address: (principal: Principal) => Promise<SigningResult>;
  sign_algorand_transaction: (principal: Principal, transactionBytes: Uint8Array | number[]) => Promise<TransactionSigningResult>;
  get_canister_status: () => Promise<Array<[string, string]>>;
  greet: (name: string) => Promise<string>;
  verify_signature: (message: Uint8Array | number[], signature: Uint8Array | number[], publicKey: Uint8Array | number[]) => Promise<boolean>;
}

// IDL Factory (simplified version - in production this should be imported from declarations)  
const thresholdSignerIdl = ({ IDL }: { IDL: any }) => {
  const AlgorandAddress = IDL.Record({
    'public_key': IDL.Vec(IDL.Nat8),
    'address': IDL.Text,
  });
  const SigningError = IDL.Record({
    'code': IDL.Nat32,
    'message': IDL.Text,
  });
  const SigningResult = IDL.Variant({
    'Ok': AlgorandAddress,
    'Err': SigningError,
  });
  const SignedTransaction = IDL.Record({
    'signature': IDL.Vec(IDL.Nat8),
    'transaction_bytes': IDL.Vec(IDL.Nat8),
    'signed_tx_id': IDL.Text,
  });
  const TransactionSigningResult = IDL.Variant({
    'Ok': SignedTransaction,
    'Err': SigningError,
  });
  return IDL.Service({
    'derive_algorand_address': IDL.Func([IDL.Principal], [SigningResult], []),
    'get_canister_status': IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text))], ['query']),
    'greet': IDL.Func([IDL.Text], [IDL.Text], ['query']),
    'sign_algorand_transaction': IDL.Func([IDL.Principal, IDL.Vec(IDL.Nat8)], [TransactionSigningResult], []),
    'verify_signature': IDL.Func([IDL.Vec(IDL.Nat8), IDL.Vec(IDL.Nat8), IDL.Vec(IDL.Nat8)], [IDL.Bool], ['query']),
  });
};

export class ThresholdSignerServiceClient {
  private agent: HttpAgent;
  private actor: any;
  private canisterId: string;
  private chainFusionEndpoint: string;

  constructor() {
    this.canisterId = 'vj7ly-diaaa-aaaae-abvoq-cai'; // Threshold signer canister ID
    this.agent = new HttpAgent({ host: 'https://ic0.app' });
    this.chainFusionEndpoint = 'http://localhost:9002'; // Chain-fusion backend
    
    // Initialize actor
    this.actor = Actor.createActor(thresholdSignerIdl, {
      agent: this.agent,
      canisterId: this.canisterId,
    }) as ThresholdSignerService;
  }

  /**
   * Derive Algorand address for a user principal using threshold signatures
   */
  async deriveAlgorandAddress(userPrincipal: string): Promise<AlgorandAddress> {
    try {
      console.log(`🔑 Deriving Algorand address for principal: ${userPrincipal}`);
      
      // TEMPORARILY DISABLED: Chain-fusion backend call for debugging
      // First try to derive from chain-fusion backend
      console.log(`🔗 SKIPPING chain-fusion backend, going directly to ICP canister for debugging...`);
      
      // DIRECT CALL: Try threshold signer canister only
      try {
        let principal: Principal;
        try {
          principal = Principal.fromText(userPrincipal.trim());
        } catch {
          throw new Error('Principal parsing failed');
        }
        
        // Use the working icpCanisterService instead of direct actor call
        const icpCanisterService = require('./icpCanisterService').icpCanisterService;
        const result = await icpCanisterService.deriveAlgorandAddress(userPrincipal);
        
        console.log(`✅ Algorand address derived via working ICP service: ${result.address}`);
        return result;
      } catch (thresholdError: any) {
        console.warn(`⚠️ Threshold signer failed: ${thresholdError?.message || thresholdError}`);
        throw new Error('Both chain-fusion backend and threshold signer failed');
      }
      
    } catch (error) {
      console.error('❌ Failed to derive Algorand address:', error);
      throw error;
    }
  }

  /**
   * Sign an Algorand transaction using threshold signatures
   */
  async signAlgorandTransaction(userPrincipal: string, transactionBytes: Uint8Array): Promise<SignedTransaction> {
    try {
      console.log(`✍️ Signing Algorand transaction for principal: ${userPrincipal}`);
      
      // Use the working icpCanisterService instead of direct actor call
      const icpCanisterService = require('./icpCanisterService').icpCanisterService;
      const result = await icpCanisterService.signAlgorandTransaction(userPrincipal, transactionBytes);
      
      console.log(`✅ Transaction signed via working ICP service: ${result.signed_tx_id}`);
      return result;
    } catch (error) {
      console.error('❌ Failed to sign Algorand transaction:', error);
      throw error;
    }
  }

  /**
   * Get canister status for monitoring
   */
  async getCanisterStatus(): Promise<Array<[string, string]>> {
    try {
      return await this.actor.get_canister_status();
    } catch (error) {
      console.error('❌ Failed to get canister status:', error);
      throw error;
    }
  }

  /**
   * Test connection to threshold signer canister
   */
  async testConnection(): Promise<boolean> {
    try {
      const greeting = await this.actor.greet('Backend Service');
      console.log(`✅ Threshold signer connection test: ${greeting}`);
      return true;
    } catch (error) {
      console.error('❌ Threshold signer connection test failed:', error);
      return false;
    }
  }

  /**
   * Verify a signature (useful for validation)
   */
  async verifySignature(message: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): Promise<boolean> {
    try {
      return await this.actor.verify_signature(message, signature, publicKey);
    } catch (error) {
      console.error('❌ Failed to verify signature:', error);
      return false;
    }
  }

}

// Export singleton instance
export const thresholdSignerService = new ThresholdSignerServiceClient();