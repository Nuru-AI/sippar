const algosdk = require('algosdk');

// Test our newly generated address
const generatedAddress = 'ZSTCXZOABUBXJNZBEFZ2CHGBLAOUT6R2EHTTLEKHARYUH6ERNTGPXWPB5Y';

console.log('Generated address:', generatedAddress);
console.log('Length:', generatedAddress.length);
console.log('Is valid:', algosdk.isValidAddress(generatedAddress));

if (algosdk.isValidAddress(generatedAddress)) {
    console.log('🎉 SUCCESS: Address is valid according to algosdk!');
    
    // Let's decode it to see the structure
    try {
        const decoded = algosdk.decodeAddress(generatedAddress);
        console.log('\nDecoded address structure:');
        console.log('Public key (hex):', Buffer.from(decoded.publicKey).toString('hex'));
        console.log('Checksum (hex):', Buffer.from(decoded.checksum).toString('hex'));
        console.log('Public key length:', decoded.publicKey.length);
        console.log('Checksum length:', decoded.checksum.length);
    } catch (error) {
        console.log('Failed to decode address:', error.message);
    }
} else {
    console.log('❌ Address is still invalid');
}