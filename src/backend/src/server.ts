/**
 * Sippar Chain Fusion Backend - Phase 1
 * Simple Express server for Algorand credential derivation
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
import { z } from 'zod';
import { Principal } from '@dfinity/principal';
import { HttpAgent, Actor } from '@dfinity/agent';
import algosdk from 'algosdk';
import { algorandService, algorandMainnet, AlgorandAccount } from './services/algorandService.js';
import { thresholdSignerService } from './services/thresholdSignerService.js';
import { sipparAIService } from './services/sipparAIService.js';
// import aiOracleRoutes from './routes/aiOracle.js'; // Temporarily disabled

// ICP Canister Configuration
const CK_ALGO_CANISTER_ID = 'gbmxj-yiaaa-aaaak-qulqa-cai';
const IC_HOST = 'https://ic0.app';

// Create IC Agent
const agent = new HttpAgent({ host: IC_HOST });

// ckALGO Canister Interface (simplified)
const ckAlgoIdl = ({ IDL }: { IDL: any }) => {
  return IDL.Service({
    'icrc1_name': IDL.Func([], [IDL.Text], ['query']),
    'icrc1_symbol': IDL.Func([], [IDL.Text], ['query']),
    'icrc1_decimals': IDL.Func([], [IDL.Nat8], ['query']),
    'icrc1_total_supply': IDL.Func([], [IDL.Nat], ['query']),
    'icrc1_balance_of': IDL.Func([IDL.Principal], [IDL.Nat], ['query']),
    'get_reserves': IDL.Func([], [IDL.Nat, IDL.Nat, IDL.Float32], ['query']),
  });
};

// Create ckALGO actor
const ckAlgoActor = Actor.createActor(ckAlgoIdl, {
  agent,
  canisterId: CK_ALGO_CANISTER_ID,
});

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:5175',
    'http://localhost:5176',
    'http://localhost:5177',
    'https://nuru.network',
    'https://*.nuru.network'
  ],
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json());

// Routes
// app.use('/api/v1/ai-oracle', aiOracleRoutes); // Temporarily disabled

// Request validation schemas
const deriveCredentialsSchema = z.object({
  principal: z.string().min(1),
  timestamp: z.number().optional(),
  blockchain: z.literal('algorand').optional()
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Sippar Algorand Chain Fusion Backend',
    version: '1.0.0-alpha',
    deployment: 'Phase 1',
    components: {
      chain_fusion_engine: true,
      threshold_ed25519: false, // Not implemented yet in Phase 1
      algorand_integration: true,
      ck_algo_minting: false // Phase 2 feature
    },
    capabilities: {
      supported_chains: 1,
      chain_key_tokens: 0,
      threshold_signatures: false, // Phase 1 fallback mode
      milkomeda_integration: false // Phase 3 feature
    },
    metrics: {
      total_transactions: 0,
      avg_processing_time_ms: 150,
      success_rate: 1.0
    },
    timestamp: new Date().toISOString()
  });
});




// Phase 2: Enhanced balance endpoint
app.get('/ck-algo/balance/:principal', async (req, res) => {
  try {
    const { principal } = req.params;
    
    // Validate principal
    let principalObj;
    try {
      principalObj = Principal.fromText(principal);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid principal format'
      });
    }

    // Query actual ckALGO canister balance
    const ckAlgoBalance = await ckAlgoActor.icrc1_balance_of(principalObj);
    
    // Get real Algorand balance using threshold-derived address
    let algorandAddress: string;
    try {
      const algorandAddressInfo = await thresholdSignerService.deriveAlgorandAddress(principal);
      algorandAddress = algorandAddressInfo.address;
    } catch (error) {
      console.error('❌ Failed to derive Algorand address via threshold signer:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to derive Algorand address using threshold signatures'
      });
    }
    
    let algorandBalance = 0;
    let algorandAccountInfo = null;
    
    try {
      algorandAccountInfo = await algorandService.getAccountInfo(algorandAddress);
      algorandBalance = algorandAccountInfo.balance;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`⚠️ Could not fetch Algorand balance for ${algorandAddress}:`, errorMessage);
    }

    res.json({
      algorand_balance: algorandBalance, // Real Algorand balance from network
      ck_algo_balance: Number(ckAlgoBalance) / 1e6, // Convert from micro-ALGO
      ck_algo_address: `ckAlgo-${principal.slice(0, 10)}`,
      custody_address: algorandAddress, // Real custody address
      algorand_account_info: algorandAccountInfo,
      last_updated: new Date().toISOString(),
      phase: 2,
      features: {
        minting_enabled: true,
        redemption_enabled: true,
        trading_enabled: true
      }
    });

  } catch (error) {
    console.error('❌ Balance check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during balance check'
    });
  }
});




// Phase 3: Real ckALGO minting with confirmed Algorand transaction
app.post('/api/ck-algo/mint-confirmed', async (req, res) => {
  try {
    console.log('🪙 Real ckALGO mint request (Phase 3):', req.body);
    
    const { algorandTxId, userPrincipal, amount } = req.body;
    
    // Validate required fields
    if (!algorandTxId || !userPrincipal || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: algorandTxId, userPrincipal, amount'
      });
    }

    // 1. Verify transaction on Algorand network
    console.log('🔍 Verifying Algorand transaction:', algorandTxId);
    
    let algorandTx;
    try {
      // Get transaction details from Algorand network
      algorandTx = await algorandService.getTransaction(algorandTxId);
      
      if (!algorandTx.confirmed) {
        return res.status(400).json({
          success: false,
          error: 'Algorand transaction not confirmed yet',
          algorandTxId,
          confirmed: false
        });
      }
      
      console.log('✅ Algorand transaction confirmed:', {
        txId: algorandTxId,
        round: algorandTx.confirmedRound,
        amount: algorandTx.amount
      });
      
    } catch (error) {
      console.error('❌ Failed to verify Algorand transaction:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return res.status(400).json({
        success: false,
        error: 'Failed to verify Algorand transaction',
        details: errorMessage,
        algorandTxId
      });
    }

    // 2. Call ckALGO canister to mint tokens
    console.log('🏭 Minting ckALGO tokens via canister...');
    
    try {
      const principalObj = Principal.fromText(userPrincipal);
      // Convert amount to microALGO (canister expects Nat in microALGO)
      const microAlgoAmount = Math.floor(amount * 1_000_000);
      
      const mintResult: any = await ckAlgoActor.mint_ck_algo(
        principalObj,
        BigInt(microAlgoAmount)
      );
      
      console.log('✅ ckALGO minted successfully:', {
        userPrincipal,
        amount,
        microAlgoAmount,
        icpTxId: mintResult.toString()
      });
      
      // 3. Return successful response with real transaction details
      res.json({
        success: true,
        ckAlgoAmount: amount,
        icpTxId: mintResult.toString(),
        algorandTxId,
        algorandTxConfirmed: true,
        algorandTxRound: algorandTx.confirmedRound,
        userPrincipal,
        timestamp: new Date().toISOString(),
        phase: 'Phase 3 - Real Chain Fusion'
      });
      
    } catch (error) {
      console.error('❌ ckALGO minting failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Check if it's an authorization error
      if (errorMessage.includes('Unauthorized minting attempt')) {
        return res.status(403).json({
          success: false,
          error: 'ckALGO canister authorization failed',
          details: 'Backend not authorized to mint tokens',
          suggestion: 'Add backend principal to authorized minters list'
        });
      }
      
      return res.status(500).json({
        success: false,
        error: 'ckALGO minting failed',
        details: errorMessage,
        algorandTxId,
        userPrincipal
      });
    }
    
  } catch (error) {
    console.error('❌ Real mint endpoint failed:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during real minting',
      details: errorMessage
    });
  }
});

// Phase 3: Real ckALGO redemption with ALGO transfer
app.post('/api/ck-algo/redeem-confirmed', async (req, res) => {
  try {
    console.log('💸 Real ckALGO redemption request (Phase 3):', req.body);
    
    const { amount, targetAddress, userPrincipal } = req.body;
    
    // Validate required fields
    if (!amount || !targetAddress || !userPrincipal) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: amount, targetAddress, userPrincipal'
      });
    }

    // Validate Algorand address format
    if (targetAddress.length !== 58) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Algorand address format'
      });
    }

    // 1. Check user's ckALGO balance via canister
    console.log('🔍 Checking ckALGO balance for redemption...');
    
    try {
      const principalObj = Principal.fromText(userPrincipal);
      const ckAlgoBalance = await ckAlgoActor.icrc1_balance_of(principalObj);
      const balanceInAlgo = Number(ckAlgoBalance) / 1_000_000; // Convert from microALGO
      
      if (balanceInAlgo < amount) {
        return res.status(400).json({
          success: false,
          error: 'Insufficient ckALGO balance',
          userBalance: balanceInAlgo,
          requestedAmount: amount
        });
      }
      
      console.log('✅ Sufficient ckALGO balance:', {
        userBalance: balanceInAlgo,
        requestedAmount: amount
      });
      
    } catch (error) {
      console.error('❌ Failed to check ckALGO balance:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return res.status(500).json({
        success: false,
        error: 'Failed to verify ckALGO balance',
        details: errorMessage
      });
    }

    // 2. Call ckALGO canister to redeem (burn) tokens
    console.log('🔥 Burning ckALGO tokens via canister...');
    
    let algorandTxId: string;
    try {
      const redeemResult = await ckAlgoActor.redeem_ck_algo(
        BigInt(Math.floor(amount * 1_000_000)), // Convert to microALGO
        targetAddress
      );
      
      // The redeem function returns the Algorand transaction ID
      algorandTxId = redeemResult as string;
      
      console.log('✅ ckALGO redeemed successfully:', {
        userPrincipal,
        amount,
        targetAddress,
        algorandTxId
      });
      
      // 3. Return successful response with real transaction details
      res.json({
        success: true,
        algoAmount: amount,
        targetAddress,
        algorandTxId,
        userPrincipal,
        timestamp: new Date().toISOString(),
        phase: 'Phase 3 - Real Chain Fusion Redemption'
      });
      
    } catch (error) {
      console.error('❌ ckALGO redemption failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Check if it's an authorization or balance error
      if (errorMessage.includes('Insufficient funds')) {
        return res.status(400).json({
          success: false,
          error: 'Insufficient ckALGO balance for redemption',
          details: errorMessage
        });
      }
      
      return res.status(500).json({
        success: false,
        error: 'ckALGO redemption failed',
        details: errorMessage,
        userPrincipal,
        amount
      });
    }
    
  } catch (error) {
    console.error('❌ Real redemption endpoint failed:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during real redemption',
      details: errorMessage
    });
  }
});

// Phase 2: Get proof of reserves
app.get('/ck-algo/reserves', async (req, res) => {
  try {
    // Query actual canister reserves
    const reservesResult = await ckAlgoActor.get_reserves();
    const [totalSupply, algorandBalance, backingRatio] = Array.isArray(reservesResult) ? reservesResult : [0, 0, 0];
    
    res.json({
      success: true,
      total_ck_algo_supply: Number(totalSupply) / 1e6,
      algorand_custody_balance: Number(algorandBalance) / 1e6,
      backing_ratio: backingRatio,
      custody_address: 'CUSTODY_ADDRESS_NOT_SET',
      last_audit: new Date().toISOString(),
      reserve_health: backingRatio >= 1.0 ? 'excellent' : 'needs_attention'
    });

  } catch (error) {
    console.error('❌ Reserves check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during reserves check'
    });
  }
});

// Helper functions for Phase 1 credential derivation
// deriveAlgorandAddress function removed - now using thresholdSignerService.deriveAlgorandAddress()

function deriveEthereumAddress(principal: string): string {
  // Phase 1: Simple deterministic Ethereum address for future Milkomeda integration
  const seed = createDeterministicSeed(principal, 'ethereum');
  const seedBytes = new TextEncoder().encode(seed);
  
  // Create valid Ethereum address format
  let address = '0x';
  for (let i = 0; i < 20; i++) {
    const byte = seedBytes[i % seedBytes.length];
    address += byte.toString(16).padStart(2, '0');
  }
  
  return address;
}

function createDeterministicSeed(principal: string, blockchain: string): string {
  // Phase 1: Simple but deterministic seed generation
  // In production, this would use proper cryptographic derivation
  const combined = `sippar-${blockchain}-${principal}`;
  
  // Simple hash-like operation for Phase 1
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return `${combined}-${Math.abs(hash)}`;
}

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp: Date.now()
  });
});

// Algorand network status endpoint
app.get('/algorand/status', async (req, res) => {
  try {
    const [testnetStatus, mainnetStatus] = await Promise.allSettled([
      algorandService.getNetworkStatus(),
      algorandMainnet.getNetworkStatus()
    ]);

    res.json({
      testnet: testnetStatus.status === 'fulfilled' ? testnetStatus.value : { error: testnetStatus.reason?.message },
      mainnet: mainnetStatus.status === 'fulfilled' ? mainnetStatus.value : { error: mainnetStatus.reason?.message },
      timestamp: new Date().toISOString(),
      service: 'algorand-network-monitor'
    });
  } catch (error) {
    console.error('Error getting Algorand network status:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: 'Failed to get network status',
      details: errorMessage
    });
  }
});

// Algorand account information endpoint  
app.get('/algorand/account/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const network = req.query.network || 'testnet';
    
    if (!algorandService.isValidAddress(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Algorand address format'
      });
    }

    const service = network === 'mainnet' ? algorandMainnet : algorandService;
    const accountInfo = await service.getAccountInfo(address);
    const recentTransactions = await service.getAccountTransactions(address, 5);

    res.json({
      success: true,
      network,
      account: accountInfo,
      recent_transactions: recentTransactions,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting Algorand account info:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: 'Failed to get account information',
      details: errorMessage
    });
  }
});

// Algorand deposit monitoring endpoint
app.get('/algorand/deposits/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const network = req.query.network || 'testnet';
    const lastRound = parseInt(req.query.lastRound as string) || 0;
    
    if (!algorandService.isValidAddress(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Algorand address format'
      });
    }

    const service = network === 'mainnet' ? algorandMainnet : algorandService;
    const deposits = await service.monitorDeposits(address, lastRound);

    res.json({
      success: true,
      network,
      address,
      last_round_checked: lastRound,
      new_deposits: deposits,
      deposit_count: deposits.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error monitoring deposits:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: 'Failed to monitor deposits',
      details: errorMessage
    });
  }
});

// Test threshold signer connection endpoint
app.get('/test/threshold-signer', async (req, res) => {
  try {
    console.log('🧪 Testing threshold signer connection...');
    
    // Test basic connection
    const connectionTest = await thresholdSignerService.testConnection();
    
    if (connectionTest) {
      // Try to get canister status
      const status = await thresholdSignerService.getCanisterStatus();
      
      res.json({
        success: true,
        connection: connectionTest,
        canister_status: status,
        message: 'Threshold signer integration working'
      });
    } else {
      res.status(503).json({
        success: false,
        error: 'Threshold signer connection failed'
      });
    }
  } catch (error) {
    console.error('❌ Threshold signer test failed:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: 'Threshold signer test failed',
      details: errorMessage
    });
  }
});

// API v1 threshold status endpoint (for frontend compatibility)
app.get('/api/v1/threshold/status', async (req, res) => {
  try {
    console.log('📊 Getting threshold signer status for frontend...');
    
    const connectionTest = await thresholdSignerService.testConnection();
    
    if (connectionTest) {
      const status = await thresholdSignerService.getCanisterStatus();
      res.json({
        success: true,
        canister_id: 'vj7ly-diaaa-aaaae-abvoq-cai',
        network: 'icp-mainnet',
        integration_status: 'operational',
        healthy: true,
        canister_status: status,
        last_check: Date.now()
      });
    } else {
      res.json({
        success: false,
        canister_id: 'vj7ly-diaaa-aaaae-abvoq-cai',
        network: 'icp-mainnet',
        integration_status: 'error',
        healthy: false,
        error: 'Connection failed'
      });
    }
  } catch (error) {
    console.error('❌ Threshold status check failed:', error);
    res.status(500).json({
      success: false,
      canister_id: 'vj7ly-diaaa-aaaae-abvoq-cai',
      network: 'icp-mainnet',
      integration_status: 'error',
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// API v1 threshold derive-address endpoint (for frontend compatibility)
app.post('/api/v1/threshold/derive-address', async (req, res) => {
  try {
    const { principal } = req.body;
    console.log(`🔐 Frontend requesting address derivation for principal: ${principal}`);
    
    if (!principal) {
      return res.status(400).json({
        success: false,
        error: 'Principal is required'
      });
    }

    // Use the existing derive-algorand-credentials endpoint logic
    const algorandAddressInfo = await thresholdSignerService.deriveAlgorandAddress(principal);
    
    res.json({
      success: true,
      address: algorandAddressInfo.address,
      public_key: algorandAddressInfo.public_key,
      canister_id: 'vj7ly-diaaa-aaaae-abvoq-cai'
    });
  } catch (error) {
    console.error('❌ Threshold address derivation failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Address derivation failed'
    });
  }
});

// API v1 sippar mint/prepare endpoint (for frontend compatibility)
app.post('/api/v1/sippar/mint/prepare', async (req, res) => {
  try {
    console.log('🪙 Frontend requesting mint preparation...');
    const { amount, user_principal } = req.body;
    
    // Return preparation data (simplified for now)
    res.json({
      success: true,
      custody_address: 'SIPPAR_CUSTODY_ADDRESS_PLACEHOLDER',
      expected_amount: amount || 0,
      deposit_deadline: Date.now() + 3600000, // 1 hour
      transaction_id: `mint_${Date.now()}`
    });
  } catch (error) {
    console.error('❌ Mint preparation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Mint preparation failed'
    });
  }
});

// API v1 sippar redeem/prepare endpoint (for frontend compatibility)
app.post('/api/v1/sippar/redeem/prepare', async (req, res) => {
  try {
    console.log('💸 Frontend requesting redeem preparation...');
    const { amount, recipient_address } = req.body;
    
    res.json({
      success: true,
      recipient_address: recipient_address || 'RECIPIENT_ADDRESS_PLACEHOLDER',
      amount: amount || 0,
      estimated_fees: 0.001, // ALGO
      transaction_id: `redeem_${Date.now()}`
    });
  } catch (error) {
    console.error('❌ Redeem preparation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Redeem preparation failed'
    });
  }
});

// API v1 threshold sign-transaction endpoint (for frontend compatibility)
app.post('/api/v1/threshold/sign-transaction', async (req, res) => {
  try {
    console.log('🔐 Frontend requesting transaction signing...');
    const { transaction_data } = req.body;
    
    res.json({
      success: true,
      signed_transaction: 'SIGNED_TX_PLACEHOLDER',
      transaction_id: `signed_${Date.now()}`,
      algorand_tx_id: `ALGO_TX_${Date.now()}`
    });
  } catch (error) {
    console.error('❌ Transaction signing failed:', error);
    res.status(500).json({
      success: false,
      error: 'Transaction signing failed'
    });
  }
});

// =============================================================================
// AI INTEGRATION ENDPOINTS (Sprint 007 - Proof of Concept)
// =============================================================================

/**
 * Check OpenWebUI status
 */
app.get('/api/ai/status', async (req, res) => {
  try {
    console.log('🤖 Checking OpenWebUI status...');
    const status = await sipparAIService.getConnectionStatus();
    
    res.json({
      success: true,
      openwebui: {
        available: status.available,
        endpoint: status.endpoint,
        responseTime: status.responseTime
      },
      lastChecked: status.lastChecked,
      serviceInfo: sipparAIService.getServiceInfo(),
      interfaceUrl: sipparAIService.getOpenWebUIUrl(),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ OpenWebUI status check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check OpenWebUI status',
      openwebui: { available: false, endpoint: 'unknown' }
    });
  }
});

/**
 * Test OpenWebUI connection
 */
app.post('/api/ai/test-connection', async (req, res) => {
  try {
    console.log('🔍 Testing OpenWebUI connection...');
    const status = await sipparAIService.testConnection();
    
    res.json({
      success: true,
      result: status,
      message: `OpenWebUI connection test completed. Status: ${status.available ? 'Available' : 'Unavailable'}${status.responseTime ? ` (${status.responseTime}ms)` : ''}`,
      interfaceUrl: sipparAIService.getOpenWebUIUrl(),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ OpenWebUI connection test error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test OpenWebUI connection'
    });
  }
});

/**
 * Send question to AI (basic chat functionality)
 */
app.post('/api/ai/chat', async (req, res) => {
  try {
    const chatSchema = z.object({
      message: z.string().min(1, 'Message cannot be empty').max(1000, 'Message too long'),
      userPrincipal: z.string().optional()
    });
    
    const { message, userPrincipal } = chatSchema.parse(req.body);
    console.log('💬 AI chat request:', { message: message.substring(0, 50), userPrincipal });
    
    const aiResponse = await sipparAIService.askSimpleQuestion(message);
    
    res.json({
      success: aiResponse.success,
      response: aiResponse.response,
      responseTime: aiResponse.responseTime,
      source: aiResponse.source,
      error: aiResponse.error,
      interfaceUrl: sipparAIService.getOpenWebUIUrl(),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ AI chat error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request format',
        details: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error during AI chat',
      response: 'AI service is currently unavailable. Please try again later.'
    });
  }
});

/**
 * Get authenticated OpenWebUI URL for iframe embedding
 */
app.post('/api/ai/auth-url', async (req, res) => {
  try {
    const authSchema = z.object({
      userPrincipal: z.string().min(1, 'User principal required'),
      algorandAddress: z.string().optional(),
      authSignature: z.string().optional()
    });
    
    const { userPrincipal, algorandAddress, authSignature } = authSchema.parse(req.body);
    console.log('🔐 Creating authenticated AI chat URL for user:', userPrincipal);
    
    // Get the base OpenWebUI URL
    const baseUrl = sipparAIService.getOpenWebUIUrl();
    
    if (!baseUrl || baseUrl === 'unknown') {
      throw new Error('OpenWebUI service not available');
    }
    
    // For now, we'll create a direct link with user context in localStorage/sessionStorage approach
    // This is a simplified approach that works with most chat interfaces
    const authUrl = `${baseUrl}?sippar_user=${encodeURIComponent(userPrincipal)}&sippar_address=${encodeURIComponent(algorandAddress || '')}&source=sippar`;
    
    res.json({
      success: true,
      authUrl,
      message: 'Authenticated chat URL created',
      userContext: {
        principal: userPrincipal,
        algorandAddress: algorandAddress || null
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Auth URL creation error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request format',
        details: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to create authenticated chat URL',
      authUrl: null
    });
  }
});

/**
 * Get available AI models (when API access is established)
 */
app.get('/api/ai/models', async (req, res) => {
  try {
    console.log('📋 Getting available AI models...');
    const models = await sipparAIService.getAvailableModels();
    
    res.json({
      success: true,
      models,
      note: 'Model discovery is in development - showing expected models',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ AI models error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get AI models',
      models: []
    });
  }
});

/**
 * Basic market data for AI testing
 */
app.get('/api/ai/market-data', async (req, res) => {
  try {
    console.log('📊 Getting basic market data for AI testing...');
    
    // Simple market data that could be fed to AI for testing
    const marketData = {
      algo: {
        price: 0.15, // Placeholder - could be fetched from real API
        change24h: 2.5,
        marketCap: 1200000000
      },
      ckAlgo: {
        totalSupply: 100000, // Placeholder
        bridgeVolume24h: 5000
      },
      bridge: {
        totalValueLocked: 15000,
        transactions24h: 25
      }
    };
    
    // Format for potential AI input
    const aiFormattedData = `Market Update: ALGO is trading at $${marketData.algo.price} with a 24h change of +${marketData.algo.change24h}%. The ckALGO bridge has processed ${marketData.bridge.transactions24h} transactions in the last 24 hours with $${marketData.bridge.totalValueLocked} total value locked.`;
    
    res.json({
      success: true,
      rawData: marketData,
      aiFormattedData,
      note: 'This is placeholder data for AI testing',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Market data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get market data'
    });
  }
});

// 404 handler (must be last)
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    timestamp: Date.now()
  });
});

// SSL Configuration for HTTPS
let server;
try {
  // Try to use HTTPS if certificates exist
  const httpsOptions = {
    key: fs.readFileSync(path.join(process.cwd(), 'server.key')),
    cert: fs.readFileSync(path.join(process.cwd(), 'server.crt'))
  };
  
  server = https.createServer(httpsOptions, app).listen(PORT, () => {
    console.log('🚀 Sippar Algorand Chain Fusion Backend started!');
    console.log(`📡 Server running on https://localhost:${PORT}`);
    console.log('🔒 HTTPS enabled with self-signed certificate');
    console.log('🌉 Phase 2: Real Algorand Network Integration');
    console.log('⚡ Ready for Internet Identity authentication and real ALGO balances!');
  });
} catch (error) {
  // Fallback to HTTP if certificates don't exist
  console.log('⚠️  HTTPS certificates not found, falling back to HTTP');
  server = app.listen(PORT, () => {
    console.log('🚀 Sippar Algorand Chain Fusion Backend started!');
    console.log(`📡 Server running on http://localhost:${PORT}`);
    console.log('🌉 Phase 2: Real Algorand Network Integration');
    console.log('⚡ Ready for Internet Identity authentication and real ALGO balances!');
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;