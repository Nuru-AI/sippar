# Sippar Documentation

**Last Updated**: 2026-02-21

Sippar is a cross-chain payment bridge for AI agent-to-agent commerce, built on ICP-Algorand Chain Fusion.

---

## Start Here

| Document | Purpose | Audience |
|----------|---------|----------|
| [CLAUDE.md](../CLAUDE.md) | Project overview | AI assistants, new developers |
| [Agent Quickstart](integration/AGENT_QUICKSTART.md) | Get started in 5 minutes | External developers |
| [Current API Reference](api/CURRENT_ENDPOINTS.md) | Working endpoints | Developers |
| [Architecture](ARCHITECTURE.md) | System design | Technical readers |
| [Status](STATUS.md) | What works today | Everyone |

---

## For External Developers

### Integration Guides

- [Agent Quickstart](integration/AGENT_QUICKSTART.md) - 5-minute start
- [API Reference](api/CURRENT_ENDPOINTS.md) - Current endpoints (verified 2026-02-21)
- [ckETH Swap Plan](plans/CKETH_CKALGO_SWAP_PLAN.md) - Swap implementation details

### Key Concepts

- **ckALGO**: ICRC-1 token on ICP, 1:1 backed by ALGO
- **X402**: HTTP 402-based micropayments for agent services
- **Threshold Signing**: ICP's Ed25519 signatures control Algorand addresses

### Core Flows

1. **Check Balance**: `GET /ck-algo/balance/:principal`
2. **Swap ckETH -> ckALGO**: Deposit to custody, call `/swap/execute`
3. **Pay for Service**: Create payment via X402, use token

---

## Architecture & Technical

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | System architecture, canister map, flows |
| [CODEBASE_INVENTORY.md](CODEBASE_INVENTORY.md) | Code-level inventory |
| [research/X402.md](research/X402.md) | Algorand X402 strategy analysis |

### Canister Reference

| Canister | ID | Purpose |
|----------|------|---------|
| threshold_signer | `vj7ly-diaaa-aaaae-abvoq-cai` | Address derivation, tx signing |
| simplified_bridge | `hldvt-2yaaa-aaaak-qulxa-cai` | ckALGO token, bridge logic |
| ck_algo | `gbmxj-yiaaa-aaaak-qulqa-cai` | **ARCHIVED** |

---

## Internal Documentation

These docs are primarily for the team:

| Directory | Contents |
|-----------|----------|
| `business/` | Business planning, canvas, pitch deck |
| `funding/` | Grant applications |
| `strategy/` | Go-to-market, competitive analysis |
| `reports/` | Breakthrough reports, sprint reports |
| `development/` | Dev process, sprint management |

---

## Document Status

### Current (Safe to Reference)

- STATUS.md - Updated 2026-02-21
- ARCHITECTURE.md - Updated 2026-02-21
- CODEBASE_INVENTORY.md - Generated 2026-02-20
- api/CURRENT_ENDPOINTS.md - Verified 2026-02-21
- integration/AGENT_QUICKSTART.md - Created 2026-02-21

### Outdated (Use With Caution)

- api/endpoints.md - September 2025 (see CURRENT_ENDPOINTS.md instead)
- api/integration.md - September 2025
- guides/user/getting-started.md - September 2025

---

## Not Sippar Documentation

The `ci/docs/` directory contains documentation for the **CollaborativeIntelligence** system, which is a separate project. It is NOT Sippar documentation.

---

## Contributing to Docs

1. All new docs should include "Last Verified" or "Last Updated" dates
2. Prefer updating existing docs over creating new ones
3. Test all code examples before documenting
4. Mark outdated docs clearly

---

**Backend URL**: https://nuru.network/api/sippar/ (or 74.50.113.152:3004)
**Frontend**: https://nuru.network/sippar/
