# 00 — Executive Summary

## The opportunity

A full-service hotel runs 8–15 disconnected systems. The money flows — rooms, restaurants, payments, payroll, procurement — cross system boundaries on middleware that breaks, batch exports that lag, and channel syncs measured in minutes. The market's two camps both fail this segment: **Oracle OPERA + Micros** delivers depth with notoriously poor UX, support, and cost; **Mews/Cloudbeds-class** platforms deliver elegance without F&B, accounting, or labor depth. Research across review platforms and vendor documentation (June 2026) confirms the complaint patterns are structural, not incidental: sync-lag overbookings, PMS↔POS interface outages, shallow reporting, month-end reconciliation between systems that should never have disagreed.

**We build the Hospitality Operating System: one platform, one source of truth, one ecosystem** — PMS, POS, booking engine, channel manager, accounting, CRM, HR/payroll, inventory, CMS, revenue AI, and an AI assistant on a single transactional core.

## The wedge

**V1 targets full-service hotels and resorts with restaurants** — the segment trapped in the Oracle bundle. The demo that closes deals: *a guest's dinner posts to their room folio, the general ledger, the food-cost report, and their lifetime value before the table is cleared.* No middleware, no nightly batch, no reconciliation — because it's one database transaction.

## Architectural theses (full detail: docs 04–14)

1. **Modular monolith** (NestJS/Fastify + Next.js + PostgreSQL + Redis + OpenSearch) — 18 bounded modules, one deployable, ACID transactions across folio/POS/ledger, extraction-ready seams for later scale.
2. **Zero-lag by construction:** booking engine and channel manager read/write the same availability counters as the front desk; OTA pushes fire from domain events in < 5 s (industry: 30–90 s polling rounds).
3. **A double-entry ledger is the financial spine** — operations *generate* accounting (USALI-native); the trial balance ties to the front desk by construction, enabling day-3 closes.
4. **Multi-tenant, permission-first:** shared schema with forced PostgreSQL row-level security; ~230 fine-grained `resource.action` permissions with tenant/property/department scoping.
5. **AI on native data:** predictive (demand forecasting, open pricing with autonomy guardrails), conversational (Claude-powered assistant over a governed semantic layer — numbers always match the dashboard), ambient (smart assignment, sentiment routing, anomaly briefs). No AI in transactional critical paths.
6. **Offline where it matters:** POS terminals run a full check lifecycle offline with idempotent replay; the restaurant never stops serving.

## Strategy in one paragraph

Enter with PMS+POS+booking engine at transparent per-room pricing with embedded payments (Phase 1, design partners by month 12). Surround with channel manager, native accounting, CRM, and CMS — deleting three vendor line items (Phase 2, GA). Deepen with revenue AI, scheduling/payroll, and procurement until the property runs entirely on-platform (Phase 3). Then open the ecosystem: public API marketplace, enterprise chains, country packs, benchmark network (Phase 4). The moat is the unified data model — competitors assembling suites by acquisition cannot retrofit one transactional core; every module we add compounds it.

## What this document set contains

Market research and competitive analysis grounding every design choice (01–03); system, tenancy, permission, database, API, and security architecture (04–09); AI strategy (10); infrastructure, performance, UX, and engineering standards (11–14); a phased roadmap with exit criteria (15); risks with pre-decided mitigations and the expansion thesis (16); and complete specifications for all 25 functional domains in 14 module documents (modules/01–14), each covering purpose, features, entities, APIs, workflows, permissions, dependencies, events, and scalability.

**Read first:** [03-product-strategy.md](03-product-strategy.md) → [04-system-architecture.md](04-system-architecture.md) → [modules/01-pms-core.md](modules/01-pms-core.md) → [15-implementation-roadmap.md](15-implementation-roadmap.md).
