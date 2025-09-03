const algosdk = require('algosdk');
const crypto = require('crypto');

// Public key from canister (in hex from the blob data)
const publicKeyHex = '02cca62be5c00d0374b7212173a11cc1581d49fa3a21e7359147047143f8916ccc';
const publicKeyBytes = Buffer.from(publicKeyHex, 'hex');

console.log('=== Canister Output Analysis ===');
console.log('Public key (hex):', publicKeyHex);
console.log('Public key length:', publicKeyBytes.length);
console.log('First byte:', publicKeyBytes[0].toString(16)); // Should be 02 or 03 for compressed secp256k1

// Let's manually create the address following what we implemented
const rawKey = publicKeyBytes.slice(1); // Remove compression prefix
console.log('Raw key after removing prefix (hex):', rawKey.toString('hex'));
console.log('Raw key length:', rawKey.length);

if (rawKey.length === 32) {
    // Calculate checksum manually 
    const checksumHash = crypto.createHash('sha512');
    checksumHash.update(rawKey);
    const fullHash = checksumHash.digest();
    const checksum = fullHash.slice(-4); // Last 4 bytes
    
    console.log('\n=== Manual Address Generation ===');
    console.log('Address bytes (hex):', rawKey.toString('hex'));
    console.log('Checksum (hex):', checksum.toString('hex'));
    
    // Combine
    const combined = Buffer.concat([rawKey, checksum]);
    console.log('Combined length:', combined.length);
    
    // Use algosdk to properly encode
    const properAddress = algosdk.encodeAddress(rawKey);
    console.log('Proper address:', properAddress);
    console.log('Is valid:', algosdk.isValidAddress(properAddress));
    console.log('Our generated address:', 'ZSTCXZOABUBXJNZBEFZ2CHGBLAOUT6R2EHTTLEKHARYUH6ERNTGPXWPB5Y');
    
    // Compare with what we generated
    if (algosdk.isValidAddress(properAddress)) {
        const decoded = algosdk.decodeAddress(properAddress);
        console.log('\nProperly generated address structure:');
        console.log('Public key (hex):', Buffer.from(decoded.publicKey).toString('hex'));
        console.log('Checksum (hex):', Buffer.from(decoded.checksum).toString('hex'));
    }
}

// Let's also try using the base32 library directly like in Rust
const base32 = require('base32');

console.log('\n=== Testing base32 encoding ===');
if (rawKey.length === 32) {
    const checksumHash = crypto.createHash('sha512');
    checksumHash.update(rawKey);
    const fullHash = checksumHash.digest();
    const checksum = fullHash.slice(-4);
    
    const combined = Buffer.concat([rawKey, checksum]);
    
    // Custom Algorand base32 (without padding)
    const customBase32 = base32.encode(combined).replace(/=/g, '');
    console.log('Custom base32 (no padding):', customBase32);
    console.log('Is valid:', algosdk.isValidAddress(customBase32));
}