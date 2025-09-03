const algosdk = require('algosdk');

// Test with js-nacl
let nacl;
try {
    nacl = require('js-nacl');
    console.log('js-nacl loaded successfully');
} catch (error) {
    console.log('js-nacl not available:', error.message);
}

// Public key from our canister 
const publicKeyHex = '02cca62be5c00d0374b7212173a11cc1581d49fa3a21e7359147047143f8916ccc';
const publicKeyBytes = Buffer.from(publicKeyHex, 'hex');
const rawKey = publicKeyBytes.slice(1); // Remove compression prefix

console.log('=== Testing js-nacl for Blake2b ===');
console.log('Raw key (hex):', rawKey.toString('hex'));

// Generate proper address using algosdk
const properAddress = algosdk.encodeAddress(rawKey);
const decoded = algosdk.decodeAddress(properAddress);

console.log('Proper address:', properAddress);
console.log('Target checksum (hex):', Buffer.from(decoded.checksum).toString('hex'));

if (nacl && nacl.crypto_generichash) {
    console.log('\nTesting crypto_generichash...');
    
    try {
        // js-nacl uses different API
        const hash = nacl.crypto_generichash(32, rawKey); // 32-byte output
        console.log('crypto_generichash (32 bytes, hex):', Buffer.from(hash).toString('hex'));
        
        // Try 64-byte hash
        const hash64 = nacl.crypto_generichash(64, rawKey);
        console.log('crypto_generichash (64 bytes, hex):', Buffer.from(hash64).toString('hex'));
        
        const checksum = hash64.slice(28, 32);
        console.log('Checksum [28:32] (hex):', Buffer.from(checksum).toString('hex'));
        
        const targetHex = Buffer.from(decoded.checksum).toString('hex');
        const matches = Buffer.from(checksum).toString('hex') === targetHex;
        console.log('Matches target:', matches ? '✅ PERFECT!' : '❌ Still no');
        
    } catch (error) {
        console.log('Error with crypto_generichash:', error.message);
    }
} else {
    console.log('❌ js-nacl crypto_generichash not available');
}

// Let's try to use the same library that algosdk uses
console.log('\n=== Checking what algosdk uses internally ===');
try {
    // Try to access algosdk's internal nacl
    console.log('algosdk version:', require('algosdk/package.json').version);
    
    // Let's see if we can find the nacl dependency
    const fs = require('fs');
    const path = require('path');
    
    try {
        const algosdkPackage = JSON.parse(fs.readFileSync('./node_modules/algosdk/package.json'));
        console.log('algosdk dependencies:', algosdkPackage.dependencies);
    } catch (e) {
        console.log('Could not read algosdk package.json');
    }
    
} catch (error) {
    console.log('Error checking algosdk:', error.message);
}