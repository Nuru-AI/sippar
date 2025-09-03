const algosdk = require('algosdk');
const crypto = require('crypto');

// Generate a test account
const account = algosdk.generateAccount();
const publicKeyBytes = account.sk.slice(32); // Ed25519 public key

console.log('=== Algorand Address Generation Understanding ===');
console.log('Valid address:', account.addr);
console.log('Public key (hex):', Buffer.from(publicKeyBytes).toString('hex'));

// Decode the valid address to see its structure
const decoded = algosdk.decodeAddress(account.addr);
console.log('\nDecoded address:');
console.log('Public key from address (hex):', Buffer.from(decoded.publicKey).toString('hex'));
console.log('Checksum (hex):', Buffer.from(decoded.checksum).toString('hex'));

// Verify they match
const match = Buffer.from(publicKeyBytes).equals(Buffer.from(decoded.publicKey));
console.log('Public keys match:', match);

// Now let's manually create the address following the correct spec:
console.log('\n=== Manual Address Generation (Correct) ===');

// Step 1: Address bytes = public key bytes (32 bytes)
const addressBytes = publicKeyBytes;

// Step 2: Calculate checksum = last 4 bytes of SHA-512 of address bytes
const checksumHash = crypto.createHash('sha512');
checksumHash.update(addressBytes);
const fullHash = checksumHash.digest();
const checksum = fullHash.slice(-4);

console.log('Address bytes (hex):', addressBytes.toString('hex'));
console.log('Calculated checksum (hex):', checksum.toString('hex'));

// Step 3: Combine and encode with base32
const combined = Buffer.concat([addressBytes, checksum]);
console.log('Combined length:', combined.length);

// Use algosdk to encode (it handles base32 + checksum properly)
const manualAddress = algosdk.encodeAddress(addressBytes);
console.log('Manual address:', manualAddress);
console.log('Matches original:', manualAddress === account.addr);

// Test with our problematic secp256k1 key
console.log('\n=== Testing with secp256k1 key ===');
// This would be the public key we get from ICP threshold ECDSA
const secp256k1PubKey = Buffer.from('0279BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798', 'hex');
console.log('secp256k1 public key (hex):', secp256k1PubKey.toString('hex'));
console.log('Length:', secp256k1PubKey.length);

if (secp256k1PubKey.length === 33) {
    // Remove the compression prefix for raw key
    const rawKey = secp256k1PubKey.slice(1);
    console.log('Raw key without prefix (hex):', rawKey.toString('hex'));
    console.log('Raw key length:', rawKey.length);
    
    if (rawKey.length === 32) {
        const secp256k1Address = algosdk.encodeAddress(rawKey);
        console.log('Address from secp256k1:', secp256k1Address);
        console.log('Is valid:', algosdk.isValidAddress(secp256k1Address));
    }
}