# Sippar Business Model Canvas

**Cross-Chain Payment Rail for AI Agent Commerce**
**Last Updated**: February 2026
**Version**: 2.0

---

## 🎯 **Value Propositions**

### **For AI Agent Developers**
- **No Custody Risk**: ICP threshold signatures — no seed phrases, no bridges to hack
- **Cross-Chain Native**: Agents on ETH pay ckETH, receive services from ALGO-based agents
- **Autonomous Operations**: Deposit-based flows require no human signatures
- **Standard Protocols**: X402 (HTTP 402) + ICRC-1 tokens — works with existing frameworks

### **For Platforms (ELNA, Fetch.ai, etc.)**
- **Invisible Infrastructure**: ICP is middleware, not a competing L1
- **Mathematical Security**: Threshold cryptography, not multisig
- **Instant Settlement**: Sub-second ICP finality
- **Audit Trail**: All payments on-chain (ICRC-1 transfers verifiable)

### **For Enterprises**
- **No Key Management**: Agents don't hold private keys
- **Compliance-Friendly**: All transactions on-chain, auditable
- **Multi-Chain Ready**: ETH, ALGO, more via ICP ckTokens
- **SLA Potential**: Enterprise support tiers as volume grows

---

## 🎭 **Customer Segments**

### **Primary: Agent Platform Integrators**
- **Algorand ASIF Partners**: Platforms building on Algorand's agent commerce initiative
- **ICP Chain Fusion Apps**: Canisters needing cross-chain payment capabilities
- **X402 Adopters**: Coinbase Bazaar, other HTTP 402 marketplaces
- **Multi-Chain Agent Frameworks**: Fetch.ai, Google A2A needing settlement rails

### **Secondary: Agent Developers**
- **Autonomous Agent Builders**: Need payment flows without human signatures
- **Cross-Chain Agent Services**: Receive ETH, settle ALGO (or vice versa)
- **AI Service Providers**: Monetize via X402 payment-gated endpoints

### **Tertiary: Infrastructure Players**
- **Lava Network**: Decentralized RPC partner (50+ chains, 160B+ requests)
- **DEX Integrators**: ICPSwap, Sonic for ckToken liquidity
- **Enterprise Compliance**: Auditable on-chain payment trails

---

## 📈 **Revenue Streams**

### **1. Swap Fee (Active)**
- **Model**: 0.3% on ckETH → ckALGO conversions
- **Status**: Live on mainnet (first swap Feb 2026)
- **Margin**: 95%+ (ICP cycles only cost)

### **2. Transaction Routing Fee (Active)**
- **Model**: 0.1% on cross-chain agent payments
- **Status**: X402 real payments working, treasury receiving fees
- **Margin**: 95%+

### **3. CI Agent Services (Active)**
- **Model**: Pay-per-use agent invocations (payment-gated via X402)
- **Status**: 32 services, real Grok LLM responses
- **Pricing**: Per-service (e.g., 0.01 ckALGO for basic AI query)

### **4. Future Revenue Streams**
- **ICPSwap LP Fees**: Liquidity provision once ckALGO listed
- **Enterprise SLAs**: Higher-margin support tiers
- **Integration Fees**: Platform onboarding for external integrations

---

## 🤝 **Key Partnerships**

### **Strategic Partners**
- **Lava Network**: Decentralized RPC (50+ chains, 160B+ requests) — combined = full-stack agent infra
- **Algorand Foundation**: ASIF initiative targeting agent commerce — Sippar is infrastructure
- **DFINITY/ICP**: Chain Fusion thesis — Sippar validates cross-chain works

### **Infrastructure Partners**
- **ICPSwap/Sonic**: DEX liquidity for ckALGO trading
- **ckToken Ecosystem**: ckETH, ckBTC for multi-chain support
- **xAI (Grok)**: LLM powering CI agent responses

### **Target Integrations (In Progress)**
- **ELNA.ai**: Algorand agent platform (SNS canister identified)
- **Fetch.ai**: Multi-agent framework needing settlement
- **Coinbase Bazaar**: X402 marketplace
- **Google A2A**: Agent-to-agent protocol

---

## 🎯 **Customer Relationships**

### **Enterprise Customers**
- **Dedicated Account Management**: Personal relationship managers for major accounts
- **24/7 Technical Support**: Enterprise SLA with guaranteed response times
- **Custom Integration Services**: Tailored deployment and ongoing optimization
- **Executive Briefing Programs**: Regular strategic updates and roadmap discussions

### **Platform Partners**
- **Technical Partnership Programs**: Joint development initiatives and integration support
- **Co-Marketing Programs**: Joint market development and customer acquisition
- **Revenue Sharing Agreements**: Aligned incentives for mutual growth
- **Developer Relations**: Technical evangelism and ecosystem development

### **Developer Community**
- **Open Source Contributions**: Active GitHub presence with community contributions
- **Developer Documentation**: Comprehensive guides, tutorials, and API references
- **Community Support**: Forums, Discord, and direct technical assistance
- **Developer Incentive Programs**: Hackathons, grants, and revenue sharing opportunities

---

## 📡 **Channels**

### **Direct Sales**
- **Enterprise Sales Team**: Direct relationship building with Fortune 500 decision makers
- **Product Demonstrations**: Live demos of autonomous payment capabilities
- **Executive Briefings**: Strategic presentations to C-level executives
- **Proof of Concept Programs**: Risk-free pilot implementations

### **Partner Channels**
- **System Integrator Partnerships**: Leverage existing enterprise relationships
- **Technology Vendor Alliances**: Joint go-to-market with complementary providers
- **Cloud Marketplace Listings**: AWS, Azure, GCP marketplace presence
- **Industry Conference Speaking**: Thought leadership at major industry events

### **Digital Marketing**
- **Content Marketing**: Technical blogs, whitepapers, and research publications
- **Developer Evangelism**: Technical tutorials, open source contributions
- **Social Media**: LinkedIn for enterprise, Twitter for developer community
- **Webinar Programs**: Educational content and product demonstrations

---

## 🎬 **Key Activities**

### **Technology Development**
- **Platform Engineering**: Core infrastructure development and optimization
- **Security Auditing**: Continuous security validation and improvement
- **Integration Development**: SDK and API enhancement for ecosystem growth
- **Research & Development**: Advanced cryptography and autonomous payment innovation

### **Business Development**
- **Enterprise Customer Acquisition**: Direct sales and relationship building
- **Strategic Partnership Development**: Ecosystem partnerships and alliances
- **Market Development**: New use case identification and validation
- **Ecosystem Evangelism**: Community building and developer relations

### **Operations & Support**
- **Platform Operations**: 24/7 system monitoring and maintenance
- **Customer Success**: Ongoing customer support and optimization
- **Compliance Management**: Regulatory adherence and audit preparation
- **Quality Assurance**: Continuous testing and performance optimization

---

## 🏗️ **Key Resources**

### **Technical Assets (Production)**
- **threshold_signer canister** (vj7ly): Ed25519 threshold signatures for Algorand
- **simplified_bridge canister** (hldvt): ICRC-1 ckALGO token + bridge logic
- **Backend (VPS)**: 74.50.113.152:3004, 111+ endpoints, Express.js
- **CI API (Docker)**: 17 agent types, real Grok LLM responses

### **Proven Capabilities**
- **Deposit→Mint→Redeem**: All flows proven on mainnet (Feb 2026)
- **ckETH→ckALGO Swap**: First real swap executed (0.000248 ETH → 5.4 ckALGO)
- **X402 Real Payments**: JWT + ICRC-1 transfers on-chain
- **Threshold Signatures**: ICP Ed25519 controlling Algorand addresses

### **Documentation**
- **ARCHITECTURE.md**: System design and canister map
- **STATUS.md**: Current state and known issues
- **CKETH_CKALGO_SWAP_PLAN.md**: Swap implementation details

---

## 💰 **Cost Structure**

### **Current Costs (Low Burn)**
- **ICP Cycles**: Canister compute (~$5-20/month at current usage)
- **VPS**: 74.50.113.152, 3.8GB RAM (~$50/month)
- **xAI API**: Grok-3-mini-fast for CI agents (usage-based)
- **Domain/SSL**: nuru.network

### **Scaling Costs (As Volume Grows)**
- **ICP Cycles**: Scales with canister calls
- **VPS Upgrade**: More RAM for npm install, more endpoints
- **DEX Liquidity**: Initial ckALGO pool on ICPSwap
- **Security Audit**: External review before enterprise pilots

### **Future Costs**
- **Team expansion**: If/when revenue justifies
- **Multi-region**: Additional VPS for latency
- **Enterprise support**: SLA fulfillment

---

## 📊 **Current Metrics (Feb 2026)**

### **On-Chain Proof**
- **ckALGO Minted**: 24.12 ckALGO from real deposits
- **ALGO Redeemed**: 0.6 ALGO delivered via threshold signatures
- **ckETH Swapped**: 0.000248 ETH → 5.4 ckALGO
- **X402 Payments**: Real transfers to treasury

### **Infrastructure**
- **Endpoints**: 111+ REST APIs on backend
- **Agents**: 32 services in marketplace
- **Canisters**: 2 on ICP mainnet
- **Uptime**: Backend + CI API healthy

### **Target Metrics (Q2 2026)**
- **ICPSwap Listing**: ckALGO tradeable
- **External Integration**: 1+ platform pilot
- **Grant Funding**: Algorand Foundation

---

## 🎯 **Competitive Advantages**

### **Technical Moats**
- **Only working ICP-Algorand bridge** — mainnet proven
- **Deposit-based autonomous flow** — no human signatures
- **Threshold cryptography** — ICP subnet security, not custom

### **Strategic Position**
- **Algorand ASIF**: Foundation targeting agent commerce — we're infrastructure
- **ICP Chain Fusion**: DFINITY thesis — Sippar validates it works
- **Lava Partnership**: Combined = full-stack agent infra
- **Working Product**: Not vaporware — all flows have tx IDs

---

**Summary**: Sippar is cross-chain payment rails for AI agent commerce. Core infrastructure works on mainnet. Focus now is traction and partnerships.