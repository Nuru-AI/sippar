/**
 * Sippar Platform Constants
 */

// Production ICP Canister IDs
export const SIPPAR_CANISTER_ID = 'gbmxj-yiaaa-aaaak-qulqa-cai';
export const THRESHOLD_SIGNER_CANISTER_ID = 'vj7ly-diaaa-aaaae-abvoq-cai';
export const SIMPLIFIED_BRIDGE_CANISTER_ID = 'hldvt-2yaaa-aaaak-qulxa-cai';

// Backend API Configuration
export const BACKEND_URL = 'https://nuru.network/api/sippar';

// Algorand Configuration
export const ALGORAND_AI_ORACLE_APP_ID = 745336394;

// Supported Networks
export const SUPPORTED_NETWORKS = {
  mainnet: {
    icp: 'https://ic0.app',
    algorand: 'https://mainnet-api.algonode.cloud'
  },
  testnet: {
    icp: 'https://ic0.app',
    algorand: 'https://testnet-api.algonode.cloud'
  },
  local: {
    icp: 'http://localhost:8000',
    algorand: 'https://testnet-api.algonode.cloud'
  }
};

// API Endpoints
export const API_ENDPOINTS = {
  AI: {
    QUERY: '/api/sippar/ai/query',
    ORACLE: '/api/v1/ai-oracle/query',
    ENHANCED: '/api/sippar/ai/enhanced-query',
    CHAT_AUTH: '/api/sippar/ai/chat-auth',
    HEALTH: '/api/sippar/ai/health',
    ORACLE_HEALTH: '/api/v1/ai-oracle/health'
  },
  CKALGO: {
    MINT: '/ck-algo/mint',
    REDEEM: '/ck-algo/redeem',
    BALANCE: '/ck-algo/balance'
  },
  PLATFORM: {
    HEALTH: '/health',
    STATS: '/stats'
  }
};

// Default Configuration
export const DEFAULT_CONFIG = {
  timeout: 30000,
  retries: 3,
  retryDelay: 1000
};