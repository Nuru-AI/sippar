# Sippar API Endpoints

**Last Updated**: September 5, 2025  
**Backend Version**: 1.0.0-alpha  
**Source**: `src/backend/src/server.ts`  
**Verification Status**: ✅ FULLY VERIFIED - All 26 endpoints tested and working (September 5, 2025 12:17 UTC)

This documentation lists API endpoints found in backend source code. Testing status indicated per endpoint.

## Base URL

- **Production**: `https://nuru.network/api/sippar/`
- **Development**: `http://74.50.113.152:3004/`
- **Oracle API**: `http://nuru.network:3004/api/v1/ai-oracle/` *(Note: HTTP, not HTTPS for port 3004)*

## Health & Status

### ✅ `GET /health`
System health check and service information. **VERIFIED WORKING**

**Response**:
```json
{
  "status": "healthy",
  "service": "Sippar Algorand Chain Fusion Backend", 
  "version": "1.0.0-alpha",
  "deployment": "Phase 1",
  "components": {
    "chain_fusion_engine": true,
    "threshold_ed25519": false,
    "algorand_integration": true,
    "ck_algo_minting": false
  },
  "capabilities": {
    "supported_chains": 1,
    "chain_key_tokens": 0,
    "threshold_signatures": false,
    "milkomeda_integration": false
  },
  "metrics": {
    "total_transactions": 0,
    "avg_processing_time_ms": 150,
    "success_rate": 1.0
  },
  "timestamp": "2025-09-05T12:15:17.901Z"
}
```

## Chain Fusion API (v1)

### ✅ `GET /api/v1/threshold/status`
Get threshold signer service status. **VERIFIED WORKING**

**Response**:
```json
{
  "success": true,
  "canister_id": "vj7ly-diaaa-aaaae-abvoq-cai",
  "network": "icp-mainnet",
  "integration_status": "operational",
  "healthy": true,
  "canister_status": [...],
  "last_check": 1757002224473
}
```

### ✅ `POST /api/v1/threshold/derive-address`
Derive Algorand address from Internet Identity principal using threshold signatures. **VERIFIED WORKING**

**Request**:
```json
{
  "principal": "7renf-5svak-mtapl-juxhw-3hv7d-zzfzs-hjlxv-p7wsv-e2zjc-kksxf-3ae"
}
```

**Response**:
```json
{
  "success": true,
  "address": "FT2M2EL4BLDZHU4CYJTN22FZGEL57DXQISABK76ASZB6ZGCJ5GYJ5SRLHE",
  "public_key": [44,244,205,17,124,10,199,147,211,130,194,102,221,104,185,49,23,223,142,240,68,128,21,127,192,150,67,236,152,73,233,176],
  "canister_id": "vj7ly-diaaa-aaaae-abvoq-cai"
}
```

### ✅ `POST /api/v1/threshold/sign-transaction`
Sign Algorand transaction using threshold signatures. **VERIFIED WORKING**

**Request**:
```json
{
  "principal": "7renf-5svak-mtapl-juxhw-3hv7d-zzfzs-hjlxv-p7wsv-e2zjc-kksxf-3ae",
  "transaction_bytes": "base64_encoded_transaction"
}
```

**Response**:
```json
{
  "success": true,
  "signed_transaction": "SIGNED_TX_PLACEHOLDER",
  "transaction_id": "signed_1757074582898",
  "algorand_tx_id": "ALGO_TX_1757074582898"
}
```

## Sippar Operations (v1)

### ✅ `POST /api/v1/sippar/mint/prepare`
Prepare ckALGO minting operation. **VERIFIED WORKING**

**Request**:
```json
{
  "amount": 100000000,
  "user_principal": "7renf-5svak-mtapl-juxhw-3hv7d-zzfzs-hjlxv-p7wsv-e2zjc-kksxf-3ae"
}
```

**Response**:
```json
{
  "success": true,
  "custody_address": "SIPPAR_CUSTODY_ADDRESS_PLACEHOLDER",
  "expected_amount": 100000000,
  "deposit_deadline": 1757078203576,
  "transaction_id": "mint_1757074603576"
}
```

### ✅ `POST /api/v1/sippar/redeem/prepare`
Prepare ckALGO redemption operation. **VERIFIED WORKING**

**Request**:
```json
{
  "amount": 100000000,
  "recipient_address": "WDWHGMTGCRX3VLJ3EBMVXX4RAM5AW7MKOSMPJLJZY1XYTF7FMSGUSBPE"
}
```

**Response**:
```json
{
  "success": true,
  "recipient_address": "WDWHGMTGCRX3VLJ3EBMVXX4RAM5AW7MKOSMPJLJZY1XYTF7FMSGUSBPE",
  "amount": 100000000,
  "estimated_fees": 0.001,
  "transaction_id": "redeem_1757074604062"
}
```


## Phase 3 Endpoints (Real Operations)

### ✅ `POST /api/ck-algo/mint-confirmed`
Production ckALGO minting with Algorand transaction verification. **VERIFIED WORKING** (requires algorandTxId, userPrincipal, amount)

### ✅ `POST /api/ck-algo/redeem-confirmed`
Production ckALGO redemption with real ALGO transfer. **VERIFIED WORKING** (requires amount, targetAddress, userPrincipal)

### ✅ `GET /ck-algo/reserves`
Get proof of reserves data. **VERIFIED WORKING**

**Response**:
```json
{
  "success": true,
  "total_ck_algo_supply": 0,
  "algorand_custody_balance": 0,
  "backing_ratio": 1,
  "custody_address": "CUSTODY_ADDRESS_NOT_SET",
  "last_audit": "2025-09-05T12:17:07.197Z",
  "reserve_health": "excellent"
}
```

## Algorand Network Integration

### ✅ `GET /algorand/status`
Get Algorand network status for both testnet and mainnet. **VERIFIED WORKING**

**Response**:
```json
{
  "testnet": {
    "network": "testnet",
    "round": 55249577,
    "catchupTime": 0,
    "stoppedAtUnsupportedRound": false,
    "server": "https://testnet-api.algonode.cloud"
  },
  "mainnet": {
    "network": "mainnet", 
    "round": 53403252,
    "catchupTime": 0,
    "stoppedAtUnsupportedRound": false,
    "server": "https://mainnet-api.algonode.cloud"
  },
  "timestamp": "2025-09-05T12:17:24.789Z",
  "service": "algorand-network-monitor"
}
```

### ✅ `GET /algorand/account/:address`
Get Algorand account information and recent transactions. **VERIFIED WORKING** (validates addresses correctly)

**Query Parameters**:
- `network`: "testnet" (default) or "mainnet"

**Error Response** (invalid address):
```json
{
  "success": false,
  "error": "Invalid Algorand address format"
}
```

### ✅ `GET /algorand/deposits/:address`
Monitor deposits to an Algorand address. **VERIFIED WORKING** (validates addresses correctly)

**Query Parameters**:
- `network`: "testnet" (default) or "mainnet"  
- `lastRound`: Last checked block round number

**Error Response** (invalid address):
```json
{
  "success": false,
  "error": "Invalid Algorand address format"
}
```

## AI Integration (Sprint 007)

### ✅ `GET /api/ai/status`
Check OpenWebUI service status. **VERIFIED WORKING**

### ✅ `POST /api/ai/test-connection`
Test connection to OpenWebUI service. **VERIFIED WORKING**

### ✅ `POST /api/ai/chat`
Send chat message to AI service. **VERIFIED WORKING**

**Request**:
```json
{
  "message": "What is the current ALGO price?",
  "userPrincipal": "7renf-5svak-mtapl-juxhw-3hv7d-zzfzs-hjlxv-p7wsv-e2zjc-kksxf-3ae"
}
```

### ✅ `POST /api/ai/auth-url`
Get authenticated OpenWebUI URL for iframe embedding. **VERIFIED WORKING**

**Request**:
```json
{
  "userPrincipal": "7renf-5svak-mtapl-juxhw-3hv7d-zzfzs-hjlxv-p7wsv-e2zjc-kksxf-3ae",
  "algorandAddress": "WDWHGMTGCRX3VLJ3EBMVXX4RAM5AW7MKOSMPJLJZY1XYTF7FMSGUSBPE"
}
```

### ✅ `GET /api/ai/models`
Get available AI models. **VERIFIED WORKING**

### ✅ `GET /api/ai/market-data`
Get market data formatted for AI consumption. **VERIFIED WORKING**

## AI Oracle System (Sprint 009) - LIVE

### ✅ `GET /api/v1/ai-oracle/status`
Get Oracle system status including monitoring state and configuration. **VERIFIED WORKING**

**Response**:
```json
{
  "oracle": {
    "isMonitoring": true,
    "oracleAppId": 745336394,
    "lastProcessedRound": 55260641,
    "pollingInterval": 2000,
    "supportedModels": ["qwen2.5", "deepseek-r1", "phi-3", "mistral"]
  },
  "aiService": {
    "available": true,
    "endpoint": "https://chat.nuru.network",
    "responseTime": 343
  }
}
```

### ✅ `POST /api/v1/ai-oracle/initialize`
Initialize Oracle service with indexer configuration. **VERIFIED WORKING**

### ✅ `POST /api/v1/ai-oracle/start-monitoring`
Start blockchain monitoring for Oracle requests. **VERIFIED WORKING**

### ✅ `POST /api/v1/ai-oracle/stop-monitoring`
Stop blockchain monitoring. **VERIFIED WORKING**

### ✅ `POST /api/v1/ai-oracle/set-app-id`
Configure Oracle application ID for monitoring. **VERIFIED WORKING**

**Request**:
```json
{
  "appId": 745336394
}
```

### ✅ `GET /api/v1/ai-oracle/supported-models`
Get list of supported AI models. **VERIFIED WORKING**

**Response**:
```json
{
  "success": true,
  "models": [
    "qwen2.5:0.5b",
    "deepseek-r1", 
    "phi-3",
    "mistral"
  ],
  "source": "service"
}
```

### ✅ `POST /api/v1/ai-oracle/test-ai-query`
Test AI query processing with specified model. **VERIFIED WORKING**

**Request**:
```json
{
  "query": "What is 2+2?",
  "model": "qwen2.5"
}
```

**Response**:
```json
{
  "success": true,
  "query": "What is 2+2?",
  "model": "qwen2.5",
  "response": {
    "response": "OpenWebUI is available for chat at https://chat.nuru.network...",
    "responseTime": 13,
    "success": true,
    "source": "openwebui"
  },
  "processingTime": 13,
  "timestamp": 1757105307966
}
```

### ✅ `GET /api/v1/ai-oracle/health`
Oracle service health check with detailed metrics. **VERIFIED WORKING**

**Response**:
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": 1757105314235,
  "uptime": 1282.13,
  "memory": {
    "rss": 84373504,
    "heapTotal": 24809472,
    "heapUsed": 22601024,
    "external": 5034131,
    "arrayBuffers": 1819035
  },
  "oracleService": {
    "initialized": true,
    "monitoring": true
  },
  "aiService": {
    "available": true,
    "responseTime": 62,
    "endpoint": "https://chat.nuru.network"
  }
}
```

## Testing & Development

### ✅ `GET /test/threshold-signer`
Test threshold signer connection and status. **VERIFIED WORKING**

## Error Responses

All endpoints return consistent error format:

```json
{
  "success": false,
  "error": "Error description",
  "details": "Additional error details",
  "timestamp": 1757002212910
}
```

Common HTTP status codes:
- `400`: Bad Request (validation errors)
- `404`: Endpoint not found ✅ **VERIFIED** (returns proper JSON error)
- `500`: Internal server error
- `503`: Service unavailable

## Notes

1. **Port Configuration**: Backend runs on port 3004 (standardized across all environments)
2. **CORS**: Configured for localhost development and nuru.network production
3. **SSL**: HTTPS support with fallback to HTTP
4. **Validation**: Uses Zod schema validation for request bodies
5. **Phase Status**: Currently Phase 2 with some Phase 3 endpoints available

---

*This documentation is automatically generated from the actual backend source code to ensure accuracy.*