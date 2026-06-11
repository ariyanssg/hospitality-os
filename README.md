<div align="center">

# ▲ Vela

**The hospitality operating system.**
One platform — PMS · POS · booking · folio · accounting — for full-service hotels and resorts.

_One deployable. Eighteen modules. Zero sync lag._

</div>

---

Vela is a unified [Hospitality OS](docs/00-executive-summary.md): a modular monolith where every module
reads and writes the same transactional core. A restaurant check posting to a guest folio is a single
ACID transaction, not an interface message. The booking engine reads the same availability counters the
front desk writes. Accounting entries are generated in the same transaction as the business event that
caused them. The visual + interaction language is the **Atrium** design system; the flagship front-desk
surface is **The Desk**.

> The architecture blueprint in [`docs/`](docs/) is the source of truth. This repository implements it,
> starting with **Phase 0** ([roadmap](docs/15-implementation-roadmap.md)).

## Stack

Next.js · TypeScript (strict) · Tailwind v4 + shadcn-derived `@vela/ui` · TanStack Query · Zustand ·
React Hook Form + Zod · NestJS (Fastify) · PostgreSQL + Drizzle (RLS multi-tenancy) · Redis (cache /
BullMQ / Streams) · OpenSearch · Socket.IO · Better Auth · Turborepo + pnpm.

## Monorepo layout

```
apps/
  api/        NestJS (Fastify) — the modular monolith (src/modules/{kernel,availability,rates,reservations,folio,gl,…})
  web/        Next.js staff PMS — "The Desk"
packages/
  contracts/  Zod schemas + OpenAPI bindings + generated SDK
  ui/         Atrium design system (tokens, density modes, components)
  permissions/ permission catalog (single source of truth, ~230 resource.action)
  db/         Drizzle schema, migrations, RLS policies + tenant context
  events/     event taxonomy + envelope types
  config/     eslint / tsconfig / tailwind presets
tooling/      module-graph, RLS-coverage check, permission-guard check, demo script
infra/        postgres init, (terraform/helm later)
```

## Getting started

```bash
pnpm install
cp .env.example .env
pnpm infra:up          # Postgres + Redis + OpenSearch via Docker (Postgres on host :5434)
pnpm db:migrate        # apply schema + RLS policies
pnpm demo              # provision a tenant and take a booking end-to-end → trial balance
pnpm seed              # provision a populated property (today's arrivals) for the web app
pnpm dev               # run api + web → http://localhost:3000
```

Sign in to **The Desk** with the seeded Front Desk user: `frankie@grand-vela.demo` / `demo-password`.

> The Docker Postgres is published on host port **5434** to avoid clashing with a native Windows
> PostgreSQL install on 5432/5433. Adjust `.env` if your setup differs. `.env` is auto-loaded by the
> `db:migrate`, `demo`, `seed`, and `check:*` scripts (via `tsx --env-file-if-exists`).

## Definition of done (Phase 0)

`pnpm demo` provisions a tenant + property + room types + rates from templates, creates a Front Desk
user, then via the public API: takes a booking (idempotent) → checks in → posts a charge → takes a
payment → checks out → runs night audit, and prints a trial balance that ties to the folio ledger.
CI gates: typecheck · boundaries · RLS coverage · permission-guard coverage · integration tests ·
OpenAPI diff.

## Non-negotiable rules

- **Module boundaries** — modules touch only their own tables; cross-module access via the owning
  module's `index.ts` or domain events (enforced by ESLint `boundaries` + `tooling/module-graph.json`).
- **Money** — `numeric(14,4)` in DB, string amounts in JSON, a `Money` value object in code. No float math.
- **Financial rows are immutable** — corrections are reversal rows, never UPDATE/DELETE.
- **Every mutation** — permission guard + audit row + outbox event, in one transaction.
- **Tenant isolation** — Postgres RLS, fail-closed; the app role has no `BYPASSRLS`.

See [`docs/14-engineering-standards.md`](docs/14-engineering-standards.md) for the full standard.
