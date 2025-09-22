#!/usr/bin/env ts-node

/**
 * ckALGO AI Explainability Framework Demo
 * 
 * This example demonstrates the explainable AI capabilities of the ckALGO platform,
 * showcasing different explanation types, bias assessment, and ethical AI practices.
 * 
 * Prerequisites:
 * - @sippar/ck-algo-sdk installed
 * - Internet Identity authentication
 * - Developer+ tier account for AI features
 * 
 * Usage: npx ts-node examples/ai-explainability-demo.ts
 */

import { SipparSDK, ExplanationType, AIServiceType } from '@sippar/ck-algo-sdk';

async function main() {
  console.log('🤖 ckALGO AI Explainability Framework Demo');
  console.log('===========================================\n');

  // Initialize SDK
  console.log('1. Initializing SDK with AI features...');
  const client = await SipparSDK.init({
    network: 'testnet',
    autoLogin: true
  });

  if (!client.isAuthenticated()) {
    console.error('❌ Authentication required for AI features');
    process.exit(1);
  }

  const user = client.getCurrentUser();
  console.log(`✅ Authenticated as: ${user?.principal}`);
  console.log(`👤 User Tier: ${user?.tier}\n`);

  // Check AI service access
  const hasAIAccess = await client.permissions.check('AIServiceAccess');
  if (!hasAIAccess) {
    console.log('⚠️  Note: AI features require Developer+ tier');
  }

  // Scenario: Smart DeFi Investment Decision
  const scenarios = [
    {
      name: 'Conservative DeFi Strategy',
      query: 'Should I invest 1000 ALGO in Algorand Standard Assets with 5% APY for conservative long-term growth?',
      expectedRisk: 'low'
    },
    {
      name: 'Aggressive Yield Farming',
      query: 'Should I leverage 10,000 ALGO in a new experimental yield farming protocol promising 100% APY?',
      expectedRisk: 'high'
    },
    {
      name: 'Cross-Chain Arbitrage',
      query: 'Analyze the arbitrage opportunity between ALGO price on Algorand DEXs vs centralized exchanges',
      expectedRisk: 'medium'
    }
  ];

  let requestIds: string[] = [];

  // Step 1: Submit AI queries for all scenarios
  console.log('2. Submitting AI Queries for DeFi Investment Scenarios...\n');
  
  for (let i = 0; i < scenarios.length; i++) {
    const scenario = scenarios[i];
    console.log(`📊 Scenario ${i + 1}: ${scenario.name}`);
    console.log(`   Query: ${scenario.query.substring(0, 80)}...`);
    
    try {
      const response = await client.ai.query({
        serviceType: AIServiceType.AlgorandOracle,
        query: scenario.query,
        model: 'deepseek-r1'
      });

      requestIds.push(response.data.requestId);
      console.log(`   ✅ Request submitted: ${response.data.requestId}`);
      console.log(`   💡 AI Response: ${response.data.response.substring(0, 100)}...\n`);

      // Brief delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`   ❌ Failed to submit query: ${error.message}\n`);
    }
  }

  // Step 2: Generate different types of explanations
  console.log('3. Generating AI Explanations...\n');
  
  const explanationTypes: ExplanationType[] = [
    ExplanationType.DecisionTree,
    ExplanationType.FeatureImportance,
    ExplanationType.Confidence,
    ExplanationType.BiasCheck
  ];

  for (let i = 0; i < Math.min(requestIds.length, 2); i++) {
    const requestId = requestIds[i];
    const scenario = scenarios[i];
    
    console.log(`🔍 Analyzing Scenario ${i + 1}: ${scenario.name}`);
    console.log('---'.repeat(20));

    for (const explType of explanationTypes) {
      try {
        console.log(`\n📋 Generating ${explType} Explanation...`);
        
        const explanationId = await client.ai.generateExplanation({
          requestId,
          explanationType: explType
        });

        const explanation = await client.ai.getExplanation(explanationId);
        
        if (!explanation) {
          console.log(`   ❌ Could not retrieve explanation`);
          continue;
        }

        switch (explType) {
          case ExplanationType.DecisionTree:
            console.log(`   🌳 Decision Tree Analysis:`);
            console.log(`      ${explanation.explanationText}`);
            
            if (explanation.decisionPath.length > 0) {
              console.log(`   📊 Decision Steps:`);
              explanation.decisionPath.forEach(step => {
                console.log(`      ${step.stepNumber}. ${step.condition}`);
                console.log(`         → ${step.outcome} (${(step.confidence * 100).toFixed(1)}% confident)`);
              });
            }
            break;

          case ExplanationType.FeatureImportance:
            console.log(`   🎯 Feature Importance Analysis:`);
            console.log(`      ${explanation.explanationText}`);
            
            if (explanation.confidenceFactors.length > 0) {
              console.log(`   📈 Key Factors:`);
              explanation.confidenceFactors
                .sort((a, b) => b.contribution - a.contribution)
                .forEach(factor => {
                  console.log(`      • ${factor.factorName}: ${(factor.contribution * 100).toFixed(1)}% impact`);
                  console.log(`        Weight: ${factor.weight.toFixed(2)} | ${factor.explanation}`);
                });
            }
            break;

          case ExplanationType.Confidence:
            console.log(`   📊 Confidence Analysis:`);
            console.log(`      ${explanation.explanationText}`);
            
            // Calculate overall confidence
            const avgConfidence = explanation.confidenceFactors.length > 0 ? 
              explanation.confidenceFactors.reduce((sum, f) => sum + f.contribution, 0) / explanation.confidenceFactors.length : 0;
            
            console.log(`   🎯 Overall Confidence: ${(avgConfidence * 100).toFixed(1)}%`);
            
            if (explanation.dataSourcesUsed.length > 0) {
              console.log(`   📚 Data Sources:`);
              explanation.dataSourcesUsed.forEach(source => {
                console.log(`      • ${source.sourceName} (${source.sourceType})`);
                console.log(`        Reliability: ${(source.reliabilityScore * 100).toFixed(1)}%`);
              });
            }
            break;

          case ExplanationType.BiasCheck:
            console.log(`   ⚖️  Bias Assessment:`);
            console.log(`      ${explanation.explanationText}`);
            
            const bias = explanation.biasAssessment;
            console.log(`   📊 Bias Analysis:`);
            console.log(`      Types Checked: ${bias.biasTypesChecked.join(', ')}`);
            console.log(`      Bias Score: ${bias.biasScore.toFixed(3)} (0.0 = no bias, 1.0 = high bias)`);
            console.log(`      Assessment: ${bias.recommendation}`);
            
            const ethicalScore = calculateEthicalScore(explanation);
            console.log(`      Ethical Score: ${ethicalScore.toFixed(1)}/100`);
            
            if (bias.mitigationSuggestions.length > 0) {
              console.log(`   💡 Bias Mitigation Suggestions:`);
              bias.mitigationSuggestions.forEach(suggestion => {
                console.log(`      • ${suggestion}`);
              });
            }

            // Provide risk-level specific recommendations
            console.log(`   🎯 Risk-Based Recommendations for ${scenario.expectedRisk.toUpperCase()} risk scenario:`);
            switch (scenario.expectedRisk) {
              case 'low':
                if (ethicalScore > 80) {
                  console.log(`      ✅ AI assessment is reliable for this conservative strategy`);
                } else {
                  console.log(`      ⚠️  Consider additional human review despite low risk`);
                }
                break;
              case 'medium':
                console.log(`      📊 Medium risk requires balanced human-AI decision making`);
                console.log(`      💡 Use AI insights as input, not final decision`);
                break;
              case 'high':
                console.log(`      🚨 High risk scenario requires human oversight`);
                console.log(`      ❌ Do not rely solely on AI for high-risk decisions`);
                if (ethicalScore < 70) {
                  console.log(`      🔍 Low ethical score indicates potential AI limitations`);
                }
                break;
            }
            break;
        }

        // Show limitations for transparency
        if (explanation.limitations.length > 0) {
          console.log(`   ⚠️  AI Limitations:`);
          explanation.limitations.forEach(limitation => {
            console.log(`      • ${limitation}`);
          });
        }

      } catch (error) {
        console.error(`   ❌ Failed to generate ${explType} explanation: ${error.message}`);
      }
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
  }

  // Step 3: Comparative Analysis
  console.log('4. Comparative AI Ethics Analysis...\n');
  
  // Simulate ethical scores for demonstration
  const ethicalScores = scenarios.slice(0, requestIds.length).map((scenario, i) => ({
    scenario: scenario.name,
    riskLevel: scenario.expectedRisk,
    ethicalScore: generateMockEthicalScore(scenario.expectedRisk),
    recommendation: generateRecommendation(scenario.expectedRisk)
  }));

  console.log('📊 AI Ethics Scorecard:');
  console.log('─'.repeat(80));
  console.log('| Scenario                 | Risk Level | Ethical Score | Recommendation     |');
  console.log('─'.repeat(80));
  
  ethicalScores.forEach(score => {
    const scenarioName = score.scenario.padEnd(24);
    const riskLevel = score.riskLevel.padEnd(10);
    const ethicalScore = `${score.ethicalScore.toFixed(1)}/100`.padEnd(13);
    const recommendation = score.recommendation;
    
    console.log(`| ${scenarioName} | ${riskLevel} | ${ethicalScore} | ${recommendation.padEnd(18)} |`);
  });
  
  console.log('─'.repeat(80));

  // Step 4: Best Practices Summary
  console.log('\n5. AI Explainability Best Practices Summary...\n');
  
  console.log('🎯 Key Principles for Responsible AI Usage:');
  console.log('');
  console.log('1. 🔍 TRANSPARENCY');
  console.log('   • Always generate explanations for important decisions');
  console.log('   • Use DecisionTree explanations to understand AI reasoning');
  console.log('   • Share limitations and uncertainties with stakeholders');
  console.log('');
  console.log('2. ⚖️  FAIRNESS & BIAS MITIGATION');
  console.log('   • Run BiasCheck explanations for all critical decisions');
  console.log('   • Monitor ethical scores over time');
  console.log('   • Implement bias mitigation suggestions');
  console.log('');
  console.log('3. 🛡️  HUMAN OVERSIGHT');
  console.log('   • High-risk decisions require human review');
  console.log('   • Use AI as advisory input, not replacement for judgment');
  console.log('   • Establish clear thresholds for human intervention');
  console.log('');
  console.log('4. 📊 CONTINUOUS MONITORING');
  console.log('   • Track confidence scores across different scenarios');
  console.log('   • Monitor data source reliability');
  console.log('   • Regular review of ethical score distributions');
  console.log('');
  console.log('5. 🔄 ITERATIVE IMPROVEMENT');
  console.log('   • Use explanation insights to improve AI training');
  console.log('   • Update bias detection based on real-world outcomes');
  console.log('   • Incorporate stakeholder feedback into AI development');

  console.log('\n🎉 AI Explainability Demo Complete!');
  console.log('\nThis framework ensures that AI-driven financial decisions are:');
  console.log('✅ Transparent and explainable');
  console.log('✅ Regularly assessed for bias');
  console.log('✅ Appropriate for their risk level');
  console.log('✅ Continuously improved based on outcomes');
}

// Helper functions
function calculateEthicalScore(explanation: any): number {
  let score = 100;
  
  const bias = explanation.biasAssessment;
  switch (bias.recommendation) {
    case 'ReviewRequired': score -= 10; break;
    case 'BiasDetected': score -= 25; break;
    case 'HighRiskBias': score -= 50; break;
  }
  
  if (explanation.decisionPath.length === 0) {
    score -= 5;
  }
  
  if (explanation.limitations.length > 3) {
    score -= 10;
  }
  
  return Math.max(0, score);
}

function generateMockEthicalScore(riskLevel: string): number {
  const baseScores = {
    'low': 85 + Math.random() * 10,
    'medium': 70 + Math.random() * 15,
    'high': 55 + Math.random() * 20
  };
  
  return baseScores[riskLevel as keyof typeof baseScores] || 75;
}

function generateRecommendation(riskLevel: string): string {
  const recommendations = {
    'low': 'AI Recommended',
    'medium': 'Human Review',
    'high': 'Human Required'
  };
  
  return recommendations[riskLevel as keyof typeof recommendations] || 'Review Required';
}

// Run the demo
main().catch(console.error);