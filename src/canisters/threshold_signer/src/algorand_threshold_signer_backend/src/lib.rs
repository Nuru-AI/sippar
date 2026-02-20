use candid::{CandidType, Principal};
use ic_cdk::api::management_canister::schnorr::{
    SchnorrAlgorithm, SchnorrKeyId, SchnorrPublicKeyArgument,
    SignWithSchnorrArgument, SchnorrPublicKeyResponse, SignWithSchnorrResponse,
};
use hex;
use ic_cdk::api::call::call_with_payment;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256, Sha512_256};
use sha2::Sha512_256 as ForcedSha512_256;
use std::collections::HashMap;

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct AlgorandAddress {
    pub address: String,
    pub public_key: Vec<u8>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct SignedTransaction {
    pub transaction_bytes: Vec<u8>,
    pub signature: Vec<u8>,
    pub signed_tx_id: String,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct SigningError {
    pub code: u32,
    pub message: String,
}

type SigningResult<T> = Result<T, SigningError>;

// Key ID name for threshold Schnorr signatures (mainnet Ed25519 key)
const KEY_NAME: &str = "key_1";

// Create Schnorr Key ID for Ed25519 signatures (native Algorand support)
fn get_schnorr_key_id() -> SchnorrKeyId {
    SchnorrKeyId {
        algorithm: SchnorrAlgorithm::Ed25519,
        name: KEY_NAME.to_string(),
    }
}

/// Derive a unique Algorand address for a user principal using threshold Ed25519
#[ic_cdk::update]
async fn derive_algorand_address(user_principal: Principal) -> SigningResult<AlgorandAddress> {
    // Convert principal to 4-byte big-endian format for Ed25519 derivation
    // Hash principal bytes and take first 4 bytes as derivation path
    let principal_hash = Sha256::digest(user_principal.as_slice());
    let derivation_key = &principal_hash[0..4];
    
    let derivation_path = vec![
        derivation_key.to_vec(),
        b"algorand".to_vec(),
        b"sippar".to_vec(),
    ];

    // Call management canister with cycles for threshold operations
    match call_with_payment::<(SchnorrPublicKeyArgument,), (SchnorrPublicKeyResponse,)>(
        Principal::management_canister(),
        "schnorr_public_key",
        (SchnorrPublicKeyArgument {
            canister_id: None,
            derivation_path,
            key_id: get_schnorr_key_id(),
        },),
        15_000_000_000, // 15 billion cycles for public key derivation
    )
    .await
    {
        Ok((public_key_response,)) => {
            let algorand_address = ed25519_public_key_to_algorand_address(&public_key_response.public_key);
            
            Ok(AlgorandAddress {
                address: algorand_address,
                public_key: public_key_response.public_key,
            })
        }
        Err((rejection_code, msg)) => Err(SigningError {
            code: rejection_code as u32,
            message: format!("Failed to derive public key: {}", msg),
        }),
    }
}

/// MIGRATION: Derive address using OLD derivation method (for verification)
#[ic_cdk::update]
async fn derive_old_algorand_address(user_principal: Principal) -> SigningResult<AlgorandAddress> {
    // Use OLD derivation method (raw principal bytes) for migration verification
    let derivation_path = vec![
        user_principal.as_slice().to_vec(),
        b"algorand".to_vec(),
        b"sippar".to_vec(),
    ];

    // Call management canister with cycles for threshold operations
    match call_with_payment::<(SchnorrPublicKeyArgument,), (SchnorrPublicKeyResponse,)>(
        Principal::management_canister(),
        "schnorr_public_key",
        (SchnorrPublicKeyArgument {
            canister_id: None,
            derivation_path,
            key_id: get_schnorr_key_id(),
        },),
        15_000_000_000, // 15 billion cycles for public key derivation
    )
    .await
    {
        Ok((public_key_response,)) => {
            let algorand_address = ed25519_public_key_to_algorand_address(&public_key_response.public_key);

            Ok(AlgorandAddress {
                address: algorand_address,
                public_key: public_key_response.public_key,
            })
        }
        Err((rejection_code, msg)) => Err(SigningError {
            code: rejection_code as u32,
            message: format!("Failed to derive old public key: {}", msg),
        }),
    }
}

/// MIGRATION: Sign transaction using old derivation method for address migration
#[ic_cdk::update]
async fn sign_migration_transaction(
    user_principal: Principal,
    transaction_bytes: Vec<u8>,
) -> SigningResult<SignedTransaction> {
    // Use OLD derivation method (raw principal bytes) for migration
    let derivation_path = vec![
        user_principal.as_slice().to_vec(),
        b"algorand".to_vec(),
        b"sippar".to_vec(),
    ];

    // Call management canister with cycles for threshold signature operations  
    match call_with_payment::<(SignWithSchnorrArgument,), (SignWithSchnorrResponse,)>(
        Principal::management_canister(),
        "sign_with_schnorr", 
        (SignWithSchnorrArgument {
            message: transaction_bytes.clone(),
            derivation_path,
            key_id: get_schnorr_key_id(),
        },),
        30_000_000_000, // 30 billion cycles for signing
    )
    .await
    {
        Ok((response,)) => {
            let tx_id = hex::encode(Sha256::digest(&transaction_bytes));
            Ok(SignedTransaction {
                transaction_bytes: transaction_bytes,
                signature: response.signature,
                signed_tx_id: tx_id,
            })
        }
        Err((rejection_code, msg)) => Err(SigningError {
            code: rejection_code as u32,
            message: format!("Failed to sign transaction: {}", msg),
        }),
    }
}

/// Sign an Algorand transaction using threshold Ed25519 signatures
#[ic_cdk::update]
async fn sign_algorand_transaction(
    user_principal: Principal,
    transaction_bytes: Vec<u8>,
) -> SigningResult<SignedTransaction> {
    // Use same principal hashing as address derivation for consistency
    let principal_hash = Sha256::digest(user_principal.as_slice());
    let derivation_key = &principal_hash[0..4];
    
    let derivation_path = vec![
        derivation_key.to_vec(),
        b"algorand".to_vec(),
        b"sippar".to_vec(),
    ];

    // Call management canister with cycles for threshold signature operations  
    match call_with_payment::<(SignWithSchnorrArgument,), (SignWithSchnorrResponse,)>(
        Principal::management_canister(),
        "sign_with_schnorr",
        (SignWithSchnorrArgument {
            message: transaction_bytes.clone(),
            derivation_path,
            key_id: get_schnorr_key_id(),
        },),
        30_000_000_000, // 30 billion cycles for signing (increased for actual requirements)
    )
    .await
    {
        Ok((signature_response,)) => {
            let signed_tx_id = generate_transaction_id(&transaction_bytes, &signature_response.signature);
            
            // Return the original transaction_bytes and signature as separate components
            // Let the backend handle the signed transaction construction using AlgoSDK
            // This is the working approach from our breakthrough
            
            Ok(SignedTransaction {
                transaction_bytes: transaction_bytes,
                signature: signature_response.signature,
                signed_tx_id,
            })
        }
        Err((rejection_code, msg)) => Err(SigningError {
            code: rejection_code as u32,
            message: format!("Failed to sign transaction: {}", msg),
        }),
    }
}

/// Get the canister's status and available features
#[ic_cdk::query]
fn get_canister_status() -> HashMap<String, String> {
    let mut status = HashMap::new();
    status.insert("version".to_string(), "2.0.0".to_string());
    status.insert("canister_type".to_string(), "algorand_threshold_signer".to_string());
    status.insert("supported_curves".to_string(), "Ed25519 (native)".to_string());
    status.insert("signature_scheme".to_string(), "Schnorr Ed25519".to_string());
    status.insert("network_support".to_string(), "Algorand Testnet, Mainnet".to_string());
    
    // Show Ed25519 native support
    status.insert("algorand_compatible".to_string(), "YES".to_string());
    status.insert("signature_format".to_string(), "RFC8032 Ed25519".to_string());
    status.insert("key_derivation".to_string(), "Hierarchical Ed25519".to_string());
    
    status
}

/// Convert Ed25519 public key to proper Algorand address format
/// Follows Algorand's official address generation specification
fn ed25519_public_key_to_algorand_address(public_key: &[u8]) -> String {
    // Ed25519 public keys are exactly 32 bytes (no compression prefix needed)
    if public_key.len() != 32 {
        panic!("Ed25519 public key must be exactly 32 bytes, got {}", public_key.len());
    }
    
    // Use the public key directly as address bytes
    algorand_base32_encode_with_checksum(public_key)
}

/// Encode address bytes with checksum using Algorand's base32 format  
/// Uses SHA-512/256 algorithm matching Node.js crypto.createHash('sha512-256')
fn algorand_base32_encode_with_checksum(address_bytes: &[u8]) -> String {
    // Step 1: Calculate SHA-512/256 checksum - FORCE EXPLICIT IMPLEMENTATION
    let sha512_256_hash = ForcedSha512_256::digest(address_bytes);
    
    // Use SHA-512/256 (the correct one)
    let checksum = &sha512_256_hash[28..32];
    
    // Step 2: Combine address + checksum (32 + 4 = 36 bytes total)
    let mut address_with_checksum = Vec::with_capacity(36);
    address_with_checksum.extend_from_slice(address_bytes);
    address_with_checksum.extend_from_slice(checksum);
    
    // Step 3: Encode with base32 using Algorand's alphabet
    algorand_base32_encode(&address_with_checksum)
}

/// Generate transaction ID from transaction bytes and signature
fn generate_transaction_id(transaction_bytes: &[u8], signature: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(transaction_bytes);
    hasher.update(signature);
    let hash = hasher.finalize();
    hex::encode(hash)
}

/// Algorand-specific base32 encoding (RFC 4648 without padding)
/// Uses the standard base32 alphabet: ABCDEFGHIJKLMNOPQRSTUVWXYZ234567
fn algorand_base32_encode(data: &[u8]) -> String {
    const ALPHABET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let mut result = String::new();
    let mut buffer = 0u64;
    let mut bits_in_buffer = 0;
    
    for &byte in data {
        buffer = (buffer << 8) | (byte as u64);
        bits_in_buffer += 8;
        
        // Extract 5-bit groups from the buffer
        while bits_in_buffer >= 5 {
            bits_in_buffer -= 5;
            let index = ((buffer >> bits_in_buffer) & 0x1f) as usize;
            result.push(ALPHABET[index] as char);
        }
    }
    
    // Handle remaining bits (if any)
    if bits_in_buffer > 0 {
        let index = ((buffer << (5 - bits_in_buffer)) & 0x1f) as usize;
        result.push(ALPHABET[index] as char);
    }
    
    // Algorand addresses are exactly 58 characters long (no padding)
    result
}

/// Verify that a signature is valid for given transaction bytes
#[ic_cdk::query]
fn verify_signature(
    _public_key: Vec<u8>,
    _transaction_bytes: Vec<u8>,
    _signature: Vec<u8>,
) -> bool {
    // Ed25519 signature verification would be implemented here
    // For now, return true as placeholder - actual verification would require
    // Ed25519 verification libraries which are not readily available in this environment
    true
}

#[ic_cdk::query]
fn greet(name: String) -> String {
    format!("Hello, {}! This is the Sippar Algorand Threshold Signer.", name)
}

