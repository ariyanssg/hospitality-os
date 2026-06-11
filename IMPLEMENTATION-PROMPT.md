# Implementation Kickoff Prompt — Hospitality OS

> Copy everything below this line into a new Claude Code session started in `~/Desktop/ariyan/hospitality-os/`.

---

You are implementing a Hospitality Operating System — a unified platform (PMS + restaurant POS + booking engine + accounting + more) for full-service hotels and resorts. The complete architecture blueprint already exists in `docs/` in this directory. **The blueprint is the source of truth — do not re-litigate decisions already made there.** When code and blueprint conflict, raise it; when the blueprint is silent, decide consistently with its principles and record an ADR in `docs/adr/`.

## Step 0 — Read before writing any code

Read these in order (skim the rest of `docs/` as needed):

1. `docs/README.md` — document map
2. `docs/04-system-architecture.md` — modular monolith, module map + allowed dependency graph, transactional outbox, request anatomy
3. `docs/05-multi-tenancy.md` — RLS implementation rules (fail-closed `SET LOCAL` contexts, non-BYPASSRLS app role, CI coverage check)
4. `docs/06-permission-engine.md` — permission catalog model and evaluation semantics
5. `docs/07-database-design.md` — conventions, availability counter design, immutable postings, partitioning
6. `docs/08-api-standards.md` — REST/error/pagination/idempotency conventions
7. `docs/14-engineering-standards.md` — **monorepo layout, boundary enforcement, testing policy, CI — follow it exactly**
8. `docs/15-implementation-roadmap.md` — you are building **Phase 0**
9. `docs/modules/01-pms-core.md` — the domain you'll implement first

## Mandated stack (fixed — do not substitute)

Next.js (latest stable) · TypeScript strict · Tailwind + shadcn/ui · TanStack Query · Zustand · React Hook Form · Zod · NestJS with **Fastify adapter** · PostgreSQL · **Drizzle ORM** · Redis (cache + BullMQ + Streams) · OpenSearch · Socket.IO · Better Auth · Docker Compose for local dev · Turborepo + pnpm monorepo.

## Phase 0 scope (build in this order)

Goal (from roadmap): *a demo tenant takes a booking end-to-end via API → folio → daily journal, in a local dev environment.*

1. **Monorepo skeleton** per `docs/14-engineering-standards.md §1`: `apps/api`, `apps/web`, `packages/{contracts,ui,permissions,metrics,db,events,config}`, `tooling/`. Turborepo pipeline, shared tsconfig/eslint presets, ESLint `boundaries` rules wired to `tooling/module-graph.json` (mirror the dependency graph in doc 04 §2).
2. **Local infra**: `docker-compose.yml` with Postgres, Redis, OpenSearch; seed scripts.
3. **Kernel** (`apps/api/src/modules/kernel/`):
   - Better Auth integration (sessions, org plugin mapped to tenants)
   - Tenancy: RequestContext via AsyncLocalStorage; transaction-scoped `SET LOCAL app.tenant_id / app.property_ids`; PgBouncer-safe; fail-closed
   - RLS framework in `packages/db`: every tenant table gets ENABLE + FORCE policies; write `tooling/check-rls` CI script that fails if any table with `tenant_id` lacks them
   - Permission engine: catalog in `packages/permissions` (typed `resource.action` strings with risk tiers per doc 06), roles, scoped assignments, Redis-cached decision sets, `@RequirePermission()` guard — a route without the decorator must fail CI
   - Transactional outbox: `outbox_events` table written in the same transaction via a kernel `UnitOfWork`; relay worker publishing to Redis Streams; idempotent consumer base class
   - Audit log written in the same transaction as every mutation
4. **Revenue core data model + walking skeleton** (modules: `availability`, `rates`, `reservations`, `folio`, `gl`):
   - Schema exactly per doc 07: `availability_days` counter table with the CHECK constraint, `reservations` + `reservation_nights` + `reservation_room_stays`, immutable `folio_postings` (corrections = reversals), balanced `journal_entries`/`journal_lines` (DB-enforced Σdebits = Σcredits)
   - `POST /reservations` implementing the booking sequence in `docs/modules/01-pms-core.md` (price resolve → counter increment → folio create → outbox event) with `Idempotency-Key` support; conflict = 409 `AVAILABILITY_CONFLICT` problem+json per doc 08
   - Check-in/check-out/cancel transitions per the state machine in doc 04 §5
   - Night-audit walking skeleton: roll `business_date`, post room+tax for in-house, generate daily journal
5. **Contracts pipeline**: Zod schemas in `packages/contracts` shared by API validation and frontend; OpenAPI generated from code in CI; typed SDK consumed by `apps/web`.
6. **`apps/web` minimal**: login, property switcher, arrivals list, reservation record, ⌘K palette shell — enough to exercise the API through the SDK; design tokens + density variants started in `packages/ui` per doc 13.

## Non-negotiable working rules

- **Module boundaries**: modules touch only their own tables; cross-module access via the owning module's `index.ts` public API or domain events. No exceptions, even "temporarily."
- **Money**: `numeric(14,4)` in DB, string amounts in JSON, `Money` value object in code — no float arithmetic on money, ever.
- **Financial rows are immutable** — no UPDATE/DELETE on `folio_postings` or `journal_lines`; corrections are reversal rows.
- **Every mutation**: permission guard + audit row + outbox event in one transaction.
- **Testing policy** (doc 14 §3): Testcontainers integration tests for every endpoint including an authz-denied case and a tenant-isolation probe (tenant B must not see tenant A's data); property-based tests (fast-check) on ledger balancing and availability counter invariants.
- **Errors**: RFC 9457 problem+json with stable `code` and `correlationId`; cursor pagination only.
- TypeScript strict, no `any` without justification; conventional commits; small reviewable increments.

## Definition of done for Phase 0

A script (`pnpm demo`) that: provisions a tenant + property + room types + rates from templates (<1s, no DDL), creates a user with a Front Desk role, then via the public API: takes a booking (idempotent), checks the guest in, posts a charge, takes a payment, checks out, runs night audit — and prints a trial balance that ties to the folio ledger. All CI gates green: typecheck, boundaries, RLS coverage, permission-guard coverage, integration tests, OpenAPI diff.

Start by reading the docs listed in Step 0, then propose the repo skeleton as your first deliverable. Work incrementally — kernel before domain, schema before endpoints, tests with (not after) each slice.
