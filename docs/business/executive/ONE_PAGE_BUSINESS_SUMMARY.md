# Sippar: One-Page Business Summary

**Cross-Chain Payment Rail for AI Agent Commerce**

**Last Updated**: February 2026

---

## 🎯 **The Opportunity**

**Market Problem**: AI agents on different chains (Ethereum, Algorand, ICP) cannot pay each other. No infrastructure exists for autonomous agent-to-agent transactions across ecosystems.

**Sippar's Solution**: Cross-chain payment rail using ICP threshold signatures. Agents pay in their native token; Sippar swaps via ICP DEX, burns ckALGO, and settles native ALGO to the receiving agent. No bridges, no seed phrases, no human intervention.

---

## 🏆 **What's Already Working (Production)**

✅ **Bridge Layer (Mainnet)**: Deposit ALGO → mint ckALGO → redeem → withdraw ALGO (all proven Feb 2026)
✅ **ckETH → ckALGO Swap**: Autonomous deposit-based swap at ICP Exchange Rate (~21,750 ALGO/ETH)
✅ **X402 Real Payments**: JWT-signed tokens with real ICRC-1 ckALGO transfers on-chain
✅ **CI Agent Marketplace**: 32 services, real Grok LLM responses, payment-gated access
✅ **Threshold Signatures**: ICP Ed25519 signatures controlling Algorand addresses (proven mainnet)
✅ **Live Demo**: Backend at 74.50.113.152:3004, canisters on ICP mainnet

---

## 💡 **Unique Value Propositions**

### **For AI Agent Developers**
- **No Custody Risk**: ICP threshold signatures — no seed phrases, no bridges to hack
- **Cross-Chain Native**: Agents on ETH pay ckETH, receive services from ALGO-based agents
- **Autonomous Operations**: Deposit-based flows require no human signatures
- **Standard Protocols**: X402 (HTTP 402) + ICRC-1 tokens — works with existing agent frameworks

### **For Enterprises / Platforms**
- **Invisible Infrastructure**: ICP is middleware, not a competing L1 — agents use native tokens
- **Mathematical Security**: Threshold cryptography, not multisig — proven secure
- **Instant Settlement**: Sub-second ICP finality, no bridging delays
- **Audit Trail**: All payments on-chain (ICRC-1 transfers verifiable via dfx)

---

## 📊 **Market & Business Model**

### **Target Markets**
- **Algorand Ecosystem**: ASIF initiative (MCP + A2A + x402) targeting agentic commerce
- **ICP Ecosystem**: Chain Fusion applications needing cross-chain payments
- **Multi-Chain Agents**: Fetch.ai, Google A2A, Coinbase Bazaar agents needing settlement

### **Revenue Model**
1. **Transaction Routing Fee**: 0.1% on all cross-chain agent payments
2. **Swap Fee**: 0.3% on ckETH → ckALGO conversions
3. **CI Agent Services**: Pay-per-use AI agent invocations (Grok-powered)
4. **Future**: ICPSwap liquidity provision, enterprise SLAs

---

## 🚀 **Competitive Advantages**

### **Technical Moats**
- **Threshold Cryptography**: ICP subnet controls Algorand keys — no seed phrase custody
- **Chain Fusion Pioneer**: First working ICP-Algorand bridge (proven mainnet Sept 2025)
- **Deposit-Based Swaps**: No signatures required — true autonomous agent flow
- **Anti-Replay Protection**: On-chain tx_id tracking prevents double-spending

### **Strategic Position**
- **Algorand Foundation Alignment**: ASIF initiative explicitly targets agent commerce
- **ICP Ecosystem**: Chain Fusion grants, DFINITY support for cross-chain apps
- **Lava Network Partnership**: Combined with decentralized RPC (50+ chains, 160B+ requests)
- **Working Product**: Not a pitch — all core flows proven on mainnet

---

## 🎯 **Traction & Proof Points**

### **On-Chain Evidence (February 2026)**
- **Minted**: 24.12 ckALGO from real ALGO deposits
- **Redeemed**: 0.6 ALGO delivered to external wallets via threshold signatures
- **Swapped**: 0.000248 ETH → 5.4 ckALGO (first mainnet swap)
- **Payments**: X402 real payments transferring ckALGO to treasury
- **Agents**: 32 services, real Grok responses, payment-gated

### **Infrastructure**
- **2 Canisters**: threshold_signer (vj7ly), simplified_bridge (hldvt) on ICP mainnet
- **Backend**: VPS at 74.50.113.152:3004, 111+ API endpoints
- **CI API**: Docker on VPS port 8080, 17 agent types loaded

---

## 💰 **Next Steps / Funding**

### **Immediate Priorities (Q1 2026)**
1. **ICPSwap Listing**: Get ckALGO tradeable for cross-token routing
2. **Per-User Custody**: Scale beyond single shared address
3. **Algorand Grant**: Submit proposal with Lava partnership

### **Near-Term (Q2 2026)**
4. **ETH-Side Agent Demo**: Agent pays ckETH, receives service
5. **Full E2E Demo**: ETH agent pays, ALGO agent delivers, automated
6. **External Integrations**: ELNA, Fetch.ai, or Coinbase Bazaar pilot

### **Funding Ask: TBD**
- Core infrastructure working — focus is now on traction and partnerships
- Grant funding preferred (Algorand Foundation, DFINITY)
- Equity raise for aggressive scaling if market timing right

---

## 📈 **Technical Validation**

### **Performance**
- **Minting**: ~30 second deposit detection, 6-block confirmation, automatic mint
- **Redemption**: Threshold sign + Algorand submit in <5 seconds
- **Swap**: Exchange rate fetch from ICP XRC, sub-second mint
- **API**: 111+ endpoints, 580ms average response time

### **Security**
- **No custody risk**: ICP threshold signatures, not multisig or bridges
- **Anti-replay**: Transaction IDs tracked on-chain
- **Upgrade-safe**: Canister state preserved via stable storage

---

## 🎖️ **Why Sippar**

### **Technical Differentiation**
- **Only working ICP-Algorand bridge** — proven mainnet transactions
- **Deposit-based autonomous flow** — no human signatures required
- **X402 real payments** — not simulated, actual on-chain transfers

### **Strategic Timing**
- **Algorand ASIF**: Foundation explicitly targeting agent commerce infrastructure
- **ICP Chain Fusion**: Cross-chain is the thesis — Sippar is proof it works
- **Agent Economy**: Fetch.ai, Google A2A, Coinbase Bazaar all need settlement rails

---

## 📞 **Contact**

**Backend**: 74.50.113.152:3004 (live endpoints)
**Canisters**: threshold_signer (vj7ly), simplified_bridge (hldvt) on ICP mainnet
**Documentation**: See `/docs/STATUS.md`, `/docs/ARCHITECTURE.md`

---

**Summary**: Sippar is the cross-chain payment rail for AI agent commerce. Core infrastructure is working on mainnet. The focus now is traction, partnerships, and scaling.