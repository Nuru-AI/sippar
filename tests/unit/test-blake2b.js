const algosdk = require('algosdk');
const nacl = require('tweetnacl');

// Public key from our canister 
const publicKeyHex = '02cca62be5c00d0374b7212173a11cc1581d49fa3a21e7359147047143f8916ccc';
const publicKeyBytes = Buffer.from(publicKeyHex, 'hex');
const rawKey = publicKeyBytes.slice(1); // Remove compression prefix

console.log('=== Testing Blake2b for Checksum ===');
console.log('Raw key (hex):', rawKey.toString('hex'));

// Generate proper address using algosdk
const properAddress = algosdk.encodeAddress(rawKey);
const decoded = algosdk.decodeAddress(properAddress);

console.log('Proper address:', properAddress);
console.log('Target checksum (hex):', Buffer.from(decoded.checksum).toString('hex'));

// Test with nacl.hash (Blake2b)
try {
    // nacl.hash is Blake2b with 64-byte output
    const hash = nacl.hash(rawKey);
    const checksum = hash.slice(-4); // Last 4 bytes
    
    console.log('Blake2b hash (hex):', Buffer.from(hash).toString('hex'));
    console.log('Blake2b checksum (hex):', Buffer.from(checksum).toString('hex'));
    console.log('Matches target:', Buffer.from(checksum).toString('hex') === Buffer.from(decoded.checksum).toString('hex') ? '✅ YES!' : '❌ No');
    
    // Try the range mentioned in the source [28:32]
    const checksum_alt = hash.slice(28, 32);
    console.log('Blake2b checksum [28:32] (hex):', Buffer.from(checksum_alt).toString('hex'));
    console.log('Matches target [28:32]:', Buffer.from(checksum_alt).toString('hex') === Buffer.from(decoded.checksum).toString('hex') ? '✅ YES!' : '❌ No');
} catch (error) {
    console.log('Error with nacl.hash:', error.message);
}

// Try other ranges
console.log('\n=== Testing different ranges ===');
if (nacl.hash) {
    const hash = nacl.hash(rawKey);
    const targetHex = Buffer.from(decoded.checksum).toString('hex');
    
    for (let i = 0; i <= 64-4; i++) {
        const slice = hash.slice(i, i+4);
        const sliceHex = Buffer.from(slice).toString('hex');
        if (sliceHex === targetHex) {
            console.log(`✅ FOUND MATCH at bytes [${i}:${i+4}]: ${sliceHex}`);
        }
    }
}