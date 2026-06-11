# 14 — Engineering Standards

> Standards exist to make the modular monolith stay modular, the speed stay fast, and the team stay small relative to surface area. Everything here is enforced by tooling, not memos.

---

## 1. Monorepo (Turborepo + pnpm)

```
hospitality-os/
├── apps/
│   ├── api/                  # NestJS (Fastify) — the modular monolith
│   │   └── src/modules/
│   │       ├── kernel/       # auth, tenancy, permissions, events, audit, files
│   │       ├── reservations/ # each module: api/ (controllers+dto), domain/
│   │       ├── availability/ #   (services, entities, state machines),
│   │       ├── rates/        #   infra/ (repositories), events/ (handlers),
│   │       ├── folio/        #   index.ts (PUBLIC api of the module)
│   │       ├── gl/  pos/  housekeeping/  inventory/  procurement/
│   │       ├── crm/  loyalty/  channel/  booking-engine/  cms/
│   │       ├── revenue/  hr/  payroll/  reporting/  notifications/  ai/
│   │       └── ...
│   ├── web/                  # Next.js staff PMS
│   ├── pos/                  # POS terminal (Next.js PWA / Electron shell)
│   ├── guest/                # guest portal/app (Next.js PWA)
│   ├── booking/              # booking engine flow + widget
│   ├── sites/                # CMS site renderer (Next.js ISR)
│   ├── mobile/               # Expo (staff app)
│   └── inference/            # Python FastAPI (ML serving)
├── packages/
│   ├── contracts/            # Zod schemas + OpenAPI bindings + generated SDK
│   ├── ui/                   # design system (shadcn-based) + tokens
│   ├── permissions/          # permission catalog (single source of truth)
│   ├── metrics/              # semantic layer definitions
│   ├── db/                   # Drizzle schema, migrations, RLS policies
│   ├── events/               # event taxonomy + envelope types
│   └── config/               # eslint, tsconfig, tailwind presets
├── tooling/                  # codegen, checks (boundaries, RLS coverage), scripts
└── infra/                    # terraform, helm, argocd
```

**Boundary enforcement:** ESLint `boundaries` rules — app code imports a module only via its `index.ts`; modules import other modules' `index.ts` only along the allowed dependency graph (declared in `tooling/module-graph.json`, mirrors [04-system-architecture.md §2](04-system-architecture.md)); `packages/*` never import `apps/*`. Violations fail CI.

## 2. Coding standards

- TypeScript `strict` everywhere; no `any` without `// expl:` justification comment; exhaustive switches on unions (compiler-enforced).
- Validation at boundaries only (Zod in controllers/jobs); domain code trusts typed inputs.
- Errors: typed domain errors (`AvailabilityConflictError`) mapped centrally to problem+json; never throw strings; never catch-and-swallow.
- Money via a `Money` value object (amount-string + currency) — arithmetic only through it; raw float math on money fails lint (custom rule).
- Dates: `Temporal`/date-fns with explicit zones; business-date logic only via the kernel's `BusinessDateService`.
- Repository pattern per module; SQL lives in `infra/`; transactions via kernel `UnitOfWork` (ensures outbox+audit join the same txn).
- Naming/comment style: code states constraints, comments explain *why* (invariants, regulatory reasons), no narration.
- Feature flags wrap incomplete work — trunk-based development, no long-lived branches.

## 3. Testing strategy

| Layer | Tooling | Policy |
|---|---|---|
| Unit (domain logic, pricing, state machines, tax calc) | Vitest | fast, exhaustive on money/availability math; property-based tests (fast-check) on ledger balancing & counter invariants |
| Integration (module API + real Postgres) | Vitest + Testcontainers | every endpoint: happy path + authz matrix (permission denied per role) + tenancy isolation probe (tenant B cannot see tenant A — generated for every resource) |
| Contract | OpenAPI spec diff + SDK compile | breaking-change gate |
| E2E | Playwright | the 12 golden flows (walk-in, check-in/out, room move, POS room charge, refund, group pickup, OTA booking materialization, night audit, rate push, payroll run, period close, online check-in); keyboard-only variants for front-desk flows |
| Load | k6 in CI (nightly) + pre-release | budget regressions fail ([12-performance-scalability.md](12-performance-scalability.md)) |
| AI evals | golden-question suites | accuracy/refusal/leak probes gate AI releases |

Coverage gates on domain packages (≥90% on folio/gl/availability/rates); mutation testing (Stryker) on the ledger and counters — the code where bugs cost real money.

## 4. CI/CD

- **CI (per PR):** typecheck → lint+boundaries → unit/integration (Turborepo-cached, affected-only) → contract diff → RLS-coverage check → permission-catalog sync check → build → preview deploy (frontends) → Playwright smoke. Target wall time < 12 min.
- **CD:** trunk-based; merge → auto-deploy dev → staging (auto, with seeded synthetic tenants + OTA sandboxes) → prod via promotion (canary 10→50→100 on error/latency analysis; auto-rollback). DB migrations: expand→migrate→contract pattern, never breaking running pods; migration dry-run against prod-clone nightly.
- **Release management:** continuous for platform; weekly release notes (customer-facing changelog, Linear-style); versioned API changes per [08-api-standards.md](08-api-standards.md); mobile via Expo OTA + monthly store cadence; feature-flag progressive rollout per tenant ring (internal → design partners → GA).

## 5. Observability

- **OpenTelemetry end-to-end:** traces (HTTP → service → SQL → queue → consumer, `correlation_id` = trace id surfaced in error responses and audit rows), metrics, structured logs (JSON; `tenant_id`, `property_id`, `module` fields; PII-scrubbed at source) → collector → Grafana stack or Datadog (decide on team familiarity; abstraction is OTel either way).
- **SLOs with error budgets:** API availability 99.95%, reservation-create success 99.99%, event-to-projection lag < 5 s, channel push < 5 s, WS delivery < 1 s. Burn-rate alerts page; budget exhaustion freezes feature deploys for stability work (the rule that keeps "speed is a feature" true).
- **Per-domain dashboards:** night-audit health (all properties' audit status on one screen — ops team's morning view), channel sync health, queue depths, outbox lag, DB hot queries, per-tenant anomaly flags.
- On-call: single rotation initially; runbooks per alert in-repo; public status page + per-incident postmortems ([03-product-strategy.md §6](03-product-strategy.md)).

## 6. Documentation & decision hygiene

ADRs (architecture decision records) in `docs/adr/` — required for any deviation from these standards or the module graph; module READMEs follow the spec template; the OpenAPI docs site and this blueprint are versioned artifacts, updated in the same PR as behavior changes ("docs or it didn't happen").

---

Related: [04-system-architecture.md](04-system-architecture.md) · [08-api-standards.md](08-api-standards.md) · [11-infrastructure.md](11-infrastructure.md)
