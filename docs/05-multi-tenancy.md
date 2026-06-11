# 05 — Multi-Tenant Architecture

> Tenant = hotel group. Property = hotel. Every row, every request, every cache key, every search query, every event carries this hierarchy — enforced by the database, not by developer discipline.

---

## 1. Tenancy Model

```
Tenant (hotel group / management company / independent owner)
├── Property A (resort, 480 rooms, 6 outlets)
│   ├── Departments: front-office, housekeeping, f&b, finance, hr, ...
│   └── Outlets: restaurant-1, pool-bar, spa, ...
├── Property B (boutique, 42 rooms)
└── Property C (serviced apartments, 120 units)
```

- An **independent hotel** is a tenant with one property — no special casing.
- Supported property types (resort, boutique, hostel, serviced apartment) are **configuration** (room/unit semantics, housekeeping cadence, rate granularity incl. monthly), never schema forks.
- **Corporate level** (cross-property rates, consolidated GL, group-wide guest profiles, chain reporting) is simply tenant-scoped data with `property_id IS NULL`.

### Identity vs. membership

Users are global (one login, Better Auth). Access is granted via **memberships**:

```
users (global)
└── tenant_memberships (user ↔ tenant, base status)
    └── role_assignments (role, scope: tenant | property | department)
```

A regional manager has property-scoped roles at properties A and B; a group financial controller has a tenant-scoped role. Guests are **not** users — guest profiles are CRM data owned by the tenant (a person may exist as a guest in many tenants; cross-tenant identity is never linked, by design — see GDPR in `09-security.md`).

---

## 2. Isolation Strategy: Shared Schema + Postgres RLS

| Option | Verdict | Why |
|---|---|---|
| DB-per-tenant | ❌ (default) | Thousands of properties → migration fan-out, connection-pool explosion, cross-tenant platform analytics impossible. This is what makes legacy PMS hosting expensive. |
| Schema-per-tenant | ❌ | Same migration fan-out; PG catalogs degrade at 10k+ schemas; tooling pain. |
| **Shared schema + RLS** | ✅ | One migration, uniform pooling, platform-level analytics, and isolation enforced by the database engine itself. |
| Dedicated-DB premium tier | ✅ later | The row model ports unchanged into a single-tenant cell for enterprise chains demanding physical isolation — sales answer, not architecture change. |

### RLS implementation

Every tenant-scoped table:

```sql
CREATE TABLE reservations (
  id            uuid PRIMARY KEY DEFAULT uuidv7(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id),
  property_id   uuid NOT NULL REFERENCES properties(id),
  -- ... domain columns
);

ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations FORCE ROW LEVEL SECURITY;  -- applies to table owner too

CREATE POLICY tenant_isolation ON reservations
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY property_scope ON reservations
  USING (
    current_setting('app.property_ids', true) IS NULL  -- tenant-wide context
    OR property_id = ANY (string_to_array(current_setting('app.property_ids'), ',')::uuid[])
  );
```

Per request (transaction-scoped, safe with PgBouncer transaction pooling):

```sql
BEGIN;
SET LOCAL app.tenant_id = '018f...';
SET LOCAL app.property_ids = '018a...,018b...';
-- every query in this txn is automatically tenant+property filtered
COMMIT;
```

**Rules that make RLS real rather than theater:**

1. The application connects as a **non-superuser role without `BYPASSRLS`**. There is no code path that can query tenant tables without a tenant context — a missing `SET LOCAL` yields zero rows, not all rows (fail closed).
2. `FORCE ROW LEVEL SECURITY` on every table; a CI check (`scripts/check-rls.sql`) fails the build if any table with a `tenant_id` column lacks an enabled+forced policy.
3. Migrations and platform jobs use a separate `app_admin` role; its use is audited and never reachable from request handlers.
4. **RLS is defense-in-depth, not the only line:** repositories still filter by `tenant_id` explicitly (it's required for index usage anyway). RLS catches the bug that slips through.
5. Platform staff access to tenant data goes through a break-glass flow: time-boxed, reason-required, audit-logged, tenant-visible (this is a selling point against Oracle's opaque support access).

### Cross-cutting isolation (beyond the database)

| Layer | Mechanism |
|---|---|
| Cache | Every Redis key prefixed `t:{tenant_id}:p:{property_id}:...`; flush-by-prefix on tenant offboarding |
| Search | Server-injected `term: {tenant_id}` filter on every OpenSearch query; tenants never compose raw queries |
| Events | Envelope carries `tenant_id`; webhook dispatch filters by subscription owner |
| Files | S3 keys `tenants/{tenant_id}/...`; presigned URLs only; bucket policy denies cross-prefix access |
| Realtime | Socket.IO room join requires membership check; rooms named `tenant:{id}:property:{id}:{topic}` |
| Background jobs | Job payloads carry tenant context; workers re-establish `SET LOCAL` before any query |
| Logs/metrics | `tenant_id` as structured field, never in URL paths (avoids leak via access logs) |

---

## 3. Indexing & Performance Under Shared Schema

- **Composite indexes lead with tenant:** `(tenant_id, property_id, <domain cols>)` — e.g. reservations by arrival: `(tenant_id, property_id, arrival_date) INCLUDE (status, guest_id)`. RLS predicates then ride the index rather than filtering.
- **Hot-path counters** (availability) are keyed `(tenant_id, property_id, room_type_id, date)` — naturally partition-friendly.
- **Large append-only tables** (folio_postings, journal_lines, audit_log, outbox) are range-partitioned by date (see `07-database-design.md §partitioning`); tenant pruning happens via leading index column, time pruning via partitions.
- **Noisy-neighbor control:** per-tenant rate limits at the API edge (Redis token bucket keyed by tenant), per-tenant BullMQ queue weights so one chain's channel-sync storm can't starve others, and `statement_timeout` per role class.

## 4. Tenant Lifecycle

| Stage | What happens |
|---|---|
| Provisioning | Insert tenant + first property + default roles/chart-of-accounts/room-status taxonomy from templates; no DDL, so provisioning is <1s and transactional |
| Configuration | Property settings (currency, timezone, business-day rollover time, tax regime, languages) — all data, all versioned |
| Suspension | Flag checked in auth middleware; data intact, logins blocked, webhooks paused |
| Offboarding/export | Full export (JSON + CSV per entity) from replicas; then scheduled hard-delete with cryptographic erasure of PII (GDPR Art. 17) |

## 5. Request Context Contract

Every authenticated request resolves exactly:

```ts
interface RequestContext {
  tenantId: string;        // from session/API key
  propertyIds: string[];   // from X-Property-Id header ∩ user's permitted properties
  userId: string;
  roleIds: string[];       // resolved scoped assignments
  permissions: PermissionSet; // cached decision set (see 06-permission-engine.md)
  correlationId: string;
}
```

It is constructed once in middleware, frozen, carried via AsyncLocalStorage, and is the **only** source of tenancy for repositories, cache keys, event envelopes, and audit rows. Handlers physically cannot specify a different tenant.

---

Related: [06-permission-engine.md](06-permission-engine.md) · [07-database-design.md](07-database-design.md) · [09-security.md](09-security.md)
