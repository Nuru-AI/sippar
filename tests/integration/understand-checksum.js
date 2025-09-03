const algosdk = require('algosdk');
const crypto = require('crypto');

// Public key from our canister 
const publicKeyHex = '02cca62be5c00d0374b7212173a11cc1581d49fa3a21e7359147047143f8916ccc';
const publicKeyBytes = Buffer.from(publicKeyHex, 'hex');
const rawKey = publicKeyBytes.slice(1); // Remove compression prefix

console.log('=== Understanding Algorand Checksum ===');
console.log('Raw key (hex):', rawKey.toString('hex'));

// Generate proper address using algosdk
const properAddress = algosdk.encodeAddress(rawKey);
const decoded = algosdk.decodeAddress(properAddress);

console.log('Proper address:', properAddress);
console.log('Decoded public key (hex):', Buffer.from(decoded.publicKey).toString('hex'));
console.log('Decoded checksum (hex):', Buffer.from(decoded.checksum).toString('hex'));

// Now let's reverse engineer the checksum calculation
console.log('\n=== Reverse Engineering Checksum ===');

// Try different hash approaches
const approaches = [
    { name: 'SHA-512 last 4 bytes', hash: crypto.createHash('sha512').update(rawKey).digest().slice(-4) },
    { name: 'SHA-512 bytes [60:64]', hash: crypto.createHash('sha512').update(rawKey).digest().slice(60, 64) },
    { name: 'SHA-512 bytes [28:32]', hash: crypto.createHash('sha512').update(rawKey).digest().slice(28, 32) },
    { name: 'SHA-256 last 4 bytes', hash: crypto.createHash('sha256').update(rawKey).digest().slice(-4) },
    { name: 'SHA-256 first 4 bytes', hash: crypto.createHash('sha256').update(rawKey).digest().slice(0, 4) },
];

const correctChecksum = Buffer.from(decoded.checksum).toString('hex');
console.log('Target checksum:', correctChecksum);

approaches.forEach(approach => {
    const calculatedHex = approach.hash.toString('hex');
    const matches = calculatedHex === correctChecksum;
    console.log(`${approach.name}: ${calculatedHex} ${matches ? '✅ MATCH!' : '❌'}`);
});

// Let's also try with different input data
console.log('\n=== Testing with address+checksum pattern ===');
// Some algorithms use the address bytes + some constant for checksum calculation
const testInputs = [
    rawKey,
    Buffer.concat([rawKey, Buffer.from('algorand')]),
    Buffer.concat([rawKey, Buffer.from([0])]),
    Buffer.concat([rawKey, Buffer.from([255])]),
];

testInputs.forEach((input, i) => {
    const hash256 = crypto.createHash('sha256').update(input).digest();
    const hash512 = crypto.createHash('sha512').update(input).digest();
    
    console.log(`Input ${i} (${input.length} bytes):`);
    console.log(`  SHA-256 last 4: ${hash256.slice(-4).toString('hex')} ${hash256.slice(-4).toString('hex') === correctChecksum ? '✅' : '❌'}`);
    console.log(`  SHA-512 last 4: ${hash512.slice(-4).toString('hex')} ${hash512.slice(-4).toString('hex') === correctChecksum ? '✅' : '❌'}`);
});