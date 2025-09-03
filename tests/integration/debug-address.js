const algosdk = require('algosdk');
const crypto = require('crypto');

// Test our generated address
const ourAddress = 'WEL2WX76K5G2KKZX3FN6WWEK74UZGF2YHCVDBK3F6DXR5SY5V6VEONV4IU';
console.log('Our generated address:', ourAddress);
console.log('Length:', ourAddress.length);
console.log('Is valid:', algosdk.isValidAddress(ourAddress));

// Let's examine a valid address structure
const account = algosdk.generateAccount();
console.log('\nValid address:', account.addr);
console.log('Length:', account.addr.length);
console.log('Is valid:', algosdk.isValidAddress(account.addr));

// Get the public key bytes
const publicKeyBytes = account.sk.slice(32); // Ed25519 secret key is 64 bytes, public key is last 32
console.log('\nPublic key bytes (hex):', Buffer.from(publicKeyBytes).toString('hex'));
console.log('Public key length:', publicKeyBytes.length);

// Let's try to reverse engineer address generation
function analyzeAddress(address) {
    try {
        // Decode base32 address
        const decoded = algosdk.decodeAddress(address);
        console.log(`\nDecoded ${address}:`);
        console.log('Decoded bytes (hex):', Buffer.from(decoded.publicKey).toString('hex'));
        console.log('Decoded length:', decoded.publicKey.length);
        console.log('Checksum (hex):', Buffer.from(decoded.checksum).toString('hex'));
        console.log('Checksum length:', decoded.checksum.length);
    } catch (error) {
        console.log(`\nFailed to decode ${address}:`, error.message);
    }
}

analyzeAddress(account.addr);
analyzeAddress(ourAddress);

// Let's also see if we can manually create an address from public key
console.log('\n=== Manual Address Generation ===');
const sha512_256 = crypto.createHash('sha512');
sha512_256.update(publicKeyBytes);
const hash = sha512_256.digest();
const addressBytes = hash.slice(0, 32); // First 32 bytes

// Calculate checksum
const checksumHash = crypto.createHash('sha512');
checksumHash.update(addressBytes);
const fullChecksumHash = checksumHash.digest();
const checksum = fullChecksumHash.slice(-4); // Last 4 bytes

console.log('Address bytes (hex):', addressBytes.toString('hex'));
console.log('Checksum (hex):', checksum.toString('hex'));

// Combine and encode
const combined = Buffer.concat([addressBytes, checksum]);
console.log('Combined length:', combined.length);

// Use algosdk's encoding
const manualAddress = algosdk.encodeAddress(addressBytes);
console.log('Manual address:', manualAddress);
console.log('Is valid:', algosdk.isValidAddress(manualAddress));