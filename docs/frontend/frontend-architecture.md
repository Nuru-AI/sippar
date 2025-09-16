# Sippar Frontend Architecture

**Date**: September 15, 2025
**Version**: 1.0.0-production
**Framework**: React + TypeScript with Vite
**Status**: Production Implementation with Sprint X Authentic Mathematical Backing

## 🏗️ **Architecture Overview**

The Sippar frontend is a React + TypeScript application that provides Internet Identity authentication with threshold signature-based Algorand integration. Following Sprint X completion, the frontend now displays authentic mathematical backing with real canister data integration, eliminating all simulation displays.

### **Core Architecture Principles**
- **Service-First Design**: All API interactions through dedicated service classes
- **Zustand State Management**: Centralized reactive state with custom hooks (Sprint 010)
- **Authentic Data Integration**: Real canister queries and threshold-controlled addresses (Sprint X)
- **Component Isolation**: Each component handles specific functionality with direct store access
- **Type Safety**: Full TypeScript implementation with strict type checking
- **Error-First Development**: Comprehensive error handling and graceful degradation

### **Technology Stack**
- **Framework**: React 18.3.1 + TypeScript 5.8.3
- **Build Tool**: Vite 6.0.0
- **Styling**: Tailwind CSS 3.4.1
- **Query Library**: @tanstack/react-query 5.85.3 (installed but not used)
- **State Library**: zustand 5.0.7 ✅ **ACTIVE** (Sprint 010 implementation)
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
- **useAlgorandIdentity**: Authentication hook - integrates with Zustand auth store for reactive state
- **useAlgorandWallet**: Handles wallet connections, transaction signing, balance queries

### **State Management Integration** *(Added: Sprint 010)*
- **Zustand Store**: `src/stores/authStore.ts` - Centralized authentication and balance state
- **Hook Integration**: `useAlgorandIdentity` migrated to use Zustand store with backward compatibility
- **Store Features**: Automatic persistence, selective subscriptions, computed selectors
- **Performance**: Eliminated manual localStorage polling, reactive component updates

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

### **ICP Mainnet Integration** *(Updated: Sprint X)*
- **Canisters**: Production canisters with Sprint X SimplifiedBridge integration
  - **Threshold Signer**: `vj7ly-diaaa-aaaae-abvoq-cai` (Ed25519 threshold signatures)
  - **SimplifiedBridge**: `hldvt-2yaaa-aaaak-qulxa-cai` (authentic mathematical backing)
- **Authentication**: Internet Identity with automatic principal derivation
- **Communication**: Direct canister calls via SimplifiedBridgeService (Sprint X)
- **Data Flow**: Authentic canister queries eliminating simulation data

### **Algorand Integration** *(Updated: Sprint X)*
- **Smart Contract**: AI Oracle App ID `745336394` (testnet)
- **Wallet Support**: PeraWallet, MyAlgo, DeflyWallet
- **Address Derivation**: Real threshold signature-based address generation (Sprint X)
- **Custody Addresses**: Authentic threshold-controlled addresses like `6W47GCLXWEIEZ2LRQCXF...`
- **Transaction Flow**: Prepare → Sign → Submit via wallet providers with real mathematical backing

### **AI Infrastructure Integration**
- **OpenWebUI**: `https://chat.nuru.network` and `https://xnode2.openmesh.cloud:8080`
- **XNode2 Containers**: 12 active containers with AI services
- **AI Models**: Qwen 2.5, DeepSeek R1, phi-3, mistral
- **Backend Processing**: Average 150ms response time

## 🔄 **State Management Architecture** *(Updated: Sprint 010)*

### **Zustand Store Architecture**
- **Primary Store**: `authStore.ts` - Authentication, user data, and balance management
- **Store Features**: Persistence middleware, selective subscriptions, computed selectors
- **Integration Pattern**: Components access store directly or through `useAlgorandIdentity` hook
- **Performance**: Reactive updates, eliminates manual localStorage caching

### **Authentication State Flow**
1. **Internet Identity Login** → User Principal
2. **Threshold Address Derivation** → Algorand Address  
3. **Zustand Store Update** → Automatic Persistence
4. **Component Reactivity** → UI Updates via Selective Subscriptions

### **Component State Patterns**
- **Global Auth State**: Zustand store with automatic persistence
- **Local UI State**: useState for component-specific interactions
- **Store Subscriptions**: `useAuthStore(state => state.user)` for selective reactivity
- **Hook Integration**: `useAlgorandIdentity` provides backward-compatible API
- **Service State**: API response caching and error states

### **Modern Data Flow Architecture** *(Sprint 010)*
```
User Interaction → Component → Zustand Store → Reactive UI Update
                            ↓
User Interaction → Component → Hook → Service → API → Store Update → Reactive UI Update
```

## 🚀 **Development Architecture**

### **Project Structure** *(Updated: Sprint 010)*
```
src/frontend/src/
├── components/          # React components
│   ├── ai/             # AI-specific components (2)
│   └── *.tsx           # Main components (7)
├── hooks/              # Custom hooks (2)
├── services/           # API services (5)
├── stores/             # Zustand state stores (Sprint 010)
│   ├── authStore.ts    # Authentication & balance state
│   └── index.ts        # Store exports
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

### **Optimization Strategies** *(Updated: Sprint 010)*
- **Zustand State Management**: Reactive store eliminates manual localStorage polling (Sprint 010)
- **Selective Subscriptions**: Components only re-render on relevant state changes
- **Service Layer Caching**: API response caching with configurable TTL (implemented in BaseAPIService)
- **Bundle Optimization**: Vite's built-in tree shaking and minification + Zustand (2.9kb gzipped)
- **Network Optimization**: Request timeout management and retry logic
- **React Optimization**: useCallback and useMemo used in custom hooks

### **Performance Metrics** *(Updated: Sprint X)*
- **Backend Response**: Average 150ms processing time with real canister integration
- **Service Success Rate**: 100% (27/27 endpoints verified with authentic data)
- **Build Output**: Optimized Vite production builds
- **Runtime Performance**: React performance profiling ready
- **Data Authenticity**: 100% real data flow (0% simulation)

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
- **Project Overview**: `/README.md` - Getting started and architecture overview
- **API Integration**: `/docs/api/endpoints.md` - Complete API reference with Sprint X updates
- **System Architecture**: `/docs/architecture/core/SYSTEM_ARCHITECTURE.md` - Overall system design
- **Development Workflow**: `/CLAUDE.md` - Development standards and Sprint X status

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

This architecture provides a scalable, maintainable foundation for Sippar's Chain Fusion technology with comprehensive error handling, security measures, and modern React development patterns. Sprint X completion ensures all frontend components now display authentic mathematical backing with real canister integration, eliminating simulation data and providing users with transparent threshold-controlled custody addresses.