/**
 * ICP Canister Service for Threshold Signatures
 * Handles interaction with the Algorand threshold signing canister
 */

import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';

interface AlgorandAddress {
  address: string;
  public_key: Uint8Array;
}

interface SignedTransaction {
  transaction_bytes: Uint8Array;
  signature: Uint8Array;
  signed_tx_id: string;
}

interface SigningError {
  code: number;
  message: string;
}

type SigningResult = { Ok: AlgorandAddress } | { Err: SigningError };
type TransactionSigningResult = { Ok: SignedTransaction } | { Err: SigningError };

// IDL interface for the canister
const idlFactory = ({ IDL }: any) => {
  const AlgorandAddress = IDL.Record({
    address: IDL.Text,
    public_key: IDL.Vec(IDL.Nat8),
  });
  
  const SignedTransaction = IDL.Record({
    transaction_bytes: IDL.Vec(IDL.Nat8),
    signature: IDL.Vec(IDL.Nat8),
    signed_tx_id: IDL.Text,
  });
  
  const SigningError = IDL.Record({
    code: IDL.Nat32,
    message: IDL.Text,
  });
  
  const SigningResult = IDL.Variant({
    Ok: AlgorandAddress,
    Err: SigningError,
  });
  
  const TransactionSigningResult = IDL.Variant({
    Ok: SignedTransaction,
    Err: SigningError,
  });

  return IDL.Service({
    greet: IDL.Func([IDL.Text], [IDL.Text], ['query']),
    derive_algorand_address: IDL.Func([IDL.Principal], [SigningResult], []),
    sign_algorand_transaction: IDL.Func([IDL.Principal, IDL.Vec(IDL.Nat8)], [TransactionSigningResult], []),
    get_canister_status: IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text))], ['query']),
    verify_signature: IDL.Func([IDL.Vec(IDL.Nat8), IDL.Vec(IDL.Nat8), IDL.Vec(IDL.Nat8)], [IDL.Bool], ['query']),
  });
};

export class ICPCanisterService {
  private agent: HttpAgent;
  private actor: any;
  private canisterId: string;

  constructor(canisterId: string, hostUrl: string = 'http://127.0.0.1:4943') {
    this.canisterId = canisterId;
    this.agent = new HttpAgent({ host: hostUrl });
    
    // Only fetch root key in local development
    if (hostUrl.includes('127.0.0.1') || hostUrl.includes('localhost')) {
      this.agent.fetchRootKey().catch(console.error);
    }
    
    this.actor = Actor.createActor(idlFactory, {
      agent: this.agent,
      canisterId: this.canisterId,
    });
  }

  /**
   * Test canister connectivity
   */
  async greet(name: string): Promise<string> {
    try {
      const result = await this.actor.greet(name);
      return result;
    } catch (error) {
      console.error('❌ Canister greet failed:', error);
      throw new Error(`Canister communication failed: ${error}`);
    }
  }

  /**
   * Get canister status and capabilities
   */
  async getCanisterStatus(): Promise<Record<string, string>> {
    try {
      const result = await this.actor.get_canister_status();
      const statusMap: Record<string, string> = {};
      
      for (const [key, value] of result) {
        statusMap[key] = value;
      }
      
      return statusMap;
    } catch (error) {
      console.error('❌ Get canister status failed:', error);
      throw new Error(`Failed to get canister status: ${error}`);
    }
  }

  /**
   * Derive a unique Algorand address for a user principal using threshold signatures
   */
  async deriveAlgorandAddress(userPrincipal: string): Promise<AlgorandAddress> {
    try {
      const principal = Principal.fromText(userPrincipal);
      const result: SigningResult = await this.actor.derive_algorand_address(principal);
      
      if ('Ok' in result) {
        return {
          address: result.Ok.address,
          public_key: new Uint8Array(result.Ok.public_key),
        };
      } else {
        throw new Error(`Address derivation failed: ${result.Err.message} (Code: ${result.Err.code})`);
      }
    } catch (error) {
      console.error('❌ Address derivation failed:', error);
      throw new Error(`Failed to derive Algorand address: ${error}`);
    }
  }

  /**
   * Sign an Algorand transaction using threshold signatures
   */
  async signAlgorandTransaction(userPrincipal: string, transactionBytes: Uint8Array): Promise<SignedTransaction> {
    try {
      const principal = Principal.fromText(userPrincipal);
      const result: TransactionSigningResult = await this.actor.sign_algorand_transaction(
        principal, 
        Array.from(transactionBytes)
      );
      
      if ('Ok' in result) {
        return {
          transaction_bytes: new Uint8Array(result.Ok.transaction_bytes),
          signature: new Uint8Array(result.Ok.signature),
          signed_tx_id: result.Ok.signed_tx_id,
        };
      } else {
        throw new Error(`Transaction signing failed: ${result.Err.message} (Code: ${result.Err.code})`);
      }
    } catch (error) {
      console.error('❌ Transaction signing failed:', error);
      throw new Error(`Failed to sign Algorand transaction: ${error}`);
    }
  }

  /**
   * Verify a signature for given transaction bytes
   */
  async verifySignature(publicKey: Uint8Array, transactionBytes: Uint8Array, signature: Uint8Array): Promise<boolean> {
    try {
      const result = await this.actor.verify_signature(
        Array.from(publicKey),
        Array.from(transactionBytes),
        Array.from(signature)
      );
      return result;
    } catch (error) {
      console.error('❌ Signature verification failed:', error);
      throw new Error(`Failed to verify signature: ${error}`);
    }
  }

  /**
   * Get the canister ID
   */
  getCanisterId(): string {
    return this.canisterId;
  }
}

// Export singleton instance for the deployed canister
export const icpCanisterService = new ICPCanisterService(
  'vj7ly-diaaa-aaaae-abvoq-cai', // Production threshold signer canister ID
  'https://ic0.app' // ICP mainnet
);

export default icpCanisterService;