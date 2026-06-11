# Hospitality OS — Architecture & Product Blueprint

> **One platform. One source of truth. One ecosystem.**
> Complete technical architecture, product strategy, and engineering standards for a next-generation Hospitality Operating System targeting full-service hotels and resorts. Authored June 2026.

## Reading order

New to the project: `00 → 03 → 04 → modules/01 → 15`. Engineers: `04 → 05 → 06 → 07 → 08 → 14`. Product/commercial: `01 → 02 → 03 → 13 → 15 → 16`.

## Document map

| Doc | Contents |
|---|---|
| [00-executive-summary.md](00-executive-summary.md) | The thesis, wedge, and architecture in two pages |
| [01-market-research.md](01-market-research.md) | Market size, validated pain themes, 2026 trends, future of hospitality software |
| [02-competitive-analysis.md](02-competitive-analysis.md) | OPERA, Mews, Cloudbeds, Toast, SiteMinder et al. — strengths, complaints, the gap |
| [03-product-strategy.md](03-product-strategy.md) | Positioning, wedge & expansion, business model, moats, product principles, KPIs |
| [04-system-architecture.md](04-system-architecture.md) | Modular monolith, module map, event/outbox architecture, runtime topology, offline strategy |
| [05-multi-tenancy.md](05-multi-tenancy.md) | Tenant→property→department model, Postgres RLS, isolation across every layer |
| [06-permission-engine.md](06-permission-engine.md) | ~230-permission catalog, roles, scoping, conditions, feature flags, runtime |
| [07-database-design.md](07-database-design.md) | Conventions, core ERD, availability counters, indexing, partitioning, audit, Redis/OpenSearch maps |
| [08-api-standards.md](08-api-standards.md) | REST conventions, errors (RFC 9457), pagination, idempotency, versioning, webhooks, examples |
| [09-security.md](09-security.md) | Better Auth, MFA/passkeys, field-level encryption, PCI SAQ-A posture, GDPR, OWASP |
| [10-ai-strategy.md](10-ai-strategy.md) | Predictive / conversational / ambient layers, Claude gateway, governance |
| [11-infrastructure.md](11-infrastructure.md) | AWS/EKS topology, IaC, environments, CDN, DR, cells |
| [12-performance-scalability.md](12-performance-scalability.md) | Budgets, caching layers, DB scaling sequence, rate limiting, capacity model |
| [13-ux-strategy.md](13-ux-strategy.md) | Design language, keyboard/command system, signature screens, interaction principles |
| [14-engineering-standards.md](14-engineering-standards.md) | Monorepo layout, boundaries, testing, CI/CD, observability/SLOs |
| [15-implementation-roadmap.md](15-implementation-roadmap.md) | Phases 0–4 with scope, teams, and exit criteria |
| [16-risks-and-future.md](16-risks-and-future.md) | Risk register, kill criteria, expansion opportunities |

## Module specifications

Each follows a fixed template: Purpose · Features · Database entities · APIs · Workflows · Permissions · Dependencies · Events · Future scalability.

| Module | Covers |
|---|---|
| [01-pms-core.md](modules/01-pms-core.md) | Reservations, front desk, check-in/out, rooms, rates, packages, availability, folios, charges, payments, refunds, taxes, groups, walk-ins, night audit |
| [02-housekeeping-maintenance.md](modules/02-housekeeping-maintenance.md) | Housekeeping boards/tasks, inspections, maintenance tickets, assets, PM |
| [03-pos-restaurant.md](modules/03-pos-restaurant.md) | **V1 wedge** — POS, KDS, menus, room charge as transaction, offline terminals |
| [04-inventory-procurement.md](modules/04-inventory-procurement.md) | Stock, recipes/costing, requisition→PO→receiving→3-way match |
| [05-accounting-finance.md](modules/05-accounting-finance.md) | GL (USALI), AR/AP, tax, reconciliation, statements, close |
| [06-hr-payroll.md](modules/06-hr-payroll.md) | HR records, demand-driven scheduling, time/tips, payroll runs |
| [07-crm-guest-loyalty.md](modules/07-crm-guest-loyalty.md) | Unified guest profiles, segments, campaigns, upsells, loyalty, feedback |
| [08-cms-booking-engine.md](modules/08-cms-booking-engine.md) | Website builder, SEO, offers; zero-lag direct booking engine |
| [09-channel-manager.md](modules/09-channel-manager.md) | OTA adapters (Booking.com, Expedia, Agoda, Airbnb, Trip.com), ARI sync, conflicts |
| [10-revenue-management.md](modules/10-revenue-management.md) | Forecasting, open pricing, autopilot trust ladder, displacement |
| [11-reporting-bi.md](modules/11-reporting-bi.md) | Semantic metrics layer, report canon, dashboards, explorer, owner portal |
| [12-notifications.md](modules/12-notifications.md) | Staff alerts, guest messaging spine, templates, conversations |
| [13-mobile-apps.md](modules/13-mobile-apps.md) | Staff app, guest portal/app, digital key, offline patterns |
| [14-ai-assistant.md](modules/14-ai-assistant.md) | Claude-powered staff/guest assistant, NL analytics, action execution |

## Mandated stack

Next.js · TypeScript · Tailwind · shadcn/ui · TanStack Query · Zustand · React Hook Form · Zod · NestJS (Fastify) · PostgreSQL · Redis · OpenSearch · Socket.IO · Better Auth · Docker · Kubernetes · AWS · REST/OpenAPI/webhooks · event-driven · modular monolith, extraction-ready.

## Requested-deliverable cross-reference

Executive summary (00) · Market research (01) · Competitive analysis (02) · Product strategy (03) · System architecture (04) · Module architecture (04 §2 + modules/) · Database design (07) · API design (08) · Security design (09) · AI strategy (10 + modules/14) · Infrastructure design (11) · Scalability strategy (12) · UX strategy (13) · Implementation roadmap & phases (15) · Risks & mitigation (16 §1–2) · Future expansion (16 §3). Requested module list (25 areas) → PMS/Front Desk/Reservations (modules/01), Housekeeping & Maintenance (02), POS & Restaurant (03), Inventory & Procurement (04), Accounting/Finance & Payroll (05, 06), HR (06), CRM/Guest Profiles/Loyalty (07), Website CMS & Booking Engine (08), Channel Manager (09), Revenue Management (10), Reporting & BI (11), Notifications (12), Mobile Apps (13), AI Assistant (14).
