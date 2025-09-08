#!/usr/bin/env node

const algosdk = require('algosdk');

async function fundEd25519Address() {
  // Algorand testnet configuration
  const algodClient = new algosdk.Algodv2('', 'https://testnet-api.algonode.cloud', 443);
  
  // Addresses
  const fromAddress = 'LSREB6DSTY4CD6KKJHIEY444SDK3SZWAHM7IFUVRVQOHS2AGBSOAIGJUOU'; // secp256k1 (has 10 ALGO)
  const toAddress = 'AC4ZYO4CYWNEWATOZETFXJHDE3GRM7CSPDSZHZADZU7HGJKPKV7JBQLHDM';   // Ed25519 (needs funds)
  
  console.log('🔄 Attempting to fund Ed25519 address...');
  console.log(`From (secp256k1): ${fromAddress}`);
  console.log(`To (Ed25519): ${toAddress}`);
  
  // Check balances
  try {
    const fromAccount = await algodClient.accountInformation(fromAddress).do();
    const toAccount = await algodClient.accountInformation(toAddress).do();
    
    console.log(`\n💰 From address balance: ${fromAccount.amount / 1000000} ALGO`);
    console.log(`💰 To address balance: ${toAccount.amount / 1000000} ALGO`);
    
    if (fromAccount.amount === 0) {
      console.log('❌ From address has no funds');
      return;
    }
    
    console.log('\n⚠️  Note: This script cannot sign transactions (no private key)');
    console.log('⚠️  You need to manually fund the Ed25519 address using:');
    console.log('   https://bank.testnet.algorand.network');
    console.log(`   Address: ${toAddress}`);
    
  } catch (error) {
    console.error('❌ Error checking balances:', error.message);
  }
}

fundEd25519Address();