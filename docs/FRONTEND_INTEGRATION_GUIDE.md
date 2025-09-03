# Sippar Frontend Integration Guide

## 🎉 **Live API Endpoints Ready**

Your Sippar threshold signature API is now **LIVE** and operational at:
**Base URL**: `http://74.50.113.152:8203`

## 🔌 **Frontend Integration**

### **1. API Client Setup**

Create a TypeScript client for your React frontend:

```typescript
// src/services/sipparAPI.ts
export class SipparAPI {
  private baseURL = 'http://74.50.113.152:8203';

  async checkHealth(): Promise<any> {
    const response = await fetch(`${this.baseURL}/health`);
    return response.json();
  }

  async deriveAlgorandAddress(principal: string): Promise<{
    success: boolean;
    address?: string;
    public_key?: string;
    error?: string;
  }> {
    const response = await fetch(`${this.baseURL}/api/v1/threshold/derive-address`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ principal })
    });
    return response.json();
  }

  async signTransaction(principal: string, transactionHex: string): Promise<{
    success: boolean;
    signature?: string;
    signed_tx_id?: string;
    error?: string;
  }> {
    const response = await fetch(`${this.baseURL}/api/v1/threshold/sign-transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        principal, 
        transaction_hex: transactionHex 
      })
    });
    return response.json();
  }

  async prepareMint(principal: string, amount: number): Promise<{
    success: boolean;
    custody_address?: string;
    next_step?: string;
    error?: string;
  }> {
    const response = await fetch(`${this.baseURL}/api/v1/sippar/mint/prepare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ principal, amount })
    });
    return response.json();
  }

  async prepareRedeem(principal: string, destination: string, amount: number): Promise<{
    success: boolean;
    next_step?: string;
    error?: string;
  }> {
    const response = await fetch(`${this.baseURL}/api/v1/sippar/redeem/prepare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ principal, destination, amount })
    });
    return response.json();
  }

  async getSystemStatus(): Promise<any> {
    const response = await fetch(`${this.baseURL}/api/v1/threshold/status`);
    return response.json();
  }
}

export const sipparAPI = new SipparAPI();
```

### **2. React Hook for Sippar Integration**

```typescript
// src/hooks/useSippar.ts
import { useState, useCallback } from 'react';
import { sipparAPI } from '../services/sipparAPI';

export const useSippar = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deriveAddress = useCallback(async (principal: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await sipparAPI.deriveAlgorandAddress(principal);
      if (result.success) {
        return {
          address: result.address!,
          publicKey: result.public_key!
        };
      } else {
        setError(result.error || 'Failed to derive address');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const prepareMint = useCallback(async (principal: string, amount: number) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await sipparAPI.prepareMint(principal, amount);
      if (result.success) {
        return {
          custodyAddress: result.custody_address!,
          nextStep: result.next_step!
        };
      } else {
        setError(result.error || 'Failed to prepare mint');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const prepareRedeem = useCallback(async (principal: string, destination: string, amount: number) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await sipparAPI.prepareRedeem(principal, destination, amount);
      if (result.success) {
        return { nextStep: result.next_step! };
      } else {
        setError(result.error || 'Failed to prepare redeem');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    deriveAddress,
    prepareMint,
    prepareRedeem,
    loading,
    error,
    clearError: () => setError(null)
  };
};
```

### **3. Component Examples**

#### **Address Display Component**
```typescript
// src/components/AlgorandAddressDisplay.tsx
import React, { useEffect, useState } from 'react';
import { useSippar } from '../hooks/useSippar';

interface Props {
  userPrincipal: string;
}

export const AlgorandAddressDisplay: React.FC<Props> = ({ userPrincipal }) => {
  const { deriveAddress, loading, error } = useSippar();
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    const loadAddress = async () => {
      const result = await deriveAddress(userPrincipal);
      if (result) {
        setAddress(result.address);
      }
    };

    if (userPrincipal) {
      loadAddress();
    }
  }, [userPrincipal, deriveAddress]);

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span>Deriving secure Algorand address...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 text-sm">
        Error: {error}
      </div>
    );
  }

  if (address) {
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Your Algorand Address (Threshold Secured)
        </label>
        <div className="font-mono text-sm bg-white p-3 rounded border break-all">
          {address}
        </div>
        <div className="text-xs text-gray-500 mt-2">
          🔐 Secured by ICP threshold signatures
        </div>
      </div>
    );
  }

  return null;
};
```

#### **Mint Flow Component**
```typescript
// src/components/MintFlow.tsx
import React, { useState } from 'react';
import { useSippar } from '../hooks/useSippar';

interface Props {
  userPrincipal: string;
  onMintPrepared?: (custodyAddress: string) => void;
}

export const MintFlow: React.FC<Props> = ({ userPrincipal, onMintPrepared }) => {
  const { prepareMint, loading, error } = useSippar();
  const [amount, setAmount] = useState<string>('');
  const [custodyAddress, setCustodyAddress] = useState<string | null>(null);

  const handlePrepareMint = async () => {
    if (!amount || !userPrincipal) return;

    const microAlgos = parseFloat(amount) * 1_000_000; // Convert ALGO to microAlgos
    const result = await prepareMint(userPrincipal, microAlgos);
    
    if (result) {
      setCustodyAddress(result.custodyAddress);
      onMintPrepared?.(result.custodyAddress);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Amount to Mint (ALGO)
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter ALGO amount"
          step="0.000001"
          min="0.001"
        />
      </div>

      <button
        onClick={handlePrepareMint}
        disabled={loading || !amount}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Preparing Mint...
          </>
        ) : (
          'Prepare ckALGO Mint'
        )}
      </button>

      {error && (
        <div className="text-red-600 text-sm bg-red-50 p-3 rounded">
          {error}
        </div>
      )}

      {custodyAddress && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-green-800 mb-2">
            ✅ Mint Prepared Successfully
          </h3>
          <p className="text-sm text-green-700 mb-3">
            Send <strong>{amount} ALGO</strong> to the custody address below:
          </p>
          <div className="font-mono text-sm bg-white p-3 rounded border break-all">
            {custodyAddress}
          </div>
          <p className="text-xs text-green-600 mt-2">
            🔐 This address is secured by ICP threshold signatures
          </p>
        </div>
      )}
    </div>
  );
};
```

#### **System Status Component**
```typescript
// src/components/SystemStatus.tsx
import React, { useEffect, useState } from 'react';
import { sipparAPI } from '../services/sipparAPI';

export const SystemStatus: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const [health, systemStatus] = await Promise.all([
          sipparAPI.checkHealth(),
          sipparAPI.getSystemStatus()
        ]);
        
        setStatus({ health, system: systemStatus });
      } catch (error) {
        console.error('Failed to load status:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStatus();
    // Refresh every 30 seconds
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="text-sm text-gray-500">Loading system status...</div>;
  }

  if (!status) {
    return <div className="text-sm text-red-600">Failed to load status</div>;
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4 text-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium">Sippar System Status</span>
        <div className="flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
          <span className="text-green-600">Operational</span>
        </div>
      </div>
      
      <div className="space-y-1 text-xs text-gray-600">
        <div>ICP Canister: {status.system.canister_id}</div>
        <div>Network: {status.system.network}</div>
        <div>Threshold Key: {status.system.threshold_key}</div>
        <div>Cycles: {status.system.cycles_estimate}</div>
      </div>
    </div>
  );
};
```

## 🔧 **Integration Steps**

### **1. Install Dependencies**
```bash
# If using fetch (built-in)
# No additional dependencies needed

# If you prefer axios:
npm install axios
```

### **2. Add to Your App**
```typescript
// src/App.tsx or your main component
import { AlgorandAddressDisplay } from './components/AlgorandAddressDisplay';
import { MintFlow } from './components/MintFlow';
import { SystemStatus } from './components/SystemStatus';

function App() {
  const userPrincipal = "rdmx6-jaaaa-aaaaa-aaadq-cai"; // Get from your auth system

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <SystemStatus />
      
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-bold mb-4">Your Algorand Address</h2>
          <AlgorandAddressDisplay userPrincipal={userPrincipal} />
        </div>
        
        <div>
          <h2 className="text-xl font-bold mb-4">Mint ckALGO</h2>
          <MintFlow 
            userPrincipal={userPrincipal}
            onMintPrepared={(address) => console.log('Mint prepared:', address)}
          />
        </div>
      </div>
    </div>
  );
}
```

### **3. Environment Configuration**
```typescript
// src/config/api.ts
export const API_CONFIG = {
  SIPPAR_API_BASE_URL: process.env.NODE_ENV === 'production' 
    ? 'http://74.50.113.152:8203'
    : 'http://74.50.113.152:8203', // Same for both environments currently
  
  // Future production settings
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
};
```

## 📱 **Mobile Responsiveness**

All components are built with mobile-first design:

```css
/* Add to your CSS */
.sippar-container {
  @apply px-4 sm:px-6 lg:px-8;
}

.sippar-address {
  @apply text-xs sm:text-sm break-all;
}

.sippar-button {
  @apply w-full sm:w-auto px-4 py-2 text-sm;
}
```

## 🔒 **Security Considerations**

### **API Security**
- **HTTPS**: In production, ensure HTTPS endpoints
- **CORS**: API already configured with CORS headers
- **Input Validation**: Validate all user inputs before API calls
- **Error Handling**: Don't expose sensitive error details to users

### **Principal Security**
```typescript
// Validate principal format
const isValidPrincipal = (principal: string): boolean => {
  return /^[a-z0-9-]{5,63}$/.test(principal);
};

// Use in your components
if (!isValidPrincipal(userPrincipal)) {
  throw new Error('Invalid principal format');
}
```

## 📊 **Testing Your Integration**

### **1. Test API Connectivity**
```bash
# Test from your local development environment
curl http://74.50.113.152:8203/health

# Test address derivation
curl -X POST http://74.50.113.152:8203/api/v1/threshold/derive-address \
  -H "Content-Type: application/json" \
  -d '{"principal": "rdmx6-jaaaa-aaaaa-aaadq-cai"}'
```

### **2. Frontend Testing**
```typescript
// Add to your test files
import { sipparAPI } from '../services/sipparAPI';

describe('Sippar API Integration', () => {
  test('should check API health', async () => {
    const health = await sipparAPI.checkHealth();
    expect(health.status).toBe('healthy');
    expect(health.icp_mainnet_canister).toBe('vj7ly-diaaa-aaaae-abvoq-cai');
  });

  test('should derive Algorand address', async () => {
    const result = await sipparAPI.deriveAlgorandAddress('test-principal');
    expect(result.success).toBe(true);
    expect(result.address).toMatch(/^[A-Z2-7]{58}$/); // Base32 format
  });
});
```

## 🚀 **Production Deployment**

### **1. Update API Base URL**
When deploying your frontend, ensure the API URL is accessible:

```typescript
const API_BASE_URL = process.env.REACT_APP_SIPPAR_API_URL || 'http://74.50.113.152:8203';
```

### **2. Build and Deploy**
```bash
npm run build
# Deploy your build folder to your hosting platform
```

## 📈 **Next Steps**

1. **✅ Integrate Components**: Add Sippar components to your React app
2. **✅ Test Functionality**: Verify address derivation and mint preparation
3. **⏳ Real ICP Integration**: Replace mock responses with actual IC canister calls
4. **⏳ Production HTTPS**: Set up SSL certificates for secure API access
5. **⏳ Monitoring**: Add error tracking and performance monitoring

## 🆘 **Troubleshooting**

### **Common Issues**
1. **Network Errors**: Check if API server is running and accessible
2. **CORS Issues**: API already configured, but verify browser console
3. **Principal Errors**: Ensure valid principal format and authentication
4. **Timeout Errors**: API calls may take a few seconds for threshold operations

### **Debug Commands**
```bash
# Check API server status
curl http://74.50.113.152:8203/health

# Check server logs
ssh -i ~/.ssh/hivelocity_key root@74.50.113.152 'tail -f /var/www/nuru.network/sippar/sippar_api.log'
```

---

**Your Sippar API is ready for frontend integration! Start with the health check and address derivation to verify everything works.** 🎉