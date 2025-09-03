const algosdk = require('algosdk');
const sha512 = require('js-sha512');

// Public key from our canister 
const publicKeyHex = '02cca62be5c00d0374b7212173a11cc1581d49fa3a21e7359147047143f8916ccc';
const publicKeyBytes = Buffer.from(publicKeyHex, 'hex');
const rawKey = publicKeyBytes.slice(1); // Remove compression prefix

console.log('=== Testing SHA-512/256 Algorithm ===');
console.log('Raw key (hex):', rawKey.toString('hex'));

// Generate proper address using algosdk
const properAddress = algosdk.encodeAddress(rawKey);
const decoded = algosdk.decodeAddress(properAddress);

console.log('Proper address:', properAddress);
console.log('Target checksum (hex):', Buffer.from(decoded.checksum).toString('hex'));

// Test exact algorithm: sha512_256.array() then slice [28:32]
console.log('\n=== Testing sha512.sha512_256.array ===');

const hashArray = sha512.sha512_256.array(rawKey);
console.log('SHA-512/256 hash length:', hashArray.length);
console.log('SHA-512/256 hash (hex):', Buffer.from(hashArray).toString('hex'));

// The checksum is bytes [28:32] from the 32-byte SHA-512/256 hash
const checksum = hashArray.slice(28, 32);
console.log('Checksum [28:32] (hex):', Buffer.from(checksum).toString('hex'));

const targetHex = Buffer.from(decoded.checksum).toString('hex');
const matches = Buffer.from(checksum).toString('hex') === targetHex;
console.log('Matches target:', matches ? '✅ PERFECT MATCH!' : '❌ Still no match');

if (matches) {
    console.log('🎉 FOUND IT! The algorithm is: sha512_256(publicKey).slice(28, 32)');
} else {
    // Try other slices just in case
    console.log('\n=== Trying other slices ===');
    for (let i = 0; i <= 28; i++) {
        const slice = hashArray.slice(i, i + 4);
        const sliceHex = Buffer.from(slice).toString('hex');
        if (sliceHex === targetHex) {
            console.log(`✅ FOUND MATCH at bytes [${i}:${i+4}]: ${sliceHex}`);
            break;
        }
    }
}