/**
 * Enterprise X402 Integration Example
 *
 * This example demonstrates enterprise-grade usage of the X402 SDK
 * including billing, analytics, error handling, and service management.
 */

import {
  X402Client,
  X402Error,
  PaymentRequiredError,
  InvalidTokenError,
  ServiceNotFoundError,
  InsufficientFundsError
} from '@sippar/x402-sdk';

interface EnterpriseConfig {
  apiKey: string;
  principal: string;
  algorandAddress: string;
  environment: 'production' | 'staging' | 'development';
}

class EnterpriseX402Service {
  private client: X402Client;
  private config: EnterpriseConfig;

  constructor(config: EnterpriseConfig) {
    this.config = config;

    // Initialize client with enterprise configuration
    this.client = new X402Client({
      principal: config.principal,
      algorandAddress: config.algorandAddress,
      apiKey: config.apiKey,
      baseURL: this.getBaseURL(config.environment),
      timeout: 60000 // Extended timeout for enterprise
    });

    console.log(`🏢 Enterprise X402 service initialized for ${config.environment}`);
  }

  private getBaseURL(environment: string): string {
    switch (environment) {
      case 'production':
        return 'https://nuru.network/api/sippar';
      case 'staging':
        return 'https://staging.nuru.network/api/sippar';
      case 'development':
        return 'http://localhost:3004';
      default:
        throw new Error(`Unknown environment: ${environment}`);
    }
  }

  /**
   * Process multiple AI queries with automatic payment management
   */
  async processBulkAIQueries(queries: string[]): Promise<Array<{ query: string; response: string; cost: number }>> {
    console.log(`📊 Processing ${queries.length} AI queries...`);

    const results = [];

    for (const [index, query] of queries.entries()) {
      try {
        console.log(`   Processing query ${index + 1}/${queries.length}: "${query.substring(0, 50)}..."`);

        // Use pay-and-call convenience method for each query
        const response = await this.client.payAndCall(
          'ai-oracle-enhanced',
          0.05,
          {
            query,
            model: 'deepseek-r1',
            options: {
              explanation: true,
              confidence_score: true
            }
          },
          '/ai/enhanced-query'
        );

        results.push({
          query,
          response: response.ai_response,
          cost: 0.05
        });

        console.log(`   ✅ Query ${index + 1} completed`);

      } catch (error) {
        console.error(`   ❌ Query ${index + 1} failed:`, error.message);

        results.push({
          query,
          response: `Error: ${error.message}`,
          cost: 0
        });
      }
    }

    const totalCost = results.reduce((sum, result) => sum + result.cost, 0);
    console.log(`💰 Total cost: $${totalCost.toFixed(2)}`);

    return results;
  }

  /**
   * Get comprehensive analytics for enterprise reporting
   */
  async getEnterpriseAnalytics(): Promise<void> {
    console.log('📈 Retrieving enterprise analytics...');

    try {
      const analytics = await this.client.getAnalytics();

      console.log('\n📊 Usage Metrics:');
      console.log(`   Total Payments: ${analytics.analytics.metrics.totalPayments}`);
      console.log(`   Total Revenue: $${analytics.analytics.metrics.totalRevenue}`);
      console.log(`   Average Payment: $${analytics.analytics.metrics.averagePaymentAmount}`);
      console.log(`   Success Rate: ${(analytics.analytics.metrics.successRate * 100).toFixed(2)}%`);

      console.log('\n🔗 Algorand Integration:');
      console.log(`   Threshold Signatures Used: ${analytics.analytics.algorand_integration_metrics.threshold_signatures_used}`);
      console.log(`   Addresses Derived: ${analytics.analytics.algorand_integration_metrics.algorand_addresses_derived}`);
      console.log(`   Successful Transactions: ${analytics.analytics.algorand_integration_metrics.successful_algo_transactions}`);
      console.log(`   Network Success Rate: ${(analytics.analytics.algorand_integration_metrics.network_success_rate * 100).toFixed(2)}%`);

      console.log('\n🔧 Performance Metrics:');
      const performance = analytics.analytics.threshold_signature_performance;
      console.log(`   Signature Success Rate: ${(performance.success_rate * 100).toFixed(2)}%`);
      console.log(`   Average Signature Time: ${performance.average_signature_time}`);
      console.log(`   Canister Cycles Used: ${performance.canister_cycles_used}`);

      // Service usage breakdown
      console.log('\n🎯 Service Usage:');
      Object.entries(analytics.analytics.service_usage).forEach(([service, usage]) => {
        console.log(`   ${service}: ${usage.calls} calls`);
        if (usage.algorand_addresses) {
          console.log(`     Algorand addresses: ${usage.algorand_addresses}`);
        }
        if (usage.algo_amount) {
          console.log(`     ALGO amount: ${usage.algo_amount}`);
        }
      });

    } catch (error) {
      console.error('❌ Failed to retrieve analytics:', error.message);
      throw error;
    }
  }

  /**
   * Get enterprise billing information
   */
  async getEnterpriseBilling(): Promise<void> {
    console.log('💼 Retrieving enterprise billing information...');

    try {
      const billing = await this.client.getEnterpriseBilling({
        usage: 1000,
        period: '2025-09',
        metadata: {
          department: 'AI Research',
          cost_center: 'CC-1001'
        }
      });

      console.log('\n💳 Billing Information:');
      console.log(`   Total Usage: ${billing.billing.totalUsage}`);
      console.log(`   Total Cost: ${billing.billing.totalCost} ${billing.billing.currency}`);
      console.log(`   Payment Status: ${billing.billing.paymentStatus}`);
      console.log(`   Next Billing Date: ${billing.billing.nextBillingDate}`);
      console.log(`   Supported Services: ${billing.billing.services.join(', ')}`);

    } catch (error) {
      console.error('❌ Failed to retrieve billing information:', error.message);
      throw error;
    }
  }

  /**
   * Discover available services in the marketplace
   */
  async discoverServices(): Promise<void> {
    console.log('🛒 Discovering available services...');

    try {
      const marketplace = await this.client.getMarketplace();

      console.log(`\n🏪 Marketplace (${marketplace.marketplace.totalServices} services available):`);
      console.log(`   Algorand Integration: ${marketplace.marketplace.algorand_integration}`);

      marketplace.marketplace.services.forEach((service) => {
        console.log(`\n   📦 ${service.name} (${service.id})`);
        console.log(`      Price: $${service.price}`);
        console.log(`      Description: ${service.description}`);
        console.log(`      Endpoint: ${service.endpoint}`);
        console.log(`      Capabilities: ${service.capabilities.join(', ')}`);

        if (service.algorand_features) {
          console.log('      Algorand Features:');
          console.log(`        Threshold Backed: ${service.algorand_features.threshold_backed}`);
          console.log(`        Address Derivation: ${service.algorand_features.address_derivation}`);
          console.log(`        Smart Contract Integration: ${service.algorand_features.smart_contract_integration}`);
        }
      });

    } catch (error) {
      console.error('❌ Failed to discover services:', error.message);
      throw error;
    }
  }

  /**
   * Comprehensive error handling demonstration
   */
  async demonstrateErrorHandling(): Promise<void> {
    console.log('🔧 Demonstrating comprehensive error handling...');

    const errorScenarios = [
      {
        name: 'Invalid Service',
        test: () => this.client.createPayment({ service: 'nonexistent-service', amount: 0.01 })
      },
      {
        name: 'Invalid Token',
        test: () => this.client.queryAI({ query: 'test' }, 'invalid-token')
      },
      {
        name: 'Invalid Amount',
        test: () => this.client.createPayment({ service: 'ai-oracle-basic', amount: 1000 })
      }
    ];

    for (const scenario of errorScenarios) {
      try {
        console.log(`\n   Testing: ${scenario.name}`);
        await scenario.test();
        console.log('   ⚠️  Expected error did not occur');
      } catch (error) {
        if (error instanceof PaymentRequiredError) {
          console.log('   💳 Payment Required Error:', error.message);
        } else if (error instanceof InvalidTokenError) {
          console.log('   🔑 Invalid Token Error:', error.message);
        } else if (error instanceof ServiceNotFoundError) {
          console.log('   🔍 Service Not Found Error:', error.message);
        } else if (error instanceof InsufficientFundsError) {
          console.log('   💰 Insufficient Funds Error:', error.message);
        } else if (error instanceof X402Error) {
          console.log('   ⚠️  X402 Error:', error.message);
          if (error.code) {
            console.log(`       Error Code: ${error.code}`);
          }
        } else {
          console.log('   ❌ Unexpected Error:', error.message);
        }
      }
    }
  }
}

// Example usage
async function runEnterpriseExample(): Promise<void> {
  const enterpriseConfig: EnterpriseConfig = {
    apiKey: process.env.X402_API_KEY || 'your-enterprise-api-key',
    principal: process.env.ICP_PRINCIPAL || 'your-internet-identity-principal',
    algorandAddress: process.env.ALGORAND_ADDRESS || 'your-algorand-address',
    environment: (process.env.ENVIRONMENT as 'production' | 'staging' | 'development') || 'production'
  };

  const enterpriseService = new EnterpriseX402Service(enterpriseConfig);

  console.log('🚀 Starting Enterprise X402 Integration Example\n');

  try {
    // Discover available services
    await enterpriseService.discoverServices();

    // Process sample AI queries
    const queries = [
      'Analyze the current state of blockchain technology',
      'What are the benefits of autonomous AI agents?',
      'Explain the concept of chain fusion'
    ];

    const results = await enterpriseService.processBulkAIQueries(queries);
    console.log(`\n✅ Processed ${results.length} queries successfully`);

    // Get analytics and billing information
    await enterpriseService.getEnterpriseAnalytics();
    await enterpriseService.getEnterpriseBilling();

    // Demonstrate error handling
    await enterpriseService.demonstrateErrorHandling();

    console.log('\n🎉 Enterprise integration example completed successfully!');

  } catch (error) {
    console.error('\n💥 Enterprise example failed:', error.message);
    throw error;
  }
}

// Run if this file is executed directly
if (require.main === module) {
  runEnterpriseExample()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Example failed:', error);
      process.exit(1);
    });
}

export { EnterpriseX402Service, runEnterpriseExample };