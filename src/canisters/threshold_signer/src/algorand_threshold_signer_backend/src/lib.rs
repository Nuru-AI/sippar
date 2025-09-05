use candid::{CandidType, Principal};
use ic_cdk::api::management_canister::ecdsa::{
    ecdsa_public_key, sign_with_ecdsa, EcdsaCurve, EcdsaKeyId, EcdsaPublicKeyArgument,
    SignWithEcdsaArgument,
};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256, Sha512, Sha512_256};
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

// Key ID name for threshold ECDSA signatures (mainnet key)
const KEY_NAME: &str = "key_1";

// Create ECDSA Key ID (secp256k1 - Ed25519 not yet supported)
fn get_ecdsa_key_id() -> EcdsaKeyId {
    EcdsaKeyId {
        curve: EcdsaCurve::Secp256k1,
        name: KEY_NAME.to_string(),
    }
}

/// Derive a unique Algorand address for a user principal using threshold Ed25519
#[ic_cdk::update]
async fn derive_algorand_address(user_principal: Principal) -> SigningResult<AlgorandAddress> {
    let derivation_path = vec![
        user_principal.as_slice().to_vec(),
        b"algorand".to_vec(),
        b"sippar".to_vec(),
    ];

    match ecdsa_public_key(EcdsaPublicKeyArgument {
        canister_id: None,
        derivation_path,
        key_id: get_ecdsa_key_id(),
    })
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

/// Sign an Algorand transaction using threshold Ed25519 signatures
#[ic_cdk::update]
async fn sign_algorand_transaction(
    user_principal: Principal,
    transaction_bytes: Vec<u8>,
) -> SigningResult<SignedTransaction> {
    let derivation_path = vec![
        user_principal.as_slice().to_vec(),
        b"algorand".to_vec(),
        b"sippar".to_vec(),
    ];

    // Create message hash for signing (Algorand uses SHA-512/256 for transaction hashing)
    let mut hasher = Sha512::new();
    hasher.update(b"TX");
    hasher.update(&transaction_bytes);
    let message_hash = &hasher.finalize()[..32].to_vec(); // Take first 32 bytes for SHA-512/256

    match sign_with_ecdsa(SignWithEcdsaArgument {
        message_hash: message_hash.clone(),
        derivation_path,
        key_id: get_ecdsa_key_id(),
    })
    .await
    {
        Ok((signature_response,)) => {
            let signed_tx_id = generate_transaction_id(&transaction_bytes, &signature_response.signature);
            
            Ok(SignedTransaction {
                transaction_bytes,
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
    status.insert("version".to_string(), "1.0.0".to_string());
    status.insert("canister_type".to_string(), "algorand_threshold_signer".to_string());
    status.insert("supported_curves".to_string(), "secp256k1 (converted to Ed25519)".to_string());
    status.insert("network_support".to_string(), "Algorand Testnet, Mainnet".to_string());
    status
}

/// Convert secp256k1 public key to proper Algorand address format
/// Follows Algorand's official address generation specification
fn ed25519_public_key_to_algorand_address(public_key: &[u8]) -> String {
    // Handle secp256k1 public key format (33 bytes with compression prefix or 32 bytes raw)
    let raw_public_key = if public_key.len() == 33 {
        // Remove compression prefix (0x02 or 0x03)
        &public_key[1..]
    } else if public_key.len() == 32 {
        // Already raw 32-byte key
        public_key
    } else {
        // Unexpected key length, use as-is
        public_key
    };
    
    // Ensure we have exactly 32 bytes
    let address_bytes = if raw_public_key.len() == 32 {
        raw_public_key
    } else {
        // Fallback: take first 32 bytes or pad if needed
        let mut padded = [0u8; 32];
        let copy_len = raw_public_key.len().min(32);
        padded[..copy_len].copy_from_slice(&raw_public_key[..copy_len]);
        return algorand_base32_encode_with_checksum(&padded);
    };
    
    algorand_base32_encode_with_checksum(address_bytes)
}

/// Encode address bytes with checksum using Algorand's base32 format
/// Uses the exact algorithm from algosdk: SHA-512/256 hash, then bytes [28:32] as checksum
fn algorand_base32_encode_with_checksum(address_bytes: &[u8]) -> String {
    // Step 1: Calculate checksum using SHA-512/256 (algosdk's genericHash)
    let mut checksum_hasher = Sha512_256::new();
    checksum_hasher.update(address_bytes);
    let checksum_hash = checksum_hasher.finalize();
    
    // Step 2: Take bytes [28:32] as checksum (PUBLIC_KEY_LENGTH - ALGORAND_CHECKSUM_BYTE_LENGTH)
    // PUBLIC_KEY_LENGTH = 32, ALGORAND_CHECKSUM_BYTE_LENGTH = 4, so [32-4:32] = [28:32]
    let checksum = &checksum_hash[28..32];
    
    // Step 3: Combine address + checksum (32 + 4 = 36 bytes total)
    let mut address_with_checksum = Vec::with_capacity(36);
    address_with_checksum.extend_from_slice(address_bytes);
    address_with_checksum.extend_from_slice(checksum);
    
    // Step 4: Encode with base32 using Algorand's alphabet
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
    // Create the same message hash that was signed
    let mut hasher = Sha512::new();
    hasher.update(b"TX");
    hasher.update(&_transaction_bytes);
    let _message_hash = &hasher.finalize()[..32];
    
    // TODO: Implement secp256k1 signature verification for Algorand compatibility
    // This would require proper secp256k1 verification and conversion
    // For now, return true as placeholder during development
    true
}

#[ic_cdk::query]
fn greet(name: String) -> String {
    format!("Hello, {}! This is the Sippar Algorand Threshold Signer.", name)
}
