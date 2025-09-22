#!/usr/bin/env ts-node

/**
 * ckALGO Enterprise Compliance Demo (CORRECTED VERSION)
 * 
 * This example demonstrates calling the actual canister functions directly,
 * since the enterprise features are not yet exposed through the SDK.
 * 
 * Prerequisites:
 * - @dfinity/agent installed
 * - Internet Identity authentication
 * - Enterprise or Professional tier account
 * 
 * Usage: npx ts-node examples/enterprise-compliance-demo-corrected.ts
 */

import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';

// These would be the actual IDL definitions from the canister
const canisterIdlFactory = ({ IDL }: any) => {
  const RegulationType = IDL.Variant({
    'GDPR': IDL.Null,
    'CCPA': IDL.Null,
    'SOX': IDL.Null,
    'FINCEN': IDL.Null,
    'MiFID': IDL.Null,
    'BASEL': IDL.Null,
    'ISO27001': IDL.Null,
    'SOC2': IDL.Null,
  });

  const ComplianceSeverity = IDL.Variant({
    'Low': IDL.Null,
    'Medium': IDL.Null,
    'High': IDL.Null,
    'Critical': IDL.Null,
  });

  const ConditionType = IDL.Variant({
    'TransactionAmount': IDL.Null,
    'UserTier': IDL.Null,
    'GeographicLocation': IDL.Null,
    'TimeOfDay': IDL.Null,
    'FrequencyLimit': IDL.Null,
    'RiskScore': IDL.Null,
    'AggregateVolume': IDL.Null,
  });

  const ComplianceOperator = IDL.Variant({
    'GreaterThan': IDL.Null,
    'LessThan': IDL.Null,
    'Equal': IDL.Null,
    'NotEqual': IDL.Null,
    'Contains': IDL.Null,
    'NotContains': IDL.Null,
  });

  const ComplianceCondition = IDL.Record({
    'condition_type': ConditionType,
    'operator': ComplianceOperator,
    'value': IDL.Text,
    'description': IDL.Text,
  });

  const ActionType = IDL.Variant({
    'Block': IDL.Null,
    'RequireApproval': IDL.Null,
    'LogEvent': IDL.Null,
    'NotifyOfficer': IDL.Null,
    'IncreaseMonitoring': IDL.Null,
    'RequestDocumentation': IDL.Null,
  });

  const ComplianceAction = IDL.Record({
    'action_type': ActionType,
    'parameters': IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
    'is_blocking': IDL.Bool,
  });

  return IDL.Service({
    // These are actual functions that exist in the canister
    'create_advanced_compliance_rule': IDL.Func([
      IDL.Text, // rule_name
      RegulationType, // regulation_type  
      ComplianceSeverity, // severity_level
      IDL.Vec(ComplianceCondition), // conditions
      IDL.Vec(ComplianceAction), // actions
    ], [IDL.Variant({ 'Ok': IDL.Text, 'Err': IDL.Text })], []),
    
    'assess_user_risk': IDL.Func([
      IDL.Principal, // user
    ], [IDL.Variant({ 'Ok': IDL.Text, 'Err': IDL.Text })], []), // Simplified return type
    
    'get_compliance_dashboard': IDL.Func([], [IDL.Text], ['query']),
    
    'generate_regulatory_report': IDL.Func([
      RegulationType, // regulation_type
      IDL.Nat64, // period_start
      IDL.Nat64, // period_end
    ], [IDL.Variant({ 'Ok': IDL.Text, 'Err': IDL.Text })], []),
  });
};

async function main() {
  console.log('🏢 ckALGO Enterprise Compliance Demo (CORRECTED)');
  console.log('==================================================\n');

  console.log('⚠️  This demo calls canister functions directly since the SDK');
  console.log('    does not yet expose enterprise features.\n');

  // Initialize agent (would need proper setup for mainnet/testnet)
  const agent = new HttpAgent({
    host: 'https://ic0.app' // or local replica URL for testing
  });

  // In development, fetch root key
  if (process.env.NODE_ENV !== 'production') {
    console.log('🔧 Fetching root key for development...');
    try {
      await agent.fetchRootKey();
    } catch (error) {
      console.log('⚠️  Could not fetch root key (local replica not running?)');
    }
  }

  const canisterId = 'vj7ly-diaaa-aaaae-abvoq-cai'; // Actual ckALGO canister ID
  
  try {
    const actor = Actor.createActor(canisterIdlFactory, {
      agent,
      canisterId,
    });

    console.log('✅ Connected to ckALGO canister');

    // Example 1: Get Compliance Dashboard
    console.log('\n1. Fetching Compliance Dashboard...');
    try {
      const dashboard = await actor.get_compliance_dashboard();
      console.log('📊 Compliance Dashboard:');
      console.log(dashboard.substring(0, 200) + '...\n');
    } catch (error) {
      console.log(`⚠️  Dashboard access requires Enterprise tier: ${error}\n`);
    }

    // Example 2: Create Compliance Rule (if authorized)
    console.log('2. Attempting to Create Compliance Rule...');
    try {
      const result = await actor.create_advanced_compliance_rule(
        'Demo High Value Transaction Monitor',
        { 'FINCEN': null },
        { 'High': null },
        [
          {
            condition_type: { 'TransactionAmount': null },
            operator: { 'GreaterThan': null },
            value: '10000000000000', // 10,000 ckALGO  
            description: 'Monitor transactions over $10,000 equivalent'
          }
        ],
        [
          {
            action_type: { 'RequireApproval': null },
            parameters: [['approval_tier', 'compliance_officer']],
            is_blocking: true
          }
        ]
      );

      if ('Ok' in result) {
        console.log(`✅ Created compliance rule: ${result.Ok}`);
      } else {
        console.log(`❌ Rule creation failed: ${result.Err}`);
      }
    } catch (error) {
      console.log(`⚠️  Rule creation requires Enterprise tier: ${error}\n`);
    }

    // Example 3: Generate Regulatory Report
    console.log('\n3. Generating GDPR Compliance Report...');
    try {
      const endTime = BigInt(Date.now() * 1000000); // Convert to nanoseconds
      const startTime = endTime - BigInt(30 * 24 * 60 * 60 * 1000000000); // 30 days ago

      const reportResult = await actor.generate_regulatory_report(
        { 'GDPR': null },
        startTime,
        endTime
      );

      if ('Ok' in reportResult) {
        console.log('📋 GDPR Compliance Report Generated:');
        console.log(reportResult.Ok.substring(0, 300) + '...');
      } else {
        console.log(`❌ Report generation failed: ${reportResult.Err}`);
      }
    } catch (error) {
      console.log(`⚠️  Report generation requires Enterprise tier: ${error}\n`);
    }

    // Example 4: Risk Assessment (if authorized)
    console.log('\n4. Performing Risk Assessment...');
    try {
      // This would need to be the caller's principal in a real implementation
      const userPrincipal = Principal.fromText('rdmx6-jaaaa-aaaah-qcaiq-cai'); // Example principal
      
      const riskResult = await actor.assess_user_risk(userPrincipal);
      
      if ('Ok' in riskResult) {
        console.log('🎯 Risk Assessment Result:');
        console.log(riskResult.Ok);
      } else {
        console.log(`❌ Risk assessment failed: ${riskResult.Err}`);
      }
    } catch (error) {
      console.log(`⚠️  Risk assessment failed: ${error}\n`);
    }

  } catch (error) {
    console.error('❌ Failed to connect to canister:', error);
  }

  // Demonstrate what exists vs what doesn't
  console.log('\n📋 What Actually Exists vs Documentation Claims:\n');
  
  console.log('✅ CANISTER FUNCTIONS THAT EXIST:');
  console.log('   • create_advanced_compliance_rule() - Creates compliance rules');  
  console.log('   • assess_user_risk() - Performs risk assessment');
  console.log('   • get_compliance_dashboard() - Gets compliance status');
  console.log('   • generate_regulatory_report() - Generates compliance reports');
  console.log('   • evaluate_compliance_for_operation() - Evaluates operations');
  console.log('   • create_access_role() - Creates access control roles');
  console.log('   • assign_role_to_user() - Assigns roles to users');
  console.log('   • create_governance_proposal() - Creates governance proposals');
  console.log('   • vote_on_proposal() - Votes on proposals');
  console.log('   • request_ai_explanation() - Requests AI explanations');
  console.log('   • get_ai_explanation() - Gets AI explanations');
  console.log('');
  
  console.log('❌ SDK METHODS CLAIMED BUT DON\'T EXIST:');
  console.log('   • client.compliance.createRule() - NOT IMPLEMENTED');
  console.log('   • client.compliance.assessUserRisk() - NOT IMPLEMENTED');  
  console.log('   • client.governance.createProposal() - NOT IMPLEMENTED');
  console.log('   • client.permissions.check() - NOT IMPLEMENTED');
  console.log('   • client.ai.generateExplanation() - NOT IMPLEMENTED');
  console.log('');
  
  console.log('🔧 REQUIRED FIXES:');
  console.log('   1. Add enterprise service classes to SDK');
  console.log('   2. Expose canister functions through SDK methods');
  console.log('   3. Add proper TypeScript types for all parameters');
  console.log('   4. Implement error handling and response parsing');
  console.log('   5. Add authentication checks and tier validation');

  console.log('\n🎯 This demonstrates the actual canister capabilities');
  console.log('   without the hallucinated SDK wrapper that doesn\'t exist yet.');
}

// Run the corrected demo
main().catch(console.error);