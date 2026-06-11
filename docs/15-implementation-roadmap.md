# 15 — Implementation Roadmap

> Sequencing rule: ship the wedge (PMS + POS + one folio) to design partners fast, with the kernel done *right* (tenancy, permissions, events, ledger) because those are unfixable later. Everything else is iterative.

---

## Phase 0 — Foundation (months 0–4)

**Goal:** the kernel and the rails; a booking can be taken end-to-end in a dev environment.

- Monorepo, CI/CD, environments, IaC ([14-engineering-standards.md](14-engineering-standards.md), [11-infrastructure.md](11-infrastructure.md))
- Kernel: Better Auth integration, tenancy + RLS framework, permission engine + catalog, transactional outbox + event bus, audit log, files, notifications skeleton
- Design system v1 (tokens, density modes, core components, rack/board primitives)
- Revenue core data model: availability counters, rates, reservations, folios, GL spine + night-audit walking skeleton
- Contracts/SDK pipeline (OpenAPI generation, typed SDK consumed by `web`)

**Exit:** demo tenant takes a booking via API → folio → daily journal; RLS/permission/outbox test suites green; 12-min CI.

**Team:** ~8 engineers (2 kernel/platform, 3 revenue core, 2 frontend/design-system, 1 infra) + design lead + PM/domain expert (hotelier-in-residence).

## Phase 1 — V1 Wedge: full-service PMS + POS (months 4–12)

**Goal:** 5–10 design-partner properties live, running front desk *and* restaurant on us.

- PMS core complete ([modules/01-pms-core.md](modules/01-pms-core.md)): reservations lifecycle, front desk boards + rack, walk-ins, groups v1 (blocks, rooming lists, master folios), folio routing, payments via PSP, taxes, night audit, cashier sessions
- Housekeeping v1 ([modules/02](modules/02-housekeeping-maintenance.md)): boards, tasks, attendant mobile (PWA), maintenance tickets
- **POS v1 ([modules/03](modules/03-pos-restaurant.md)): floor plans, ordering, KDS, splits, discounts, offline op-queue, room charge to folio, shift close** — the headline
- Booking engine v1 ([modules/08](modules/08-cms-booking-engine.md), engine before CMS): availability/rates flow, PSP payment, confirmations, modify/cancel, embeddable widget
- Reporting v1: manager flash, daily revenue, arrivals/departures, night-audit pack, outlet flash; semantic-layer foundation
- Guest messaging v1: transactional emails, conversation inbox (email/SMS)
- AI quick wins: smart room assignment suggestions, AI search, sentiment routing
- Migration tooling v1 (reservations/guests/rates importers), onboarding playbook
- Compliance baseline: GDPR tooling, SAQ-A posture, pen test

**Exit criteria (measured at partners):** check-in < 60 s keyboard-only; POS→folio accuracy 100%; zero overbooking incidents from our stack; night audit unattended ≥ 95% of nights; support CSAT ≥ 4.5; the integrated-folio demo closes new prospects.

**Team:** ~14–16 (+POS pod of 3, +1 mobile, +1 data/BI, +support/implementation lead).

## Phase 2 — Surround: distribution + money (months 12–20)

**Goal:** replace the SiteMinder and QuickBooks line items; GA launch.

- Channel manager ([modules/09](modules/09-channel-manager.md)): Booking.com, Expedia, Airbnb, Agoda, Trip.com adapters; mapping studio; health dashboard; kill switch; overbooking workflow
- Accounting GA ([modules/05](modules/05-accounting-finance.md)): full GL/USALI, AR/AP, bank reconciliation, period close, statements
- CRM v1 ([modules/07](modules/07-crm-guest-loyalty.md)): unified profiles, dedup/merge, segments, pre-arrival upsells, surveys
- CMS v1: site builder, offers, SEO, multi-language; guest portal + online check-in ([modules/13](modules/13-mobile-apps.md))
- Staff mobile app GA (manager + housekeeping roles); webhooks + public API/SDK GA
- SOC 2 Type I; pricing/packaging GA; payments revenue share live

**Exit:** 50–100 properties; ≥4 modules average per property; direct-booking share lift demonstrated; day-3 close at reference properties.

## Phase 3 — Deepen: intelligence + labor + cost (months 20–30)

- Revenue management ([modules/10](modules/10-revenue-management.md)): forecasting, open pricing, autopilot advise→guardrails; events calendar; group displacement
- HR & scheduling GA ([modules/06](modules/06-hr-payroll.md)): demand-driven scheduling, time/tips, ESS; payroll in launch countries + bureau export elsewhere
- Inventory & procurement GA ([modules/04](modules/04-inventory-procurement.md)): stock, recipes/costing, PO cycle, variance
- BI explorer + scheduled reports + owner portal ([modules/11](modules/11-reporting-bi.md)); loyalty v1
- AI assistant beta: NL analytics + GM briefings ([modules/14](modules/14-ai-assistant.md)); SOC 2 Type II

**Exit:** the full-service property runs *entirely* on the platform; TRevPAR/labor% dashboards become sales artifacts; NRR > 120%.

## Phase 4 — Ecosystem & scale (months 30+)

- AI assistant GA (action execution, guest assistant on owned channels, autopilot full)
- Marketplace: partner API program, app directory, OAuth apps, revenue share
- Enterprise: chain standards (corporate rate/brand governance), SSO/SCIM, dedicated-cell tier, GDS connectivity
- Geographic expansion: fiscalization country packs, payroll packs, additional cells (residency)
- Benchmark network (anonymized cross-tenant indices)

## Cross-phase tracks (always-on)

Security (quarterly pen-test cadence from GA) · performance budgets · migration tooling hardening · support tooling (the "explain" endpoints, sync ledgers) · design-partner council → customer advisory board.

## Risks checkpoint

Top delivery risks and their mitigation hooks live in [16-risks-and-future.md](16-risks-and-future.md); the roadmap's structural hedge is that each phase ships a self-sufficient commercial product — a slip in Phase 3 delays upsell, not survival.
