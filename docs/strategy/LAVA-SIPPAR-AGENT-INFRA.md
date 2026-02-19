# Lava + Sippar: Full-Stack Agent Infrastructure

**Created**: 2026-02-19
**Status**: Strategy / Pre-Grant

## One-Liner

Lava provides AI agents with blockchain RPC access. Sippar provides cross-chain payments. Together: the complete infrastructure stack for autonomous multi-chain agents.

## The Problem

AI agents operating across blockchains need two primitives that don't exist as integrated products:

1. **Chain access** — reliable, multi-chain RPC without managing endpoints or API keys per chain
2. **Cross-chain payments** — pay for services across ecosystems without manual bridging

Today, agents either hardcode Alchemy/Infura endpoints (centralized, single-chain) or don't interact with chains at all. No agent framework has native multi-chain RPC or cross-chain payment support.

## The Solution

| Layer | Provider | What It Does |
|-------|----------|-------------|
| **RPC Access** | Lava Network | Decentralized, multi-chain RPC routing. 50+ chains, 160B+ requests served. Agent calls any chain through one endpoint. |
| **Payments** | Sippar | Cross-chain settlement via ICP chain fusion. Agent pays in ETH, recipient gets ALGO. X402 protocol. |
| **Middleware** | ICP (invisible) | Chain fusion, threshold signatures, ckTokens (ckETH, ckSOL, ckALGO). Swap + settle without bridges. |

## How It Works

```
Agent on Ethereum
  │
  ├─ Reads chain data ──→ Lava RPC (decentralized, multi-chain)
  │
  ├─ Discovers service ──→ Agent marketplace / registry
  │
  └─ Pays for service ──→ Sippar X402
        │
        ├─ ckETH (ICP-wrapped ETH)
        ├─ Swap ckETH → ckALGO (ICPSwap, on-chain)
        ├─ Burn ckALGO
        ├─ Threshold Ed25519 signature (ICP, no seed phrase)
        └─ Native ALGO delivered to Algorand agent
              │
              └─ Agent delivers service, verified on-chain
```

The agent never knows about ICP. It sends ETH, the other agent receives ALGO.

## Why This Matters

### For Algorand
- First chain with full agent infrastructure (RPC + payments)
- Aligns with ASIF roadmap: MCP (Lava) + A2A (marketplace) + x402 (Sippar)
- Brings ETH/SOL liquidity into Algorand via agent commerce
- Positions Algorand as the settlement layer for cross-chain agent payments

### For Lava
- AI agents are the next wave of RPC consumers (post-dApp, post-DeFi)
- First-mover in agent framework integrations (LangChain, MCP, CrewAI — currently zero presence)
- Differentiation from Alchemy/Infura: decentralized + agent-native + payment-integrated
- New revenue stream: agent RPC consumption at scale

### For ICP
- Validates chain fusion as invisible middleware (not competing L1)
- ckToken ecosystem gets real utility (not just speculative trading)
- Threshold signatures used for real cross-chain settlement

## Competitive Landscape

| Player | RPC | Payments | Multi-Chain | Agent-Native |
|--------|-----|----------|-------------|-------------|
| **Lava + Sippar** | ✅ Decentralized, 50+ chains | ✅ Cross-chain X402 | ✅ | ✅ (building) |
| Alchemy | ✅ Centralized | ❌ | Partial | ❌ |
| QuickNode | ✅ Centralized | ❌ | Partial | ❌ |
| Coinbase/Bazaar | ❌ | Partial (x402) | ETH only | Partial |
| POKT/Pocket | ✅ Decentralized | ❌ | Partial | ❌ |

**No one combines decentralized RPC + cross-chain payments for agents.**

## Grant Strategy

### Option A: Unified Algorand Grant
- **Pitch**: Full agent infrastructure for Algorand — RPC (Lava) + payments (Sippar)
- **Ask**: Fund both components as integrated stack
- **Deliverables**: Lava MCP server for Algorand, Sippar payment rail, working cross-chain demo
- **Strength**: Comprehensive, aligns perfectly with ASIF

### Option B: Separate Grants, Coordinated
- **Algorand grant for Sippar**: Cross-chain payment rail, ckALGO settlement
- **Lava internal funding**: MCP server, LangChain integration, agent RPC tooling
- **Coordinate**: Demo combines both at milestone delivery
- **Strength**: Easier to approve (smaller individual asks)

### Option C: Lava Grant + Algorand Grant
- **Lava Foundation grant**: Build Lava MCP server + AI agent integrations
- **Algorand Foundation grant**: Build Sippar payment rail + settlement
- **Combined demo**: Agent uses Lava RPC + Sippar payments end-to-end
- **Strength**: Each funder pays for their piece, demo shows combined value

## MVP Requirements (Pre-Grant Demo)

Must demonstrate the full flow working, not simulated:

### Must Have
1. ✅ ALGO → ckALGO deposit + mint (working)
2. ⬜ ckALGO → ALGO redemption (untested, pieces exist)
3. ⬜ Real ICRC-1 payment verification (not fake tokens)
4. ⬜ ckALGO listed on ICPSwap (enables cross-token swap)
5. ⬜ ckETH → ckALGO swap via ICPSwap (canister integration)
6. ⬜ Grok-powered agent responses (real LLM, not templates)
7. ⬜ Ethereum-side agent initiating payment
8. ⬜ Algorand-side agent receiving ALGO + delivering service

### Nice to Have
- Lava MCP server (agent-accessible RPC)
- LangChain/CrewAI integration
- Agent registry canister
- Multiple agent types in demo

## Critical Path

```
Week 1-2: Bridge completion
  - Redemption e2e (ckALGO → ALGO)
  - Real payment verification (ICRC-1 transfers)
  - List ckALGO on ICPSwap

Week 3: Cross-chain routing
  - Canister calls ICPSwap for ckETH → ckALGO swap
  - Wire swap → burn → sign → settle flow

Week 4: Agents
  - Grok-powered agents (real responses)
  - Ethereum-side agent (pays ckETH)
  - Algorand-side agent (receives ALGO, delivers)

Week 5: Integration + polish
  - End-to-end demo recording
  - Lava MCP server (if time)
  - Grant proposal draft
```

## Revenue Model

- **Sippar**: 0.1% routing fee on cross-chain settlements
- **Lava**: RPC relay fees (existing model, applied to agent traffic)
- **Combined**: Agents pay per-request (RPC) + per-transaction (settlement)

## Key Technical Details

### ICP Chain Fusion (the invisible middleware)
- **ckETH**: Dfinity-maintained, wrapped ETH on ICP (ICRC-1)
- **ckSOL**: Dfinity-maintained, wrapped SOL on ICP (ICRC-1) — future expansion
- **ckALGO**: Sippar-maintained, wrapped ALGO on ICP (ICRC-1)
- **Threshold Ed25519**: ICP signs Algorand transactions without seed phrases
- **ICPSwap**: Permissionless DEX, supports ICRC-1 token pairs

### Lava Network (decentralized RPC)
- 50+ chains supported
- 160B+ requests served
- Decentralized provider marketplace
- Quality-of-service routing (latency, uptime, sync)
- Zero AI agent framework integrations today (opportunity)

### Sippar (cross-chain payments)
- X402 payment protocol
- ICP-Algorand bridge (live, 25+ ckALGO minted)
- Threshold signature custody (no seed phrases)
- Agent marketplace (32 services, needs real LLM)

## Open Questions

1. **ICPSwap liquidity**: How much do we need to seed? ckALGO/ICP or ckALGO/ckETH pair?
2. **Lava internal buy-in**: Does Lava Foundation want to co-fund/co-brand this?
3. **Grant timing**: When is the next Algorand grant cycle?
4. **Agent framework priority**: LangChain vs MCP vs CrewAI — which first?
5. **ckSOL expansion**: Do we add Solana in MVP or defer?
