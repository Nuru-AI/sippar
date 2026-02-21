# Documenter Local Context - Sippar

## My Role Here
Documentation creation specialist for Sippar - an ICP-Algorand bridge for AI agent-to-agent commerce with X402 payment protocol.

## My Recent Work
- 2026-02-21: Comprehensive documentation audit - reviewed all existing docs in docs/, ci/docs/, and x402-sdk
- 2026-02-21: Created DOCUMENTATION-AUDIT.md with gap analysis and recommendations

## Patterns I Use Here
- Progressive disclosure: STATUS.md (current state) -> ARCHITECTURE.md (system design) -> API docs (detailed reference)
- Example-first approach especially important for X402 agent integration
- Code examples must be tested against actual endpoints (VPS 74.50.113.152:3004)

## Project-Specific Knowledge
- **Tech stack**: Rust canisters (ICP), TypeScript backend (Express), React frontend
- **Key docs locations**:
  - `docs/STATUS.md` - Current state, what works/doesn't (VERY CURRENT as of 2026-02-21)
  - `docs/ARCHITECTURE.md` - System architecture (CURRENT)
  - `docs/CODEBASE_INVENTORY.md` - Generated code inventory (2026-02-20)
  - `docs/api/endpoints.md` - API reference (STALE - dated Sept 2025)
  - `packages/x402-sdk/README.md` - SDK documentation (aspirational, not reflecting reality)
  - `ci/docs/` - CollaborativeIntelligence system docs, NOT Sippar docs
- **Canister IDs**:
  - threshold_signer: `vj7ly-diaaa-aaaae-abvoq-cai`
  - simplified_bridge: `hldvt-2yaaa-aaaak-qulxa-cai`
  - ck_algo: `gbmxj-yiaaa-aaaak-qulqa-cai` (ARCHIVED)
- **Backend**: VPS 74.50.113.152:3004
- **Production endpoints verified working**:
  - `/health`, `/swap/*`, `/ck-algo/*`, `/api/sippar/x402/*`

## My Current Focus
- [x] Audit existing documentation
- [x] Created docs/api/CURRENT_ENDPOINTS.md (new file, kept old one for reference)
- [x] Created docs/integration/AGENT_QUICKSTART.md
- [x] Created docs/README.md (documentation index)
- [x] Created docs/DOCUMENTATION-AUDIT.md (this audit)
- [ ] Consider: Verify x402-sdk README against actual endpoints

## Critical Issues Found
1. **docs/api/endpoints.md** is severely outdated (Sept 2025) - missing swap endpoints, ckETH swap, many new routes
2. **x402-sdk README** describes aspirational API, not actual working endpoints
3. **docs/guides/user/getting-started.md** references outdated flows
4. **ci/docs/** is for CollaborativeIntelligence system, not Sippar - may confuse external developers
