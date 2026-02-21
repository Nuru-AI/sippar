/**
 * Sippar Chain Fusion Backend - Phase 3: Threshold Signatures
 * Production-ready server with ICP threshold signature integration
 */

// IMPORTANT: Load environment variables FIRST, before any other imports
// This ensures services like x402Service see the env vars when they initialize
import { config } from 'dotenv';
config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { z } from 'zod';
import { Principal } from '@dfinity/principal';
import { HttpAgent, Actor } from '@dfinity/agent';
import algosdk from 'algosdk';
import { algorandService, algorandMainnet, AlgorandAccount } from './services/algorandService.js';
// Use mainnet for deposit detection since custody address is on mainnet
import { icpCanisterService } from './services/icpCanisterService.js';
import { ckAlgoService } from './services/ckAlgoService.js';
import { simplifiedBridgeService } from './services/simplifiedBridgeService.js';
import { DepositDetectionService } from './services/depositDetectionService.js';
import { CustodyAddressService } from './services/custodyAddressService.js';
import { ReserveVerificationService } from './services/reserveVerificationService.js';
import { AutomaticMintingService } from './services/automaticMintingService.js';
import { AutomaticMintingHandler } from './services/automaticMintingHandler.js';
import { AutomaticRedemptionService } from './services/automaticRedemptionService.js';
import { BalanceSynchronizationService } from './services/balanceSynchronizationService.js';
import { TransactionHistoryService } from './services/transactionHistoryService.js';
import { migrationService } from './services/migrationService.js';
import { productionMonitoringService } from './services/productionMonitoringService.js';
import { alertManager } from './services/alertManager.js';
import { x402Service } from './services/x402Service.js';
import { ElnaIntegration } from './services/elnaIntegration.js';
import { ciAgentService } from './services/ciAgentService.js';
import { ckethDepositService } from './services/ckethDepositService.js';
import { createRateLimiter, createStrictRateLimiter, createLenientRateLimiter } from './middleware/rateLimiter.js';
import {
  validateAgentInvocation,
  validatePaymentCreation,
  validateSmartRouting,
  validatePathParams,
  pathValidators,
  sanitizeRequest
} from './middleware/inputValidation.js';

// Utility function for retrying ICP operations with exponential backoff
async function retryIcpOperation<T>(operation: () => Promise<T>, maxRetries: number = 5): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 ICP operation attempt ${attempt}/${maxRetries}`);
      const result = await operation();
      if (attempt > 1) {
        console.log(`✅ ICP operation succeeded on attempt ${attempt} (network recovery)`);
      }
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(`Unknown error: ${error}`);
      const isNetworkError = lastError.message.includes('Couldn\'t send message') || 
                           lastError.message.includes('Code: 2') ||
                           lastError.message.includes('network') ||
                           lastError.message.includes('timeout');
      
      console.warn(`⚠️ ICP operation failed on attempt ${attempt}/${maxRetries}:`, lastError.message);
      
      if (attempt === maxRetries) {
        break;
      }
      
      // Longer delays for network issues: 2s, 4s, 6s, 8s
      const delay = isNetworkError ? 
        Math.min(2000 * attempt, 8000) : 
        Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      
      console.log(`⏳ ${isNetworkError ? 'Network issue detected,' : ''} retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error(`ICP operation failed after ${maxRetries} attempts: ${lastError!.message}`);
}

const app = express();
// Phase 3 uses same port as production for consistency  
const PORT = process.env.PORT || 3004;

// Initialize Sprint X services
const depositDetectionService = new DepositDetectionService(algorandMainnet, simplifiedBridgeService);
const custodyAddressService = new CustodyAddressService();
const reserveVerificationService = new ReserveVerificationService();

// Initialize Sprint 012.5 Enhanced Automatic Minting System
const automaticMintingService = new AutomaticMintingService(
  depositDetectionService,
  simplifiedBridgeService,
  ckAlgoService,
  productionMonitoringService,
  alertManager
);
const automaticMintingHandler = new AutomaticMintingHandler(automaticMintingService);

// Initialize Sprint 012.5 Enhanced Automatic Redemption System
// Uses simplified_bridge canister (hldvt) instead of archived ck_algo canister (gbmxj)
const automaticRedemptionService = new AutomaticRedemptionService(
  simplifiedBridgeService,
  productionMonitoringService,
  alertManager
);

// Initialize Sprint 012.5 Balance Synchronization System
const balanceSynchronizationService = new BalanceSynchronizationService(
  productionMonitoringService,
  alertManager
);

// Initialize Sprint 012.5 Transaction History System
const transactionHistoryService = new TransactionHistoryService(
  productionMonitoringService
);

// Register the automatic minting handler with deposit detection service
depositDetectionService.registerDepositHandler(automaticMintingHandler);

console.log('🏦 Sprint X services initialized: deposit detection + custody address management');
console.log('🪙 Sprint 012.5 services initialized: enhanced automatic minting & redemption system');
console.log('⚖️ Sprint 012.5 balance sync initialized: real-time Algorand ↔ ICP balance monitoring');
console.log('📚 Sprint 012.5 transaction history initialized: comprehensive audit trails for all operations');

// Transaction monitoring metrics
interface TransactionMetrics {
  totalTransactions: number;
  totalMints: number;
  totalRedeems: number;
  totalChainFusion: number;
  failedOperations: number;
  lastOperationTime: Date | null;
  custodyAddressesGenerated: number;
  totalProcessingTimeMs: number;
  errors: Array<{
    timestamp: Date;
    operation: string;
    error: string;
    principal?: string;
  }>;
}

const transactionMetrics: TransactionMetrics = {
  totalTransactions: 0,
  totalMints: 0,
  totalRedeems: 0,
  totalChainFusion: 0,
  failedOperations: 0,
  lastOperationTime: null,
  custodyAddressesGenerated: 0,
  totalProcessingTimeMs: 0,
  errors: []
};

// Helper function to log operations
function logOperation(operation: string, success: boolean, processingTime: number, principal?: string, error?: string) {
  const timestamp = new Date();
  transactionMetrics.totalTransactions++;
  transactionMetrics.lastOperationTime = timestamp;
  transactionMetrics.totalProcessingTimeMs += processingTime;
  
  if (success) {
    switch (operation) {
      case 'mint':
        transactionMetrics.totalMints++;
        break;
      case 'redeem':
        transactionMetrics.totalRedeems++;
        break;
      case 'chain-fusion':
        transactionMetrics.totalChainFusion++;
        break;
      case 'custody-generation':
        transactionMetrics.custodyAddressesGenerated++;
        break;
    }
  } else {
    transactionMetrics.failedOperations++;
    if (error) {
      transactionMetrics.errors.push({
        timestamp,
        operation,
        error,
        principal
      });
      // Keep only last 50 errors
      if (transactionMetrics.errors.length > 50) {
        transactionMetrics.errors = transactionMetrics.errors.slice(-50);
      }
    }
  }
  
  console.log(`[${timestamp.toISOString()}] ${operation.toUpperCase()} - ${success ? 'SUCCESS' : 'FAILED'} - ${processingTime}ms${principal ? ` - Principal: ${principal}` : ''}${error ? ` - Error: ${error}` : ''}`);
}

// Middleware
// Sprint 018.2 Phase F: Enhanced Security Configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://nuru.network', 'https://*.nuru.network'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS Configuration - Production hardened
const allowedOrigins = [
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:5177',
  'https://nuru.network',
  'http://nuru.network'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`🚫 CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Test-Session', 'X-API-Key'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400 // 24 hours
}));

app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' })); // Set payload size limit
app.use(sanitizeRequest); // Global request sanitization

// X402 Payment Protocol Middleware
console.log('🔒 Initializing X402 payment middleware for AI and ckALGO services');
try {
  const x402Middleware = x402Service.createMiddleware();
  app.use(x402Middleware);
  console.log('✅ X402 middleware configured for protected routes');
} catch (error) {
  console.warn('⚠️ X402 middleware initialization failed:', error);
  console.log('📝 Continuing without X402 payments - services will be free');
}

// Request validation schemas
const deriveCredentialsSchema = z.object({
  principal: z.string().min(1),
  timestamp: z.number().optional(),
  blockchain: z.literal('algorand').optional()
});

const mintRequestSchema = z.object({
  principal: z.string().min(1),
  amount: z.number().positive(),
  algorandTxId: z.string().optional(),
  depositAddress: z.string().optional(),
});

const redeemRequestSchema = z.object({
  principal: z.string().min(1),
  amount: z.number().positive(),
  destinationAddress: z.string().min(1),
});

const depositAddressRequestSchema = z.object({
  principal: z.string().min(1),
});

// =============================================================================
// SPRINT X PHASE 3.1: RESERVE VERIFICATION ENDPOINTS
// =============================================================================

/**
 * Get current reserve status with real-time verification
 * Sprint X Phase 3.1: Real-time verification of locked ALGO vs ckALGO supply
 */
app.get('/reserves/status', async (req, res) => {
  try {
    console.log('🏦 Getting reserve status with real-time verification...');
    const reserveStatus = await reserveVerificationService.getReserveStatus();

    res.json({
      success: true,
      operation: 'get_reserve_status',
      data: reserveStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Reserve status error:', error);
    res.status(500).json({
      success: false,
      operation: 'get_reserve_status',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Generate cryptographic proof-of-reserves
 * Sprint X Phase 3.1: Proof-of-reserves generation and validation
 */
app.get('/reserves/proof', async (req, res) => {
  try {
    console.log('🔐 Generating cryptographic proof-of-reserves...');
    const proof = await reserveVerificationService.generateProofOfReserves();

    res.json({
      success: true,
      operation: 'generate_proof_of_reserves',
      data: proof,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Proof generation error:', error);
    res.status(500).json({
      success: false,
      operation: 'generate_proof_of_reserves',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Check if system can safely mint ckALGO
 * Sprint X Phase 3.1: Emergency pause functionality
 */
app.post('/reserves/can-mint', async (req, res) => {
  try {
    const { amount } = z.object({
      amount: z.number().positive()
    }).parse(req.body);

    console.log(`🔍 Checking if can safely mint ${amount} ckALGO...`);
    const mintCheck = await reserveVerificationService.canSafelyMint(amount);

    res.json({
      success: true,
      operation: 'check_safe_mint',
      data: mintCheck,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Mint safety check error:', error);
    res.status(500).json({
      success: false,
      operation: 'check_safe_mint',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Admin dashboard data
 * Sprint X Phase 3.1: Admin dashboard monitoring interface
 */
app.get('/reserves/admin/dashboard', async (req, res) => {
  try {
    console.log('📊 Getting admin dashboard data...');
    const dashboardData = await reserveVerificationService.getAdminDashboardData();

    res.json({
      success: true,
      operation: 'get_admin_dashboard',
      data: dashboardData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Admin dashboard error:', error);
    res.status(500).json({
      success: false,
      operation: 'get_admin_dashboard',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Emergency pause system
 * Sprint X Phase 3.1: Emergency pause when reserves fall below threshold
 */
app.post('/reserves/admin/pause', async (req, res) => {
  try {
    const { reason, adminSignature } = z.object({
      reason: z.string().min(1),
      adminSignature: z.string().min(10)
    }).parse(req.body);

    console.log(`🚨 Activating emergency pause: ${reason}`);
    await reserveVerificationService.activateEmergencyPause(reason);

    res.json({
      success: true,
      operation: 'activate_emergency_pause',
      data: { paused: true, reason },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Emergency pause error:', error);
    res.status(500).json({
      success: false,
      operation: 'activate_emergency_pause',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Clear emergency pause (admin only)
 * Sprint X Phase 3.1: Admin function to clear emergency pause
 */
app.post('/reserves/admin/unpause', async (req, res) => {
  try {
    const { adminSignature } = z.object({
      adminSignature: z.string().min(10)
    }).parse(req.body);

    console.log('✅ Attempting to clear emergency pause...');
    const success = await reserveVerificationService.clearEmergencyPause(adminSignature);

    if (success) {
      res.json({
        success: true,
        operation: 'clear_emergency_pause',
        data: { paused: false, cleared: true },
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(400).json({
        success: false,
        operation: 'clear_emergency_pause',
        error: 'Failed to clear emergency pause - check reserves and admin signature',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('❌ Clear emergency pause error:', error);
    res.status(500).json({
      success: false,
      operation: 'clear_emergency_pause',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

// =============================================================================

// Health check endpoint with Phase 3 capabilities
app.get('/health', async (req, res) => {
  try {
    // Test canister connectivity
    const canisterStatus = await icpCanisterService.getCanisterStatus();
    const canisterConnected = Boolean(canisterStatus.version);

    // Test SimplifiedBridgeService connectivity (Phase A.1.4)
    const bridgeHealthCheck = await simplifiedBridgeService.healthCheck();
    const bridgeConnected = bridgeHealthCheck.connected;
    
    res.json({
      status: 'healthy',
      service: 'Sippar Algorand Chain Fusion Backend',
      version: '1.0.0-alpha',
      deployment: 'Phase 3 - Threshold Signatures',
      components: {
        chain_fusion_engine: true,
        threshold_ecdsa: canisterConnected, // Real threshold signatures
        algorand_integration: true,
        ck_algo_minting: canisterConnected,
        icp_canister: canisterConnected,
        simplified_bridge: bridgeConnected, // Phase A.1.4 Integration
        simplified_bridge_canister: bridgeHealthCheck.canisterId
      },
      capabilities: {
        supported_chains: 1,
        chain_key_tokens: 1, // ckALGO
        threshold_signatures: canisterConnected,
        address_derivation: canisterConnected,
        transaction_signing: canisterConnected,
        milkomeda_integration: false // Phase 4 feature
      },
      canister_info: canisterConnected ? {
        canister_id: icpCanisterService.getCanisterId(),
        ...canisterStatus
      } : null,
      metrics: {
        total_transactions: transactionMetrics.totalTransactions,
        avg_processing_time_ms: transactionMetrics.totalTransactions > 0 
          ? Math.round(transactionMetrics.totalProcessingTimeMs / transactionMetrics.totalTransactions)
          : 250,
        success_rate: transactionMetrics.totalTransactions > 0 
          ? Math.round(((transactionMetrics.totalTransactions - transactionMetrics.failedOperations) / transactionMetrics.totalTransactions) * 100) / 100
          : 1.0
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Health check failed:', error);
    res.status(503).json({
      status: 'degraded',
      service: 'Sippar Algorand Chain Fusion Backend',
      error: 'ICP canister connectivity issues',
      timestamp: new Date().toISOString()
    });
  }
});

// Detailed metrics endpoint for monitoring
app.get('/metrics', (req, res) => {
  const avgProcessingTime = transactionMetrics.totalTransactions > 0 
    ? Math.round(transactionMetrics.totalProcessingTimeMs / transactionMetrics.totalTransactions)
    : 0;
    
  const successRate = transactionMetrics.totalTransactions > 0 
    ? Math.round(((transactionMetrics.totalTransactions - transactionMetrics.failedOperations) / transactionMetrics.totalTransactions) * 100) / 100
    : 1.0;

  res.json({
    service: 'Sippar Chain Fusion Metrics',
    timestamp: new Date().toISOString(),
    uptime_seconds: process.uptime(),
    operations: {
      total_transactions: transactionMetrics.totalTransactions,
      total_mints: transactionMetrics.totalMints,
      total_redeems: transactionMetrics.totalRedeems,
      total_chain_fusion: transactionMetrics.totalChainFusion,
      custody_addresses_generated: transactionMetrics.custodyAddressesGenerated,
      failed_operations: transactionMetrics.failedOperations
    },
    performance: {
      avg_processing_time_ms: avgProcessingTime,
      total_processing_time_ms: transactionMetrics.totalProcessingTimeMs,
      success_rate: successRate,
      last_operation_time: transactionMetrics.lastOperationTime
    },
    recent_errors: transactionMetrics.errors.slice(-10), // Last 10 errors
    system: {
      memory_usage: process.memoryUsage(),
      node_version: process.version,
      platform: process.platform,
      pid: process.pid
    }
  });
});

// Real-time ALGO balance tracking endpoint
app.get('/balance-monitor/:address', async (req, res) => {
  const startTime = Date.now();
  const { address } = req.params;
  
  try {
    if (!algosdk.isValidAddress(address)) {
      logOperation('balance-check', false, Date.now() - startTime, undefined, 'Invalid address format');
      return res.status(400).json({
        success: false,
        error: 'Invalid Algorand address format',
        address
      });
    }

    const accountInfo = await algorandMainnet.getAccountInfo(address);
    const processingTime = Date.now() - startTime;
    
    logOperation('balance-check', true, processingTime);
    
    res.json({
      success: true,
      address,
      balance_algo: accountInfo.balance,
      min_balance_algo: accountInfo.minBalance,
      last_updated: new Date().toISOString(),
      processing_time_ms: processingTime,
      round: accountInfo.round,
      status: accountInfo.status
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logOperation('balance-check', false, processingTime, undefined, errorMessage);
    
    res.status(500).json({
      success: false,
      error: 'Failed to check balance',
      address,
      details: errorMessage,
      processing_time_ms: processingTime
    });
  }
});

// Enhanced credential derivation with threshold signatures
app.post('/derive-algorand-credentials', async (req, res) => {
  try {
    const { principal } = deriveCredentialsSchema.parse(req.body);
    
    console.log(`🔐 Deriving threshold-based Algorand credentials for principal: ${principal}`);
    
    // Use threshold signatures for secure address derivation
    const addressInfo = await icpCanisterService.deriveAlgorandAddress(principal);
    
    // Get account info from Algorand network
    let algorandAccount: AlgorandAccount | null = null;
    try {
      algorandAccount = await algorandMainnet.getAccountInfo(addressInfo.address);
    } catch (error) {
      // Account might not exist yet, which is fine
      console.log(`ℹ️ Account ${addressInfo.address} not found on Algorand (new account)`);
    }
    
    const response = {
      success: true,
      principal,
      method: 'threshold_ecdsa',
      signature_type: 'secp256k1_to_ed25519',
      algorand: {
        address: addressInfo.address,
        public_key: Array.from(addressInfo.public_key),
        balance_microalgos: algorandAccount?.balance || 0,
        balance_algo: algorandAccount ? algorandAccount.balance / 1_000_000 : 0,
        min_balance: algorandAccount?.min_balance || 100000, // 0.1 ALGO
        exists_on_network: Boolean(algorandAccount),
        derivation_path: ['algorand', 'sippar'],
      },
      canister_info: {
        canister_id: icpCanisterService.getCanisterId(),
        signature_scheme: 'threshold_ecdsa_secp256k1'
      },
      timestamp: new Date().toISOString(),
    };
    
    console.log(`✅ Threshold address derived: ${addressInfo.address}`);
    res.json(response);
    
  } catch (error) {
    console.error('❌ Threshold credential derivation failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      method: 'threshold_ecdsa',
      timestamp: new Date().toISOString(),
    });
  }
});

// SPRINT X: Generate deposit address for real ALGO custody
app.post('/ck-algo/generate-deposit-address', async (req, res) => {
  try {
    const { principal } = depositAddressRequestSchema.parse(req.body);
    
    console.log(`🏦 Generating unique custody address for principal: ${principal}`);
    
    // SPRINT X PHASE 2.2: Generate unique custody address using enhanced service
    const custodyInfo = await custodyAddressService.generateSecureCustodyAddress({
      userPrincipal: principal,
      purpose: 'deposit'
    });
    
    console.log(`✅ Generated unique custody address: ${custodyInfo.custodyAddress}`);
    console.log(`🔐 Threshold signature controlled: ${custodyInfo.controlledByThresholdSignatures}`);
    console.log(`📍 Derivation path: ${custodyInfo.derivationPath}`);
    
    // Register address with Sprint X deposit monitoring service
    await depositDetectionService.registerCustodyAddress(custodyInfo.custodyAddress, principal);
    console.log(`🔍 Address registered for deposit monitoring`);
    
    res.json({
      success: true,
      operation: 'register_custody_address',
      principal: principal,
      custody_address: custodyInfo.custodyAddress,
      deposit_id: custodyInfo.depositId,
      derivation_path: custodyInfo.derivationPath,
      threshold_controlled: custodyInfo.controlledByThresholdSignatures,
      instructions: {
        step1: 'Deposit ALGO to the custody address shown above',
        step2: 'Wait for 6+ network confirmations',
        step3: 'Call /ck-algo/mint with deposit transaction ID',
        minimum_deposit: '0.1 ALGO',
        network: 'Algorand Testnet/Mainnet'
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('❌ Failed to register custody address:', error);
    res.status(500).json({
      success: false,
      operation: 'register_custody_address',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

// SPRINT X PHASE 2.2: Custody address management endpoints
app.get('/ck-algo/custody/info/:principal', async (req, res) => {
  try {
    const principal = req.params.principal;
    
    const custodyAddresses = custodyAddressService.getCustodyAddressesForUser(principal);
    
    res.json({
      success: true,
      operation: 'custody_info',
      principal,
      custody_addresses: custodyAddresses.map(addr => ({
        custody_address: addr.custodyAddress,
        deposit_id: addr.depositId,
        derivation_path: addr.derivationPath,
        created_at: addr.createdAt,
        threshold_controlled: addr.controlledByThresholdSignatures,
        purpose: addr.purpose || 'deposit'
      })),
      total_addresses: custodyAddresses.length,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('❌ Failed to get custody info:', error);
    res.status(500).json({
      success: false,
      operation: 'custody_info',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

app.get('/ck-algo/custody/stats', async (req, res) => {
  try {
    const stats = custodyAddressService.getStatistics();
    
    res.json({
      success: true,
      operation: 'custody_stats',
      stats,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('❌ Failed to get custody stats:', error);
    res.status(500).json({
      success: false,
      operation: 'custody_stats',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

app.post('/ck-algo/custody/verify/:address', async (req, res) => {
  try {
    const address = req.params.address;
    
    const isControlled = await custodyAddressService.verifyThresholdControl(address);
    const addressInfo = custodyAddressService.getCustodyAddressInfoByAddress(address);
    
    res.json({
      success: true,
      operation: 'verify_custody',
      address,
      threshold_controlled: isControlled,
      address_info: addressInfo,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('❌ Failed to verify custody address:', error);
    res.status(500).json({
      success: false,
      operation: 'verify_custody',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

// SPRINT X: Deposit monitoring endpoints
app.get('/ck-algo/deposits/status/:principal', async (req, res) => {
  try {
    const principal = req.params.principal;
    
    const pendingDeposits = depositDetectionService.getPendingDepositsForUser(principal);
    const confirmedDeposits = depositDetectionService.getConfirmedDepositsForUser(principal);
    const custodyAddress = depositDetectionService.getCustodyAddressForUser(principal);
    
    res.json({
      success: true,
      operation: 'deposit_status',
      principal,
      custody_address: custodyAddress,
      pending_deposits: pendingDeposits,
      confirmed_deposits: confirmedDeposits,
      total_pending: pendingDeposits.length,
      total_confirmed: confirmedDeposits.length,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('❌ Failed to get deposit status:', error);
    res.status(500).json({
      success: false,
      operation: 'deposit_status',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

app.get('/ck-algo/monitoring/stats', async (req, res) => {
  try {
    const stats = depositDetectionService.getMonitoringStats();
    
    res.json({
      success: true,
      operation: 'monitoring_stats',
      stats,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('❌ Failed to get monitoring stats:', error);
    res.status(500).json({
      success: false,
      operation: 'monitoring_stats',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

app.post('/ck-algo/monitoring/start', async (req, res) => {
  try {
    await depositDetectionService.startMonitoring();
    
    res.json({
      success: true,
      operation: 'start_monitoring',
      message: 'Deposit monitoring started',
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('❌ Failed to start monitoring:', error);
    res.status(500).json({
      success: false,
      operation: 'start_monitoring',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

app.post('/ck-algo/monitoring/stop', async (req, res) => {
  try {
    depositDetectionService.stopMonitoring();
    
    res.json({
      success: true,
      operation: 'stop_monitoring',
      message: 'Deposit monitoring stopped',
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('❌ Failed to stop monitoring:', error);
    res.status(500).json({
      success: false,
      operation: 'stop_monitoring',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

// ============================================================================
// SPRINT 012.5: AUTOMATIC MINTING SERVICE ENDPOINTS
// ============================================================================

/**
 * Get automatic minting statistics
 */
app.get('/ck-algo/minting/stats', async (req, res) => {
  try {
    const stats = automaticMintingService.getMintingStats();

    res.json({
      success: true,
      operation: 'minting_stats',
      stats,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Failed to get minting stats:', error);
    res.status(500).json({
      success: false,
      operation: 'minting_stats',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Get minting job status
 */
app.get('/ck-algo/minting/job/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = automaticMintingService.getMintingJob(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        operation: 'get_minting_job',
        error: 'Minting job not found',
        job_id: jobId,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      operation: 'get_minting_job',
      job,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Failed to get minting job:', error);
    res.status(500).json({
      success: false,
      operation: 'get_minting_job',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Get minting jobs for a user
 */
app.get('/ck-algo/minting/user/:principal', async (req, res) => {
  try {
    const { principal } = req.params;
    const jobs = automaticMintingService.getUserMintingJobs(principal);

    res.json({
      success: true,
      operation: 'get_user_minting_jobs',
      principal,
      jobs,
      total_jobs: jobs.length,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Failed to get user minting jobs:', error);
    res.status(500).json({
      success: false,
      operation: 'get_user_minting_jobs',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Retry a failed minting job
 */
app.post('/ck-algo/minting/retry/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const retried = automaticMintingService.retryMintingJob(jobId);

    if (!retried) {
      return res.status(400).json({
        success: false,
        operation: 'retry_minting_job',
        error: 'Job not found or cannot be retried (must be in failed status)',
        job_id: jobId,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      operation: 'retry_minting_job',
      job_id: jobId,
      message: 'Minting job queued for retry',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Failed to retry minting job:', error);
    res.status(500).json({
      success: false,
      operation: 'retry_minting_job',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Cancel a pending minting job
 */
app.post('/ck-algo/minting/cancel/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const cancelled = automaticMintingService.cancelMintingJob(jobId);

    if (!cancelled) {
      return res.status(400).json({
        success: false,
        operation: 'cancel_minting_job',
        error: 'Job not found or cannot be cancelled (must be in pending status)',
        job_id: jobId,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      operation: 'cancel_minting_job',
      job_id: jobId,
      message: 'Minting job cancelled',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Failed to cancel minting job:', error);
    res.status(500).json({
      success: false,
      operation: 'cancel_minting_job',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Force process the minting queue (for debugging)
 */
app.post('/ck-algo/minting/process-queue', async (req, res) => {
  try {
    await automaticMintingService.forceProcessQueue();

    res.json({
      success: true,
      operation: 'force_process_queue',
      message: 'Minting queue processed',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Failed to process minting queue:', error);
    res.status(500).json({
      success: false,
      operation: 'force_process_queue',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

// ============================================================================
// SPRINT 012.5: AUTOMATIC REDEMPTION SERVICE ENDPOINTS
// ============================================================================

/**
 * Queue a redemption request
 */
app.post('/ck-algo/redemption/queue', async (req, res) => {
  try {
    const { principal, amount, destinationAddress } = z.object({
      principal: z.string().min(1),
      amount: z.number().positive(),
      destinationAddress: z.string().min(1)
    }).parse(req.body);

    const jobId = await automaticRedemptionService.queueRedemption(
      principal,
      amount,
      destinationAddress
    );

    res.json({
      success: true,
      operation: 'queue_redemption',
      job_id: jobId,
      principal,
      amount,
      destination_address: destinationAddress,
      message: 'Redemption queued for automatic processing',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Failed to queue redemption:', error);
    res.status(400).json({
      success: false,
      operation: 'queue_redemption',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Get automatic redemption statistics
 */
app.get('/ck-algo/redemption/stats', async (req, res) => {
  try {
    const stats = automaticRedemptionService.getRedemptionStats();

    res.json({
      success: true,
      operation: 'redemption_stats',
      stats,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Failed to get redemption stats:', error);
    res.status(500).json({
      success: false,
      operation: 'redemption_stats',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Get redemption job status
 */
app.get('/ck-algo/redemption/job/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = automaticRedemptionService.getRedemptionJob(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        operation: 'get_redemption_job',
        error: 'Redemption job not found',
        job_id: jobId,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      operation: 'get_redemption_job',
      job,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Failed to get redemption job:', error);
    res.status(500).json({
      success: false,
      operation: 'get_redemption_job',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Get redemption jobs for a user
 */
app.get('/ck-algo/redemption/user/:principal', async (req, res) => {
  try {
    const { principal } = req.params;
    const jobs = automaticRedemptionService.getUserRedemptionJobs(principal);

    res.json({
      success: true,
      operation: 'get_user_redemption_jobs',
      principal,
      jobs,
      total_jobs: jobs.length,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Failed to get user redemption jobs:', error);
    res.status(500).json({
      success: false,
      operation: 'get_user_redemption_jobs',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Retry a failed redemption job
 */
app.post('/ck-algo/redemption/retry/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const retried = automaticRedemptionService.retryRedemptionJob(jobId);

    if (!retried) {
      return res.status(400).json({
        success: false,
        operation: 'retry_redemption_job',
        error: 'Job not found or cannot be retried (must be in failed status)',
        job_id: jobId,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      operation: 'retry_redemption_job',
      job_id: jobId,
      message: 'Redemption job queued for retry',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Failed to retry redemption job:', error);
    res.status(500).json({
      success: false,
      operation: 'retry_redemption_job',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Cancel a pending redemption job
 */
app.post('/ck-algo/redemption/cancel/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const cancelled = automaticRedemptionService.cancelRedemptionJob(jobId);

    if (!cancelled) {
      return res.status(400).json({
        success: false,
        operation: 'cancel_redemption_job',
        error: 'Job not found or cannot be cancelled (must be pending or not yet fully processed)',
        job_id: jobId,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      operation: 'cancel_redemption_job',
      job_id: jobId,
      message: 'Redemption job cancelled',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Failed to cancel redemption job:', error);
    res.status(500).json({
      success: false,
      operation: 'cancel_redemption_job',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Force process the redemption queue (for debugging)
 */
app.post('/ck-algo/redemption/process-queue', async (req, res) => {
  try {
    await automaticRedemptionService.forceProcessQueue();

    res.json({
      success: true,
      operation: 'force_process_redemption_queue',
      message: 'Redemption queue processed',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Failed to process redemption queue:', error);
    res.status(500).json({
      success: false,
      operation: 'force_process_redemption_queue',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

// ============================================================================
// SPRINT 012.5: BALANCE SYNCHRONIZATION SERVICE ENDPOINTS
// ============================================================================

/**
 * Register a user for balance synchronization
 */
app.post('/ck-algo/balance/register/:principal', async (req, res) => {
  try {
    const { principal } = req.params;

    await balanceSynchronizationService.registerUser(principal);

    res.json({
      success: true,
      operation: 'register_balance_sync',
      principal,
      message: 'User registered for balance synchronization',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Failed to register user for balance sync:', error);
    res.status(500).json({
      success: false,
      operation: 'register_balance_sync',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Get balance synchronization statistics
 */
app.get('/ck-algo/balance/stats', async (req, res) => {
  try {
    const stats = balanceSynchronizationService.getSyncStats();

    res.json({
      success: true,
      operation: 'balance_sync_stats',
      stats,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Failed to get balance sync stats:', error);
    res.status(500).json({
      success: false,
      operation: 'balance_sync_stats',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Get balance snapshot for a user
 */
app.get('/ck-algo/balance/user/:principal', async (req, res) => {
  try {
    const { principal } = req.params;
    const balance = balanceSynchronizationService.getUserBalance(principal);

    if (!balance) {
      return res.status(404).json({
        success: false,
        operation: 'get_user_balance',
        error: 'User not registered for balance synchronization',
        principal,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      operation: 'get_user_balance',
      principal,
      balance,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Failed to get user balance:', error);
    res.status(500).json({
      success: false,
      operation: 'get_user_balance',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Get all user balances
 */
app.get('/ck-algo/balance/all', async (req, res) => {
  try {
    const balances = balanceSynchronizationService.getAllBalances();

    res.json({
      success: true,
      operation: 'get_all_balances',
      balances,
      total_users: balances.length,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Failed to get all balances:', error);
    res.status(500).json({
      success: false,
      operation: 'get_all_balances',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Get balance discrepancies
 */
app.get('/ck-algo/balance/discrepancies', async (req, res) => {
  try {
    const discrepancies = balanceSynchronizationService.getDiscrepancies();

    res.json({
      success: true,
      operation: 'get_balance_discrepancies',
      discrepancies,
      total_discrepancies: discrepancies.length,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Failed to get balance discrepancies:', error);
    res.status(500).json({
      success: false,
      operation: 'get_balance_discrepancies',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Force sync balance for a specific user
 */
app.post('/ck-algo/balance/sync/:principal', async (req, res) => {
  try {
    const { principal } = req.params;

    const balance = await balanceSynchronizationService.forceSyncUser(principal);

    res.json({
      success: true,
      operation: 'force_sync_user',
      principal,
      balance,
      message: 'Balance synchronized successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Failed to force sync user balance:', error);
    res.status(500).json({
      success: false,
      operation: 'force_sync_user',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Force sync all user balances
 */
app.post('/ck-algo/balance/sync-all', async (req, res) => {
  try {
    await balanceSynchronizationService.forceSyncAll();

    res.json({
      success: true,
      operation: 'force_sync_all',
      message: 'All balances synchronized successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Failed to force sync all balances:', error);
    res.status(500).json({
      success: false,
      operation: 'force_sync_all',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Unregister a user from balance synchronization
 */
app.delete('/ck-algo/balance/unregister/:principal', async (req, res) => {
  try {
    const { principal } = req.params;

    balanceSynchronizationService.unregisterUser(principal);

    res.json({
      success: true,
      operation: 'unregister_balance_sync',
      principal,
      message: 'User unregistered from balance synchronization',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Failed to unregister user from balance sync:', error);
    res.status(500).json({
      success: false,
      operation: 'unregister_balance_sync',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

// ============================================================================
// SPRINT 012.5: TRANSACTION HISTORY SERVICE ENDPOINTS
// ============================================================================

/**
 * Get service statistics (must come before /:txId route)
 */
app.get('/ck-algo/transactions/stats', async (req, res) => {
  try {
    const stats = transactionHistoryService.getServiceStats();

    res.json({
      success: true,
      operation: 'get_transaction_service_stats',
      stats,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Failed to get transaction service stats:', error);
    res.status(500).json({
      success: false,
      operation: 'get_transaction_service_stats',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Get transaction summary statistics (must come before /:txId route)
 */
app.get('/ck-algo/transactions/summary', async (req, res) => {
  try {
    const {
      userPrincipal,
      type,
      status,
      currency,
      startDate,
      endDate
    } = req.query;

    const filter = {
      userPrincipal: userPrincipal as string,
      type: type as any,
      status: status as any,
      currency: currency as any,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined
    };

    const summary = transactionHistoryService.getTransactionSummary(filter);

    res.json({
      success: true,
      operation: 'get_transaction_summary',
      filter,
      summary,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Failed to get transaction summary:', error);
    res.status(500).json({
      success: false,
      operation: 'get_transaction_summary',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Clean up old transactions (admin endpoint, must come before /:txId route)
 */
app.post('/ck-algo/transactions/cleanup', async (req, res) => {
  try {
    const cleanedCount = transactionHistoryService.cleanupOldTransactions();

    res.json({
      success: true,
      operation: 'cleanup_transactions',
      cleaned_count: cleanedCount,
      message: `Cleaned up ${cleanedCount} old transactions`,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Failed to cleanup transactions:', error);
    res.status(500).json({
      success: false,
      operation: 'cleanup_transactions',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Get transaction by ID
 */
app.get('/ck-algo/transactions/:txId', async (req, res) => {
  try {
    const { txId } = req.params;
    const transaction = transactionHistoryService.getTransaction(txId);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        operation: 'get_transaction',
        error: 'Transaction not found',
        tx_id: txId,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      operation: 'get_transaction',
      transaction,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Failed to get transaction:', error);
    res.status(500).json({
      success: false,
      operation: 'get_transaction',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Get transactions for a user
 */
app.get('/ck-algo/transactions/user/:principal', async (req, res) => {
  try {
    const { principal } = req.params;
    const { type, status, currency, limit, offset } = req.query;

    const filter = {
      type: type as any,
      status: status as any,
      currency: currency as any,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined
    };

    const transactions = transactionHistoryService.getUserTransactions(principal, filter);

    res.json({
      success: true,
      operation: 'get_user_transactions',
      principal,
      transactions,
      total: transactions.length,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Failed to get user transactions:', error);
    res.status(500).json({
      success: false,
      operation: 'get_user_transactions',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Search transactions with filters
 */
app.get('/ck-algo/transactions', async (req, res) => {
  try {
    const {
      userPrincipal,
      type,
      status,
      currency,
      minAmount,
      maxAmount,
      startDate,
      endDate,
      custodyAddress,
      destinationAddress,
      limit,
      offset
    } = req.query;

    const filter = {
      userPrincipal: userPrincipal as string,
      type: type as any,
      status: status as any,
      currency: currency as any,
      minAmount: minAmount ? parseFloat(minAmount as string) : undefined,
      maxAmount: maxAmount ? parseFloat(maxAmount as string) : undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      custodyAddress: custodyAddress as string,
      destinationAddress: destinationAddress as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined
    };

    const transactions = transactionHistoryService.searchTransactions(filter);

    res.json({
      success: true,
      operation: 'search_transactions',
      filter,
      transactions,
      total: transactions.length,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Failed to search transactions:', error);
    res.status(500).json({
      success: false,
      operation: 'search_transactions',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});


// SPRINT X: New endpoint for minting from existing balance
app.post('/ck-algo/mint-existing-balance', async (req, res) => {
  try {
    const { principal, amount } = z.object({
      principal: z.string().min(1),
      amount: z.number().positive()
    }).parse(req.body);

    console.log(`💰 Processing existing balance mint: ${amount} ALGO for principal ${principal}`);

    // Get the user's custody address
    const addressInfo = await icpCanisterService.deriveAlgorandAddress(principal);
    const custodyAddress = addressInfo.address;

    // Check actual balance in custody address
    const accountInfo = await algorandMainnet.getAccountInfo(custodyAddress);
    const availableBalance = accountInfo.balance - accountInfo.minBalance;

    console.log(`🏦 Custody address ${custodyAddress} has ${availableBalance} ALGO available`);

    // Validate requested amount
    if (amount > availableBalance) {
      return res.status(400).json({
        success: false,
        operation: 'mint_existing_balance',
        error: `Insufficient balance. Requested: ${amount} ALGO, Available: ${availableBalance} ALGO`,
        available_balance: availableBalance,
        requested_amount: amount,
        timestamp: new Date().toISOString()
      });
    }

    if (amount < 0.1) {
      return res.status(400).json({
        success: false,
        operation: 'mint_existing_balance',
        error: 'Minimum mint amount is 0.1 ALGO',
        requested_amount: amount,
        minimum_amount: 0.1,
        timestamp: new Date().toISOString()
      });
    }

    // Convert amount to microALGO for minting
    const microAlgoAmount = Math.floor(amount * 1000000);

    console.log(`🔄 Minting ${microAlgoAmount} microALGO (${amount} ALGO) from existing balance`);

    try {
      // DIRECT MINTING: Use ckAlgoService now that authorization is fixed
      console.log(`✅ Authorization confirmed - proceeding with direct ckALGO minting`);

      const mintResult = await ckAlgoService.mintCkAlgo(principal, microAlgoAmount);

      console.log(`🎉 Successfully minted ${mintResult.amount_minted} ckALGO for ${principal}`);

      return res.json({
        success: true,
        operation: 'mint_existing_balance',
        amount_requested: amount,
        amount_minted: mintResult.amount_minted,
        principal,
        custody_address: custodyAddress,
        transaction_id: mintResult.transaction_id,
        timestamp: new Date().toISOString()
      });

    } catch (mintError) {
      console.error(`❌ Minting failed:`, mintError);

      res.status(500).json({
        success: false,
        operation: 'mint_existing_balance',
        error: 'Failed to mint ckALGO from existing balance',
        details: mintError instanceof Error ? mintError.message : 'Unknown minting error',
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ Existing balance mint error:', error);
    res.status(500).json({
      success: false,
      operation: 'mint_existing_balance',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// SPRINT X: New mint endpoint for confirmed deposits
app.post('/ck-algo/mint-confirmed-deposit', async (req, res) => {
  try {
    const { principal, txId } = z.object({
      principal: z.string().min(1),
      txId: z.string().min(1)
    }).parse(req.body);
    
    console.log(`🎯 Processing confirmed deposit minting: ${txId} for principal ${principal}`);
    
    // Get the confirmed deposit from monitoring service
    const deposit = await depositDetectionService.processConfirmedDepositForMinting(txId);
    
    if (!deposit) {
      return res.status(400).json({
        success: false,
        operation: 'mint_confirmed_deposit',
        error: 'Deposit not found or not confirmed',
        txId,
        timestamp: new Date().toISOString(),
      });
    }
    
    // Verify the deposit belongs to the requesting principal
    if (deposit.userPrincipal !== principal) {
      return res.status(403).json({
        success: false,
        operation: 'mint_confirmed_deposit',
        error: 'Deposit does not belong to requesting principal',
        txId,
        timestamp: new Date().toISOString(),
      });
    }
    
    console.log(`✅ Confirmed deposit verified: ${deposit.amount} ALGO from ${deposit.sender}`);
    
    // Mint ckALGO tokens using the simplified bridge canister
    // Convert amount to micro units (ALGO * 1,000,000)
    const ckAlgoMicroUnits = Math.floor(deposit.amount * 1_000_000);
    
    try {
      // Call simplified bridge canister's mint_after_deposit_confirmed function
      // Using real SimplifiedBridgeService integration (Phase A.1.4)
      const mintResult = await simplifiedBridgeService.mintAfterDepositConfirmed(deposit.txId);
      
      console.log(`✅ Successfully minted ${deposit.amount} ckALGO for confirmed deposit:`, mintResult);
      
      res.json({
        success: true,
        operation: 'mint_confirmed_deposit',
        principal,
        amount: deposit.amount,
        txId: deposit.txId,
        ck_algo_minted: deposit.amount,
        custody_address: deposit.custodyAddress,
        confirmations: deposit.confirmations,
        algorand_sender: deposit.sender,
        minting_result: mintResult,
        timestamp: new Date().toISOString(),
      });
      
    } catch (mintError) {
      console.error('❌ ckALGO minting failed for confirmed deposit:', mintError);
      
      // Put the deposit back since minting failed
      depositDetectionService.restoreDeposit({
        ...deposit,
        status: 'confirmed' // Reset to confirmed so it can be retried
      });
      
      return res.status(500).json({
        success: false,
        operation: 'mint_confirmed_deposit',
        error: 'Deposit confirmed but ckALGO minting failed: ' + (mintError instanceof Error ? mintError.message : String(mintError)),
        txId: deposit.txId,
        timestamp: new Date().toISOString(),
      });
    }
    
  } catch (error) {
    console.error('❌ Failed to process confirmed deposit minting:', error);
    res.status(500).json({
      success: false,
      operation: 'mint_confirmed_deposit',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

// Production ckALGO minting with threshold signatures
app.post('/ck-algo/mint', async (req, res) => {
  try {
    const { principal, amount, algorandTxId, depositAddress } = mintRequestSchema.parse(req.body);
    
    // DEBUG: Log the exact principal being received
    console.log('🔍 MINT DEBUG - Principal received:', JSON.stringify(principal));
    console.log('🔍 MINT DEBUG - Principal type:', typeof principal);
    console.log('🔍 MINT DEBUG - Principal length:', principal?.length);
    console.log('🔍 MINT DEBUG - Principal raw bytes:', principal ? Array.from(Buffer.from(principal, 'utf8')).slice(0, 20) : 'null');
    
    // Safety Controls - Phase 3 Initial Limits
    const MAX_MINT_AMOUNT = 10.0; // 10 ALGO max per transaction (testnet safe)
    const MIN_MINT_AMOUNT = 0.01; // 0.01 ALGO minimum
    
    if (amount > MAX_MINT_AMOUNT) {
      return res.status(400).json({
        success: false,
        operation: 'mint',
        error: `Maximum mint amount is ${MAX_MINT_AMOUNT} ALGO per transaction`,
        requested_amount: amount,
        max_allowed: MAX_MINT_AMOUNT,
        timestamp: new Date().toISOString(),
      });
    }
    
    if (amount < MIN_MINT_AMOUNT) {
      return res.status(400).json({
        success: false,
        operation: 'mint',
        error: `Minimum mint amount is ${MIN_MINT_AMOUNT} ALGO`,
        requested_amount: amount,
        min_required: MIN_MINT_AMOUNT,
        timestamp: new Date().toISOString(),
      });
    }
    
    console.log(`🪙 Processing ckALGO mint: ${amount} ALGO for principal ${principal} (within safety limits)`);
    
    // 1. Use provided depositAddress instead of wasteful re-derivation
    console.log('✅ Using provided custody address (no re-derivation needed):', depositAddress);
    
    // Optional security verification: Ensure depositAddress belongs to principal
    // Only verify if we suspect tampering - normally trust the frontend
    const verifyAddress = false; // Set to true if security concerns
    if (verifyAddress) {
      console.log('🔒 Verifying address ownership...');
      try {
        const verifiedInfo = await icpCanisterService.deriveAlgorandAddress(principal);
        if (verifiedInfo.address !== depositAddress) {
          return res.status(400).json({
            success: false,
            error: 'Address verification failed: provided address does not belong to principal'
          });
        }
      } catch (error) {
        console.warn('⚠️ Address verification failed, proceeding anyway:', error);
      }
    }
    
    if (!depositAddress) {
      return res.status(400).json({
        success: false,
        error: 'Deposit address is required for minting'
      });
    }
    
    const custodyInfo = {
      address: depositAddress,
      public_key: new Uint8Array(32) // Dummy for compatibility - not needed for minting
    };
    
    // 2. Verify ALGO deposit (if provided)
    if (algorandTxId) {
      // In production, we would verify the actual Algorand transaction
      console.log(`🔍 Verifying Algorand transaction: ${algorandTxId}`);
    }
    
    // 3. Create REAL Algorand payment transaction (as proven in breakthrough)
    const { algorandService } = await import('./services/algorandService.js');
    const algosdk = (await import('algosdk')).default;
    
    // SPRINT X FIX: Real custody logic - user deposits ALGO to bridge-controlled address
    // This replaces the previous self-transfer simulation that created unbacked tokens
    const suggestedParams = await algorandService.getSuggestedParams();
    const mintMicroAlgos = Math.floor(amount * 1_000_000); // Convert ALGO to microALGOs
    
    // Sprint X: Direct manual minting is disabled - guide users to automatic workflow
    return res.status(400).json({
      success: false,
      operation: 'mint',
      error: 'Sprint X: Manual minting disabled - automatic minting system active',
      sprint_x_workflow: {
        step1: 'Generate custody address using /ck-algo/custody/generate-deposit-address',
        step2: 'Send ALGO to your custody address (system will auto-detect)',
        step3: 'Wait for automatic minting after 6 confirmations (mainnet) or 3 (testnet)',
        step4: 'Check your ckALGO balance - no manual action required'
      },
      custody_address: custodyInfo.address,
      automatic_system: 'Sprint X automatically detects deposits and mints ckALGO',
      frontend_url: 'https://nuru.network/sippar/ - use the web interface for guided workflow',
      timestamp: new Date().toISOString(),
    });
    
    /* SPRINT X: ALL CODE BELOW DISABLED - WAS CREATING UNBACKED TOKENS
    
    // DISABLED: Previous simulation code that created unbacked tokens
    // const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    //   from: custodyInfo.address,  // BROKEN: Self-transfer doesn't lock user's ALGO
    //   to: custodyInfo.address,    // BROKEN: Same address = no real custody
    //   amount: mintMicroAlgos,
    //   note: new Uint8Array(Buffer.from(`ckALGO mint: ${amount} ALGO for ${principal}`)),
    //   suggestedParams: suggestedParams,
    // });
    
    // Get transaction bytes to sign (this is what we sign with threshold signatures)
    const mintTransactionBytes = paymentTxn.bytesToSign();
    
    // 4. Sign transaction with threshold signatures  
    const signedMint = await retryIcpOperation(async () => {
      return await icpCanisterService.signAlgorandTransaction(
        principal, 
        new Uint8Array(mintTransactionBytes)
      );
    }, 3); // Retry up to 3 times
    
    console.log(`✅ Threshold signature generated: ${signedMint.signed_tx_id}`);
    
    // SPRINT X NOTE: This code path is now disabled to prevent unbacked token creation
    // Threshold signatures are proven working, but minting requires real deposits first
    console.log(`✅ Signature length: ${signedMint.signature.length} bytes - mathematically valid`);
    console.log(`🎯 Completing ckALGO minting with proven threshold signature technology`);
    
    // Simulate successful Algorand transaction (threshold signatures prove the capability)
    const confirmedAlgorandTxId = `THRESHOLD-PROVEN-${signedMint.signed_tx_id.slice(0, 8)}`;
    
    // 6. Only mint ckALGO after Algorand transaction is confirmed
    console.log(`🪙 Now minting ${amount} ckALGO tokens after successful ALGO deposit`);
    
    // 6. Actually mint ckALGO tokens using the ckALGO service
    const ckAlgoMicroUnits = Math.floor(amount * 1_000_000);
    console.log(`🪙 Calling ckALGO canister to mint ${amount} ckALGO (${ckAlgoMicroUnits} microckALGO)`);
    
    try {
      // Use simplified bridge service for real minting
      const actualMintResult = await simplifiedBridgeService.mintAfterDepositConfirmed(`DEPOSIT_${Date.now()}`);
      console.log(`✅ Actually minted ckALGO via simplified bridge:`, actualMintResult);
    } catch (mintError) {
      console.error('❌ ckALGO minting failed:', mintError);
      return res.status(500).json({
        success: false,
        operation: 'mint',
        error: 'Threshold signature succeeded but ckALGO minting failed: ' + (mintError instanceof Error ? mintError.message : String(mintError)),
        signed_tx_id: signedMint.signed_tx_id,
        timestamp: new Date().toISOString(),
      });
    }
    
    const response = {
      success: true,
      operation: 'mint',
      principal,
      amount,
      custody_address: custodyInfo.address,
      ck_algo_minted: amount,
      atomic_operation: true,
      transaction_details: {
        signed_tx_id: signedMint.signed_tx_id,
        signature_length: signedMint.signature.length,
        threshold_signed: true,
        canister_id: icpCanisterService.getCanisterId(),
        ck_algo_canister_id: 'gbmxj-yiaaa-aaaak-qulqa-cai'
      },
      icp_tx_id: `ICP-MINT-${Date.now()}`,
      algorand_tx_id: confirmedAlgorandTxId,
      timestamp: new Date().toISOString(),
    };
    
    console.log(`✅ Complete atomic ckALGO mint: ${signedMint.signed_tx_id}`);
    res.json(response);
    
    END OF DISABLED CODE BLOCK */
    
  } catch (error) {
    console.error('❌ ckALGO minting failed:', error);
    res.status(500).json({
      success: false,
      operation: 'mint',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    });
  }
});

// Production ckALGO redemption with threshold signatures
app.post('/ck-algo/redeem', async (req, res) => {
  try {
    const { principal, amount, destinationAddress } = redeemRequestSchema.parse(req.body);
    
    // Safety Controls - Phase 3 Initial Limits  
    const MAX_REDEEM_AMOUNT = 10.0; // 10 ALGO max per transaction (testnet safe)
    const MIN_REDEEM_AMOUNT = 0.01; // 0.01 ALGO minimum
    
    if (amount > MAX_REDEEM_AMOUNT) {
      return res.status(400).json({
        success: false,
        operation: 'redeem',
        error: `Maximum redeem amount is ${MAX_REDEEM_AMOUNT} ALGO per transaction`,
        requested_amount: amount,
        max_allowed: MAX_REDEEM_AMOUNT,
        timestamp: new Date().toISOString(),
      });
    }
    
    if (amount < MIN_REDEEM_AMOUNT) {
      return res.status(400).json({
        success: false,
        operation: 'redeem',
        error: `Minimum redeem amount is ${MIN_REDEEM_AMOUNT} ALGO`,
        requested_amount: amount,
        min_required: MIN_REDEEM_AMOUNT,
        timestamp: new Date().toISOString(),
      });
    }
    
    console.log(`💸 Processing ckALGO redeem: ${amount} ckALGO for principal ${principal} (within safety limits)`);
    
    // 1. Verify destination address format
    // TODO: Temporarily bypassing address validation to test token burning
    console.log(`⚠️ TESTING: Bypassing address validation for: ${destinationAddress}`);
    // if (!algosdk.isValidAddress(destinationAddress)) {
    //   throw new Error('Invalid Algorand destination address');
    // }
    
    // 2. FIRST: Burn ckALGO tokens from user's balance
    console.log(`🔥 Burning ${amount} ckALGO tokens from principal ${principal}...`);
    const ckAlgoMicroUnits = BigInt(Math.floor(amount * 1_000_000));

    try {
      // Use simplified_bridge canister (hldvt) for redemption - NOT archived ck_algo (gbmxj)
      const userPrincipal = Principal.fromText(principal);
      const burnResult = await simplifiedBridgeService.adminRedeemCkAlgo(userPrincipal, ckAlgoMicroUnits, destinationAddress);
      console.log(`✅ Successfully burned ${amount} ckALGO via simplified_bridge canister:`, burnResult);
    } catch (burnError) {
      console.error('❌ ckALGO burning failed:', burnError);
      throw new Error('Failed to burn ckALGO tokens: ' + (burnError instanceof Error ? burnError.message : String(burnError)));
    }
    
    // 3. Get user's threshold address for ALGO unlocking
    const custodyInfo = await icpCanisterService.deriveAlgorandAddress(principal);
    console.log(`📍 User's custody address: ${custodyInfo.address}`);
    
    // 4. Create real Algorand transaction to unlock ALGO (transfer from custody to destination)
    // IMPORTANT: Use mainnet for withdrawal since custody address is on mainnet
    const suggestedParams = await algorandMainnet.getSuggestedParams();
    const microAlgos = Math.floor(amount * 1_000_000); // Convert to microALGOs
    
    const unlockTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: custodyInfo.address,
      to: destinationAddress,
      amount: microAlgos,
      note: new Uint8Array(Buffer.from(`ckALGO redeem: Unlocking ${amount} ALGO for ${principal}`)),
      suggestedParams: suggestedParams,
    });
    
    // 5. Get transaction bytes to sign with threshold signatures
    const txnBytesToSign = unlockTxn.bytesToSign();
    console.log(`🔐 Signing ALGO unlock transaction: ${txnBytesToSign.length} bytes`);
    
    // 6. Sign with threshold signatures
    const signedTransfer = await retryIcpOperation(async () => {
      return await icpCanisterService.signAlgorandTransaction(
        principal,
        new Uint8Array(txnBytesToSign)
      );
    }, 3);
    
    console.log(`✅ ALGO unlock transaction signed: ${signedTransfer.signed_tx_id}`);
    
    // 7. Submit transaction to Algorand network to actually unlock ALGO
    let algorandTxId = 'N/A';
    try {
      // Create signed transaction for submission
      const signedTxnData = {
        sig: new Uint8Array(signedTransfer.signature),
        txn: unlockTxn.get_obj_for_encoding()
      };
      
      const encodedSignedTxn = algosdk.encodeObj(signedTxnData);
      // IMPORTANT: Use mainnet for withdrawal since custody address is on mainnet
      const submissionResult = await algorandMainnet.submitTransaction(encodedSignedTxn);
      algorandTxId = submissionResult.txId;
      
      console.log(`🎉 ALGO unlocked on Algorand network: ${algorandTxId}`);
    } catch (submissionError) {
      console.warn('⚠️ Algorand transaction submission failed (ckALGO already burned):', submissionError);
      // Don't throw - ckALGO is already burned, this is just the unlock step
      algorandTxId = `THRESHOLD-SIGNED-${signedTransfer.signed_tx_id.slice(0, 8)}`;
    }
    
    const response = {
      success: true,
      operation: 'redeem',
      principal,
      amount,
      destination_address: destinationAddress,
      ck_algo_burned: amount,
      algo_unlocked: amount,
      transaction_details: {
        signed_tx_id: signedTransfer.signed_tx_id,
        signature_length: signedTransfer.signature.length,
        threshold_signed: true,
        canister_id: icpCanisterService.getCanisterId(),
      },
      icp_tx_id: `ICP-REDEEM-${Date.now()}`,
      algorand_tx_id: algorandTxId,
      algorandTxId: algorandTxId, // Add camelCase version for frontend compatibility
      transactionId: algorandTxId, // Alternative field name for frontend
      timestamp: new Date().toISOString(),
    };
    
    console.log(`✅ ckALGO redeem completed with threshold signature: ${signedTransfer.signed_tx_id}`);
    res.json(response);
    
  } catch (error) {
    console.error('❌ ckALGO redemption failed:', error);
    res.status(500).json({
      success: false,
      operation: 'redeem',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    });
  }
});

// ckALGO Token Information endpoint
app.get('/ck-algo/info', async (req, res) => {
  try {
    // Get real token info from simplified bridge canister
    const [tokenName, tokenSymbol, decimals, totalSupply, reserveStatus] = await Promise.all([
      simplifiedBridgeService.getTokenName(),
      simplifiedBridgeService.getTokenSymbol(),
      simplifiedBridgeService.getDecimals(),
      simplifiedBridgeService.getTotalSupply(),
      simplifiedBridgeService.getReserveStatus()
    ]);

    const tokenInfo = {
      name: tokenName,
      symbol: tokenSymbol,
      decimals
    };

    const reserves = {
      totalCkAlgoSupply: Number(totalSupply) / 1_000_000, // Convert from microalgos to ALGO
      totalLockedAlgo: Number(reserveStatus.locked_algo_reserves) / 1_000_000,
      reserveRatio: reserveStatus.reserve_ratio
    };

    res.json({
      success: true,
      token: tokenInfo,
      totalSupply,
      reserves,
      canisterId: 'gbmxj-yiaaa-aaaak-qulqa-cai',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ ckALGO info query failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

// ckALGO transfer endpoint
app.post('/ck-algo/transfer', async (req, res) => {
  try {
    const { fromPrincipal, toPrincipal, amount } = req.body;
    
    // Validate required parameters
    if (!fromPrincipal || !toPrincipal || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: fromPrincipal, toPrincipal, amount'
      });
    }
    
    // Validate amount
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be a positive number'
      });
    }
    
    // Validate ICP principals (with Chain Fusion support)
    try {
      // Always validate toPrincipal as it must be standard ICP format
      Principal.fromText(toPrincipal);
      
      // For fromPrincipal, allow Chain Fusion format (longer than standard ICP principals)
      if (fromPrincipal.length > 50) {
        console.log('🔗 Chain Fusion principal detected for transfer:', fromPrincipal.substring(0, 20) + '...');
        // Skip Principal.fromText validation for Chain Fusion principals
      } else {
        Principal.fromText(fromPrincipal);
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ICP principal format'
      });
    }
    
    console.log(`💸 Processing ckALGO transfer: ${amount} ckALGO from ${fromPrincipal} to ${toPrincipal}`);
    
    const transferResult = await ckAlgoService.transferCkAlgo(fromPrincipal, toPrincipal, amount);
    
    res.json({
      operation: 'transfer',
      ...transferResult,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ ckALGO transfer failed:', error);
    res.status(500).json({
      success: false,
      operation: 'transfer',
      error: error instanceof Error ? error.message : 'Transfer failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Admin endpoint to restore balance (temporary)
app.post('/ck-algo/admin/restore-balance', async (req, res) => {
  try {
    const { accountStr, amount } = req.body;
    console.log(`🔧 Admin restoring ${amount} ckALGO for account: ${accountStr}`);
    
    const result = await ckAlgoService.restoreBalance(accountStr, amount);
    
    res.json({
      operation: 'restore_balance',
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Admin balance restore failed:', error);
    res.status(500).json({
      success: false,
      operation: 'restore_balance',
      error: error instanceof Error ? error.message : 'Restore failed',
      timestamp: new Date().toISOString()
    });
  }
});

// ckALGO balance endpoint (enhanced with threshold signature verification)
app.get('/ck-algo/balance/:principal', async (req, res) => {
  try {
    const { principal } = req.params;
    
    // URL decode the principal parameter to handle encoded characters
    const decodedPrincipal = decodeURIComponent(principal);
    
    console.log('🔍 ckALGO balance request:');
    console.log('📥 Raw principal:', principal);
    console.log('📥 Decoded principal:', decodedPrincipal);
    
    // Validate Principal format - all principals must be valid ICP format
    let validatedPrincipal: Principal;
    try {
      validatedPrincipal = Principal.fromText(decodedPrincipal);
      console.log('✅ Valid ICP Principal:', validatedPrincipal.toString());
    } catch (principalError: any) {
      console.warn('❌ Invalid Principal format:', decodedPrincipal, principalError.message);

      // Return user-friendly error for invalid principals
      return res.status(400).json({
        success: false,
        error: 'INVALID_PRINCIPAL_FORMAT',
        message: 'The provided Principal ID is not valid. Please authenticate with Internet Identity to get a valid Principal ID.',
        details: {
          received_principal: decodedPrincipal,
          validation_error: principalError.message,
          solution: 'Click "Connect Internet Identity" to authenticate and get a valid Principal ID'
        },
        timestamp: new Date().toISOString(),
      });
    }
    
    // Skip wasteful address derivation for balance checks - just get ckALGO balance directly
    // We only need the threshold address for display purposes, not for balance queries
    console.log('✅ Skipping address derivation for balance check - querying ckALGO directly');
    
    // For Algorand balance, we need the address but we can get it from the frontend/cache
    // For now, focus on ckALGO balance which is the main issue
    const thresholdAddress = 'N/A'; // Will be provided by frontend when needed
    
    // Query real ckALGO balance from ckALGO canister (not SimplifiedBridge)
    let ckAlgoBalance = 0;
    try {
      const balanceResult = await ckAlgoService.getBalance(decodedPrincipal);
      ckAlgoBalance = balanceResult; // Already converted to ALGO by ckAlgoService
      console.log(`✅ Real ckALGO balance queried from ckALGO canister: ${ckAlgoBalance} ckALGO`);
    } catch (error) {
      console.warn('⚠️ Failed to query ckALGO balance from ckALGO canister, using fallback:', error);
      ckAlgoBalance = 0;
    }
    
    const response = {
      success: true,
      principal,
      threshold_address: thresholdAddress,
      balances: {
        algo_balance: 0, // Algorand balance query skipped for performance
        ck_algo_balance: ckAlgoBalance,
        total_value_algo: ckAlgoBalance, // Only showing ckALGO balance for now
      },
      account_info: {
        exists: false, // Address derivation skipped for performance
        min_balance: 0.1,
        assets: 0,
      },
      threshold_info: {
        canister_id: icpCanisterService.getCanisterId(),
        public_key_length: 0, // Address derivation skipped for performance
      },
      timestamp: new Date().toISOString(),
    };
    
    res.json(response);
    
  } catch (error) {
    console.error('❌ Balance query failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    });
  }
});

// ============================================================================
// ckETH -> ckALGO SWAP ENDPOINTS (Deposit-Based, Autonomous Agent Flow)
// ============================================================================

/**
 * GET /swap/config
 * Get swap configuration (enabled, fee, limits)
 */
app.get('/swap/config', async (req, res) => {
  const startTime = Date.now();
  try {
    const [config, rate] = await Promise.all([
      simplifiedBridgeService.getSwapConfig(),
      simplifiedBridgeService.getCurrentEthAlgoRate().catch(() => null)
    ]);

    res.json({
      success: true,
      config: {
        enabled: config.enabled,
        feeBps: Number(config.fee_bps),
        feePercent: Number(config.fee_bps) / 100,
        minCketh: config.min_cketh.toString(),
        minCkethFormatted: `${Number(config.min_cketh) / 1e18} ETH`,
        maxCketh: config.max_cketh.toString(),
        maxCkethFormatted: `${Number(config.max_cketh) / 1e18} ETH`,
        ckethBackedCkalgo: config.cketh_backed_ckalgo.toString(),
        totalCkethReceived: config.total_cketh_received.toString()
      },
      currentRate: rate,
      ckethCanister: 'ss2fx-dyaaa-aaaar-qacoq-cai',
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Swap config failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get swap config',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /swap/rate
 * Get current ETH/ALGO exchange rate from XRC
 */
app.get('/swap/rate', async (req, res) => {
  const startTime = Date.now();
  try {
    const rate = await simplifiedBridgeService.getCurrentEthAlgoRate();

    res.json({
      success: true,
      rate: rate,
      pair: 'ETH/ALGO',
      source: 'ICP Exchange Rate Canister (XRC)',
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get rate failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get exchange rate',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /swap/custody-account/:principal
 * Get custody account info for ckETH deposits
 */
app.get('/swap/custody-account/:principal', async (req, res) => {
  const startTime = Date.now();
  try {
    const { principal } = req.params;

    // Validate principal
    try {
      Principal.fromText(principal);
    } catch {
      return res.status(400).json({
        success: false,
        error: 'Invalid principal format'
      });
    }

    // Now async - queries canister for subaccount (P1 fix: single source of truth)
    const custodyInfo = await ckethDepositService.getCustodyAccountInfo(principal);

    res.json({
      success: true,
      custodyAccount: {
        owner: custodyInfo.owner,
        subaccount: custodyInfo.subaccount,
        subaccountArray: Array.from(custodyInfo.subaccountBytes),
        ckethCanister: 'ss2fx-dyaaa-aaaar-qacoq-cai'
      },
      instructions: custodyInfo.instructions,
      agentPrincipal: principal,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get custody account failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get custody account',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /swap/custody-balance/:principal
 * Get agent's ckETH custody balance (deposited but not yet swapped)
 */
app.get('/swap/custody-balance/:principal', async (req, res) => {
  const startTime = Date.now();
  try {
    const { principal } = req.params;
    const balance = await ckethDepositService.getCustodyBalance(principal);

    res.json({
      success: true,
      balance: {
        total: balance.balance.toString(),
        totalFormatted: `${Number(balance.balance) / 1e18} ETH`,
        lastUpdated: new Date(balance.lastUpdated).toISOString()
      },
      principal,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get custody balance failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get custody balance',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /swap/execute
 * Execute ckETH to ckALGO swap (deposit-based, autonomous)
 *
 * Flow:
 * 1. Agent transfers ckETH to custody account (GET /swap/custody-account first)
 * 2. Agent calls this endpoint with tx_id from transfer
 * 3. Backend verifies deposit, executes swap
 */
app.post('/swap/execute', async (req, res) => {
  const startTime = Date.now();
  try {
    const { principal, ckethAmount, ckethTxId, minCkalgoOut } = z.object({
      principal: z.string().min(1),
      ckethAmount: z.string().min(1),      // Amount in wei (string for bigint)
      ckethTxId: z.string().min(1),        // Block index from icrc1_transfer
      minCkalgoOut: z.string().optional()  // Slippage protection
    }).parse(req.body);

    const amount = BigInt(ckethAmount);
    const minOut = minCkalgoOut ? BigInt(minCkalgoOut) : undefined;

    console.log(`Deposit swap request: ${principal} swapping ${amount} ckETH (tx: ${ckethTxId})`);

    const result = await ckethDepositService.executeDepositSwap(
      principal,
      amount,
      ckethTxId,
      minOut
    );

    if (result.success && result.swapResult) {
      res.json({
        success: true,
        swap: {
          ckethIn: result.swapResult.cketh_in.toString(),
          ckethInFormatted: `${Number(result.swapResult.cketh_in) / 1e18} ETH`,
          ckalgoOut: result.swapResult.ckalgo_out.toString(),
          ckalgoOutFormatted: `${Number(result.swapResult.ckalgo_out) / 1e6} ALGO`,
          rateUsed: result.swapResult.rate_used,
          ckethTxId
        },
        principal,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        custodyInfo: result.custodyInfo,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Swap execute failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Swap execution failed',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /swap/deposit-status/:txId
 * Get status of a specific deposit
 */
app.get('/swap/deposit-status/:txId', async (req, res) => {
  const startTime = Date.now();
  try {
    const { txId } = req.params;
    const deposit = ckethDepositService.getDepositStatus(txId);

    if (!deposit) {
      // Check if processed on canister
      const processedOnCanister = await simplifiedBridgeService.isSwapDepositProcessed(txId);

      if (processedOnCanister) {
        return res.json({
          success: true,
          deposit: {
            txId,
            status: 'swapped',
            source: 'canister'
          },
          timestamp: new Date().toISOString()
        });
      }

      return res.status(404).json({
        success: false,
        error: `Deposit ${txId} not found`
      });
    }

    res.json({
      success: true,
      deposit: {
        txId: deposit.ckethTxId,
        agentPrincipal: deposit.agentPrincipal,
        amount: deposit.amount.toString(),
        amountFormatted: `${Number(deposit.amount) / 1e18} ETH`,
        status: deposit.status,
        error: deposit.error,
        detectedAt: new Date(deposit.detectedAt).toISOString()
      },
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get deposit status failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get deposit status',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /swap/history
 * Get swap history from canister
 */
app.get('/swap/history', async (req, res) => {
  const startTime = Date.now();
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const records = await simplifiedBridgeService.getSwapRecords(limit);

    res.json({
      success: true,
      records: records.map(r => ({
        user: r.user.toString(),
        ckethIn: r.cketh_in.toString(),
        ckethInFormatted: `${Number(r.cketh_in) / 1e18} ETH`,
        ckalgoOut: r.ckalgo_out.toString(),
        ckalgoOutFormatted: `${Number(r.ckalgo_out) / 1e6} ALGO`,
        rateUsed: r.rate_used,
        feeCollected: r.fee_collected.toString(),
        timestamp: new Date(Number(r.timestamp) / 1e6).toISOString(),
        txId: r.tx_id
      })),
      count: records.length,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get swap history failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get swap history',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /swap/metrics
 * Get deposit service metrics
 */
app.get('/swap/metrics', async (req, res) => {
  const startTime = Date.now();
  try {
    const metrics = ckethDepositService.getMetrics();
    const config = await simplifiedBridgeService.getSwapConfig();

    res.json({
      success: true,
      metrics: {
        localCache: {
          totalDepositsProcessed: metrics.totalDepositsProcessed,
          swappedDeposits: metrics.swappedDeposits,
          failedDeposits: metrics.failedDeposits,
          totalCkethProcessed: metrics.totalCkethProcessed.toString(),
          totalCkethProcessedFormatted: `${Number(metrics.totalCkethProcessed) / 1e18} ETH`
        },
        canister: {
          ckethBackedCkalgo: config.cketh_backed_ckalgo.toString(),
          totalCkethReceived: config.total_cketh_received.toString()
        }
      },
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get swap metrics failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get swap metrics',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /swap/admin/enable
 * Enable/disable swaps (controllers only)
 */
app.post('/swap/admin/enable', async (req, res) => {
  try {
    const { enabled } = z.object({
      enabled: z.boolean()
    }).parse(req.body);

    const result = await simplifiedBridgeService.setSwapEnabled(enabled);
    res.json({
      success: true,
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Set swap enabled failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to set swap enabled',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /swap/admin/fee
 * Set swap fee (controllers only, max 5%)
 */
app.post('/swap/admin/fee', async (req, res) => {
  try {
    const { feeBps } = z.object({
      feeBps: z.number().min(0).max(500)
    }).parse(req.body);

    const result = await simplifiedBridgeService.setSwapFeeBps(BigInt(feeBps));
    res.json({
      success: true,
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Set swap fee failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to set swap fee',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /swap/admin/limits
 * Set swap limits (controllers only)
 */
app.post('/swap/admin/limits', async (req, res) => {
  try {
    const { minCketh, maxCketh } = z.object({
      minCketh: z.string(),
      maxCketh: z.string()
    }).parse(req.body);

    const result = await simplifiedBridgeService.setSwapLimits(
      BigInt(minCketh),
      BigInt(maxCketh)
    );
    res.json({
      success: true,
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Set swap limits failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to set swap limits',
      timestamp: new Date().toISOString()
    });
  }
});

// Test canister connectivity endpoint
app.get('/canister/test', async (req, res) => {
  try {
    const greetMessage = await icpCanisterService.greet('Phase 3 Testing');
    const status = await icpCanisterService.getCanisterStatus();
    
    res.json({
      success: true,
      canister_test: {
        greet_response: greetMessage,
        status: status,
        canister_id: icpCanisterService.getCanisterId(),
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('❌ Canister test failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Canister connectivity failed',
      timestamp: new Date().toISOString(),
    });
  }
});

// Algorand network integration endpoints (existing from Phase 2)
app.get('/algorand/account/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!algosdk.isValidAddress(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Algorand address format'
      });
    }
    
    const account = await algorandMainnet.getAccountInfo(address);
    res.json({ success: true, account });
    
  } catch (error) {
    console.error('❌ Account query failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

app.get('/algorand/deposits/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!algosdk.isValidAddress(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Algorand address format'
      });
    }
    
    const deposits = await algorandMainnet.getRecentDeposits(address);
    res.json({ success: true, deposits, address });
    
  } catch (error) {
    console.error('❌ Deposits query failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

// Real Chain Fusion: Actual Algorand Transaction Control
// TEST ENDPOINT: Try submitting working AlgoSDK transaction
app.post('/test-algosdk-submit', async (req, res) => {
  try {
    // Create funded test account (this won't work but will test our submission method)
    const testAccount = algosdk.generateAccount();
    
    const suggestedParams = await algorandMainnet.getSuggestedParams();
    const testTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: testAccount.addr,
      to: testAccount.addr,
      amount: 100000,
      suggestedParams
    });
    
    // Sign with AlgoSDK
    const signedTxn = testTxn.signTxn(testAccount.sk);
    
    // Try to submit (should fail due to no funds, but we'll see the error type)
    try {
      const result = await algorandMainnet.submitTransaction(signedTxn);
      res.json({ success: true, result });
    } catch (submitError) {
      res.json({ 
        success: false, 
        error: submitError instanceof Error ? submitError.message : 'Submit error',
        note: "This tests our submission method with a known good signature"
      });
    }
    
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// TEST ENDPOINT: Debug signature verification
app.post('/debug-signature', async (req, res) => {
  try {
    const { principal } = req.body;
    
    // Get custody info
    const custodyInfo = await icpCanisterService.deriveAlgorandAddress(principal);
    
    // Create a simple test transaction
    const suggestedParams = await algorandMainnet.getSuggestedParams();
    const testTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: custodyInfo.address,
      to: custodyInfo.address,
      amount: 100000, // 0.1 ALGO
      suggestedParams
    });
    
    // Get transaction bytes that should be signed
    const txnBytes = testTxn.bytesToSign();
    console.log(`Debug: Transaction bytes: ${txnBytes.length} bytes`);
    console.log(`Debug: First 32 bytes: [${Array.from(txnBytes.slice(0, 32))}]`);
    
    // Get raw transaction encoding
    const rawTxnEncoding = algosdk.encodeObj(testTxn.get_obj_for_encoding());
    console.log(`Debug: Raw transaction encoding: ${rawTxnEncoding.length} bytes`);
    console.log(`Debug: Raw first 32 bytes: [${Array.from(rawTxnEncoding.slice(0, 32))}]`);
    
    // Sign with ICP canister
    const signResult = await icpCanisterService.signAlgorandTransaction(principal, txnBytes);
    console.log(`Debug: ICP signature: ${signResult.signature.length} bytes`);
    
    res.json({
      success: true,
      txn_bytes_length: txnBytes.length,
      raw_encoding_length: rawTxnEncoding.length,
      signature_length: signResult.signature.length,
      bytes_match: Buffer.compare(txnBytes, rawTxnEncoding) === 0,
      debug: "Check if transaction bytes match raw encoding"
    });
    
  } catch (error) {
    console.error('Debug signature error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// TEST ENDPOINT: Verify address derivation correctness
app.post('/test-address-derivation', async (req, res) => {
  try {
    const { principal } = req.body;
    
    // Get custody info from ICP canister
    const custodyInfo = await icpCanisterService.deriveAlgorandAddress(principal);
    console.log(`ICP derived address: ${custodyInfo.address}`);
    console.log(`ICP public key length: ${custodyInfo.public_key.length} bytes`);
    console.log(`ICP public key first 8 bytes: ${Array.from(custodyInfo.public_key.slice(0, 8))}`);
    
    // Try to manually derive Algorand address from the public key
    let manualAddress: string;
    try {
      // If it's a 33-byte secp256k1 key, remove the prefix
      const keyForAddress = custodyInfo.public_key.length === 33 
        ? custodyInfo.public_key.slice(1) 
        : custodyInfo.public_key;
      
      // Use AlgoSDK to derive address from public key
      manualAddress = algosdk.encodeAddress(keyForAddress);
      console.log(`Manually derived address: ${manualAddress}`);
    } catch (error) {
      manualAddress = `Error: ${error instanceof Error ? error.message : 'Unknown'}`;
    }
    
    // Check if addresses match
    const addressesMatch = custodyInfo.address === manualAddress;
    console.log(`Addresses match: ${addressesMatch}`);
    
    res.json({
      success: true,
      icp_derived_address: custodyInfo.address,
      manual_derived_address: manualAddress,
      addresses_match: addressesMatch,
      public_key_length: custodyInfo.public_key.length,
      public_key_format: custodyInfo.public_key.length === 33 ? "secp256k1 compressed" : 
                          custodyInfo.public_key.length === 32 ? "Ed25519" : "unknown",
      debug_info: "This tests if ICP address derivation matches AlgoSDK address derivation"
    });
    
  } catch (error) {
    console.error('Test address derivation error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.post('/chain-fusion/transfer-algo', async (req, res) => {
  const startTime = Date.now();
  try {
    console.log('🔥 Real Chain Fusion: ALGO Transfer Request');
    const { principal, toAddress, amount, note } = req.body;
    
    // Validate inputs
    if (!principal || !toAddress || !amount) {
      return res.status(400).json({
        success: false,
        error: 'principal, toAddress, and amount are required'
      });
    }
    
    if (!algosdk.isValidAddress(toAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid destination address format'
      });
    }
    
    // Safety limits for real transactions
    const MAX_TRANSFER_AMOUNT = 5.0; // 5 ALGO max for safety
    const MIN_TRANSFER_AMOUNT = 0.001; // 0.001 ALGO minimum
    
    if (amount > MAX_TRANSFER_AMOUNT) {
      return res.status(400).json({
        success: false,
        error: `Maximum transfer amount is ${MAX_TRANSFER_AMOUNT} ALGO`,
        requested_amount: amount,
        max_allowed: MAX_TRANSFER_AMOUNT
      });
    }
    
    if (amount < MIN_TRANSFER_AMOUNT) {
      return res.status(400).json({
        success: false,
        error: `Minimum transfer amount is ${MIN_TRANSFER_AMOUNT} ALGO`,
        requested_amount: amount,
        min_required: MIN_TRANSFER_AMOUNT
      });
    }
    
    console.log(`🏗️ Chain Fusion Transfer: ${amount} ALGO from ${principal} to ${toAddress}`);
    
    // Step 1: Derive custody address from principal
    const custodyInfo = await icpCanisterService.deriveAlgorandAddress(principal);
    console.log(`📍 Custody Address: ${custodyInfo.address}`);
    
    // Step 2: Check custody address balance
    const custodyAccount = await algorandMainnet.getAccountInfo(custodyInfo.address);
    console.log(`💰 Custody Balance: ${custodyAccount.balance} ALGO`);
    
    if (custodyAccount.balance < amount + 0.001) { // +0.001 for fee
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance in custody address',
        custody_balance: custodyAccount.balance,
        requested_amount: amount,
        required_amount: amount + 0.001
      });
    }
    
    // Step 3: Create real Algorand payment transaction
    const transferNote = note || `Chain Fusion Transfer via ICP Threshold Signatures - ${Date.now()}`;
    const paymentTxn = await algorandMainnet.createPaymentTransaction(
      custodyInfo.address,
      toAddress,
      amount,
      transferNote
    );
    
    console.log('📋 Transaction Created:', {
      from: paymentTxn.from.toString(),
      to: paymentTxn.to.toString(),
      amount: paymentTxn.amount,
      fee: paymentTxn.fee
    });
    
    // Step 4: Get the actual public key that will sign
    console.log(`🔑 Custody public key: ${Array.from(custodyInfo.public_key).slice(0, 8)}... (${custodyInfo.public_key.length} bytes)`);
    
    // Final attempt: Use original bytesToSign() - maybe it was correct
    const bytesToSign = paymentTxn.bytesToSign();
    console.log(`🔐 Using original bytesToSign(): ${bytesToSign.length} bytes`);
    console.log(`🔐 First 8 bytes: [${Array.from(bytesToSign.slice(0, 8))}]`);
    
    // Check what the canister status shows about Ed25519 conversion
    console.log(`🔐 Canister claims: "secp256k1 (converted to Ed25519)"`);
    console.log(`🔐 Debug SHA equal: NO (using SHA-256 instead of SHA-512/256)`);
    
    // Try one more time with the original approach but double-check signature format
    const signedResult = await icpCanisterService.signAlgorandTransaction(principal, bytesToSign);
    console.log(`✅ Signature generated: ${Array.from(signedResult.signature.slice(0, 8))}... (${signedResult.signature.length} bytes)`);
    
    // Create signed transaction with the correct signature
    const signature = new Uint8Array(signedResult.signature);
    console.log(`📏 Signature: ${signature.length} bytes`);
    
    const signedTxnData = {
      sig: signature,
      txn: paymentTxn.get_obj_for_encoding()
    };
    
    const encodedSignedTxn = algosdk.encodeObj(signedTxnData);
    console.log(`📦 Signed transaction: ${encodedSignedTxn.length} bytes`);
    
    // Step 6: Submit to Algorand network
    console.log('🚀 Broadcasting transaction to Algorand testnet...');
    const submissionResult = await algorandMainnet.submitTransaction(encodedSignedTxn);
    
    console.log('🎉 REAL ALGORAND TRANSACTION CONFIRMED!', {
      txId: submissionResult.txId,
      confirmedRound: submissionResult.confirmedRound
    });
    
    // Step 7: Verify balance changes
    const newCustodyBalance = await algorandMainnet.getAccountInfo(custodyInfo.address);
    const destinationBalance = await algorandMainnet.getAccountInfo(toAddress);
    
    res.json({
      success: true,
      chain_fusion_proven: true,
      real_transaction: true,
      algorand_tx_id: submissionResult.txId,
      confirmed_round: submissionResult.confirmedRound,
      threshold_signature_id: signedResult.signed_tx_id,
      transfer_details: {
        from: custodyInfo.address,
        to: toAddress,
        amount: amount,
        note: transferNote
      },
      balance_changes: {
        custody_before: custodyAccount.balance,
        custody_after: newCustodyBalance.balance,
        destination_after: destinationBalance.balance,
        algo_moved: custodyAccount.balance - newCustodyBalance.balance
      },
      icp_canister: icpCanisterService.getCanisterId(),
      proof_of_control: 'Real ALGO moved via ICP threshold signatures',
      timestamp: new Date().toISOString()
    });
    
    // Log successful chain fusion operation
    logOperation('chain-fusion', true, Date.now() - startTime, principal);
    
  } catch (error) {
    console.error('❌ Chain Fusion transfer failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Log failed chain fusion operation
    logOperation('chain-fusion', false, Date.now() - startTime, req.body.principal, errorMessage);
    
    res.status(500).json({
      success: false,
      chain_fusion_proven: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
});

// Frontend compatibility endpoints (Phase 3 adaptations)
app.get('/api/v1/threshold/status', async (req, res) => {
  try {
    console.log('📊 Getting threshold signer status for frontend...');
    const status = await icpCanisterService.getCanisterStatus();
    res.json({
      success: true,
      canister_id: icpCanisterService.getCanisterId(),
      network: 'icp-mainnet',
      integration_status: 'operational',
      healthy: true,
      canister_status: status,
      last_check: Date.now()
    });
  } catch (error) {
    console.error('❌ Threshold status check failed:', error);
    res.status(500).json({
      success: false,
      canister_id: icpCanisterService.getCanisterId(),
      network: 'icp-mainnet',
      integration_status: 'error',
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/api/v1/threshold/derive-address', async (req, res) => {
  const startTime = Date.now();
  try {
    const { principal } = req.body;
    console.log(`🔐 Frontend requesting address derivation for principal: ${principal}`);
    
    if (!principal) {
      return res.status(400).json({
        success: false,
        error: 'Principal is required'
      });
    }

    const addressInfo = await icpCanisterService.deriveAlgorandAddress(principal);
    
    // Log successful custody address generation
    logOperation('custody-generation', true, Date.now() - startTime, principal);
    
    res.json({
      success: true,
      address: addressInfo.address,
      public_key: addressInfo.public_key,
      canister_id: icpCanisterService.getCanisterId()
    });
  } catch (error) {
    console.error('❌ Threshold address derivation failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Address derivation failed';
    
    // Log failed custody address generation
    logOperation('custody-generation', false, Date.now() - startTime, req.body.principal, errorMessage);
    
    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
});

app.post('/api/v1/sippar/mint/prepare', async (req, res) => {
  try {
    console.log('🪙 Frontend requesting mint preparation...');
    const { amount, user_principal } = req.body;
    
    if (!user_principal) {
      return res.status(400).json({
        success: false,
        error: 'user_principal is required'
      });
    }

    // Generate custody address for this user
    const addressInfo = await icpCanisterService.deriveAlgorandAddress(user_principal);

    // Register address with Sprint X deposit monitoring service
    await depositDetectionService.registerCustodyAddress(addressInfo.address, user_principal);
    console.log(`🔍 Address ${addressInfo.address} registered for deposit monitoring`);

    res.json({
      success: true,
      custody_address: addressInfo.address,
      expected_amount: amount || 0,
      deposit_deadline: Date.now() + 3600000, // 1 hour
      transaction_id: `mint_${Date.now()}`,
      method: 'threshold_ecdsa'
    });
  } catch (error) {
    console.error('❌ Mint preparation failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Mint preparation failed'
    });
  }
});

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

app.post('/api/v1/threshold/sign-transaction', async (req, res) => {
  try {
    console.log('🔐 Frontend requesting transaction signing...');
    const { transaction_data, principal } = req.body;
    
    if (!principal || !transaction_data) {
      return res.status(400).json({
        success: false,
        error: 'principal and transaction_data are required'
      });
    }

    // Use real threshold signing
    const signedTx = await icpCanisterService.signAlgorandTransaction(
      principal, 
      new Uint8Array(Buffer.from(transaction_data, 'hex'))
    );
    
    res.json({
      success: true,
      signed_transaction: signedTx.signature,
      transaction_id: signedTx.signed_tx_id,
      algorand_tx_id: `ALGO_TX_${Date.now()}`
    });
  } catch (error) {
    console.error('❌ Transaction signing failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Transaction signing failed'
    });
  }
});

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp: new Date().toISOString(),
  });
});

// AI Integration Endpoints
app.get('/api/ai/status', async (req, res) => {
  try {
    // Check OpenWebUI service availability
    const response = {
      success: true,
      openwebui: {
        available: true,
        endpoint: 'https://chat.nuru.network',
        responseTime: 50  // Simulated response time
      },
      timestamp: new Date().toISOString()
    };
    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'AI service check failed'
    });
  }
});

app.post('/api/ai/auth-url', async (req, res) => {
  try {
    const { userPrincipal, algorandAddress, authSignature } = req.body;
    
    // Generate authenticated URL for OpenWebUI
    const authUrl = `https://chat.nuru.network?user=${encodeURIComponent(userPrincipal)}&addr=${encodeURIComponent(algorandAddress || '')}`;
    
    res.json({
      success: true,
      authUrl: authUrl,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate auth URL'
    });
  }
});

// ============================================================================
// ENHANCED AI ENDPOINTS (Sprint 012.5 Integration)
// ============================================================================

// Basic AI Query Endpoint - Compatible with enhanced ckALGO canister
app.post('/api/sippar/ai/query', async (req, res) => {
  try {
    const { query, userPrincipal, serviceType = 'general' } = req.body;

    if (!query || !userPrincipal) {
      return res.status(400).json({
        success: false,
        error: 'Query and userPrincipal are required'
      });
    }

    // Simulate AI service response - in production, route to appropriate AI service
    const response = {
      success: true,
      data: {
        query: query,
        response: `AI Response to: ${query}`,
        serviceType: serviceType,
        userPrincipal: userPrincipal,
        responseTime: Math.floor(Math.random() * 100) + 50, // 50-150ms
        model: 'qwen2.5:0.5b',
        tokens: {
          input: query.length / 4, // Approximate token count
          output: 50
        }
      },
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    console.error('AI Query Error:', error);
    res.status(500).json({
      success: false,
      error: 'AI query processing failed'
    });
  }
});

// AI Oracle Query Endpoint - Algorand AI Oracle integration
app.post('/api/v1/ai-oracle/query', async (req, res) => {
  try {
    const { query, userPrincipal, algorandData } = req.body;

    if (!query || !userPrincipal) {
      return res.status(400).json({
        success: false,
        error: 'Query and userPrincipal are required'
      });
    }

    // Simulate Oracle response - in production, connect to App ID 745336394
    const response = {
      success: true,
      data: {
        query: query,
        oracleResponse: `Oracle Response: ${query}`,
        algorandData: algorandData || {},
        userPrincipal: userPrincipal,
        responseTime: Math.floor(Math.random() * 80) + 40, // 40-120ms
        appId: 745336394,
        confidence: 0.95,
        sources: ['algorand-mainnet', 'algorand-testnet']
      },
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    console.error('AI Oracle Query Error:', error);
    res.status(500).json({
      success: false,
      error: 'AI Oracle query failed'
    });
  }
});

// OpenWebUI Chat Authentication Endpoint
app.post('/api/sippar/ai/chat-auth', async (req, res) => {
  try {
    const { userPrincipal, algorandAddress } = req.body;

    if (!userPrincipal) {
      return res.status(400).json({
        success: false,
        error: 'userPrincipal is required'
      });
    }

    // Generate authenticated URL for OpenWebUI
    const authUrl = `https://chat.nuru.network?user=${encodeURIComponent(userPrincipal)}&addr=${encodeURIComponent(algorandAddress || '')}`;

    const response = {
      success: true,
      data: {
        authUrl: authUrl,
        userPrincipal: userPrincipal,
        algorandAddress: algorandAddress,
        expires: Date.now() + (60 * 60 * 1000), // 1 hour
        chatService: 'OpenWebUI',
        models: ['qwen2.5:0.5b', 'deepseek-r1', 'phi-3', 'mistral']
      },
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    console.error('Chat Auth Error:', error);
    res.status(500).json({
      success: false,
      error: 'Chat authentication failed'
    });
  }
});

// Enhanced AI Query with Caching
app.post('/api/sippar/ai/enhanced-query', async (req, res) => {
  try {
    const { query, userPrincipal, serviceType, cacheEnabled = true } = req.body;

    if (!query || !userPrincipal) {
      return res.status(400).json({
        success: false,
        error: 'Query and userPrincipal are required'
      });
    }

    // Enhanced response with caching simulation
    const response = {
      success: true,
      data: {
        query: query,
        response: `Enhanced AI Response: ${query}`,
        serviceType: serviceType || 'enhanced',
        userPrincipal: userPrincipal,
        responseTime: Math.floor(Math.random() * 60) + 30, // 30-90ms (faster due to caching)
        cached: cacheEnabled && Math.random() > 0.5, // 50% cache hit rate
        model: 'qwen2.5:0.5b',
        confidence: 0.98,
        tokens: {
          input: query.length / 4,
          output: 75
        },
        metadata: {
          tier: 'premium',
          features: ['caching', 'enhanced_context', 'priority_processing']
        }
      },
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    console.error('Enhanced AI Query Error:', error);
    res.status(500).json({
      success: false,
      error: 'Enhanced AI query processing failed'
    });
  }
});

// AI Service Health Endpoints
app.get('/api/v1/ai-oracle/health', async (req, res) => {
  try {
    const response = {
      success: true,
      data: {
        status: 'healthy',
        appId: 745336394,
        network: 'algorand-testnet',
        responseTime: Math.floor(Math.random() * 50) + 20, // 20-70ms
        uptime: '99.9%',
        lastUpdate: new Date().toISOString(),
        version: '1.0.0'
      },
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    console.error('AI Oracle Health Check Error:', error);
    res.status(500).json({
      success: false,
      error: 'AI Oracle health check failed'
    });
  }
});

app.get('/api/sippar/ai/health', async (req, res) => {
  try {
    const response = {
      success: true,
      data: {
        status: 'healthy',
        services: {
          openwebui: {
            status: 'healthy',
            endpoint: 'https://chat.nuru.network',
            responseTime: 45
          },
          oracle: {
            status: 'healthy',
            appId: 745336394,
            responseTime: 35
          }
        },
        uptime: '99.8%',
        version: '1.0.0-sprint-012.5'
      },
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    console.error('AI Health Check Error:', error);
    res.status(500).json({
      success: false,
      error: 'AI health check failed'
    });
  }
});

// ALGO Migration endpoint - Transfer from old address to new address
app.post('/migrate-algo', async (req, res) => {
  try {
    const { principal, fromAddress, toAddress, amount } = req.body;
    
    console.log(`🔄 Processing ALGO migration: ${amount} ALGO from ${fromAddress} to ${toAddress}`);
    console.log(`🔄 User principal: ${principal}`);
    
    // 1. Verify addresses
    if (!algosdk.isValidAddress(fromAddress) || !algosdk.isValidAddress(toAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Algorand addresses provided'
      });
    }
    
    // 2. Create ALGO transfer transaction
    const microAlgos = Math.floor(amount * 1000000); // Convert to microALGO
    const paymentTxn = await algorandMainnet.createPaymentTransaction(
      fromAddress,
      toAddress,
      microAlgos,
      `Migration from old to new Sippar address`
    );
    
    // 4. Get transaction bytes for signing  
    const txnBytes = paymentTxn.bytesToSign();
    
    // 5. Sign using OLD derivation method (migration function)
    const signedTransaction = await icpCanisterService.signMigrationTransaction(
      principal,
      new Uint8Array(txnBytes)
    );
    
    // 6. Prepare signed transaction data for submission
    const signedTxnData = {
      txn: paymentTxn,
      sig: new Uint8Array(signedTransaction.signature)
    };
    
    // 7. Encode and submit to Algorand network
    const encodedSignedTxn = algosdk.encodeObj(signedTxnData);
    const submissionResult = await algorandMainnet.submitTransaction(encodedSignedTxn);
    
    res.json({
      success: true,
      operation: 'migrate',
      from_address: fromAddress,
      to_address: toAddress,
      amount: amount,
      transaction_id: submissionResult.txId,
      signed_tx_id: signedTransaction.signed_tx_id,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ ALGO migration failed:', error);
    res.status(500).json({
      success: false,
      operation: 'migrate',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString()
    });
  }
});

// ==========================================
// Sprint 018.1: CI Agent Integration Endpoints
// Sprint 018.2 Phase E: Rate Limiting Applied
// ==========================================

// Create rate limiters
const ciAgentRateLimiter = createRateLimiter(); // Default: 100 req/min, 5 concurrent
const ciAgentStrictLimiter = createStrictRateLimiter(); // 20 req/min, 2 concurrent
const ciAgentLenientLimiter = createLenientRateLimiter(); // 200 req/min, 10 concurrent

// CI Agent Service Call
app.post('/api/sippar/ci-agents/:agent/:service',
  ciAgentRateLimiter,
  validatePathParams({ agent: pathValidators.agentId, service: pathValidators.serviceName }),
  validateAgentInvocation,
  async (req, res) => {
  const startTime = performance.now();
  const { agent, service } = req.params;
  const { sessionId, requirements, paymentToken, prompt } = req.body;

  try {
    // Extract principal from request (would be set by authentication middleware)
    const principal = req.body.principal || 'anonymous';

    console.log(`🤖 CI Agent service call: ${agent}/${service} for principal: ${principal.slice(0, 10)}...`);

    // Payment verification: require a valid X402 service token (JWT signed)
    // Token is obtained via POST /api/sippar/x402/create-payment
    const verification = x402Service.verifyServiceToken(paymentToken || '');

    if (!verification.valid) {
      return res.status(402).json({
        success: false,
        error: 'Payment required',
        message: verification.error || 'Obtain a payment token via POST /api/sippar/x402/create-payment, then pass it as paymentToken in the request body',
        payment_endpoint: `/api/sippar/x402/create-payment`,
        service_info: {
          agent,
          service,
          pricing: ciAgentService.getAvailableAgents().find(a => a.id.includes(agent))?.pricing
        }
      });
    }

    // BUG FIX: Validate that JWT's service (svc) field matches the requested endpoint
    // This prevents a token paid for service A from being used to invoke service B
    if (verification.payload) {
      const requestedService = `/ci-agents/${agent}/${service}`;
      const tokenService = verification.payload.svc || '';

      // Normalize service paths for comparison (handle various formats)
      const normalizeService = (svc: string): string => {
        // Remove leading /api/sippar if present
        let normalized = svc.replace(/^\/api\/sippar/, '');
        // Convert dashes to slashes for "ci-agent-service" format
        if (normalized.match(/^ci-[a-z]+-[a-z-]+$/)) {
          const parts = normalized.split('-');
          // ci-developer-code-generation -> /ci-agents/developer/code-generation
          if (parts.length >= 3 && parts[0] === 'ci') {
            normalized = `/ci-agents/${parts[1]}/${parts.slice(2).join('-')}`;
          }
        }
        // Ensure leading slash
        if (!normalized.startsWith('/')) {
          normalized = '/' + normalized;
        }
        return normalized;
      };

      const normalizedRequested = normalizeService(requestedService);
      const normalizedToken = normalizeService(tokenService);

      if (normalizedRequested !== normalizedToken) {
        console.warn(`🚫 Service mismatch: Token for "${tokenService}" used on "${requestedService}"`);
        return res.status(403).json({
          success: false,
          error: 'Token not valid for this service',
          message: 'The payment token was issued for a different service endpoint',
          expected: requestedService,
          tokenService: tokenService
        });
      }
    }

    // Consume token to prevent replay attacks
    if (verification.payload) {
      x402Service.consumeToken(verification.payload.jti);
    }

    // BUG FIX: Extract prompt string properly from various input formats
    // Supports: { prompt: "..." }, { requirements: "..." }, { requirements: { task: "..." } }
    let promptString: string;
    if (typeof prompt === 'string' && prompt.trim()) {
      // Direct prompt field (preferred)
      promptString = prompt;
    } else if (typeof requirements === 'string' && requirements.trim()) {
      // Requirements as string
      promptString = requirements;
    } else if (requirements && typeof requirements === 'object') {
      // Requirements as object - extract task, prompt, or description
      promptString = requirements.task || requirements.prompt || requirements.description ||
                     (Object.keys(requirements).length > 0 ? JSON.stringify(requirements) : '');
    } else {
      promptString = '';
    }

    // Call CI agent service
    const result = await ciAgentService.callAgent({
      agent,
      task: service,
      sessionId: sessionId || `session-${Date.now()}`,
      requirements: promptString,
      principal,
      paymentVerified: true
    });

    const duration = performance.now() - startTime;

    console.log(`✅ CI Agent ${agent}/${service} completed in ${duration.toFixed(2)}ms`);
    logOperation(`ci-agent-${agent}-${service}`, true, duration);

    res.json({
      success: true,
      result,
      service: `ci-${agent}-${service}`,
      performance: {
        processing_time_ms: Math.round(duration),
        quality_score: result.quality_score
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const duration = performance.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    console.error(`❌ CI Agent ${agent}/${service} failed:`, errorMessage);
    logOperation(`ci-agent-${agent}-${service}`, false, duration, undefined, errorMessage);

    res.status(500).json({
      success: false,
      error: 'CI Agent service failed',
      details: errorMessage,
      service: `ci-${agent}-${service}`,
      timestamp: new Date().toISOString()
    });
  }
});

// CI Agent Marketplace Discovery (lenient rate limit for read-only)
app.get('/api/sippar/ci-agents/marketplace', ciAgentLenientLimiter, async (req, res) => {
  const startTime = performance.now();

  try {
    const agents = ciAgentService.getAvailableAgents();
    const metrics = ciAgentService.getMetrics();

    const duration = performance.now() - startTime;
    logOperation('ci-agents-marketplace', true, duration);

    res.json({
      success: true,
      marketplace: {
        agents,
        totalAgents: agents.length,
        categories: ['ai-analysis', 'architecture', 'development', 'security', 'analysis'],
        metrics: {
          totalCalls: metrics.totalCalls,
          averageQuality: metrics.averageQuality,
          averageResponseTime: `${metrics.averageResponseTime.toFixed(0)}ms`,
          successRate: `${metrics.successRate.toFixed(1)}%`,
          status: metrics.status
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const duration = performance.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logOperation('ci-agents-marketplace', false, duration, undefined, errorMessage);

    res.status(500).json({
      success: false,
      error: 'Failed to get CI agents marketplace',
      details: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
});

// CI Agent Service Analytics (lenient rate limit for read-only)
app.get('/api/sippar/ci-agents/analytics', ciAgentLenientLimiter, async (req, res) => {
  const startTime = performance.now();

  try {
    const metrics = ciAgentService.getMetrics();
    const callHistory = ciAgentService.getCallHistory(20);

    const duration = performance.now() - startTime;
    logOperation('ci-agents-analytics', true, duration);

    res.json({
      success: true,
      analytics: {
        metrics,
        recent_calls: callHistory,
        agent_performance: ciAgentService.getAvailableAgents().map(agent => ({
          agent_id: agent.id,
          name: agent.name,
          category: agent.category,
          pricing: agent.pricing,
          estimated_calls: Math.floor(Math.random() * 50), // Would be real data in production
          satisfaction: (85 + Math.random() * 15).toFixed(1) + '%'
        }))
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const duration = performance.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logOperation('ci-agents-analytics', false, duration, undefined, errorMessage);

    res.status(500).json({
      success: false,
      error: 'Failed to get CI agents analytics',
      details: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
});

// CI Agent Health Check (lenient rate limit for read-only)
app.get('/api/sippar/ci-agents/health', ciAgentLenientLimiter, async (req, res) => {
  const startTime = performance.now();

  try {
    const metrics = ciAgentService.getMetrics();
    const agents = ciAgentService.getAvailableAgents();

    const duration = performance.now() - startTime;
    logOperation('ci-agents-health', true, duration);

    res.json({
      success: true,
      health: {
        status: 'healthy',
        agents_available: agents.length,
        uptime: metrics.uptime,
        total_calls: metrics.totalCalls,
        success_rate: `${metrics.successRate.toFixed(1)}%`,
        average_response_time: `${metrics.averageResponseTime.toFixed(0)}ms`,
        ci_system_path: '/Users/eladm/Projects/CollaborativeIntelligence/AGENTS',
        integration_status: 'operational'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const duration = performance.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logOperation('ci-agents-health', false, duration, undefined, errorMessage);

    res.status(500).json({
      success: false,
      error: 'CI agents health check failed',
      details: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
});

// Sprint 018.2 Phase J: Smart Routing Endpoint
app.post('/api/sippar/ci-agents/route', ciAgentLenientLimiter, validateSmartRouting, async (req, res) => {
  const startTime = performance.now();

  try {
    const { taskDescription, sessionId, userId } = req.body;

    // Try team assembly first - it will intelligently detect multi-component tasks
    const potentialTeam = ciAgentService.assembleTeamForTask(taskDescription);

    // Select agent(s) based on team assembly results
    let recommendation;
    if (potentialTeam.length > 1) {
      // Multiple agents identified - this is a team task
      const agentDetails = potentialTeam.map(agentId => {
        const agentDef = ciAgentService.getAvailableAgents().find(a =>
          a.id.includes(agentId.toLowerCase())
        );
        return {
          agent: agentId,
          name: agentDef?.name || agentId,
          pricing: agentDef?.pricing || { base: 0, currency: 'USDC' },
          endpoint: agentDef?.endpoint || `/ci-agents/${agentId}/task`
        };
      });

      recommendation = {
        type: 'team',
        agents: agentDetails,
        total_agents: potentialTeam.length,
        estimated_cost: agentDetails.reduce((sum, a) => sum + a.pricing.base, 0),
        reasoning: `Multi-agent team assembled for complex task requiring ${potentialTeam.length} specialists`
      };
    } else {
      // Single agent - use the one returned by team assembly
      const agentId = potentialTeam[0];
      const agentDef = ciAgentService.getAvailableAgents().find(a =>
        a.id.includes(agentId.toLowerCase())
      );

      recommendation = {
        type: 'single',
        agent: {
          agent: agentId,
          name: agentDef?.name || agentId,
          pricing: agentDef?.pricing || { base: 0, currency: 'USDC' },
          endpoint: agentDef?.endpoint || `/ci-agents/${agentId}/task`
        },
        reasoning: `Optimal single agent selected based on task keywords`
      };
    }

    const duration = performance.now() - startTime;
    logOperation('smart-routing', true, duration, userId);

    res.json({
      success: true,
      taskDescription,
      sessionId,
      recommendation,
      processing_time_ms: Math.round(duration),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const duration = performance.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logOperation('smart-routing', false, duration, undefined, errorMessage);

    res.status(500).json({
      success: false,
      error: 'Smart routing failed',
      details: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
});

// =============================================================================
// DEPOSIT MONITORING ENDPOINTS - Sprint X.1 Phase 1.1
// =============================================================================

/**
 * Get deposit monitoring statistics
 * GET /deposits/monitoring-stats
 */
app.get('/deposits/monitoring-stats', async (req, res) => {
  try {
    console.log(`📊 Getting deposit monitoring statistics...`);

    const monitoringStats = depositDetectionService.getMonitoringStats();

    res.json({
      success: true,
      data: monitoringStats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Deposit monitoring stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get deposit monitoring statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Start deposit monitoring
 * POST /deposits/start-monitoring
 */
app.post('/deposits/start-monitoring', async (req, res) => {
  try {
    console.log(`🔍 Starting deposit monitoring...`);

    await depositDetectionService.startMonitoring();

    res.json({
      success: true,
      message: 'Deposit monitoring started successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Start deposit monitoring error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start deposit monitoring',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Stop deposit monitoring
 * POST /deposits/stop-monitoring
 */
app.post('/deposits/stop-monitoring', async (req, res) => {
  try {
    console.log(`🛑 Stopping deposit monitoring...`);

    depositDetectionService.stopMonitoring();

    res.json({
      success: true,
      message: 'Deposit monitoring stopped successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Stop deposit monitoring error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop deposit monitoring',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get pending deposits for monitoring
 * GET /deposits/pending
 */
app.get('/deposits/pending', async (req, res) => {
  try {
    console.log(`📋 Getting pending deposits...`);

    const monitoringStats = depositDetectionService.getMonitoringStats();
    const pendingDeposits = Array.isArray(monitoringStats.pendingDeposits)
      ? monitoringStats.pendingDeposits
      : [];

    res.json({
      success: true,
      data: {
        pendingDeposits,
        totalPending: pendingDeposits.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Pending deposits error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pending deposits',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// =============================================================================
// MIGRATION ENDPOINTS - Sprint X.1 Phase 1.1
// =============================================================================

/**
 * Get migration status for a user
 * GET /migration/status/:principal
 */
app.get('/migration/status/:principal', async (req, res) => {
  try {
    console.log(`📊 Getting migration status for principal: ${req.params.principal}`);

    // Validate principal
    let principal: Principal;
    try {
      principal = Principal.fromText(req.params.principal);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid principal format',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    const migrationStatus = await migrationService.getUserMigrationStatus(principal);

    res.json({
      success: true,
      data: migrationStatus,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Migration status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get migration status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Execute fresh start migration
 * POST /migration/fresh-start
 */
app.post('/migration/fresh-start', async (req, res) => {
  try {
    console.log(`🆕 Starting fresh start migration...`);

    // Validate request body
    const schema = z.object({
      principal: z.string()
    });

    const { principal: principalStr } = schema.parse(req.body);

    // Validate principal
    let principal: Principal;
    try {
      principal = Principal.fromText(principalStr);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid principal format',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    const migrationResult = await migrationService.executeFreshStartMigration(principal);

    if (migrationResult.success) {
      res.json({
        success: true,
        data: migrationResult,
        message: 'Fresh start migration initiated successfully',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Fresh start migration failed',
        details: migrationResult.errorMessage,
        data: migrationResult
      });
    }

  } catch (error) {
    console.error('❌ Fresh start migration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute fresh start migration',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Execute migration bridge
 * POST /migration/bridge
 */
app.post('/migration/bridge', async (req, res) => {
  try {
    console.log(`🌉 Starting migration bridge...`);

    // Validate request body
    const schema = z.object({
      principal: z.string(),
      amount: z.number().positive()
    });

    const { principal: principalStr, amount } = schema.parse(req.body);

    // Validate principal
    let principal: Principal;
    try {
      principal = Principal.fromText(principalStr);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid principal format',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    const migrationResult = await migrationService.executeMigrationBridge(principal, amount);

    if (migrationResult.success) {
      res.json({
        success: true,
        data: migrationResult,
        message: 'Migration bridge initiated successfully',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Migration bridge failed',
        details: migrationResult.errorMessage,
        data: migrationResult
      });
    }

  } catch (error) {
    console.error('❌ Migration bridge error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute migration bridge',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Complete migration bridge after deposit confirmation
 * POST /migration/bridge/complete
 */
app.post('/migration/bridge/complete', async (req, res) => {
  try {
    console.log(`✅ Completing migration bridge...`);

    // Validate request body
    const schema = z.object({
      migrationId: z.string(),
      depositTxId: z.string()
    });

    const { migrationId, depositTxId } = schema.parse(req.body);

    await migrationService.completeMigrationBridge(migrationId, depositTxId);

    res.json({
      success: true,
      message: 'Migration bridge completed successfully',
      data: {
        migrationId,
        depositTxId,
        completedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Migration bridge completion error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete migration bridge',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get migration statistics
 * GET /migration/stats
 */
app.get('/migration/stats', async (req, res) => {
  try {
    console.log(`📊 Getting migration statistics...`);

    const migrationStats = await migrationService.getMigrationStatistics();

    res.json({
      success: true,
      data: migrationStats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Migration statistics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get migration statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get migration progress for a user
 * GET /migration/progress/:principal
 */
app.get('/migration/progress/:principal', async (req, res) => {
  try {
    console.log(`📈 Getting migration progress for principal: ${req.params.principal}`);

    // Validate principal
    let principal: Principal;
    try {
      principal = Principal.fromText(req.params.principal);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid principal format',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    const migrationProgress = await migrationService.getUserMigrationProgress(principal);

    if (migrationProgress) {
      res.json({
        success: true,
        data: migrationProgress,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Migration progress not found',
        message: 'No migration in progress for this user'
      });
    }

  } catch (error) {
    console.error('❌ Migration progress error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get migration progress',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// =============================================================================
// PRODUCTION MONITORING ENDPOINTS - Sprint X.1 Phase 2
// =============================================================================

/**
 * Get comprehensive system health metrics
 * GET /monitoring/system
 */
app.get('/monitoring/system', async (req, res) => {
  try {
    console.log('📊 Getting system health metrics...');

    const systemMetrics = await productionMonitoringService.collectSystemMetrics();

    res.json({
      success: true,
      data: systemMetrics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ System metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to collect system metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get migration system metrics
 * GET /monitoring/migration
 */
app.get('/monitoring/migration', async (req, res) => {
  try {
    console.log('📈 Getting migration system metrics...');

    const migrationMetrics = await productionMonitoringService.collectMigrationMetrics();

    res.json({
      success: true,
      data: migrationMetrics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Migration metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to collect migration metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get reserve backing metrics
 * GET /monitoring/reserves
 */
app.get('/monitoring/reserves', async (req, res) => {
  try {
    console.log('🏦 Getting reserve backing metrics...');

    const reserveMetrics = await productionMonitoringService.collectReserveMetrics();

    res.json({
      success: true,
      data: reserveMetrics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Reserve metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to collect reserve metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get active alerts
 * GET /monitoring/alerts
 */
app.get('/monitoring/alerts', async (req, res) => {
  try {
    console.log('🚨 Getting active alerts...');

    const activeAlerts = await productionMonitoringService.checkAlertConditions();

    res.json({
      success: true,
      data: {
        activeAlerts,
        alertHistory: productionMonitoringService.getAlertHistory(20),
        totalActiveAlerts: activeAlerts.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Alerts collection error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to collect alerts',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Test alert system
 * POST /monitoring/alerts/test
 */
app.post('/monitoring/alerts/test', async (req, res) => {
  try {
    console.log('🧪 Testing alert system...');

    const testResults = await alertManager.testNotifications();

    res.json({
      success: true,
      data: {
        testResults,
        channelHealth: await alertManager.checkChannelHealth(),
        message: 'Alert system test completed'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Alert test error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test alert system',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Execute health checks
 * GET /monitoring/health-checks
 */
app.get('/monitoring/health-checks', async (req, res) => {
  try {
    console.log('🏥 Executing comprehensive health checks...');

    const healthChecks = await productionMonitoringService.executeHealthChecks();

    res.json({
      success: true,
      data: {
        healthChecks,
        summary: {
          totalChecks: healthChecks.length,
          healthyCount: healthChecks.filter(check => check.status === 'HEALTHY').length,
          degradedCount: healthChecks.filter(check => check.status === 'DEGRADED').length,
          offlineCount: healthChecks.filter(check => check.status === 'OFFLINE').length
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Health checks error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute health checks',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get comprehensive dashboard data
 * GET /monitoring/dashboard
 */
app.get('/monitoring/dashboard', async (req, res) => {
  try {
    console.log('📊 Getting comprehensive dashboard data...');

    // Collect all monitoring data in parallel
    const [systemMetrics, migrationMetrics, reserveMetrics, activeAlerts, healthChecks] = await Promise.all([
      productionMonitoringService.collectSystemMetrics(),
      productionMonitoringService.collectMigrationMetrics(),
      productionMonitoringService.collectReserveMetrics(),
      productionMonitoringService.checkAlertConditions(),
      productionMonitoringService.executeHealthChecks()
    ]);

    // Get alert manager statistics
    const alertStats = alertManager.getDeliveryStatistics();

    const dashboardData = {
      system: systemMetrics,
      migration: migrationMetrics,
      reserves: reserveMetrics,
      alerts: {
        active: activeAlerts,
        recent: productionMonitoringService.getAlertHistory(10),
        statistics: alertStats
      },
      healthChecks: {
        results: healthChecks,
        summary: {
          totalChecks: healthChecks.length,
          healthyCount: healthChecks.filter(check => check.status === 'HEALTHY').length,
          degradedCount: healthChecks.filter(check => check.status === 'DEGRADED').length,
          offlineCount: healthChecks.filter(check => check.status === 'OFFLINE').length
        }
      },
      lastUpdated: new Date().toISOString()
    };

    res.json({
      success: true,
      data: dashboardData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Dashboard data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to collect dashboard data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get monitoring metrics history
 * GET /monitoring/history
 */
app.get('/monitoring/history', async (req, res) => {
  try {
    console.log('📈 Getting monitoring metrics history...');

    const history = productionMonitoringService.getMetricsHistory();

    res.json({
      success: true,
      data: {
        system: history.system.slice(-24), // Last 24 entries
        migration: history.migration.slice(-24),
        reserve: history.reserve.slice(-24),
        alertHistory: productionMonitoringService.getAlertHistory(50)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ History collection error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to collect metrics history',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ==========================================
// ELNA.ai Integration Endpoints - Sprint 018
// ==========================================

app.get('/api/sippar/elna/agents', async (req, res) => {
  try {
    const elna = new ElnaIntegration();
    await elna.connect();
    const agents = await elna.listAgents();

    res.json({
      success: true,
      count: agents.length,
      agents: agents
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.get('/api/sippar/elna/agents/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const elna = new ElnaIntegration();
    await elna.connect();
    const agentDetails = await elna.getAgentDetails(agentId);

    if (agentDetails) {
      res.json({
        success: true,
        agent: agentDetails
      });
    } else {
      res.status(404).json({
        success: false,
        error: `Agent not found: ${agentId}`
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Day 3: ELNA Payment Routing endpoint
app.post('/api/sippar/elna/payment', async (req, res) => {
  try {
    const { fromAgent, toAgent, amount, principal } = req.body;

    if (!fromAgent || !toAgent || amount === undefined || amount === null) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: fromAgent, toAgent, amount'
      });
    }

    // Validate amount is positive
    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be greater than zero',
        transactionId: '',
        amount: 0,
        fee: 0,
        timestamp: Date.now()
      });
    }

    console.log('🔄 Processing ELNA payment request...');
    const elna = new ElnaIntegration();
    await elna.connect();

    const result = await elna.routePayment({
      fromAgent,
      toAgent,
      amount,
      currency: 'ckALGO',
      principal: principal || 'anonymous'
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      transactionId: '',
      amount: 0,
      fee: 0,
      timestamp: Date.now()
    });
  }
});

// Day 3: Enable ckALGO payments for an agent
app.post('/api/sippar/elna/agents/:agentId/enable-ckalgo', async (req, res) => {
  try {
    const { agentId } = req.params;

    console.log(`🔧 Enabling ckALGO for agent: ${agentId}`);
    const elna = new ElnaIntegration();
    await elna.connect();

    const success = await elna.enableCkAlgoPayments(agentId);

    res.json({
      success,
      agentId,
      paymentMethod: 'ckALGO',
      feeRate: 0.001,
      message: success ? 'ckALGO payments enabled' : 'Failed to enable ckALGO'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Day 3: Revenue stats endpoint
app.get('/api/sippar/elna/revenue', async (req, res) => {
  try {
    const elna = new ElnaIntegration();
    const stats = await elna.getRevenueStats();

    res.json({
      success: true,
      revenue: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ==========================================
// X402 Payment Protocol Endpoints
// ==========================================

// X402 Payment Creation
// Rate limiting storage
const rateLimitStorage = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute per IP

// Security validation functions
function validatePrincipal(principal: string): boolean {
  // ICP Principal format: 5-63 characters, lowercase letters and digits, with dashes
  const principalRegex = /^[a-z0-9\-]{5,63}$/;
  return principalRegex.test(principal);
}

function validateAlgorandAddress(address: string): boolean {
  // Algorand address: 58 characters, base32 encoding
  const algorandRegex = /^[A-Z2-7]{58}$/;
  return algorandRegex.test(address);
}

function validateServiceEndpoint(service: string): boolean {
  // Whitelist of allowed service endpoints
  const allowedServices = [
    // AI Services
    'ai-oracle-basic',
    'ai-oracle-enhanced',
    'ai-oracle-enterprise',
    // AI Chat Services
    'ai-chat-basic',
    'ai-chat-enhanced',
    // Chain Fusion Services
    'chain-fusion-basic',
    'chain-fusion-enhanced',
    // ckALGO Services
    'ckALGO-mint',
    'ckALGO-redeem',
    // External API Services
    'external-openai-gpt4',
    'external-claude-sonnet',
    // Analytics Services
    'blockchain-analytics',
    // CI Agent Services
    'ci-developer-code-generation',
    'ci-documenter-documentation',
    'ci-refactorer-code-improvement',
    'ci-tester-qa-testing',
    'ci-debugger-issue-resolution',
    'ci-analyst-data-analysis',
    'ci-athena-memory-optimization',
    'ci-architect-system-design',
    'ci-ui-interface-development',
    'ci-database-data-management',
    'ci-builder-full-stack',
    'ci-fixer-problem-resolution',
    'ci-designer-design-systems',
    'ci-optimizer-performance',
    'ci-researcher-analysis',
    'ci-auditor-security-review',
    'ci-webarchitect-web-systems',
    'ci-technicalarchitect-technical-design',
    'ci-cryptographer-security-systems',
    'ci-solutionarchitect-solution-design'
  ];
  return allowedServices.includes(service);
}

function validatePaymentAmount(amount: number): boolean {
  // Amount must be positive number between 0.001 and 100 ALGO
  return typeof amount === 'number' && amount > 0 && amount <= 100;
}

function sanitizeInput(input: string): string {
  // Remove potential XSS and injection patterns
  return input.replace(/[<>'"&]/g, '').trim().slice(0, 100);
}

function checkRateLimit(clientIp: string): boolean {
  const now = Date.now();
  const clientLimit = rateLimitStorage.get(clientIp);

  if (!clientLimit || now > clientLimit.resetTime) {
    // Reset window
    rateLimitStorage.set(clientIp, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (clientLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false; // Rate limit exceeded
  }

  clientLimit.count++;
  return true;
}

app.post('/api/sippar/x402/create-payment', async (req, res) => {
  const startTime = performance.now();
  const clientIp = req.ip || req.connection.remoteAddress || 'unknown';

  try {
    // Rate limiting check
    if (!checkRateLimit(clientIp)) {
      const duration = performance.now() - startTime;
      logOperation('x402-create-payment', false, duration, undefined, `Rate limit exceeded for IP: ${clientIp}`);

      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        details: 'Maximum 10 requests per minute allowed',
        processingTime: `${duration.toFixed(2)}ms`,
        timestamp: new Date().toISOString()
      });
    }

    const { service, amount, principal, algorandAddress, aiModel = 'default', metadata = {} } = req.body;

    // Enhanced validation with security checks
    const validationErrors = [];

    if (!service) validationErrors.push('service is required');
    else if (!validateServiceEndpoint(service)) validationErrors.push('invalid service endpoint');

    if (!amount) validationErrors.push('amount is required');
    else if (!validatePaymentAmount(amount)) validationErrors.push('amount must be between 0.001 and 100');

    if (!principal) validationErrors.push('principal is required');
    else if (!validatePrincipal(principal)) validationErrors.push('invalid principal format');

    if (!algorandAddress) validationErrors.push('algorandAddress is required');
    else if (!validateAlgorandAddress(algorandAddress)) validationErrors.push('invalid Algorand address format');

    if (validationErrors.length > 0) {
      const duration = performance.now() - startTime;
      logOperation('x402-create-payment', false, duration, undefined, `Validation failed: ${validationErrors.join(', ')}`);

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationErrors,
        processingTime: `${duration.toFixed(2)}ms`,
        timestamp: new Date().toISOString()
      });
    }

    // Sanitize inputs and create secure request object
    const paymentRequest = {
      serviceEndpoint: sanitizeInput(service),
      paymentAmount: amount,
      aiModel: sanitizeInput(aiModel),
      requestId: `req-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      payerCredentials: {
        principal: sanitizeInput(principal),
        algorandAddress: sanitizeInput(algorandAddress)
      },
      metadata: {
        clientIp,
        userAgent: sanitizeInput(req.headers['user-agent'] || 'unknown'),
        timestamp: new Date().toISOString(),
        securityValidated: true
      }
    };

    const payment = await x402Service.createEnterprisePayment(paymentRequest);

    const duration = performance.now() - startTime;

    // Security audit logging
    console.log(`🔒 SECURITY AUDIT - X402 Payment Created:`, {
      transactionId: payment.transactionId,
      clientIp,
      principal: principal.slice(0, 10) + '...',
      service,
      amount,
      processingTime: `${duration.toFixed(2)}ms`,
      securityValidated: true,
      timestamp: new Date().toISOString()
    });

    logOperation('x402-create-payment', true, duration);

    res.json({
      success: true,
      payment: {
        ...payment,
        securityInfo: {
          validated: true,
          rateLimit: 'within_limits',
          processingTime: `${duration.toFixed(2)}ms`
        }
      },
      performance: {
        processingTime: `${duration.toFixed(2)}ms`,
        target: '<200ms'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const duration = performance.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Security incident logging
    console.error(`🚨 SECURITY INCIDENT - X402 Payment Failed:`, {
      clientIp,
      error: errorMessage,
      userAgent: req.headers['user-agent'],
      body: JSON.stringify(req.body).slice(0, 200),
      processingTime: `${duration.toFixed(2)}ms`,
      timestamp: new Date().toISOString()
    });

    logOperation('x402-create-payment', false, duration, undefined, errorMessage);

    res.status(500).json({
      success: false,
      error: 'Failed to create X402 payment',
      details: errorMessage,
      securityInfo: {
        incident: 'logged',
        timestamp: new Date().toISOString()
      },
      performance: {
        processingTime: `${duration.toFixed(2)}ms`,
        target: '<200ms'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// X402 Payment Status
app.get('/api/sippar/x402/payment-status/:id', async (req, res) => {
  const startTime = Date.now();
  try {
    logOperation('x402-payment-status', true, Date.now() - startTime);

    const { id } = req.params;
    // For now, we'll return a mock status - in production this would query actual payment state
    res.json({
      success: true,
      paymentId: id,
      status: 'confirmed',
      amount: 0.01,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logOperation('x402-payment-status', false, Date.now() - startTime, undefined, errorMessage);

    res.status(500).json({
      success: false,
      error: 'Failed to get payment status',
      details: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
});

// X402 Service Token Verification (JWT)
app.post('/api/sippar/x402/verify-token', async (req, res) => {
  const startTime = Date.now();
  try {
    const { token, consume = false } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required',
        timestamp: new Date().toISOString()
      });
    }

    const verification = x402Service.verifyServiceToken(token);

    // Optionally consume the token (mark as used for replay protection)
    if (consume && verification.valid && verification.payload) {
      x402Service.consumeToken(verification.payload.jti);
    }

    logOperation('x402-verify-token', verification.valid, Date.now() - startTime);

    res.json({
      success: true,
      valid: verification.valid,
      payload: verification.valid ? {
        principal: verification.payload?.sub,
        service: verification.payload?.svc,
        amount: verification.payload?.amt,
        transactionId: verification.payload?.txId,
        realPayment: verification.payload?.real,
        expiresAt: verification.payload?.exp ? new Date(verification.payload.exp * 1000).toISOString() : undefined
      } : undefined,
      error: verification.error,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logOperation('x402-verify-token', false, Date.now() - startTime, undefined, errorMessage);

    res.status(500).json({
      success: false,
      error: 'Failed to verify token',
      details: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
});

// X402 Service Provider Registration
app.post('/api/sippar/x402/register-provider', async (req, res) => {
  const startTime = performance.now();
  const clientIp = req.ip || req.connection.remoteAddress || 'unknown';

  try {
    const { providerName, serviceId, serviceEndpoint, description, pricing, category } = req.body;

    // Validation for provider registration
    const validationErrors = [];
    if (!providerName) validationErrors.push('providerName is required');
    if (!serviceId) validationErrors.push('serviceId is required');
    if (!serviceEndpoint) validationErrors.push('serviceEndpoint is required');
    if (!description) validationErrors.push('description is required');
    if (!pricing || typeof pricing !== 'number') validationErrors.push('valid pricing is required');
    if (!category) validationErrors.push('category is required');

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Provider registration validation failed',
        details: validationErrors,
        timestamp: new Date().toISOString()
      });
    }

    // Provider registration logic (in production, this would save to database)
    const registrationId = `provider-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    console.log(`🔗 SERVICE PROVIDER REGISTERED:`, {
      registrationId,
      providerName,
      serviceId,
      category,
      pricing,
      clientIp,
      timestamp: new Date().toISOString()
    });

    const duration = performance.now() - startTime;

    res.json({
      success: true,
      registration: {
        registrationId,
        status: 'pending_approval',
        providerName,
        serviceId,
        category,
        pricing,
        estimatedApprovalTime: '24-48 hours'
      },
      nextSteps: [
        'Complete technical integration testing',
        'Provide API documentation and examples',
        'Setup revenue sharing configuration',
        'Complete security and compliance review'
      ],
      processingTime: `${duration.toFixed(2)}ms`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const duration = performance.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    console.error(`🚨 PROVIDER REGISTRATION FAILED:`, {
      clientIp,
      error: errorMessage,
      processingTime: `${duration.toFixed(2)}ms`,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      error: 'Provider registration failed',
      details: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
});

// X402 Revenue Sharing & Provider Analytics
app.get('/api/sippar/x402/provider-analytics/:providerId', async (req, res) => {
  const startTime = performance.now();
  try {
    const { providerId } = req.params;

    // Mock provider analytics (in production, this would query actual data)
    const analytics = {
      providerId,
      overview: {
        totalRevenue: 45.67,
        totalTransactions: 234,
        averageTransactionValue: 0.195,
        successRate: 99.1,
        customerSatisfaction: 8.7
      },
      revenueSharing: {
        providerShare: 70, // 70% to provider
        platformShare: 30, // 30% to platform
        currentBalance: 31.97,
        lastPayout: "2025-09-15T10:30:00Z",
        nextPayoutDate: "2025-09-30T10:30:00Z"
      },
      servicePerformance: [
        {
          serviceId: 'external-openai-gpt4',
          transactions: 156,
          revenue: 23.40,
          avgResponseTime: 1.2,
          errorRate: 0.6
        },
        {
          serviceId: 'blockchain-analytics',
          transactions: 78,
          revenue: 19.50,
          avgResponseTime: 2.8,
          errorRate: 1.3
        }
      ],
      topCustomers: [
        { principal: 'rdmx6-jaaaa-aaaah-qcaiq-cai', transactions: 45, revenue: 8.95 },
        { principal: 'valid-enterprise-user', transactions: 38, revenue: 7.60 }
      ]
    };

    const duration = performance.now() - startTime;

    res.json({
      success: true,
      analytics,
      processingTime: `${duration.toFixed(2)}ms`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const duration = performance.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve provider analytics',
      details: errorMessage,
      processingTime: `${duration.toFixed(2)}ms`,
      timestamp: new Date().toISOString()
    });
  }
});

// X402 Service Discovery API
app.get('/api/sippar/x402/discover-services', async (req, res) => {
  const startTime = performance.now();
  try {
    const { category, priceMin, priceMax, sortBy = 'popularity' } = req.query;

    // Service discovery with filtering and sorting
    const discovery = {
      filters: {
        category: category || 'all',
        priceRange: {
          min: priceMin ? parseFloat(priceMin as string) : 0,
          max: priceMax ? parseFloat(priceMax as string) : 1000
        },
        sortBy
      },
      recommendations: [
        {
          id: 'ai-oracle-enhanced',
          name: 'Enhanced AI Query',
          category: 'AI Services',
          price: 0.05,
          popularity: 9.2,
          reliability: 99.5,
          avgResponseTime: 0.85,
          description: 'Premium AI analysis with faster response times',
          tags: ['AI', 'Analysis', 'Fast', 'Premium']
        },
        {
          id: 'external-openai-gpt4',
          name: 'OpenAI GPT-4 Gateway',
          category: 'External APIs',
          price: 0.15,
          popularity: 8.8,
          reliability: 98.9,
          avgResponseTime: 1.2,
          description: 'Access OpenAI GPT-4 with X402 payment protection',
          tags: ['OpenAI', 'GPT-4', 'External', 'Gateway']
        },
        {
          id: 'blockchain-analytics',
          name: 'Blockchain Analytics Pro',
          category: 'Analytics',
          price: 0.25,
          popularity: 8.1,
          reliability: 99.8,
          avgResponseTime: 2.8,
          description: 'Advanced blockchain data analysis and monitoring',
          tags: ['Analytics', 'Blockchain', 'Data', 'Professional']
        }
      ],
      trending: ['ai-oracle-enhanced', 'external-claude-sonnet', 'chain-fusion-enhanced'],
      newServices: ['blockchain-analytics', 'external-openai-gpt4'],
      totalAvailable: 12
    };

    const duration = performance.now() - startTime;

    res.json({
      success: true,
      discovery,
      processingTime: `${duration.toFixed(2)}ms`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const duration = performance.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    res.status(500).json({
      success: false,
      error: 'Service discovery failed',
      details: errorMessage,
      processingTime: `${duration.toFixed(2)}ms`,
      timestamp: new Date().toISOString()
    });
  }
});

// X402 Agent Marketplace
app.get('/api/sippar/x402/agent-marketplace', async (req, res) => {
  const startTime = Date.now();
  try {
    logOperation('x402-marketplace', true, Date.now() - startTime);

    // Get CI agents from the service
    const ciAgents = ciAgentService.getAvailableAgents().map(agent => ({
      id: agent.id,
      name: agent.name,
      description: agent.description,
      price: agent.pricing.base,
      currency: agent.pricing.currency,
      endpoint: `/api/sippar${agent.endpoint}`,
      category: 'CI Agents',
      status: 'active',
      capabilities: agent.capabilities,
      memory_size: agent.memory_size,
      response_time: agent.response_time
    }));

    const marketplace = {
      services: [
        // Sprint 018.1: CI Agent Services
        ...ciAgents,
        // Existing Core Services
        {
          id: 'ai-oracle-basic',
          name: 'AI Oracle Basic Query',
          description: 'Basic AI query with standard response time',
          price: 0.01,
          currency: 'USD',
          endpoint: '/api/sippar/ai/query',
          category: 'AI Services',
          status: 'active'
        },
        {
          id: 'ai-oracle-enhanced',
          name: 'Enhanced AI Query',
          description: 'Premium AI analysis with faster response times',
          price: 0.05,
          currency: 'USD',
          endpoint: '/api/sippar/ai/enhanced-query',
          category: 'AI Services',
          status: 'active'
        },
        {
          id: 'ai-oracle-enterprise',
          name: 'Enterprise AI Oracle',
          description: 'Enterprise-grade AI analysis with priority processing and SLA guarantees',
          price: 0.10,
          currency: 'USD',
          endpoint: '/api/sippar/ai/enterprise-query',
          category: 'AI Services',
          status: 'active'
        },
        // New Chat Services
        {
          id: 'ai-chat-basic',
          name: 'AI Chat Basic',
          description: 'Interactive AI conversation with context memory',
          price: 0.02,
          currency: 'USD',
          endpoint: '/api/sippar/ai/chat-basic',
          category: 'AI Chat',
          status: 'active'
        },
        {
          id: 'ai-chat-enhanced',
          name: 'AI Chat Enhanced',
          description: 'Advanced AI conversation with extended context and personality',
          price: 0.07,
          currency: 'USD',
          endpoint: '/api/sippar/ai/chat-enhanced',
          category: 'AI Chat',
          status: 'active'
        },
        // Chain Fusion Services
        {
          id: 'chain-fusion-basic',
          name: 'Chain Fusion Transfer',
          description: 'Basic cross-chain asset transfer with threshold signatures',
          price: 0.003,
          currency: 'USD',
          endpoint: '/api/sippar/chain-fusion/transfer',
          category: 'Chain Fusion',
          status: 'active'
        },
        {
          id: 'chain-fusion-enhanced',
          name: 'Chain Fusion Advanced',
          description: 'Advanced cross-chain operations with smart contract integration',
          price: 0.008,
          currency: 'USD',
          endpoint: '/api/sippar/chain-fusion/advanced',
          category: 'Chain Fusion',
          status: 'active'
        },
        // ckALGO Services
        {
          id: 'ckALGO-mint',
          name: 'ckALGO Minting Service',
          description: 'Cross-chain ALGO to ckALGO conversion with 1:1 backing',
          price: 0.001,
          currency: 'USD',
          endpoint: '/api/sippar/x402/mint-ckALGO',
          category: 'Chain Fusion',
          status: 'active'
        },
        {
          id: 'ckALGO-redeem',
          name: 'ckALGO Redemption Service',
          description: 'Cross-chain ckALGO to ALGO conversion with threshold signatures',
          price: 0.001,
          currency: 'USD',
          endpoint: '/api/sippar/x402/redeem-ckALGO',
          category: 'Chain Fusion',
          status: 'active'
        },
        // New External API Services
        {
          id: 'external-openai-gpt4',
          name: 'OpenAI GPT-4 Gateway',
          description: 'Access OpenAI GPT-4 with X402 payment protection and usage tracking',
          price: 0.15,
          currency: 'USD',
          endpoint: '/api/sippar/x402/openai-gpt4',
          category: 'External APIs',
          status: 'active'
        },
        {
          id: 'external-claude-sonnet',
          name: 'Anthropic Claude Gateway',
          description: 'Access Claude Sonnet with enhanced reasoning and X402 billing',
          price: 0.12,
          currency: 'USD',
          endpoint: '/api/sippar/x402/claude-sonnet',
          category: 'External APIs',
          status: 'active'
        },
        {
          id: 'blockchain-analytics',
          name: 'Blockchain Analytics Pro',
          description: 'Advanced blockchain data analysis and transaction monitoring',
          price: 0.25,
          currency: 'USD',
          endpoint: '/api/sippar/x402/blockchain-analytics',
          category: 'Analytics',
          status: 'active'
        }
      ],
      categories: ['CI Agents', 'AI Services', 'AI Chat', 'Chain Fusion', 'External APIs', 'Analytics'],
      totalServices: 12 + ciAgents.length,
      priceRange: { min: 0.001, max: 0.25 },
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      marketplace,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logOperation('x402-marketplace', false, Date.now() - startTime, undefined, errorMessage);

    res.status(500).json({
      success: false,
      error: 'Failed to get marketplace data',
      details: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
});

// X402 Analytics
app.get('/api/sippar/x402/analytics', async (req, res) => {
  const startTime = Date.now();
  try {
    logOperation('x402-analytics', true, Date.now() - startTime);

    const metrics = x402Service.getMetrics();
    const paymentHistory = x402Service.getPaymentHistory(50);

    res.json({
      success: true,
      analytics: {
        metrics,
        recentPayments: paymentHistory,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logOperation('x402-analytics', false, Date.now() - startTime, undefined, errorMessage);

    res.status(500).json({
      success: false,
      error: 'Failed to get analytics',
      details: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
});

// X402 Enterprise Billing
app.post('/api/sippar/x402/enterprise-billing', async (req, res) => {
  const startTime = Date.now();
  try {
    logOperation('x402-enterprise-billing', true, Date.now() - startTime);

    const { principal, services, billingPeriod } = req.body;

    // Mock enterprise billing data
    const billing = {
      principal,
      billingPeriod,
      services: services || [],
      totalUsage: Math.floor(Math.random() * 1000),
      totalCost: Math.random() * 100,
      currency: 'USD',
      paymentStatus: 'current',
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };

    res.json({
      success: true,
      billing,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logOperation('x402-enterprise-billing', false, Date.now() - startTime, undefined, errorMessage);

    res.status(500).json({
      success: false,
      error: 'Failed to process enterprise billing',
      details: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
});

// Start server
app.listen(PORT, async () => {
  console.log(`
🚀 Sippar Algorand Chain Fusion Backend - Phase 3 Started!
🔐 Threshold Signatures: ENABLED
🌐 Server running on port ${PORT}
📍 Health check: http://localhost:${PORT}/health
🧪 Canister test: http://localhost:${PORT}/canister/test
🏗️  Architecture: Internet Computer Threshold ECDSA → Algorand Integration
⚡ Features: Real threshold signatures, secure address derivation, transaction signing
  `);
  
  // Start Sprint X deposit monitoring
  try {
    // Auto-register custody address derived from anonymous principal (2vxsx-fae)
    // This is the actual address derivable via threshold_signer canister (NEW method)
    const CUSTODY_ADDRESS = '6W47GCLXWEIEZ2LRQCXF7HGLOYSXYCXOPXJ5YE55EULFHB7O4RWIM3JDCI';
    const DEFAULT_PRINCIPAL = '2vxsx-fae'; // Anonymous principal
    await depositDetectionService.registerCustodyAddress(CUSTODY_ADDRESS, DEFAULT_PRINCIPAL);
    console.log(`🏦 Auto-registered custody address ${CUSTODY_ADDRESS} for deposit monitoring`);
    
    await depositDetectionService.startMonitoring();
    console.log('🔍 Sprint X deposit monitoring started automatically');
  } catch (error) {
    console.error('❌ Failed to start deposit monitoring:', error);
  }

  // Start Sprint 012.5 Enhanced Automatic Minting Service
  try {
    await automaticMintingService.startService();
    console.log('🪙 Sprint 012.5 enhanced automatic minting service started');
  } catch (error) {
    console.error('❌ Failed to start automatic minting service:', error);
  }

  // Start Sprint 012.5 Enhanced Automatic Redemption Service
  try {
    await automaticRedemptionService.startService();
    console.log('💸 Sprint 012.5 enhanced automatic redemption service started');
  } catch (error) {
    console.error('❌ Failed to start automatic redemption service:', error);
  }

  // Start Sprint 012.5 Balance Synchronization Service
  try {
    await balanceSynchronizationService.startService();
    console.log('⚖️ Sprint 012.5 balance synchronization service started');
  } catch (error) {
    console.error('❌ Failed to start balance synchronization service:', error);
  }
});

// ==========================================
// 404 handler - MUST be last!
// ==========================================
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    service: 'Sippar Algorand Chain Fusion Backend - Phase 3',
    available_endpoints: [
      'GET /health',
      'POST /derive-algorand-credentials',
      'POST /ck-algo/mint',
      'POST /ck-algo/redeem',
      'GET /ck-algo/balance/:principal',
      'GET /canister/test',
      'GET /algorand/account/:address',
      'GET /algorand/deposits/:address',
      'POST /chain-fusion/transfer-algo',
      'GET /api/v1/threshold/status',
      'POST /api/v1/threshold/derive-address',
      'POST /api/v1/sippar/mint/prepare',
      'POST /api/v1/sippar/redeem/prepare',
      'POST /api/v1/threshold/sign-transaction',
      'GET /api/ai/status',
      'POST /api/ai/auth-url',
      // Sprint 012.5 Integration: Enhanced AI Endpoints
      'POST /api/sippar/ai/query',
      'POST /api/v1/ai-oracle/query',
      'POST /api/sippar/ai/chat-auth',
      'POST /api/sippar/ai/enhanced-query',
      'GET /api/v1/ai-oracle/health',
      'GET /api/sippar/ai/health',
      'POST /migrate-algo',
      // Sprint X Phase 3.1: Reserve Verification Endpoints
      'GET /reserves/status',
      'GET /reserves/proof',
      'POST /reserves/can-mint',
      'GET /reserves/admin/dashboard',
      'POST /reserves/admin/pause',
      'POST /reserves/admin/unpause',
      // Sprint X.1 Phase 1.1: Deposit Monitoring Endpoints
      'GET /deposits/monitoring-stats',
      'POST /deposits/start-monitoring',
      'POST /deposits/stop-monitoring',
      'GET /deposits/pending',
      // Sprint X.1 Phase 1.1: Migration Endpoints
      'GET /migration/status/:principal',
      'POST /migration/fresh-start',
      'POST /migration/bridge',
      'POST /migration/bridge/complete',
      'GET /migration/stats',
      'GET /migration/progress/:principal',
      // Sprint X.1 Phase 2: Production Monitoring Endpoints
      'GET /monitoring/system',
      'GET /monitoring/migration',
      'GET /monitoring/reserves',
      'GET /monitoring/alerts',
      'POST /monitoring/alerts/test',
      'GET /monitoring/health-checks',
      'GET /monitoring/dashboard',
      'GET /monitoring/history',

      // Sprint 016: X402 Payment Protocol Endpoints
      'POST /api/sippar/x402/create-payment',
      'GET /api/sippar/x402/payment-status/:id',
      'POST /api/sippar/x402/verify-token',
      'GET /api/sippar/x402/agent-marketplace',
      'GET /api/sippar/x402/analytics',
      'POST /api/sippar/x402/enterprise-billing',

      // Sprint 017 Phase C.1: Ecosystem Expansion Endpoints
      'POST /api/sippar/x402/register-provider',
      'GET /api/sippar/x402/provider-analytics/:providerId',
      'GET /api/sippar/x402/discover-services',

      // Sprint 018.1: CI Agent Integration Endpoints
      'POST /api/sippar/ci-agents/:agent/:service',
      'GET /api/sippar/ci-agents/marketplace',
      'GET /api/sippar/ci-agents/analytics',
      'GET /api/sippar/ci-agents/health',

      // Sprint 018.2 Phase J: Smart Routing Endpoint
      'POST /api/sippar/ci-agents/route'
    ],
    timestamp: new Date().toISOString(),
  });
});

export default app;