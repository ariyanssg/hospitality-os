# 16 — Risks, Mitigation & Future Expansion

## 1. Risk register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | **Scope breadth kills focus** — 25 modules is a decade of work; trying to ship it all early produces shallow everything (the exact weakness we attack competitors on) | High | Fatal | Wedge discipline ([15-implementation-roadmap.md](15-implementation-roadmap.md)): each phase is a complete commercial product; module GA gates include depth checklists vs incumbent baselines; explicit "not yet" list maintained publicly to partners |
| R2 | **Domain complexity underestimated** (night audit edge cases, group wash, tax regimes, folio routing) | High | High | Hotelier-in-residence on the core team; design partners co-design before code; OPERA-experienced advisors review specs; the 12 golden E2E flows encode operator reality |
| R3 | **Migration friction** — hotels won't switch mid-contract with data hostage | High | High | Migration tooling as product (importers, parallel-run mode); switch-cost subsidies; win new-builds/rebrands/management-company rollouts first |
| R4 | **OTA API dependence** — certification delays, breaking changes, rate limits | Medium | High | Adapter isolation; OTA sandbox CI; certification begun in Phase 1 (long lead); fallback iCal/manual modes for soft-launch; channel kill switch protects tenants from our own integration bugs |
| R5 | **Payments/PCI missteps** | Medium | Severe | Out-of-scope architecture (tokens only, SAQ-A); PSP partnership rather than acquiring; fintech counsel before embedded-payments GA |
| R6 | **Single-region/cell outage damages 24/7 businesses** | Medium | High | Multi-AZ, tested DR (RPO≤5min), POS offline mode, printable emergency packs, public status + postmortems; warm-standby tier for enterprise |
| R7 | **RLS/tenancy defect leaks data across tenants** | Low | Severe | Defense-in-depth (RLS + repo filters), generated isolation tests per resource, fail-closed contexts, pen tests targeting tenancy, bug bounty |
| R8 | **Incumbent response** (Oracle price cuts; Mews ships POS; Cloudbeds moves upmarket) | Medium | Medium | Speed + unified-core moat (hard to retrofit); depth in F&B/accounting where their architectures resist; don't compete on price against Oracle discounting — compete on TCO + experience |
| R9 | **Regulatory sprawl** (fiscalization, e-invoicing, payroll law per country) | High | Medium | Country packs as gated expansion artifacts; launch-market legal review; payroll-export mode where native payroll isn't certified; revenue-weighted country sequencing |
| R10 | **AI trust failure** (wrong number to a GM, wrong promise to a guest) | Medium | High | Semantic-layer-only numbers, confirmation cards for actions, confidence-gated guest replies with human handoff, eval suites in CI, per-tenant AI off-switch |
| R11 | **Team scaling dilutes the architecture** (boundary erosion, perf regressions) | Medium | Medium | Tooling-enforced standards ([14-engineering-standards.md](14-engineering-standards.md)): boundary lint, RLS checks, perf budgets, mutation tests on money code; ADR discipline |
| R12 | **Hardware/peripheral reality** (printers, key encoders, fiscal printers, PSP terminals) | High | Medium | Hardware abstraction layer + certified-device list (narrow, opinionated); local device-bridge agent; partner with hardware distributors; this is unglamorous and budgeted for in POS pod |

## 2. Kill criteria & pivots (pre-decided)

- If design partners won't run the **POS** after 2 quarters of iteration → fall back to PMS-first with deep certified POS integrations (Toast/Lightspeed) while keeping the folio spine — the unified-ledger pitch survives via integration depth.
- If full-service sales cycles exceed runway → temporary down-market motion (boutique 40–100 rooms with F&B) on the same product.

## 3. Future expansion opportunities (beyond the roadmap)

1. **Fintech layer:** working-capital lending against on-platform revenue visibility (Toast Capital/Shopify Capital model — our ledger sees true cash flows); AP virtual cards (interchange revenue); FX for cross-border groups; payout orchestration for owners.
2. **Marketplace & app platform:** OAuth apps, embedded app surfaces (Shopify-style), revenue share; certified hardware program; theme/template marketplace for CMS.
3. **Benchmark & data network:** anonymized market indices (occupancy/ADR/pace by market) — an STR alternative born from live data; demand forecasts as a data product.
4. **Adjacent verticals on the same core:** serviced apartments/extended stay (V1 config already), hostels, vacation-rental management companies (Guesty territory), boutique chains' franchise tooling — then spa/golf/activities (Agilysys parity), MICE/function-space sales & catering (banquets reuse blocks + POS + folios).
5. **Guest-facing network effects:** cross-property loyalty alliances; a guest identity wallet (consented profile portability across tenant hotels — privacy-forward differentiation).
6. **Agentic distribution readiness:** first-class booking API + structured data for AI travel agents; become the easiest inventory for agentic buyers to transact with — the next decade's "Google free booking links" land-grab.
7. **Owner/asset-manager suite:** portfolio analytics, budget/forecast collaboration, management-agreement reporting, valuation data rooms — selling *up* the capital stack from the same data.
8. **International depth:** fiscal country packs as moat ([R9] flipped into offense); multilingual AI assistant as emerging-market differentiator.

## 4. The long bet

Every expansion above rides the same asset: **the unified transactional core**. The discipline that protects it — module boundaries, one source of truth, permission-first, evented everything — is therefore not engineering aesthetics; it is the balance sheet. Guard it accordingly.

---

Related: [03-product-strategy.md](03-product-strategy.md) · [15-implementation-roadmap.md](15-implementation-roadmap.md)
