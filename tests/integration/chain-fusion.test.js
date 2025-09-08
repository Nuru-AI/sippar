// Chain Fusion Integration Tests
// Tests the real ICP-Algorand chain fusion functionality

const chai = require('chai');
const chaiHttp = require('chai-http');
const { expect } = chai;

chai.use(chaiHttp);

const BASE_URL = process.env.SIPPAR_API_URL || 'https://nuru.network/api/sippar';
const TEST_PRINCIPAL = 'vj7ly-diaaa-aaaae-abvoq-cai';
const TEST_DESTINATION = 'GD64YIY3TWGDMCNPP553DZPPR6LDUSFQOIJVFDPPXWEG3FVOJCCDBBHU5A';

describe('Chain Fusion Integration Tests', function() {
  // Increase timeout for blockchain operations
  this.timeout(30000);
  
  let initialBalance;
  let custodyAddress;
  
  before(async function() {
    // Get initial balance for comparison
    const balanceResponse = await chai
      .request(BASE_URL)
      .get('/balance-monitor/AC4ZYO4CYWNEWATOZETFXJHDE3GRM7CSPDSZHZADZU7HGJKPKV7JBQLHDM');
    
    expect(balanceResponse).to.have.status(200);
    expect(balanceResponse.body.success).to.be.true;
    initialBalance = balanceResponse.body.balance_algo;
    custodyAddress = balanceResponse.body.address;
  });
  
  describe('Health Check', function() {
    it('should return healthy status', async function() {
      const response = await chai
        .request(BASE_URL)
        .get('/health');
        
      expect(response).to.have.status(200);
      expect(response.body.status).to.equal('healthy');
      expect(response.body.deployment).to.equal('Phase 3 - Threshold Signatures');
      expect(response.body.canister_info.canister_id).to.equal('vj7ly-diaaa-aaaae-abvoq-cai');
    });
  });
  
  describe('Monitoring Endpoints', function() {
    it('should return metrics data', async function() {
      const response = await chai
        .request(BASE_URL)
        .get('/metrics');
        
      expect(response).to.have.status(200);
      expect(response.body.service).to.equal('Sippar Chain Fusion Metrics');
      expect(response.body.operations).to.be.an('object');
      expect(response.body.performance).to.be.an('object');
      expect(response.body.system).to.be.an('object');
    });
    
    it('should monitor balance correctly', async function() {
      const response = await chai
        .request(BASE_URL)
        .get(`/balance-monitor/${custodyAddress}`);
        
      expect(response).to.have.status(200);
      expect(response.body.success).to.be.true;
      expect(response.body.address).to.equal(custodyAddress);
      expect(response.body.balance_algo).to.be.a('number');
    });
  });
  
  describe('Safety Controls', function() {
    it('should reject amounts above maximum limit', async function() {
      const response = await chai
        .request(BASE_URL)
        .post('/chain-fusion/transfer-algo')
        .send({
          principal: TEST_PRINCIPAL,
          toAddress: TEST_DESTINATION,
          amount: 10.0, // Above 5 ALGO limit
          note: 'Safety test - should fail'
        });
        
      expect(response).to.have.status(400);
      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('Maximum transfer amount');
    });
    
    it('should reject amounts below minimum limit', async function() {
      const response = await chai
        .request(BASE_URL)
        .post('/chain-fusion/transfer-algo')
        .send({
          principal: TEST_PRINCIPAL,
          toAddress: TEST_DESTINATION,
          amount: 0.0001, // Below 0.001 ALGO limit
          note: 'Safety test - should fail'
        });
        
      expect(response).to.have.status(400);
      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('Minimum transfer amount');
    });
  });
  
  describe('Real Chain Fusion', function() {
    it('should execute successful ALGO transfer', async function() {
      const response = await chai
        .request(BASE_URL)
        .post('/chain-fusion/transfer-algo')
        .send({
          principal: TEST_PRINCIPAL,
          toAddress: TEST_DESTINATION,
          amount: 0.001,
          note: 'Integration test transfer'
        });
        
      expect(response).to.have.status(200);
      expect(response.body.success).to.be.true;
      expect(response.body.chain_fusion_proven).to.be.true;
      expect(response.body.real_transaction).to.be.true;
      expect(response.body.algorand_tx_id).to.be.a('string');
      expect(response.body.confirmed_round).to.be.a('number');
      expect(response.body.threshold_signature_id).to.be.a('string');
      expect(response.body.icp_canister).to.equal('vj7ly-diaaa-aaaae-abvoq-cai');
    });
    
    it('should show balance decrease after transfer', async function() {
      // Wait a moment for network propagation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const response = await chai
        .request(BASE_URL)
        .get(`/balance-monitor/${custodyAddress}`);
        
      expect(response).to.have.status(200);
      expect(response.body.success).to.be.true;
      expect(response.body.balance_algo).to.be.lessThan(initialBalance);
    });
  });
  
  describe('Address Derivation', function() {
    it('should derive consistent addresses', async function() {
      const response1 = await chai
        .request(BASE_URL)
        .post('/api/v1/threshold/derive-address')
        .send({ principal: TEST_PRINCIPAL });
        
      const response2 = await chai
        .request(BASE_URL)
        .post('/api/v1/threshold/derive-address')
        .send({ principal: TEST_PRINCIPAL });
        
      expect(response1).to.have.status(200);
      expect(response2).to.have.status(200);
      expect(response1.body.address).to.equal(response2.body.address);
      expect(response1.body.canister_id).to.equal('vj7ly-diaaa-aaaae-abvoq-cai');
    });
  });
});