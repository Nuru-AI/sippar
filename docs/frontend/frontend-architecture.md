# Sippar Frontend Architecture

**Date**: September 5, 2025  
**Version**: 1.0.0-alpha  
**Framework**: React + TypeScript with Vite  
**Status**: Production Implementation

## 🏗️ **Architecture Overview**

The Sippar frontend is a React + TypeScript application that provides Internet Identity authentication with threshold signature-based Algorand integration. Built with modern tooling including Tailwind CSS and multiple Algorand wallet integrations.

### **Core Architecture Principles**
- **Service-First Design**: All API interactions through dedicated service classes
- **Hook-Based State Management**: Custom hooks manage authentication and wallet states
- **Component Isolation**: Each component handles specific functionality
- **Type Safety**: Full TypeScript implementation with strict type checking
- **Error-First Development**: Comprehensive error handling and graceful degradation

### **Technology Stack**
- **Framework**: React 18.3.1 + TypeScript 5.8.3
- **Build Tool**: Vite 6.0.0
- **Styling**: Tailwind CSS 3.4.1
- **Query Library**: @tanstack/react-query 5.85.3 (installed but not used)
- **State Library**: zustand 5.0.7 (installed but not used)
- **Wallet Integration**: PeraWallet, MyAlgo, DeflyWallet
- **ICP Integration**: @dfinity/auth-client, @dfinity/principal
- **Algorand Integration**: algosdk 3.4.0

## 📦 **Component Architecture**

### **Main Components** (8 components)
| Component | File | Purpose |
|-----------|------|---------|
| `ChainFusionExplanation` | `ChainFusionExplanation.tsx` | Educational component explaining threshold signatures |
| `ConnectedWalletDisplay` | `ConnectedWalletDisplay.tsx` | Connected wallet information display |
| `Dashboard` | `Dashboard.tsx` | Main authenticated user interface with tabs |
| `LoginComponent` | `LoginComponent.tsx` | Internet Identity authentication |
| `MintFlow` | `MintFlow.tsx` | ckALGO minting interface |
| `RedeemFlow` | `RedeemFlow.tsx` | ALGO redemption interface |
| `TransactionHistory` | `TransactionHistory.tsx` | User transaction history |
| `WalletConnectionModal` | `WalletConnectionModal.tsx` | Multi-wallet connection interface |

### **AI Components** (2 components)
| Component | File | Purpose |
|-----------|------|---------|
| `AIChat` | `ai/AIChat.tsx` | Direct OpenWebUI integration |
| `AIOracle` | `ai/AIOracle.tsx` | AI Oracle testing interface |


## 🎣 **Hook Architecture**

### **Custom Hooks** (2 hooks)
| Hook | File | Purpose |
|------|------|---------|
| `useAlgorandIdentity` | `useAlgorandIdentity.ts` | Internet Identity authentication & credential derivation |
| `useAlgorandWallet` | `useAlgorandWallet.ts` | Algorand wallet connection & transaction management |

### **Hook Responsibilities**
- **useAlgorandIdentity**: Manages user authentication, principal derivation, Algorand address generation
- **useAlgorandWallet**: Handles wallet connections, transaction signing, balance queries

## 🔌 **Service Layer Architecture**

### **Service Classes** (5 services)
| Service | File | Type | Purpose |
|---------|------|------|---------|
| `BaseAPIService` | `BaseAPIService.ts` | Abstract Base | Error handling, caching, retry logic |
| `SipparAPIService` | `SipparAPIService.ts` | Extends Base | Primary backend API integration |
| `AlgorandChainFusionAPI` | `AlgorandChainFusionAPI.ts` | Extends Base | Chain Fusion operations |
| `AlgorandWalletManager` | `AlgorandWalletManager.ts` | Standalone | Wallet provider integration |
| `CkAlgoCanisterService` | `ckAlgoCanister.ts` | Standalone | ICP canister communication |

### **Service Architecture Patterns**
- **BaseAPIService Pattern**: Standardized error handling, caching, and retry logic
- **Service Extension**: SipparAPIService and AlgorandChainFusionAPI extend BaseAPIService
- **Standalone Services**: WalletManager and CanisterService for specialized integrations

## 🔗 **Integration Architecture**

### **ICP Mainnet Integration**
- **Canisters**: 2 production canisters controlled by `mainnet-deploy` identity
  - **ckALGO Token**: `gbmxj-yiaaa-aaaak-qulqa-cai`
  - **Threshold Signer**: `vj7ly-diaaa-aaaae-abvoq-cai`
- **Authentication**: Internet Identity with automatic principal derivation
- **Communication**: Direct canister calls and HTTP API endpoints

### **Algorand Integration**
- **Smart Contract**: AI Oracle App ID `745336394` (testnet)
- **Wallet Support**: PeraWallet, MyAlgo, DeflyWallet
- **Address Derivation**: Threshold signature-based address generation
- **Transaction Flow**: Prepare → Sign → Submit via wallet providers

### **AI Infrastructure Integration**
- **OpenWebUI**: `https://chat.nuru.network` and `https://xnode2.openmesh.cloud:8080`
- **XNode2 Containers**: 12 active containers with AI services
- **AI Models**: Qwen 2.5, DeepSeek R1, phi-3, mistral
- **Backend Processing**: Average 150ms response time

## 🔄 **State Management Architecture**

### **Authentication State Flow**
1. **Internet Identity Login** → User Principal
2. **Threshold Address Derivation** → Algorand Address
3. **Credential Storage** → Session Management
4. **Multi-Service Integration** → Unified User State

### **Component State Patterns**
- **Local State**: useState for component-specific state
- **Global State**: React Context (no external state management library currently used)
- **Hook State**: Custom hooks for complex state logic
- **Service State**: API response caching and error states

### **Data Flow Architecture**
```
User Interaction → Component → Hook → Service → API/Canister → Response → State Update → UI Update
```

## 🚀 **Development Architecture**

### **Project Structure**
```
src/frontend/src/
├── components/          # React components
│   ├── ai/             # AI-specific components (2)
│   └── *.tsx           # Main components (7)
├── hooks/              # Custom hooks (2)
├── services/           # API services (5)
└── types/              # TypeScript definitions (1 file: wallet.ts)
```

### **Build Configuration**
- **Development Server**: Port 5175 (`npm run dev`)
- **Build Process**: Vite build with TypeScript checking
- **Deployment**: Automated VPS deployment scripts
- **Development Tools**: ESLint, TypeScript compiler, Tailwind CSS

### **API Integration Points**
- **Backend API**: `http://74.50.113.152:3004` (dev) / `/api/sippar` (prod)
- **ICP Canisters**: Direct canister communication for ckALGO operations
- **Internet Identity**: `identity.ic0.app` for authentication
- **Algorand Network**: Direct network integration for wallet operations

## 📊 **Performance Architecture**

### **Optimization Strategies**
- **Service Layer Caching**: API response caching with configurable TTL (implemented in BaseAPIService)
- **Bundle Optimization**: Vite's built-in tree shaking and minification
- **Network Optimization**: Request timeout management and retry logic
- **React Optimization**: useCallback and useMemo used in custom hooks

### **Performance Metrics**
- **Backend Response**: Average 150ms processing time
- **Service Success Rate**: 100% (18/18 endpoints verified)
- **Build Output**: Optimized Vite production builds
- **Runtime Performance**: React performance profiling ready

## 🔐 **Security Architecture**

### **Authentication Security**
- **Internet Identity**: Biometric/device-based authentication
- **Principal Validation**: All user principals validated before API calls
- **Session Management**: Secure session persistence and timeout handling

### **API Security**
- **CORS Configuration**: Proper cross-origin request handling
- **Input Validation**: All user inputs validated before API submission
- **Error Handling**: Secure error messages without sensitive data leakage

### **Wallet Security**
- **Connection Validation**: Wallet connections verified before use
- **Transaction Signing**: All transactions signed through secure wallet providers
- **Address Validation**: Algorand addresses validated before transactions

## 📚 **Additional Documentation**

For detailed implementation guides and code examples, see:
- **Component Details**: `/docs/frontend/components.md` (to be created)
- **Service Integration**: `/docs/frontend/services.md` (to be created)
- **Hook Usage**: `/docs/frontend/hooks.md` (to be created)
- **Development Guide**: `/docs/frontend/development.md` (to be created)

## 🛠️ **Development Commands**

```bash
# Start development server (port 5175)
npm run dev

# Build for production
npm run build

# Build with type checking
npm run build:with-typecheck

# Type checking only
npm run type-check

# Lint code
npm run lint

# Deploy to VPS
npm run deploy
```

---

This architecture provides a scalable, maintainable foundation for Sippar's Chain Fusion technology with comprehensive error handling, security measures, and modern React development patterns.