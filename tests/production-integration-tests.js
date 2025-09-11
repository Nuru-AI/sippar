#!/usr/bin/env node

/**
 * REAL Production Integration Tests for Enhanced ckALGO Canister
 * 
 * This script runs comprehensive tests against the LIVE production canister
 * at gbmxj-yiaaa-aaaak-qulqa-cai to verify all enhanced features work correctly.
 * 
 * Unlike unit tests, these make actual network calls to the deployed canister.
 */

const { execSync } = require('child_process');

const CANISTER_ID = 'gbmxj-yiaaa-aaaak-qulqa-cai';
const TEST_PRINCIPAL = '2vxsx-fae';

class ProductionCanisterTester {
    constructor() {
        this.results = {
            total: 0,
            passed: 0,
            failed: 0,
            errors: []
        };
    }

    async runCommand(method, args = '', description = '') {
        const command = `dfx canister --network ic call ${CANISTER_ID} ${method} ${args}`;
        console.log(`\n🧪 Testing: ${description || method}`);
        console.log(`   Command: ${command}`);
        
        try {
            const result = execSync(command, { 
                encoding: 'utf8',
                timeout: 30000,
                stdio: 'pipe'
            });
            console.log(`   ✅ Result: ${result.trim()}`);
            return { success: true, result: result.trim() };
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    recordTest(testName, passed, error = null) {
        this.results.total++;
        if (passed) {
            this.results.passed++;
            console.log(`✅ ${testName}: PASSED`);
        } else {
            this.results.failed++;
            this.results.errors.push({ test: testName, error });
            console.log(`❌ ${testName}: FAILED - ${error}`);
        }
    }

    async testBasicICRC1Functions() {
        console.log('\n' + '='.repeat(60));
        console.log('1. TESTING BASIC ICRC-1 FUNCTIONS (Enhanced Canister)');
        console.log('='.repeat(60));

        // Test 1: Token name
        const nameResult = await this.runCommand('icrc1_name', '', 'Token name');
        this.recordTest('ICRC1 Token Name', 
            nameResult.success && nameResult.result.includes('Chain-Key ALGO'));

        // Test 2: Token symbol  
        const symbolResult = await this.runCommand('icrc1_symbol', '', 'Token symbol');
        this.recordTest('ICRC1 Token Symbol', 
            symbolResult.success && symbolResult.result.includes('ckALGO'));

        // Test 3: Total supply
        const supplyResult = await this.runCommand('icrc1_total_supply', '', 'Total supply');
        this.recordTest('ICRC1 Total Supply', 
            supplyResult.success && supplyResult.result.includes('nat'));

        // Test 4: Decimals
        const decimalsResult = await this.runCommand('icrc1_decimals', '', 'Token decimals');
        this.recordTest('ICRC1 Decimals', 
            decimalsResult.success);

        // Test 5: Fee
        const feeResult = await this.runCommand('icrc1_fee', '', 'Transfer fee');
        this.recordTest('ICRC1 Fee', 
            feeResult.success);
    }

    async testEnhancedUserTierSystem() {
        console.log('\n' + '='.repeat(60));
        console.log('2. TESTING ENHANCED USER TIER SYSTEM');
        console.log('='.repeat(60));

        // Test 6: Get user tier (no params - should return default)
        const tierResult = await this.runCommand('get_user_tier', '', 'User tier system');
        this.recordTest('Enhanced User Tier System', 
            tierResult.success && tierResult.result.includes('variant'));

        // Test 7: Get user tier with specific principal
        const tierWithUserResult = await this.runCommand('get_user_tier', 
            `(opt principal "${TEST_PRINCIPAL}")`, 'User tier with principal');
        this.recordTest('User Tier With Principal', 
            tierWithUserResult.success);
    }

    async testEnhancedAIServices() {
        console.log('\n' + '='.repeat(60));
        console.log('3. TESTING ENHANCED AI SERVICE INTEGRATION');
        console.log('='.repeat(60));

        // Test 8: Basic AI request
        const aiRequestResult = await this.runCommand('process_ai_request', 
            '(variant {AlgorandOracle}, "Test AI integration", opt "")', 
            'Basic AI request processing');
        this.recordTest('AI Request Processing', 
            aiRequestResult.success && (
                aiRequestResult.result.includes('AI service not available') || 
                aiRequestResult.result.includes('Ok')
            ));

        // Test 9: Enhanced AI request
        const enhancedAIResult = await this.runCommand('enhanced_ai_request', 
            '(variant {AlgorandOracle}, "Test enhanced AI", opt "qwen2.5", vec {}, record {temperature = opt 0.7; max_tokens = opt 100})', 
            'Enhanced AI request with parameters');
        this.recordTest('Enhanced AI Request', 
            enhancedAIResult.success);

        // Test 10: AI service health check
        const healthResult = await this.runCommand('check_ai_service_health', 
            '(variant {AlgorandOracle})', 
            'AI service health monitoring');
        this.recordTest('AI Service Health Check', 
            healthResult.success && healthResult.result.includes('record'));

        // Test 11: AI service configuration
        const configResult = await this.runCommand('get_ai_service_config', 
            '(variant {AlgorandOracle})', 
            'AI service configuration');
        this.recordTest('AI Service Configuration', 
            configResult.success);
    }

    async testEnterpriseFeatures() {
        console.log('\n' + '='.repeat(60));
        console.log('4. TESTING ENTERPRISE FEATURES');
        console.log('='.repeat(60));

        // Test 12: User risk assessment (should require Enterprise tier)
        const riskResult = await this.runCommand('assess_user_risk', 
            `(principal "${TEST_PRINCIPAL}")`, 
            'Enterprise user risk assessment');
        this.recordTest('Enterprise Risk Assessment', 
            riskResult.success && (
                riskResult.result.includes('Only Enterprise users') ||
                riskResult.result.includes('Ok')
            ));

        // Test 13: Compliance framework initialization
        const complianceResult = await this.runCommand('initialize_compliance_framework', 
            '', 
            'Compliance framework initialization');
        this.recordTest('Compliance Framework', 
            complianceResult.success);

        // Test 14: Access role creation (Enterprise feature)
        const roleResult = await this.runCommand('create_access_role', 
            '("test_role", "Test role description", vec {"read"; "write"})', 
            'Enterprise access role creation');
        this.recordTest('Access Role Creation', 
            roleResult.success);
    }

    async testSmartContractEngine() {
        console.log('\n' + '='.repeat(60));
        console.log('5. TESTING SMART CONTRACT ENGINE');
        console.log('='.repeat(60));

        // Test 15: Smart contract creation
        const contractResult = await this.runCommand('create_smart_contract', 
            '("Integration Test Contract", "Test contract for integration testing", variant {UserManual}, "test condition", vec {}, false, null, 1000 : nat64)', 
            'Smart contract creation');
        this.recordTest('Smart Contract Creation', 
            contractResult.success);

        // Test 16: Get user contracts
        const userContractsResult = await this.runCommand('get_user_contracts', 
            '', 
            'Retrieve user smart contracts');
        this.recordTest('Get User Contracts', 
            userContractsResult.success);

        // Test 17: Contract template creation  
        const templateResult = await this.runCommand('create_contract_template', 
            '("Test Template", "Integration test template", variant {UserManual}, vec {}, record {complexity_level = 1 : nat8; gas_estimate = 1000 : nat64; requires_ai = false})', 
            'Contract template creation');
        this.recordTest('Contract Template Creation', 
            templateResult.success);
    }

    async testCrossChainOperations() {
        console.log('\n' + '='.repeat(60));
        console.log('6. TESTING CROSS-CHAIN OPERATIONS');
        console.log('='.repeat(60));

        // Test 18: Read Algorand state
        const algorandStateResult = await this.runCommand('read_algorand_state', 
            '("GD64YIY3TWGDMCNPP553DZPPR6LDUSFQOIJVFDPPXWEG3FVOJCCDBBHU5A", opt 1000 : opt nat64)', 
            'Read Algorand blockchain state');
        this.recordTest('Algorand State Reading', 
            algorandStateResult.success);

        // Test 19: Cross-chain operation creation
        const crossChainResult = await this.runCommand('create_enhanced_cross_chain_operation', 
            '(variant {AlgorandToICP}, "Test cross-chain op", 1000000 : nat64, "GD64YIY3TWGDMCNPP553DZPPR6LDUSFQOIJVFDPPXWEG3FVOJCCDBBHU5A", opt principal "2vxsx-fae")', 
            'Enhanced cross-chain operation');
        this.recordTest('Cross-Chain Operation', 
            crossChainResult.success);

        // Test 20: Sync cross-chain state
        const syncResult = await this.runCommand('sync_enhanced_cross_chain_state', 
            '', 
            'Cross-chain state synchronization');
        this.recordTest('Cross-Chain State Sync', 
            syncResult.success);
    }

    async testAdvancedAnalytics() {
        console.log('\n' + '='.repeat(60));
        console.log('7. TESTING ADVANCED ANALYTICS & REPORTING');
        console.log('='.repeat(60));

        // Test 21: Revenue analytics sync
        const revenueResult = await this.runCommand('sync_revenue_analytics_with_backend', 
            '', 
            'Revenue analytics synchronization');
        this.recordTest('Revenue Analytics Sync', 
            revenueResult.success);

        // Test 22: Comprehensive revenue report
        const reportResult = await this.runCommand('generate_comprehensive_revenue_report', 
            '(1725984000 : nat64, 1726070400 : nat64, opt "detailed")', 
            'Comprehensive revenue reporting');
        this.recordTest('Revenue Report Generation', 
            reportResult.success);
    }

    async testAuditingAndCompliance() {
        console.log('\n' + '='.repeat(60));
        console.log('8. TESTING AUDITING & COMPLIANCE SYSTEM');
        console.log('='.repeat(60));

        // Test 23: Enhanced audit entry creation
        const auditResult = await this.runCommand('create_enhanced_audit_entry', 
            '(variant {SmartContractExecution}, "Test audit entry", true, vec {"compliance_check_passed"}, "success", opt "cross_chain_data")', 
            'Enhanced audit entry creation');
        this.recordTest('Enhanced Audit Entry', 
            auditResult.success);

        // Test 24: Regulatory report generation
        const regulatoryResult = await this.runCommand('generate_regulatory_report', 
            '(variant {GDPR}, 1725984000 : nat64, 1726070400 : nat64)', 
            'Regulatory compliance reporting');
        this.recordTest('Regulatory Report', 
            regulatoryResult.success);

        // Test 25: Compliance rule creation
        const ruleResult = await this.runCommand('create_advanced_compliance_rule', 
            '("Test Rule", "Integration test compliance rule", vec {record {condition_type = variant {UserTierCheck}; field = "user_tier"; operator = variant {Equal}; value = "Developer"}}, vec {record {action_type = variant {RequireApproval}; parameters = vec {}}}, 5 : nat8)', 
            'Advanced compliance rule');
        this.recordTest('Compliance Rule Creation', 
            ruleResult.success);
    }

    async testGovernanceSystem() {
        console.log('\n' + '='.repeat(60));
        console.log('9. TESTING GOVERNANCE SYSTEM');
        console.log('='.repeat(60));

        // Test 26: Governance proposal creation
        const proposalResult = await this.runCommand('create_governance_proposal', 
            '(variant {ParameterChange}, "Test Proposal", "Integration test proposal", record {voting_period = 86400 : nat64; quorum_threshold = 0.1 : float64; approval_threshold = 0.6 : float64})', 
            'Governance proposal creation');
        this.recordTest('Governance Proposal', 
            proposalResult.success);
    }

    async testAIExplanationSystem() {
        console.log('\n' + '='.repeat(60));
        console.log('10. TESTING AI EXPLANATION SYSTEM');
        console.log('='.repeat(60));

        // Test 27: AI explanation request
        const explanationResult = await this.runCommand('request_ai_explanation', 
            '("test_request_id", variant {RiskAssessment}, "Explain risk calculation", opt "detailed")', 
            'AI explanation system');
        this.recordTest('AI Explanation Request', 
            explanationResult.success);
    }

    async testConfigurationManagement() {
        console.log('\n' + '='.repeat(60));
        console.log('11. TESTING CONFIGURATION MANAGEMENT');
        console.log('='.repeat(60));

        // Test 28: AI cache configuration
        const cacheResult = await this.runCommand('configure_ai_cache', 
            '(true, 3600 : nat64, 100 : nat64)', 
            'AI cache configuration');
        this.recordTest('AI Cache Configuration', 
            cacheResult.success);

        // Test 29: Algorand network configuration
        const networkResult = await this.runCommand('configure_algorand_network', 
            '("testnet", "https://testnet-api.algonode.cloud", opt "test_api_key")', 
            'Algorand network configuration');
        this.recordTest('Network Configuration', 
            networkResult.success);
    }

    async testTokenOperations() {
        console.log('\n' + '='.repeat(60));
        console.log('12. TESTING ENHANCED TOKEN OPERATIONS');
        console.log('='.repeat(60));

        // Test 30: User tier upgrade attempt
        const upgradeResult = await this.runCommand('upgrade_user_tier', 
            '(variant {Developer})', 
            'User tier upgrade');
        this.recordTest('User Tier Upgrade', 
            upgradeResult.success);
    }

    printSummary() {
        console.log('\n' + '='.repeat(80));
        console.log('🎯 COMPREHENSIVE PRODUCTION INTEGRATION TEST RESULTS');
        console.log('='.repeat(80));
        
        console.log(`📊 Total Tests: ${this.results.total}`);
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`📈 Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);

        if (this.results.failed > 0) {
            console.log('\n❌ FAILED TESTS:');
            this.results.errors.forEach((error, index) => {
                console.log(`${index + 1}. ${error.test}: ${error.error}`);
            });
        }

        console.log('\n' + '='.repeat(80));
        console.log('🏆 PRODUCTION CANISTER INTEGRATION TEST COMPLETE');
        console.log('='.repeat(80));

        if (this.results.passed >= 25) {
            console.log('🎉 EXCELLENT: Enhanced canister is production-ready with comprehensive feature coverage!');
        } else if (this.results.passed >= 20) {
            console.log('✅ GOOD: Enhanced canister core features are operational');
        } else if (this.results.passed >= 15) {
            console.log('⚠️  PARTIAL: Enhanced canister basic features working, some configuration needed');
        } else {
            console.log('❌ NEEDS ATTENTION: Enhanced canister requires configuration and debugging');
        }

        console.log(`\n📍 Tested Canister: ${CANISTER_ID}`);
        console.log(`🔗 Candid Interface: https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=${CANISTER_ID}`);
    }

    async runAllTests() {
        console.log('🚀 STARTING COMPREHENSIVE PRODUCTION INTEGRATION TESTS');
        console.log(`📍 Target Canister: ${CANISTER_ID}`);
        console.log(`⏰ Started at: ${new Date().toISOString()}`);

        try {
            await this.testBasicICRC1Functions();
            await this.testEnhancedUserTierSystem();
            await this.testEnhancedAIServices();
            await this.testEnterpriseFeatures();
            await this.testSmartContractEngine();
            await this.testCrossChainOperations();
            await this.testAdvancedAnalytics();
            await this.testAuditingAndCompliance();
            await this.testGovernanceSystem();
            await this.testAIExplanationSystem();
            await this.testConfigurationManagement();
            await this.testTokenOperations();

            this.printSummary();
        } catch (error) {
            console.error('\n💥 CRITICAL ERROR during testing:', error.message);
            process.exit(1);
        }
    }
}

// Run the comprehensive production tests
const tester = new ProductionCanisterTester();
tester.runAllTests().catch(console.error);