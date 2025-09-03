const algosdk = require('algosdk');
const nacl = require('tweetnacl');

// Public key from our canister 
const publicKeyHex = '02cca62be5c00d0374b7212173a11cc1581d49fa3a21e7359147047143f8916ccc';
const publicKeyBytes = Buffer.from(publicKeyHex, 'hex');
const rawKey = publicKeyBytes.slice(1); // Remove compression prefix

console.log('=== Testing Exact Algorithm ===');
console.log('Raw key (hex):', rawKey.toString('hex'));

// Generate proper address using algosdk
const properAddress = algosdk.encodeAddress(rawKey);
const decoded = algosdk.decodeAddress(properAddress);

console.log('Proper address:', properAddress);
console.log('Target checksum (hex):', Buffer.from(decoded.checksum).toString('hex'));

// Test exact algorithm from source code
// nacl.PUBLIC_KEY_LENGTH = 32
// ALGORAND_CHECKSUM_BYTE_LENGTH = 4
// So slice is [32-4:32] = [28:32]

console.log('\n=== Testing nacl.genericHash ===');

if (nacl.genericHash) {
    const hash = nacl.genericHash(rawKey);
    console.log('genericHash length:', hash.length);
    console.log('genericHash (hex):', Buffer.from(hash).toString('hex'));
    
    const checksum = hash.slice(28, 32);
    console.log('Checksum [28:32] (hex):', Buffer.from(checksum).toString('hex'));
    
    const targetHex = Buffer.from(decoded.checksum).toString('hex');
    const matches = Buffer.from(checksum).toString('hex') === targetHex;
    console.log('Matches target:', matches ? '✅ PERFECT MATCH!' : '❌ Still no match');
    
    if (matches) {
        console.log('🎉 Found the correct algorithm: nacl.genericHash(publicKey).slice(28, 32)');
    }
} else {
    console.log('❌ nacl.genericHash not available in this tweetnacl version');
    
    // Try nacl.hash as fallback
    const hash = nacl.hash(rawKey);
    console.log('Using nacl.hash instead...');
    console.log('hash length:', hash.length);
    
    const checksum = hash.slice(28, 32);
    console.log('Checksum [28:32] (hex):', Buffer.from(checksum).toString('hex'));
    
    const targetHex = Buffer.from(decoded.checksum).toString('hex');
    const matches = Buffer.from(checksum).toString('hex') === targetHex;
    console.log('Matches target:', matches ? '✅ MATCH!' : '❌ No match');
}

// Let's also check if we need to install a specific nacl package
console.log('\n=== Package Information ===');
console.log('nacl methods:', Object.keys(nacl));