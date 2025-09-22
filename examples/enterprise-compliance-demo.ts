#!/usr/bin/env ts-node

/**
 * ckALGO Enterprise Compliance Demo
 * 
 * This example demonstrates the advanced compliance features of the ckALGO platform,
 * including rule creation, risk assessment, and compliance evaluation.
 * 
 * Prerequisites:
 * - @sippar/ck-algo-sdk installed
 * - Internet Identity authentication
 * - Enterprise or Professional tier account
 * 
 * Usage: npx ts-node examples/enterprise-compliance-demo.ts
 */

import { SipparSDK, RegulationType, ComplianceSeverity, UserTier } from '@sippar/ck-algo-sdk';

async function main() {
  console.log('🏢 ckALGO Enterprise Compliance Demo');
  console.log('=====================================\n');

  // Initialize SDK with enterprise features
  console.log('1. Initializing SDK...');
  const client = await SipparSDK.init({
    network: 'testnet', // Use testnet for demo
    autoLogin: true,
    enterpriseFeatures: true
  });

  if (!client.isAuthenticated()) {
    console.error('❌ Authentication required for enterprise features');
    process.exit(1);
  }

  const user = client.getCurrentUser();
  console.log(`✅ Authenticated as: ${user?.principal}`);
  console.log(`👤 User Tier: ${user?.tier}\n`);

  // Check if user has compliance management permissions
  const hasCompliancePerms = await client.permissions.check('ComplianceManagement');
  if (!hasCompliancePerms) {
    console.log('⚠️  Note: You need Professional+ tier for full compliance features');
  }

  // Example 1: Create Advanced Compliance Rule
  console.log('2. Creating Advanced Compliance Rule...');
  try {
    const ruleId = await client.compliance.createRule({
      ruleName: 'High Value Transaction Monitor',
      regulationType: RegulationType.FINCEN,
      severityLevel: ComplianceSeverity.High,
      conditions: [
        {
          conditionType: 'TransactionAmount',
          operator: 'GreaterThan',
          value: '10000000000000', // 10,000 ckALGO
          description: 'Monitor transactions over $10,000 equivalent'
        }
      ],
      actions: [
        {
          actionType: 'RequireApproval',
          parameters: { approval_tier: 'compliance_officer' },
          isBlocking: true
        },
        {
          actionType: 'LogEvent',
          parameters: { priority: 'high', notify_channels: 'compliance' },
          isBlocking: false
        }
      ]
    });

    console.log(`✅ Created compliance rule: ${ruleId}\n`);
  } catch (error) {
    console.log(`⚠️  Could not create rule (requires Enterprise tier): ${error.message}\n`);
  }

  // Example 2: User Risk Assessment
  console.log('3. Performing User Risk Assessment...');
  try {
    const riskProfile = await client.compliance.assessUserRisk();
    
    console.log('📊 Risk Assessment Results:');
    console.log(`   Overall Risk Score: ${riskProfile.overallRiskScore.toFixed(1)}/100`);
    console.log(`   Profile Status: ${riskProfile.profileStatus}`);
    console.log(`   Risk Factors (${riskProfile.riskFactors.length}):`);
    
    riskProfile.riskFactors.forEach(factor => {
      console.log(`     • ${factor.factorType}: +${factor.scoreImpact} (${factor.description})`);
    });
    
    console.log(`   Next Review Due: ${new Date(riskProfile.nextReviewDue / 1000000).toLocaleDateString()}\n`);
  } catch (error) {
    console.error(`❌ Risk assessment failed: ${error.message}\n`);
  }

  // Example 3: Compliance Evaluation for Mock Operation
  console.log('4. Evaluating Compliance for Mock Cross-Chain Transaction...');
  try {
    const mockMetadata = {
      destination_network: 'algorand_mainnet',
      transaction_type: 'transfer',
      purpose: 'defi_yield_farming',
      counterparty_verified: 'true'
    };

    const evaluationResult = await client.compliance.evaluateOperation({
      operationType: 'CrossChainTransaction',
      amount: '25000000000000', // 25,000 ckALGO (high value)
      metadata: mockMetadata
    });

    console.log('🔍 Compliance Evaluation Results:');
    console.log(`   Overall Result: ${evaluationResult.overallResult}`);
    console.log(`   Rules Evaluated: ${evaluationResult.rulesEvaluated.length}`);
    
    evaluationResult.rulesEvaluated.forEach(rule => {
      const status = rule.result === 'Passed' ? '✅' : 
                    rule.result === 'RequiresReview' ? '⚠️' : '❌';
      console.log(`     ${status} ${rule.ruleName}: ${rule.result}`);
    });

    if (evaluationResult.recommendedActions.length > 0) {
      console.log(`   Recommended Actions:`);
      evaluationResult.recommendedActions.forEach(action => {
        console.log(`     • ${action}`);
      });
    }

    console.log('');
  } catch (error) {
    console.error(`❌ Compliance evaluation failed: ${error.message}\n`);
  }

  // Example 4: Generate AI Explanation with Bias Assessment
  console.log('5. Generating AI Explanation with Bias Assessment...');
  try {
    // First make an AI query
    const aiResponse = await client.ai.query({
      serviceType: 'AlgorandOracle',
      query: 'Analyze the risk of this 25,000 ckALGO cross-chain transaction to Algorand mainnet for DeFi yield farming',
      model: 'deepseek-r1'
    });

    console.log('🤖 AI Analysis:', aiResponse.data.response.substring(0, 100) + '...\n');

    // Generate explanation
    const explanationId = await client.ai.generateExplanation({
      requestId: aiResponse.data.requestId,
      explanationType: 'BiasCheck'
    });

    const explanation = await client.ai.getExplanation(explanationId);
    
    console.log('🔍 AI Bias Assessment:');
    console.log(`   Bias Types Checked: ${explanation.biasAssessment.biasTypesChecked.join(', ')}`);
    console.log(`   Bias Score: ${explanation.biasAssessment.biasScore.toFixed(3)} (lower is better)`);
    console.log(`   Recommendation: ${explanation.biasAssessment.recommendation}`);
    console.log(`   Ethical Score: ${calculateEthicalScore(explanation).toFixed(1)}/100`);
    
    if (explanation.biasAssessment.mitigationSuggestions.length > 0) {
      console.log(`   Mitigation Suggestions:`);
      explanation.biasAssessment.mitigationSuggestions.forEach(suggestion => {
        console.log(`     • ${suggestion}`);
      });
    }

    console.log('');
  } catch (error) {
    console.error(`❌ AI explanation failed: ${error.message}\n`);
  }

  // Example 5: Enterprise Governance Participation
  console.log('6. Enterprise Governance Participation...');
  try {
    // Check active governance proposals
    const activeProposals = await client.governance.listActiveProposals();
    
    if (activeProposals.length > 0) {
      console.log(`📊 Active Governance Proposals (${activeProposals.length}):`);
      
      activeProposals.forEach((proposal, index) => {
        console.log(`   ${index + 1}. ${proposal.title}`);
        console.log(`      Type: ${proposal.proposalType}`);
        console.log(`      Proposed by: ${proposal.proposedBy}`);
        console.log(`      Votes: ${proposal.votes.length}`);
        
        // Calculate voting statistics
        const totalWeight = proposal.votes.reduce((sum, vote) => sum + vote.voteWeight, 0);
        const approveWeight = proposal.votes
          .filter(vote => vote.voteDecision === 'Approve')
          .reduce((sum, vote) => sum + vote.voteWeight, 0);
        
        const approvalRate = totalWeight > 0 ? (approveWeight / totalWeight * 100).toFixed(1) : '0';
        console.log(`      Approval Rate: ${approvalRate}%`);
        console.log(`      Deadline: ${new Date(proposal.votingDeadline / 1000000).toLocaleDateString()}`);
        console.log('');
      });
    } else {
      console.log('📊 No active governance proposals at this time\n');
      
      // Create a sample governance proposal (if eligible)
      if (user?.tier !== UserTier.Free) {
        console.log('Creating sample governance proposal...');
        
        const proposalId = await client.governance.createProposal({
          proposalType: 'TierBenefitAdjustment',
          title: 'Increase Free Tier AI Query Limit',
          description: 'Proposal to increase the free tier monthly AI query limit from 100 to 200 to improve accessibility and user onboarding.',
          executionData: JSON.stringify({
            tier: 'Free',
            benefit: 'monthlyQueryLimit',
            currentValue: 100,
            proposedValue: 200
          })
        });

        console.log(`✅ Created governance proposal: ${proposalId}`);
        console.log('   Other users can now vote on this proposal\n');
      }
    }
  } catch (error) {
    console.error(`❌ Governance operations failed: ${error.message}\n`);
  }

  // Example 6: Generate Compliance Report
  console.log('7. Generating GDPR Compliance Report...');
  try {
    const endTime = Date.now() * 1000000; // Convert to nanoseconds
    const startTime = endTime - (30 * 24 * 60 * 60 * 1000000000); // 30 days ago

    const report = await client.compliance.generateReport({
      regulationType: RegulationType.GDPR,
      periodStart: startTime,
      periodEnd: endTime
    });

    console.log('📋 GDPR Compliance Report:');
    console.log(report.substring(0, 300) + '...\n');
  } catch (error) {
    console.log(`⚠️  Report generation requires Enterprise tier: ${error.message}\n`);
  }

  console.log('🎉 Enterprise Compliance Demo Complete!');
  console.log('\nKey Takeaways:');
  console.log('• Advanced compliance rules can automatically monitor and control operations');
  console.log('• Risk assessment provides continuous monitoring of user behavior');
  console.log('• AI explanations include bias assessment for ethical AI practices');
  console.log('• Governance system enables community participation in platform decisions');
  console.log('• Comprehensive audit trails support regulatory compliance requirements');
}

// Helper function to calculate ethical score
function calculateEthicalScore(explanation: any): number {
  let score = 100;
  
  switch (explanation.biasAssessment.recommendation) {
    case 'ReviewRequired': score -= 10; break;
    case 'BiasDetected': score -= 25; break;
    case 'HighRiskBias': score -= 50; break;
  }
  
  if (explanation.decisionPath.length === 0) {
    score -= 5; // Lack of transparency
  }
  
  return Math.max(0, score);
}

// Run the demo
main().catch(console.error);