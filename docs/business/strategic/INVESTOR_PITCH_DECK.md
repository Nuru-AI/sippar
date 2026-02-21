# Sippar Investor Pitch Deck

**Cross-Chain Payment Rail for AI Agent Commerce**
**Last Updated**: February 2026
**Status**: Core infrastructure working on mainnet

---

## 🎯 **Deck Structure Overview**

**Total Slides**: 12 slides (10-12 minute presentation + Q&A)
**Target Audience**: Algorand Foundation grants, ICP ecosystem funds, AI/crypto VCs
**Current Stage**: Infrastructure built, seeking traction and partnerships

---

## 📋 **Slide-by-Slide Content**

### **Slide 1: Title & Status**
**Content**:
- **Company**: Sippar - Cross-Chain Payment Rail for AI Agent Commerce
- **Tagline**: "Agents pay agents. No bridges. No seed phrases. No humans."
- **Status**: Core infrastructure working on ICP mainnet (Feb 2026)
- **Live Systems**: threshold_signer (vj7ly), simplified_bridge (hldvt)

**Speaker Notes**: "We've built the payment infrastructure for AI agent commerce. It works on mainnet. Now we need traction and partnerships."

---

### **Slide 2: The Problem**
**Content**:
- **Agents on different chains can't pay each other**
  - ETH agents can't settle with ALGO agents
  - Bridges are security risks (multisig, not threshold crypto)
  - Seed phrases don't work for autonomous agents
  - No standard protocol for agent-to-agent payments

**Speaker Notes**: "The agent economy is coming. Fetch.ai, Google A2A, Coinbase Bazaar, Algorand ASIF — all need settlement rails. None exist."

---

### **Slide 3: The Solution**
**Content**:
- **ICP as invisible middleware** — not a competing L1
- **Threshold signatures** — ICP subnet controls Algorand keys
- **ckTokens** — ckETH, ckALGO for cross-chain settlement
- **Deposit-based flows** — no human signatures required
- **X402 protocol** — HTTP 402 for pay-per-use services

**Architecture**:
```
ETH Agent → ckETH → Sippar Swap → ckALGO → burn → ALGO to receiving agent
```

**Speaker Notes**: "Agents pay in their native token. Sippar handles the cross-chain settlement. ICP provides the cryptographic security."

---

### **Slide 4: What's Working (Mainnet Proof)**
**Content**:
| Flow | Status | Evidence |
|------|--------|----------|
| ALGO → ckALGO | ✅ Working | 24.12 ckALGO minted (Feb 2026) |
| ckALGO → ALGO | ✅ Working | 0.6 ALGO redeemed via threshold sig |
| ckETH → ckALGO | ✅ Working | 0.000248 ETH → 5.4 ckALGO |
| X402 Payments | ✅ Working | Real ICRC-1 transfers to treasury |
| Agent Services | ✅ Working | 32 services, Grok LLM responses |

**Speaker Notes**: "This isn't vaporware. Every flow has on-chain evidence. We can demo all of this."

---

### **Slide 5: Business Model**
**Content**:
| Revenue Stream | Fee | Status |
|----------------|-----|--------|
| Swap Fee | 0.3% | Active (ckETH→ckALGO) |
| Routing Fee | 0.1% | Active (X402 payments) |
| Agent Services | Per-use | Active (CI marketplace) |
| ICPSwap LP | Variable | Pending (ckALGO listing) |

**Gross Margin**: 95%+ (ICP cycles + VPS only costs)

**Speaker Notes**: "Simple model. Fees on swaps and payments. 95% margin. Revenue scales with volume."

---

### **Slide 6: Strategic Position**
**Content**:
- **Algorand ASIF**: Foundation's 2025+ roadmap explicitly targets agent commerce
- **ICP Chain Fusion**: DFINITY's cross-chain thesis — Sippar validates it works
- **Lava Network**: Partnership opportunity — combined = full-stack agent infra
- **First mover**: Only working ICP-Algorand bridge

**Speaker Notes**: "Algorand is betting on agent commerce. ICP is betting on Chain Fusion. We're infrastructure for both theses."

---

### **Slide 7: Competitive Landscape**
**Content**:
| Solution | Security | Autonomous | Working |
|----------|----------|------------|---------|
| **Sippar** | Threshold | ✅ Yes | ✅ Mainnet |
| Wormhole | Economic | ❌ No | ✅ Yes |
| LayerZero | Oracle | ❌ No | ✅ Yes |
| Others | Multisig | ❌ No | ❌ No |

**Moats**:
- Only ICP-Algorand threshold bridge
- Deposit-based flows (no signatures for agents)
- X402 real payments (not simulated)

**Speaker Notes**: "Existing bridges are for humans. They don't work for autonomous agents. We built for agents."

---

### **Slide 8: Technical Architecture**
**Content**:
```
ICP Mainnet                    Algorand Mainnet
┌─────────────────────┐        ┌──────────────────┐
│ threshold_signer    │───────▶│ Custody Address  │
│ (Ed25519)           │        │ (threshold ctrl) │
├─────────────────────┤        └──────────────────┘
│ simplified_bridge   │              ▲
│ (ICRC-1 ckALGO)     │              │
├─────────────────────┤        ┌─────┴────────────┐
│ ckETH Ledger        │        │ Backend (VPS)    │
│ (ICP native)        │◀──────▶│ Express + Algod  │
└─────────────────────┘        └──────────────────┘
```

**Speaker Notes**: "Two canisters on ICP mainnet. Backend polls Algorand. Threshold signatures enable trustless control."

---

### **Slide 9: Roadmap**
**Content**:
| Phase | Target | Status |
|-------|--------|--------|
| Bridge (ALGO↔ckALGO) | Q4 2025 | ✅ Done |
| Swap (ckETH→ckALGO) | Q1 2026 | ✅ Done |
| ICPSwap Listing | Q1 2026 | Pending |
| Per-User Custody | Q1 2026 | Pending |
| External Integration | Q2 2026 | Planned |
| Multi-Chain (Solana) | Q3 2026 | Planned |

**Speaker Notes**: "Core infrastructure done. Now it's about liquidity, scaling, and integrations."

---

### **Slide 10: What We Need**
**Content**:
**Immediate (Q1 2026)**:
1. ICPSwap listing (ckALGO liquidity)
2. Per-user custody (scale beyond single address)
3. Algorand Foundation grant proposal

**Near-Term (Q2 2026)**:
4. First external integration (ELNA, Fetch.ai, or Bazaar)
5. Full E2E demo (ETH agent → ALGO agent)

**Funding**: Grant-preferred (Algorand Foundation, DFINITY)

**Speaker Notes**: "We're not raising a massive round. Infrastructure is built. We need traction and partnerships."

---

### **Slide 11: Risk Assessment**
**Content**:
| Risk | Severity | Mitigation |
|------|----------|------------|
| Single custody address | High | Fix planned (Q1) |
| Agent economy nascent | Medium | Multiple ecosystems |
| Competition | Medium | First-mover, threshold |
| VPS single point | Low | Canister logic on ICP |

**Speaker Notes**: "Known limitations are documented. Fix for biggest one (custody) is planned."

---

### **Slide 12: Summary & Contact**
**Content**:
- **What exists**: Working ICP-Algorand bridge, swap, X402 payments
- **What's next**: Liquidity, scale, integrations
- **Why interesting**: Algorand ASIF, ICP Chain Fusion, agent economy timing

**Live Systems**:
- Backend: 74.50.113.152:3004
- Canisters: threshold_signer (vj7ly), simplified_bridge (hldvt)

**Documentation**: `/docs/STATUS.md`, `/docs/ARCHITECTURE.md`

**Speaker Notes**: "Working product. Right timing. Low burn. Let's talk partnerships or grants."

---

## 📊 **Appendix: Technical Details**

### **On-Chain Evidence**
- Minted: 24.12 ckALGO from real ALGO deposits
- Redeemed: 0.6 ALGO via threshold signatures
- Swapped: 0.000248 ETH → 5.4 ckALGO (block 935652)
- X402: Real ckALGO transfers to treasury

### **Canister IDs**
- threshold_signer: `vj7ly-diaaa-aaaae-abvoq-cai`
- simplified_bridge: `hldvt-2yaaa-aaaak-qulxa-cai`
- Treasury: `smm4f-x54l6-7c2ed-rxdm7-coedl-62i2x-azfmt-ezhzj-ocftg-aa5ir-iqe`

### **Key Documentation**
- `docs/STATUS.md` — current state, known issues
- `docs/ARCHITECTURE.md` — system design
- `docs/plans/CKETH_CKALGO_SWAP_PLAN.md` — swap details
- `CLAUDE.md` — development context

---

**Summary**: Sippar is cross-chain payment rails for AI agent commerce. Infrastructure works. Focus is traction and partnerships.
