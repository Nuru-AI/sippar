# Sippar Project Overview - Architecture and Context

**Project**: Sippar - Algorand Chain Fusion Bridge  
**Date Created**: September 3, 2025  
**Version**: 1.0.0-alpha  
**Purpose**: Project context, architecture overview, and development phases

## 🧠 **Project Context**

The Sippar project creates the first trustless bridge between Internet Computer Protocol (ICP) and Algorand using Chain Fusion technology. Named after the ancient Mesopotamian city that served as a bridge between civilizations, Sippar connects blockchain ecosystems through mathematical cryptography rather than trusted intermediaries.

### **Key Decisions Made**
1. **Sister Project Architecture**: Independent from TokenHunter with selective resource sharing
2. **Technology Stack**: TypeScript/React frontend + Rust ICP canisters + Chain Fusion backend
3. **Pattern Reuse**: Copy and adapt Rabbi patterns rather than shared libraries
4. **Infrastructure**: Shared Hivelocity VPS and XNode access with independent containers

## 📁 **Project Architecture**

### **Core System Components**
```
sippar/
├── CLAUDE.md                    # Project instructions and development standards
├── README.md                    # Project overview and quick start
├── src/                         # All source code
│   ├── frontend/               # React/TypeScript user interface
│   ├── backend/                # Chain Fusion API backend
│   ├── canisters/              # ICP smart contracts (Rust)
│   └── shared/                 # Common types and utilities
├── docs/                       # Technical documentation (markdown only)
├── tools/                      # Development and deployment tools
├── tests/                      # Comprehensive testing suite
├── working/                    # Sprint management and active development
└── archive/                    # Historical data and legacy code
```

### **Documentation Organization**
- **docs/architecture/**: System design and technical architecture
- **docs/guides/**: User and developer guides
- **docs/api/**: API documentation and integration examples
- **docs/integration/**: Blockchain-specific integration docs
- **docs/development/**: Development processes and standards

## 🎯 **Development Phases**

### **Phase 1: Foundation (Weeks 1-2)** - CURRENT
- [x] Project structure setup
- [ ] Internet Identity integration (adapt Rabbi patterns)
- [ ] Algorand credential derivation (extend Chain Fusion backend)
- [ ] Threshold Ed25519 signing (leverage Solana patterns)

### **Phase 2: Chain-Key Tokens (Weeks 3-4)**
- [ ] ckALGO implementation (1:1 backed Algorand token on ICP)
- [ ] Minting/redemption flows (direct ALGO ↔ ckALGO conversion)
- [ ] Balance tracking (real-time Algorand balance display)
- [ ] Trading integration (basic ckALGO trading on ICP DEXs)

### **Phase 3: EVM Compatibility (Weeks 5-6)**
- [ ] Milkomeda A1 integration (connect to Algorand's EVM L2)
- [ ] Dual address system (users get both L1 and L2 addresses)
- [ ] Bridge interface (ALGO ↔ milkALGO wrapping functionality)
- [ ] EVM tooling (MetaMask and Web3.js compatibility)

### **Phase 4: Trading Intelligence (Weeks 7-8)**
- [ ] Arbitrage detection (cross-chain opportunity identification)
- [ ] DeFi strategy (Algorand DEX integration and yield optimization)
- [ ] AI enhancement (extend Rabbi trading intelligence to Algorand)
- [ ] Risk management (portfolio-level risk assessment and limits)

## 🔗 **Key Integration Points**

### **Shared with Rabbi Project**
- **Authentication Patterns**: Adapt useInternetIdentity.ts for Algorand
- **Chain Fusion API**: Copy and modify ChainFusionAPI.ts structure
- **Infrastructure**: Same Hivelocity VPS with separate containers
- **Monitoring**: Unified dashboard with separate Sippar metrics

### **Algorand-Specific Components**
- **Threshold Ed25519**: Same as Solana but for Algorand transaction signing
- **Address Generation**: Algorand-specific address format (32-byte + checksum)
- **Transaction Structure**: MessagePack encoding for Algorand transactions
- **Milkomeda Integration**: EVM L2 for Ethereum tooling compatibility

## 📊 **Success Metrics Tracking**

### **Technical Milestones**
- [ ] Internet Identity login working for Sippar
- [ ] Algorand address derivation from II principal
- [ ] First threshold Ed25519 signature for Algorand transaction
- [ ] ckALGO minting from native ALGO
- [ ] Cross-chain arbitrage detection
- [ ] Full user journey: II login → ckALGO mint → ICP DEX trade

### **Performance Targets**
- **Authentication**: <5 seconds Internet Identity login
- **Transaction Speed**: <2 seconds for ckALGO operations
- **Signature Throughput**: ~1 signature/second (ICP limitation)
- **Uptime**: 99.9% availability target

## 🛠️ **Development Resources**

### **Pattern Libraries to Copy**
- **Rabbi useInternetIdentity.ts**: Internet Identity authentication
- **Rabbi ChainFusionAPI.ts**: Chain Fusion API structure
- **Rabbi deployment scripts**: Infrastructure deployment patterns
- **Rabbi monitoring setup**: Health checks and metrics collection

### **Technology References**
- **ICP Threshold ECDSA/Ed25519**: Official DFINITY examples and documentation
- **Algorand SDK**: JavaScript/TypeScript integration libraries
- **Milkomeda A1**: EVM rollup integration documentation
- **React/TypeScript**: Frontend development best practices

## 🚀 **Getting Started for New Developers**

### **Onboarding Process**
1. **Read CLAUDE.md**: Complete project instructions and standards
2. **Review Architecture**: Read docs/architecture/ for system understanding
3. **Study Rabbi Patterns**: Examine parent project for reusable patterns
4. **Setup Environment**: Follow docs/development/ for local setup
5. **Review Current Sprint**: Check working/sprints/ for active tasks

### **Context Recovery**
When resuming development or onboarding new team members:
1. **Start Here**: This file (PROJECT_OVERVIEW.md)
2. **Current Sprint**: working/sprints/ for immediate priorities
3. **Technical Details**: Relevant docs/architecture/ files
4. **Development Process**: docs/development/DEVELOPMENT_PROCESS.md

---

**Next Steps**: Complete Phase 1 foundation setup with Internet Identity integration and Algorand credential derivation, following patterns established in Rabbi Trading Bot project.