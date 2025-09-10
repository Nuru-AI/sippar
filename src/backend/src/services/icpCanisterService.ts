/**
 * ICP Canister Service for Threshold Signatures
 * Handles interaction with the Algorand threshold signing canister
 */

import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { Ed25519KeyIdentity } from '@dfinity/identity';
import { getCachedOrDeriveAddress, getCacheStats } from './localAddressDerivation.js';

// In-memory cache for address derivations to save 15B cycles per lookup
interface CachedAddress {
  address: string;
  public_key: Uint8Array;
  timestamp: number;
}

const ADDRESS_CACHE = new Map<string, CachedAddress>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Clean up expired cache entries periodically
function cleanupExpiredCache() {
  const now = Date.now();
  for (const [key, cached] of ADDRESS_CACHE.entries()) {
    if (now - cached.timestamp > CACHE_DURATION) {
      ADDRESS_CACHE.delete(key);
      console.log(`🧹 Cleaned up expired cache entry for ${key.substring(0, 10)}...`);
    }
  }
}

// Run cleanup every 6 hours
setInterval(cleanupExpiredCache, 6 * 60 * 60 * 1000);

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
    sign_migration_transaction: IDL.Func([IDL.Principal, IDL.Vec(IDL.Nat8)], [TransactionSigningResult], []),
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
    
    // Create HTTP Agent with proper timeout and retry configuration
    this.agent = new HttpAgent({ 
      host: hostUrl,
      // Add timeout for mainnet calls to prevent hanging
      ...(hostUrl.includes('ic0.app') && {
        fetchOptions: {
          timeout: 30000, // 30 second timeout
        }
      })
    });
    
    // Only fetch root key in local development
    if (hostUrl.includes('127.0.0.1') || hostUrl.includes('localhost')) {
      this.agent.fetchRootKey().catch(console.error);
    }
    
    // For mainnet, ensure agent is properly configured
    if (hostUrl.includes('ic0.app')) {
      // No root key fetch needed for mainnet
      console.log('🌐 Configured for ICP mainnet with 30s timeout');
    }
    
    // For mainnet, try to load identity from environment or use anonymous
    if (!hostUrl.includes('127.0.0.1') && !hostUrl.includes('localhost')) {
      this.setupMainnetIdentity();
    }
    
    this.actor = Actor.createActor(idlFactory, {
      agent: this.agent,
      canisterId: this.canisterId,
    });
  }

  private setupMainnetIdentity() {
    try {
      // For production, the canister should allow anonymous calls for threshold operations
      // or we need to set up proper identity management
      console.log('🔧 Setting up mainnet identity...');
      
      // The threshold signature canister should be configured to accept calls
      // from the subnet or use proper authentication
      
    } catch (error) {
      console.warn('⚠️ Failed to setup identity:', error);
    }
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
   * Implements caching to avoid 15B cycle cost per lookup
   */
  async deriveAlgorandAddress(userPrincipal: string): Promise<AlgorandAddress> {
    try {
      console.log('🔍 deriveAlgorandAddress called with:', userPrincipal);
      
      // Check cache first to avoid expensive 15B cycle threshold signature call
      const cached = ADDRESS_CACHE.get(userPrincipal);
      if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
        console.log('💾 Using cached address for:', userPrincipal.substring(0, 10) + '...');
        return {
          address: cached.address,
          public_key: cached.public_key
        };
      }
      
      console.log('🔍 DEBUG - userPrincipal type:', typeof userPrincipal);
      console.log('🔍 DEBUG - userPrincipal length:', userPrincipal?.length);
      console.log('🔍 DEBUG - userPrincipal first 20 chars:', userPrincipal?.substring(0, 20));
      
      const principal = Principal.fromText(userPrincipal);
      console.log('🔍 Principal.fromText result:', principal.toString());
      console.log('🔍 Principal.toText():', principal.toText());
      console.log('🔍 Principal byte length:', principal.toUint8Array().length);
      
      // Add retry logic for mainnet connectivity issues
      let result: SigningResult;
      let lastError: any;
      
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`🔄 ICP canister call attempt ${attempt}/3`);
          result = await this.actor.derive_algorand_address(principal);
          break; // Success, exit retry loop
        } catch (error: any) {
          lastError = error;
          console.warn(`⚠️ ICP canister call failed on attempt ${attempt}/3:`, error.message);
          
          if (attempt < 3) {
            const delay = 1000 * attempt; // 1s, 2s delay
            console.log(`⏳ Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      if (!result!) {
        throw lastError || new Error('All retry attempts failed');
      }
      
      if ('Ok' in result) {
        const derivedAddress = {
          address: result.Ok.address,
          public_key: new Uint8Array(result.Ok.public_key),
        };
        
        // Cache the result to avoid expensive 15B cycle calls
        ADDRESS_CACHE.set(userPrincipal, {
          address: derivedAddress.address,
          public_key: derivedAddress.public_key,
          timestamp: Date.now()
        });
        
        console.log(`💾 Cached address for ${userPrincipal.substring(0, 10)}... (saves 15B cycles per future lookup)`);
        
        return derivedAddress;
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
   * Sign a migration transaction using OLD derivation method (for address migration)
   */
  async signMigrationTransaction(userPrincipal: string, transactionBytes: Uint8Array): Promise<SignedTransaction> {
    try {
      console.log('🔄 signMigrationTransaction called with principal:', userPrincipal);
      const principal = Principal.fromText(userPrincipal);
      const result: TransactionSigningResult = await this.actor.sign_migration_transaction(
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
        throw new Error(`Migration transaction signing failed: ${result.Err.message} (Code: ${result.Err.code})`);
      }
    } catch (error) {
      console.error('❌ Migration transaction signing failed:', error);
      throw new Error(`Failed to sign migration transaction: ${error}`);
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
   * Atomic sign and mint ckALGO operation
   */
  async signAndMintCkAlgo(userPrincipal: string, transactionBytes: Uint8Array, microAlgos: number): Promise<SignedTransaction> {
    try {
      const principal = Principal.fromText(userPrincipal);
      const result: TransactionSigningResult = await this.actor.sign_and_mint_ck_algo(
        principal, 
        Array.from(transactionBytes),
        BigInt(microAlgos)
      );
      
      if ('Ok' in result) {
        return {
          transaction_bytes: new Uint8Array(result.Ok.transaction_bytes),
          signature: new Uint8Array(result.Ok.signature),
          signed_tx_id: result.Ok.signed_tx_id,
        };
      } else {
        throw new Error(`Sign and mint failed: ${result.Err.message} (Code: ${result.Err.code})`);
      }
    } catch (error) {
      console.error('❌ Atomic sign and mint failed:', error);
      throw new Error(`Failed to sign and mint ckALGO: ${error}`);
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
  'https://icp-api.io' // Alternative ICP mainnet gateway
);

export default icpCanisterService;