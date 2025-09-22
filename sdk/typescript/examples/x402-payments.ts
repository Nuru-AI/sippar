/**
 * X402 Payment Protocol Examples
 * Demonstrates micropayment integration with Sippar's AI services and ckALGO operations
 */

import { SipparClient, X402PaymentRequest, MarketplaceService } from '../src';

async function main() {
  // Initialize Sippar client
  const client = new SipparClient({
    backendUrl: 'https://nuru.network',
    network: 'mainnet'
  });

  console.log('🚀 Sippar X402 Payment Examples\n');

  try {
    // Example 1: Browse X402 Marketplace
    console.log('📱 Example 1: Browse X402 Agent Marketplace');
    const marketplace = await client.x402.getMarketplace();

    console.log(`Found ${marketplace.totalServices} services:`);
    marketplace.services.forEach((service: MarketplaceService) => {
      console.log(`  - ${service.name}: $${service.price} ${service.currency}`);
      console.log(`    ${service.description}`);
      console.log(`    Endpoint: ${service.endpoint}\n`);
    });

    // Example 2: Create X402 Payment for AI Service
    console.log('💳 Example 2: Create X402 Payment for AI Service');

    const paymentRequest: X402PaymentRequest = {
      serviceEndpoint: '/api/sippar/ai/query',
      paymentAmount: 0.01,
      aiModel: 'default',
      requestId: `req-${Date.now()}`,
      payerCredentials: {
        principal: 'your-principal-here',
        algorandAddress: 'your-algorand-address-here'
      }
    };

    const payment = await client.x402.createPayment(paymentRequest);
    console.log('Payment created:', {
      transactionId: payment.transactionId,
      status: payment.paymentStatus,
      expiresAt: new Date(payment.expiryTime).toLocaleString()
    });

    // Example 3: Verify Payment Status
    console.log('\n🔍 Example 3: Check Payment Status');
    const status = await client.x402.getPaymentStatus(payment.transactionId);
    console.log('Payment status:', status);

    // Example 4: Verify Service Token
    console.log('\n🔐 Example 4: Verify Service Access Token');
    const isTokenValid = await client.x402.verifyServiceToken(payment.serviceAccessToken);
    console.log('Service token valid:', isTokenValid);

    // Example 5: Pay and Call AI Service in One Operation
    console.log('\n⚡ Example 5: Pay and Call AI Service');
    const aiResult = await client.x402.payAndCallAIService({
      serviceEndpoint: '/api/sippar/ai/query',
      paymentAmount: 0.01,
      payerCredentials: paymentRequest.payerCredentials,
      aiQuery: 'What is the future of blockchain technology?',
      aiModel: 'default'
    });

    console.log('AI Service Result:', {
      paymentStatus: aiResult.payment.paymentStatus,
      hasResponse: !!aiResult.serviceResponse,
      response: aiResult.serviceResponse?.response?.substring(0, 100) + '...'
    });

    // Example 6: Get X402 Analytics
    console.log('\n📊 Example 6: X402 Payment Analytics');
    const analytics = await client.x402.getAnalytics();
    console.log('Analytics:', {
      totalPayments: analytics.metrics.totalPayments,
      totalRevenue: `$${analytics.metrics.totalRevenue.toFixed(3)}`,
      averagePayment: `$${analytics.metrics.averagePaymentAmount.toFixed(3)}`,
      successRate: `${(analytics.metrics.successRate * 100).toFixed(1)}%`,
      recentPayments: analytics.recentPayments.length
    });

    // Example 7: Enterprise Billing
    console.log('\n🏢 Example 7: Enterprise Billing');
    const billing = await client.x402.processEnterpriseBilling({
      principal: 'enterprise-principal-here',
      services: ['ai-query', 'ckAlgo-mint', 'ckAlgo-redeem'],
      billingPeriod: 'monthly'
    });

    console.log('Enterprise Billing:', {
      totalUsage: billing.totalUsage,
      totalCost: `$${billing.totalCost.toFixed(2)}`,
      paymentStatus: billing.paymentStatus,
      nextBilling: billing.nextBillingDate
    });

    console.log('\n✅ All X402 examples completed successfully!');

  } catch (error) {
    console.error('❌ X402 example failed:', error);

    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        // @ts-ignore - SipparError specific properties
        code: error.code,
        // @ts-ignore
        details: error.details
      });
    }
  }
}

// Advanced X402 Usage Examples
async function advancedExamples() {
  const client = new SipparClient({
    backendUrl: 'https://nuru.network',
    network: 'mainnet'
  });

  console.log('\n🔬 Advanced X402 Examples\n');

  try {
    // Example A: Batch Payment Simulation
    console.log('🔄 Example A: Simulating Batch AI Queries');

    const batchQueries = [
      'Analyze the current crypto market trends',
      'What are the benefits of cross-chain technology?',
      'Explain the concept of threshold signatures'
    ];

    const batchResults = [];
    for (const [index, query] of batchQueries.entries()) {
      console.log(`Processing query ${index + 1}/${batchQueries.length}...`);

      const result = await client.x402.payAndCallAIService({
        serviceEndpoint: '/api/sippar/ai/query',
        paymentAmount: 0.01,
        payerCredentials: {
          principal: 'batch-user-principal',
          algorandAddress: 'batch-user-address'
        },
        aiQuery: query,
        aiModel: 'default'
      });

      batchResults.push({
        query: query.substring(0, 50) + '...',
        paymentStatus: result.payment.paymentStatus,
        transactionId: result.payment.transactionId
      });
    }

    console.log('Batch processing results:', batchResults);

    // Example B: Service Usage Monitoring
    console.log('\n📈 Example B: Service Usage Monitoring');

    const analytics = await client.x402.getAnalytics();

    if (analytics.metrics.topServices.length > 0) {
      console.log('Top Services by Revenue:');
      analytics.metrics.topServices.forEach((service, index) => {
        console.log(`  ${index + 1}. ${service.endpoint}: $${service.revenue.toFixed(3)} (${service.payments} payments)`);
      });
    }

    if (analytics.recentPayments.length > 0) {
      console.log('\nRecent Payment Activity:');
      analytics.recentPayments.slice(0, 5).forEach((payment, index) => {
        console.log(`  ${index + 1}. ${payment.service}: $${payment.amount.toFixed(3)} - ${payment.status}`);
      });
    }

    // Example C: Error Handling Best Practices
    console.log('\n🛡️ Example C: Error Handling');

    try {
      // Intentionally create an invalid payment to demonstrate error handling
      await client.x402.createPayment({
        serviceEndpoint: '/api/invalid/endpoint',
        paymentAmount: -1, // Invalid amount
        aiModel: 'invalid-model',
        requestId: 'error-test',
        payerCredentials: {
          principal: '',
          algorandAddress: ''
        }
      });
    } catch (paymentError) {
      console.log('Expected error caught and handled gracefully:', {
        type: paymentError instanceof Error ? paymentError.name : 'Unknown',
        message: paymentError instanceof Error ? paymentError.message : String(paymentError)
      });
    }

    console.log('\n✅ Advanced X402 examples completed!');

  } catch (error) {
    console.error('❌ Advanced example failed:', error);
  }
}

// Run examples
if (require.main === module) {
  main()
    .then(() => advancedExamples())
    .then(() => {
      console.log('\n🎉 All X402 Payment Protocol examples completed!');
      console.log('Ready to integrate X402 micropayments into your application.');
    })
    .catch(error => {
      console.error('Examples failed:', error);
      process.exit(1);
    });
}

export { main as runX402Examples, advancedExamples as runAdvancedX402Examples };