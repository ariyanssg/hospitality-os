# 03 — Product Strategy

> **One platform. One source of truth. One ecosystem.**
> The hospitality operating system for full-service hotels and resorts — OPERA-class depth, Linear-class speed, Shopify-class ecosystem.

---

## 1. Positioning

**For** full-service hotels, resorts, and hotel groups (60–600 rooms, meaningful F&B) **who** today choose between an expensive, slow legacy bundle (OPERA+Micros) and elegant-but-shallow modern PMSs plus a stack of integrations, **our platform** runs the entire property — rooms, restaurants, money, people, distribution, guests — on a single transactional core, **unlike** every competitor, where at least two of those are somebody else's product connected by a nightly batch or a fragile interface.

**The one-sentence demo:** *a guest's dinner hits their room folio, the GL, the F&B cost report, and the guest's lifetime value — before the server has cleared the table.*

## 2. Wedge & expansion sequence (confirmed: full-service/F&B-first)

1. **Wedge (V1):** PMS + restaurant POS with one folio. The buyer (GM/owner/controller of a full-service independent or small group) currently pays for OPERA+Micros+interfaces or suffers PMS+Toast reconciliation. The integrated folio + day-3 close + real support is a visceral, demoable win. Booking engine + payments included (margin + stickiness from day one).
2. **Surround (V1.5–V2):** channel manager (kill SiteMinder line item), native accounting (kill the QuickBooks export + reconciliation), CRM/guest profile (data flywheel starts), CMS.
3. **Deepen (V2–V3):** revenue AI (native data advantage becomes visible money), HR/scheduling/payroll (the labor line), inventory/procurement (the cost line), BI maturity.
4. **Ecosystem (V3+):** public API marketplace, app platform, benchmark network — the Shopify turn. Every module we *don't* build becomes partner revenue instead of competitor oxygen.

Per-segment note: the architecture serves hostels→resorts (property types are configuration), but sales, onboarding, templates, and demos are tuned for full-service first. We do not chase micro-properties at launch (price war, churn) nor 1,000-room chains (RFP cycles we can't win yet) — we win the underserved middle and grow both directions with references.

## 3. Business model

- **SaaS per room/month, module-tiered:** Core (PMS+booking engine+payments) → Operations (+POS, HK/maintenance, inventory) → Platform (+accounting, HR, RMS, CMS, AI). Transparent public pricing (anti-Oracle positioning); per-property minimums; chain agreements at tenant level.
- **Embedded payments** (PSP partnership, revenue share on volume: rooms + F&B — F&B volume is why the full-service segment is also the best *payments* segment).
- **Usage lines:** SMS/WhatsApp pass-through+margin, AI usage tiers beyond included quota, premium templates.
- **Implementation:** productized onboarding (fixed-fee tiers, data migration tooling from OPERA/Mews/Cloudbeds exports), partner-deliverable from V2.
- **Anti-creep covenant:** no per-interface fees, no charging tenants for their own data (exports/API included) — the resentment lines in every competitor's reviews become our trust marks.

## 4. Moats (in order of durability)

1. **Data-model unification** — competitors can't retrofit one transactional core across acquired products without rewrites; our entire advantage compounds from it.
2. **Switching costs with goodwill** — the ledger, guest history, and configured operations make leaving costly; transparent pricing and data portability make staying *chosen* (retention through love + logistics).
3. **AI on native data** — total-revenue optimization and assistant quality scale with data breadth nobody else has per property.
4. **Benchmark network effects** (V3+) — cross-property anonymized benchmarks improve every tenant's decisions; only works at platform scale.
5. **Compliance capital** — fiscalization/e-invoicing/residency country packs accumulate as expansion barriers for followers.

## 5. Principles (product law, referenced across docs)

1. **One source of truth** — no module keeps a shadow copy of another's data; if two screens disagree, it's a P1 bug.
2. **Speed is a feature** — sub-second interactions; front-desk flows keyboard-complete; perf budgets in CI ([13-ux-strategy.md](13-ux-strategy.md), [12-performance-scalability.md](12-performance-scalability.md)).
3. **API-first, dogfooded** — our apps use the public API; if we can build it, partners can ([08-api-standards.md](08-api-standards.md)).
4. **Permission-first** — every action is a named permission from day one ([06-permission-engine.md](06-permission-engine.md)).
5. **Trust is engineered** — sync ledgers, explain endpoints, audit everywhere, honest forecast-accuracy reporting; we show our work where incumbents hide it.
6. **AI with guardrails** — assistive by default, autonomous by earned trust ladders, never hallucinating prices or permissions ([10-ai-strategy.md](10-ai-strategy.md)).
7. **Depth without clutter** — OPERA's capability without OPERA's cockpit; progressive disclosure, opinionated defaults, configuration not customization.

## 6. Launch motion & proof points

- Design-partner program: 5–10 full-service properties (one flagship resort) co-building V1; public case studies on: front-desk check-in time, POS-to-folio accuracy (100% by construction), days-to-close (target day 3), direct-booking share lift, overbooking incidents (target zero from CM design).
- Migration tooling as a product: importers for OPERA/Mews/Cloudbeds (reservations, rates, guests, AR balances) + parallel-run mode (read-only mirror during cutover week).
- Support as marketing: published SLAs, in-app human chat, public status page, every incident postmortem'd publicly. The bar set by competitor complaints is low; clearing it loudly is cheap brand.

## 7. KPIs

North star: **gross transaction value processed on-platform** (rooms + F&B) — it tracks unified adoption, not just seats. Supporting: properties live, modules-per-property (target ≥4 by month 12 of a tenant), direct-booking share per tenant, logo retention ≥95%, NRR ≥120% (module expansion), time-to-first-value (booking taken < 1 week from contract), support CSAT.

---

Related: [01-market-research.md](01-market-research.md) · [02-competitive-analysis.md](02-competitive-analysis.md) · [15-implementation-roadmap.md](15-implementation-roadmap.md)
