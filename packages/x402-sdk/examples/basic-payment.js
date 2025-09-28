/**
 * Basic X402 Payment Example
 *
 * This example demonstrates the simplest way to create an X402 payment
 * and use it to access a payment-protected AI service.
 */

const { X402Client } = require('@sippar/x402-sdk');

async function basicPaymentExample() {
  console.log('🚀 Starting basic X402 payment example...\n');

  // Initialize the client
  const client = new X402Client({
    principal: 'your-internet-identity-principal',
    algorandAddress: 'your-algorand-address',
    // baseURL: 'https://nuru.network/api/sippar', // Optional: defaults to production
    // timeout: 30000, // Optional: defaults to 30 seconds
  });

  try {
    console.log('💳 Creating X402 payment...');

    // Step 1: Create a payment for an AI service
    const payment = await client.createPayment({
      service: 'ai-oracle-basic',
      amount: 0.01, // $0.01 USD
      metadata: {
        example: 'basic-payment',
        timestamp: new Date().toISOString()
      }
    });

    console.log('✅ Payment created successfully!');
    console.log(`   Payment ID: ${payment.paymentId}`);
    console.log(`   Expires: ${payment.expiresAt}`);
    console.log(`   Algorand backing: ${payment.algorandIntegration.backingAddress}\n`);

    console.log('🤖 Calling AI service with payment token...');

    // Step 2: Use the payment token to access the AI service
    const aiResponse = await client.queryAI({
      query: 'What is blockchain technology?',
      model: 'phi-3'
    }, payment.serviceToken);

    console.log('✅ AI service responded successfully!');
    console.log(`   Response: ${aiResponse.ai_response}`);
    console.log(`   Model used: ${aiResponse.model_used}`);

    if (aiResponse.confidence) {
      console.log(`   Confidence: ${aiResponse.confidence}`);
    }

    // Step 3: Check payment status (optional)
    console.log('\n📊 Checking payment status...');
    const status = await client.getPaymentStatus(payment.paymentId);
    console.log(`   Status: ${status.status}`);
    console.log(`   Updated: ${status.updatedAt}`);

  } catch (error) {
    console.error('❌ Error in basic payment example:', error.message);

    // Handle specific error types
    if (error.name === 'PaymentRequiredError') {
      console.log('💡 Tip: This service requires payment to access');
    } else if (error.name === 'InvalidTokenError') {
      console.log('💡 Tip: Payment token may have expired, create a new payment');
    } else if (error.name === 'ServiceNotFoundError') {
      console.log('💡 Tip: Check available services with client.getMarketplace()');
    }
  }
}

// Run the example
if (require.main === module) {
  basicPaymentExample()
    .then(() => {
      console.log('\n🎉 Basic payment example completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Example failed:', error);
      process.exit(1);
    });
}

module.exports = { basicPaymentExample };