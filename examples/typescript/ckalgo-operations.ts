/**
 * ckALGO Operations Example
 * Demonstrates minting, redeeming, and transferring ckALGO tokens
 */

import { SipparClient } from '@sippar/sdk';

async function ckAlgoExample() {
  // Initialize Sippar client
  const sippar = new SipparClient({
    network: 'mainnet'
  });

  const userPrincipal = "example-principal-id";
  const algorandAddress = "EXAMPLE_ALGORAND_ADDRESS_HERE";

  try {
    console.log('🪙 ckALGO Operations Example');
    console.log('============================');

    // Example 1: Check ckALGO balance
    console.log('\\n💰 Checking ckALGO balance...');
    const balance = await sippar.ckAlgo.getBalance(userPrincipal);
    console.log(`Current ckALGO balance: ${balance / 1_000_000} ckALGO`);

    // Example 2: Check Algorand account info
    console.log('\\n🔍 Checking Algorand account...');
    const accountInfo = await sippar.crossChain.getAlgorandAccount(algorandAddress);
    console.log(`ALGO balance: ${accountInfo.balance / 1_000_000} ALGO`);
    console.log(`Account status: ${accountInfo.status}`);

    // Example 3: Mint ckALGO from ALGO (requires ALGO deposit first)
    console.log('\\n🏭 Minting ckALGO from ALGO...');
    const mintAmount = 10_000_000; // 10 ALGO in microAlgos

    try {
      const mintResult = await sippar.ckAlgo.mint({
        amount: mintAmount.toString(),
        algorandAddress: algorandAddress,
        userPrincipal: userPrincipal
      });

      if (mintResult.success) {
        console.log('✅ Mint successful!');
        console.log('Transaction ID:', mintResult.transactionId);
        console.log('Block height:', mintResult.blockHeight);
      }
    } catch (error) {
      console.log('ℹ️ Mint example (requires actual ALGO deposit)');
      console.log('Error:', error.message);
    }

    // Example 4: Transfer ckALGO to another user
    console.log('\\n📤 Transferring ckALGO...');
    const transferAmount = 5_000_000; // 5 ckALGO
    const recipientPrincipal = "recipient-principal-id";

    try {
      const transferResult = await sippar.ckAlgo.transfer({
        to: recipientPrincipal,
        amount: transferAmount.toString(),
        memo: "Example transfer"
      });

      if (transferResult.success) {
        console.log('✅ Transfer successful!');
        console.log('Transaction ID:', transferResult.transactionId);
      }
    } catch (error) {
      console.log('ℹ️ Transfer example (requires sufficient balance)');
      console.log('Error:', error.message);
    }

    // Example 5: Redeem ckALGO back to ALGO
    console.log('\\n🔄 Redeeming ckALGO to ALGO...');
    const redeemAmount = 3_000_000; // 3 ckALGO

    try {
      const redeemResult = await sippar.ckAlgo.redeem({
        amount: redeemAmount.toString(),
        algorandAddress: algorandAddress
      });

      if (redeemResult.success) {
        console.log('✅ Redemption successful!');
        console.log('Transaction ID:', redeemResult.transactionId);
        console.log('ALGO will be sent to:', algorandAddress);
      }
    } catch (error) {
      console.log('ℹ️ Redeem example (requires sufficient ckALGO balance)');
      console.log('Error:', error.message);
    }

    // Example 6: Get transaction history
    console.log('\\n📜 Getting transaction history...');
    try {
      const history = await sippar.ckAlgo.getTransactionHistory(userPrincipal, {
        limit: 10,
        offset: 0
      });

      console.log(`Found ${history.data.length} transactions:`);
      history.data.forEach((tx, index) => {
        console.log(`  ${index + 1}. ${tx.type} - ${tx.amount / 1_000_000} ckALGO`);
        console.log(`     Time: ${new Date(tx.timestamp).toLocaleString()}`);
        console.log(`     Status: ${tx.status}`);
      });
    } catch (error) {
      console.log('ℹ️ Transaction history example');
      console.log('Error:', error.message);
    }

    // Example 7: Check final balances
    console.log('\\n📊 Final balance check...');
    const finalBalance = await sippar.ckAlgo.getBalance(userPrincipal);
    console.log(`Final ckALGO balance: ${finalBalance / 1_000_000} ckALGO`);

    // Example 8: Get platform statistics
    console.log('\\n📈 Platform statistics...');
    const stats = await sippar.getStats();
    console.log('AI Service Status:', stats.ai.status);
    console.log('Platform Version:', stats.ai.version);

  } catch (error) {
    console.error('❌ Error in ckALGO operations:', error);
  }
}

// Helper function to format amounts
function formatAmount(microAlgos: number): string {
  return (microAlgos / 1_000_000).toFixed(6) + ' ALGO';
}

// Run the example
if (require.main === module) {
  ckAlgoExample()
    .then(() => console.log('\\n✅ ckALGO operations example completed'))
    .catch(console.error);
}

export { ckAlgoExample };