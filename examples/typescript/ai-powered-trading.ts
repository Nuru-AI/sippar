/**
 * AI-Powered Trading Example
 * Demonstrates using AI services for automated trading decisions
 */

import { SipparClient, AIResponse } from '@sippar/sdk';

interface TradingDecision {
  action: 'buy' | 'sell' | 'hold';
  confidence: number;
  amount?: number;
  reasoning: string;
}

async function aiPoweredTradingExample() {
  // Initialize Sippar client
  const sippar = new SipparClient({
    network: 'mainnet'
  });

  const userPrincipal = "trader-principal-id";
  const algorandAddress = "TRADER_ALGORAND_ADDRESS";

  try {
    console.log('🤖 AI-Powered Trading Example');
    console.log('==============================');

    // Step 1: Get current market analysis from AI Oracle
    console.log('\\n📊 Getting market analysis...');
    const marketAnalysis = await sippar.ai.oracleQuery({
      query: `Analyze the current Algorand (ALGO) market conditions including:
               - Price trends over the last 24 hours
               - Trading volume patterns
               - Market sentiment indicators
               - Technical analysis signals
               - Fundamental analysis of recent developments
               Provide a trading recommendation with confidence level.`,
      userPrincipal: userPrincipal,
      algorandData: {
        includePrice: true,
        includeVolume: true,
        timeframe: "24h"
      }
    });

    console.log('🔮 AI Oracle Analysis:');
    console.log('Response:', marketAnalysis.data.oracleResponse);
    console.log('Confidence:', marketAnalysis.data.confidence);
    console.log('App ID:', marketAnalysis.data.appId);

    // Step 2: Get enhanced AI analysis with premium features
    console.log('\\n⚡ Getting enhanced AI analysis...');
    const enhancedAnalysis = await sippar.ai.enhancedQuery({
      query: `Based on current market data, should I buy, sell, or hold ALGO?
               Consider:
               - Risk tolerance: moderate
               - Investment horizon: 1-3 months
               - Portfolio allocation: 10% crypto
               Provide specific action with amount and reasoning.`,
      userPrincipal: userPrincipal,
      serviceType: 'enhanced',
      cacheEnabled: true
    });

    console.log('⚡ Enhanced AI Analysis:');
    console.log('Response:', enhancedAnalysis.data.response);
    console.log('Confidence:', enhancedAnalysis.data.confidence);
    console.log('Cached:', enhancedAnalysis.data.cached);

    // Step 3: Parse AI recommendation into trading decision
    const tradingDecision = parseAIRecommendation(enhancedAnalysis);
    console.log('\\n🎯 Trading Decision:');
    console.log('Action:', tradingDecision.action.toUpperCase());
    console.log('Confidence:', (tradingDecision.confidence * 100).toFixed(1) + '%');
    console.log('Reasoning:', tradingDecision.reasoning);

    // Step 4: Execute trading decision if confidence is high enough
    const CONFIDENCE_THRESHOLD = 0.75; // 75% confidence required

    if (tradingDecision.confidence >= CONFIDENCE_THRESHOLD) {
      console.log('\\n✅ Confidence threshold met. Executing trade...');

      try {
        switch (tradingDecision.action) {
          case 'buy':
            await executeBuyOrder(sippar, userPrincipal, algorandAddress, tradingDecision.amount || 100);
            break;
          case 'sell':
            await executeSellOrder(sippar, userPrincipal, algorandAddress, tradingDecision.amount || 50);
            break;
          case 'hold':
            console.log('💎 Holding position as recommended by AI');
            break;
        }
      } catch (error) {
        console.log('ℹ️ Trade execution example (requires actual funds)');
        console.log('Error:', error.message);
      }
    } else {
      console.log('\\n⚠️ Confidence below threshold. Not executing trade.');
      console.log(`Required: ${CONFIDENCE_THRESHOLD * 100}%, Got: ${tradingDecision.confidence * 100}%`);
    }

    // Step 5: Set up AI monitoring for future opportunities
    console.log('\\n🔔 Setting up AI monitoring...');
    await setupAIMonitoring(sippar, userPrincipal);

    // Step 6: Generate trading report
    console.log('\\n📋 Generating trading report...');
    await generateTradingReport(sippar, userPrincipal, {
      marketAnalysis,
      enhancedAnalysis,
      tradingDecision,
      executed: tradingDecision.confidence >= CONFIDENCE_THRESHOLD
    });

  } catch (error) {
    console.error('❌ Error in AI-powered trading:', error);
  }
}

// Helper function to parse AI recommendation
function parseAIRecommendation(aiResponse: AIResponse): TradingDecision {
  const response = aiResponse.data.response.toLowerCase();
  const confidence = aiResponse.data.confidence || 0.5;

  let action: 'buy' | 'sell' | 'hold' = 'hold';
  let amount = 0;

  if (response.includes('buy') || response.includes('purchase')) {
    action = 'buy';
    // Extract amount if mentioned
    const amountMatch = response.match(/(\\d+)\\s*(algo|dollar)/i);
    amount = amountMatch ? parseInt(amountMatch[1]) : 100;
  } else if (response.includes('sell')) {
    action = 'sell';
    const amountMatch = response.match(/(\\d+)\\s*(algo|percent)/i);
    amount = amountMatch ? parseInt(amountMatch[1]) : 50;
  }

  return {
    action,
    confidence,
    amount,
    reasoning: aiResponse.data.response
  };
}

// Execute buy order
async function executeBuyOrder(sippar: SipparClient, userPrincipal: string, algorandAddress: string, amountUSD: number) {
  console.log(`💰 Executing BUY order for $${amountUSD} worth of ALGO...`);

  // Convert USD to ALGO amount (simplified - would need real price data)
  const algoAmount = Math.floor((amountUSD / 0.25) * 1_000_000); // Assuming $0.25 per ALGO

  const mintResult = await sippar.ckAlgo.mint({
    amount: algoAmount.toString(),
    algorandAddress: algorandAddress,
    userPrincipal: userPrincipal
  });

  if (mintResult.success) {
    console.log('✅ Buy order executed successfully!');
    console.log('Transaction ID:', mintResult.transactionId);
    console.log('Amount:', algoAmount / 1_000_000, 'ckALGO minted');
  }
}

// Execute sell order
async function executeSellOrder(sippar: SipparClient, userPrincipal: string, algorandAddress: string, percentToSell: number) {
  console.log(`📈 Executing SELL order for ${percentToSell}% of holdings...`);

  const balance = await sippar.ckAlgo.getBalance(userPrincipal);
  const sellAmount = Math.floor(balance * (percentToSell / 100));

  if (sellAmount > 0) {
    const redeemResult = await sippar.ckAlgo.redeem({
      amount: sellAmount.toString(),
      algorandAddress: algorandAddress
    });

    if (redeemResult.success) {
      console.log('✅ Sell order executed successfully!');
      console.log('Transaction ID:', redeemResult.transactionId);
      console.log('Amount:', sellAmount / 1_000_000, 'ckALGO redeemed');
    }
  } else {
    console.log('⚠️ No balance to sell');
  }
}

// Set up AI monitoring
async function setupAIMonitoring(sippar: SipparClient, userPrincipal: string) {
  console.log('🤖 AI monitoring configured for:');
  console.log('  - Market trend changes');
  console.log('  - Price volatility alerts');
  console.log('  - News sentiment analysis');
  console.log('  - Technical indicator signals');

  // In a real implementation, this would set up webhooks or polling
  console.log('ℹ️ Monitoring setup (would be implemented with smart contracts)');
}

// Generate trading report
async function generateTradingReport(sippar: SipparClient, userPrincipal: string, data: any) {
  const reportQuery = `Generate a comprehensive trading report based on the following:
    - Market Analysis: ${data.marketAnalysis.data.oracleResponse}
    - Enhanced Analysis: ${data.enhancedAnalysis.data.response}
    - Decision: ${data.tradingDecision.action} (${data.tradingDecision.confidence * 100}% confidence)
    - Executed: ${data.executed ? 'Yes' : 'No'}

    Include risk assessment and future recommendations.`;

  const report = await sippar.ai.query({
    query: reportQuery,
    userPrincipal: userPrincipal,
    serviceType: 'enhanced'
  });

  console.log('📊 Trading Report Generated:');
  console.log(report.data.response);
}

// Run the example
if (require.main === module) {
  aiPoweredTradingExample()
    .then(() => console.log('\\n✅ AI-powered trading example completed'))
    .catch(console.error);
}

export { aiPoweredTradingExample };