/**
 * Basic AI Query Example
 * Demonstrates how to use Sippar's AI services
 */

import { SipparClient } from '@sippar/sdk';

async function basicAIExample() {
  // Initialize Sippar client
  const sippar = new SipparClient({
    network: 'mainnet'
  });

  try {
    // Check platform health first
    console.log('🏥 Checking platform health...');
    const health = await sippar.getHealth();
    console.log('Platform status:', health.status);

    // Example 1: Basic AI Query
    console.log('\\n🤖 Making basic AI query...');
    const basicResponse = await sippar.ai.query({
      query: "What is Algorand and how does it work?",
      userPrincipal: "example-principal-id",
      serviceType: 'general'
    });

    console.log('AI Response:', basicResponse.data.response);
    console.log('Response time:', basicResponse.data.responseTime, 'ms');
    console.log('Model used:', basicResponse.data.model);

    // Example 2: AI Oracle Query (Algorand-specific)
    console.log('\\n🔮 Making AI Oracle query...');
    const oracleResponse = await sippar.ai.oracleQuery({
      query: "What's the current status of the Algorand network?",
      userPrincipal: "example-principal-id",
      algorandData: {
        network: "mainnet",
        includeMetrics: true
      }
    });

    console.log('Oracle Response:', oracleResponse.data.oracleResponse);
    console.log('App ID:', oracleResponse.data.appId);
    console.log('Confidence:', oracleResponse.data.confidence);
    console.log('Sources:', oracleResponse.data.sources);

    // Example 3: Enhanced AI Query with caching
    console.log('\\n⚡ Making enhanced AI query...');
    const enhancedResponse = await sippar.ai.enhancedQuery({
      query: "Provide a detailed analysis of recent Algorand developments and market trends",
      userPrincipal: "example-principal-id",
      serviceType: 'enhanced',
      cacheEnabled: true
    });

    console.log('Enhanced Response:', enhancedResponse.data.response);
    console.log('Was cached:', enhancedResponse.data.cached);
    console.log('Confidence:', enhancedResponse.data.confidence);
    console.log('Premium features:', enhancedResponse.data.metadata?.features);

    // Example 4: Get OpenWebUI Chat Authentication
    console.log('\\n💬 Getting chat authentication...');
    const chatAuth = await sippar.ai.getChatAuth({
      userPrincipal: "example-principal-id",
      algorandAddress: "EXAMPLE_ALGORAND_ADDRESS"
    });

    console.log('Chat URL:', chatAuth.authUrl);
    console.log('Available models:', chatAuth.models);
    console.log('Token expires:', new Date(chatAuth.expires));

    // Example 5: Check AI service health
    console.log('\\n🏥 Checking AI service health...');
    const [aiHealth, oracleHealth] = await Promise.all([
      sippar.ai.getHealth(),
      sippar.ai.getOracleHealth()
    ]);

    console.log('AI Service Health:');
    console.log('  Status:', aiHealth.data.status);
    console.log('  Uptime:', aiHealth.data.uptime);
    console.log('  OpenWebUI:', aiHealth.data.services?.openwebui?.status);

    console.log('\\nAI Oracle Health:');
    console.log('  Status:', oracleHealth.data.status);
    console.log('  App ID:', oracleHealth.data.appId);
    console.log('  Network:', oracleHealth.data.network);
    console.log('  Uptime:', oracleHealth.data.uptime);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the example
if (require.main === module) {
  basicAIExample()
    .then(() => console.log('\\n✅ Basic AI example completed'))
    .catch(console.error);
}

export { basicAIExample };