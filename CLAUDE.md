# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Vela** (`@vela/*` packages) is a hospitality operating system — a unified PMS + POS + booking + accounting platform for full-service hotels and resorts, built as an **extraction-ready modular monolith**. The design system is **Atrium**; the flagship front-desk web app is **The Desk**.

`docs/` is the source of truth for product and engineering decisions — it is a complete blueprint (architecture, multi-tenancy, permissions, DB design, API standards). Code comments cite specific docs (e.g. "doc 05 §2"). When changing behavior in a load-bearing area (tenancy, permissions, GL, night audit), read the cited doc first. Phase 0 (kernel + core PMS) and Phase 1 (front-desk boards, housekeeping, guests, POS, reports) are complete.

## Commands

Package manager is **pnpm** (workspaces + a centralized version `catalog:` in `pnpm-workspace.yaml`). Turborepo orchestrates per-package tasks.

```bash
pnpm install                  # install workspace deps

# Build / verify (these are the CI gates — run before declaring work done)
pnpm build                    # turbo build all packages (api builds to dist/ via nest build)
pnpm typecheck                # tsc --noEmit across the graph
pnpm exec eslint apps packages tooling   # lint + module-boundary enforcement
pnpm check:permissions        # static gate: every route declares authz (see below)
pnpm check:openapi            # fails if generated OpenAPI drifts from contracts
pnpm check:rls                # fails if any tenant_id table lacks an enabled+forced RLS policy
pnpm check:desk-flows         # validates Desk "golden flow" specs (selectors/budgets) against page sources

# Database (needs Postgres — see Environment)
pnpm infra:up                 # docker compose up -d (Postgres on host port 5434, Redis, OpenSearch)
pnpm db:migrate               # apply migrations + (re)apply RLS policies; loads root .env
pnpm db:generate              # drizzle-kit generate after editing packages/db/src/schema/*

# Run end-to-end
pnpm demo                     # provision→book→check-in→charge→pay→check-out→night audit→trial balance
pnpm seed                     # provision "Grand Vela — Ocean Club" + 8 arrivals for the web app
pnpm dev                      # turbo dev — API on :4000, The Desk on http://localhost:3000

# Tests
pnpm test                                   # all packages via turbo
pnpm --filter @vela/api test                # Money property tests + permission unit tests (vitest)
pnpm --filter @vela/db test                 # DB integration tests (Testcontainers — needs Docker)
pnpm --filter @vela/permissions test        # permission-set unit tests
pnpm --filter @vela/api exec vitest run path/to.spec.ts   # a single test file
pnpm --filter @vela/api exec vitest run -t "name"         # a single test by name

tsx tooling/smoke/phase1.ts   # drives every Phase-1 endpoint against a running seeded API (not a CI gate)
```

The Desk logins (after `pnpm seed`), both `demo-password`: `frankie@grand-vela.demo` (front desk) and `greta@grand-vela.demo` (GM — has extra permissions like `room.inspect`, useful for testing permission-gated UI). In-app: ⌘P property switcher, ⌘K command palette.

## Architecture

### Monorepo layout
- `apps/api` — NestJS on Fastify. The backend modular monolith.
- `apps/web` — Next.js (App Router) "The Desk" front-desk app; TanStack Query + Zustand (`apps/web/lib/store.ts`), typed SDK in `apps/web/lib/sdk.ts`. Boards live under `app/(desk)/` (today, arrivals, rack, departures, inhouse, folios, housekeeping, audit, groups, …); shared drawers/trays/palette in `components/desk/`; readiness scoring in `lib/readiness.ts`.
- `packages/contracts` — Zod schemas + the generated OpenAPI spec + a typed SDK. **The API contract source of truth.**
- `packages/db` — Drizzle schema (`src/schema/*`), the RLS framework (`src/rls.ts`), migrations, and `withTenantTransaction`.
- `packages/permissions` — the permission catalog (~230 keys), roles, and `PermissionSet`.
- `packages/events` — domain event taxonomy + envelope (outbox payloads).
- `packages/ui` — Atrium design system (Tailwind v4 + CVA); `*.stories.tsx` excluded from typecheck.
- `packages/config` — shared tsconfig/eslint config consumed via `workspace:*`. Includes the custom `vela/no-raw-color` eslint rule: raw palette CSS vars are banned outside `packages/ui` — use semantic tokens (`--room-*`, `--ink-inverse`, …).
- `tooling/` — `demo/`, `seed/`, `smoke/`, and the gate checkers (`check-rls`, `check-permission-guards`, `check-openapi`, `check-desk-golden-flows`).

### Backend module shape (`apps/api/src/modules/`)
`kernel/` holds the cross-cutting machinery (auth, context, db/UnitOfWork, errors, money, outbox, realtime, webhooks, business-date); feature modules (`reservations`, `folio`, `gl`, `rates`, `availability`, `booking`, `guests`, `housekeeping`, `pos`, `messaging`, `reports`) depend on it. Each feature module is a Nest module with a `*.service.ts`, optional `*.controller.ts`, a `domain/` folder for pure logic, and an `index.ts` barrel. `app.module.ts` wires them.

Three invariants enforce correctness — internalize them before touching the backend:

1. **Tenancy via AsyncLocalStorage, never parameter drilling.** `RequestContext` (`kernel/context/request-context.ts`) carries `tenantId`, `propertyIds`, `userId`, `permissions`, `correlationId`. It's bound *synchronously* in the Fastify `onRequest` hook via `beginContextScope()` (a mutable holder), then populated with `setRequestContext()` after async auth. **This ordering is load-bearing**: a post-`await` `enterWith` is silently lost under Fastify and every authed route 401s. Read with `getRequestContext()` (throws if absent — fail closed).

2. **Every mutation = permission guard + audit row + outbox event in one transaction.** Use the kernel `UnitOfWork` (`kernel/db/unit-of-work.ts`): `uow.run((tx, { emit, audit }) => …)` for writes, `uow.read(tx => …)` for reads, `uow.runIdempotent(key, body, …)` for idempotent writes. Reads MUST go through a transaction too — a bare query on the app connection has no tenant GUCs set and returns **zero rows** (fail closed), not all rows.

3. **Authorization is declared on every route or CI fails.** Each controller handler needs `@RequirePermission('key')`, `@Public()`, or `@AuthenticatedOnly()`. `pnpm check:permissions` statically walks the AST and fails on any undeclared route or any permission key not in the catalog. Add new keys to `packages/permissions/src/catalog.ts` first.

### Multi-tenancy & RLS (`packages/db/src/rls.ts`)
Isolation is enforced at the database, not in app code. Every table with a `tenant_id` gets `ENABLE` + `FORCE` RLS. The app connects as a **non-superuser, non-BYPASSRLS** role (`vela_app`); migrations use a separate admin role (`vela_admin`) never reachable from request handlers. Policies are **fail-closed**: with no `app.tenant_id` GUC set, the predicate matches zero rows. The `property_scope` policy is **RESTRICTIVE** (ANDs with `tenant_isolation`) with `WITH CHECK` — this closes a cross-tenant INSERT hole; do not change it to PERMISSIVE. `withTenantTransaction` sets the GUCs (`app.tenant_id`, `app.property_ids`) per transaction. After adding any tenant-scoped table, register it in `TENANT_TABLES` or `check:rls` fails.

### Contracts & API
Contracts live in `packages/contracts` as Zod schemas; the OpenAPI spec is generated from them and the SDK is typed off them. After changing request/response shapes, regenerate (`pnpm openapi:emit`) — `check:openapi` gates drift in CI. Errors follow RFC 9457 (problem+json) via `kernel/errors/problem.filter.ts`.

### Realtime
`kernel/realtime/realtime.gateway.ts` exposes a Socket.IO `/realtime` namespace: connections authenticate with the same token as REST, join tenant/property rooms, and the gateway polls the transactional outbox and broadcasts `domain-event` messages. On the web side, `apps/web/components/realtime-bridge.tsx` maps event types to TanStack Query keys and invalidates caches, so boards refresh without manual refetch wiring — when adding a board with live data, register its query keys there.

### Money
Money is integer minor units, never floats. The `Money` type (`kernel/money/money.ts`) is covered by property-based tests (`fast-check`). GL postings must balance; the demo asserts a tying trial balance after night audit.

## Environment notes

- **Postgres port is 5434** on the host (not 5432/5433) to avoid clashing with native Windows PostgreSQL 16/18. `docker-compose.yml`, `.env`, and `.env.example` all reflect this. CI uses 5432.
- The root `.env` is loaded automatically by `tsx --env-file-if-exists=.env` on `db:migrate`, `demo`, `seed`, and the `check:*` scripts. Copy `.env.example` → `.env` to start.
- **The API cannot run under `tsx`** — esbuild can't emit NestJS decorator metadata. `pnpm dev` uses `nest start`; `pnpm demo` spawns the **built** `apps/api/dist/main.js`, so run `pnpm --filter @vela/api build` first if `dist/` is stale.
- The outbox relay worker (`apps/api/src/worker.ts`) needs Redis and is not exercised by the demo.
- Storybook deps are declared in `packages/ui` but not installed by default (heavy).

## CI gates (`.github/workflows/ci.yml`)

Three jobs must stay green: **static** (build, typecheck, eslint+boundaries, check:permissions, check:openapi), **database** (migrate → check:rls → `pnpm demo` against real Postgres), and **test** (api/permissions unit+property tests, db Testcontainers integration tests). Run the corresponding local commands above before pushing.
