# 06 — Permission Engine

> Permission-first, not role-first. Roles are just named bundles; the system reasons in fine-grained `resource.action` permissions, scoped to tenant / property / department, evaluated in sub-millisecond cached decisions.

---

## 1. Model

```
Permission   = "resource.action" string, optionally with conditions
Role         = named set of permissions (system-defined or tenant-defined)
Assignment   = (user, role, scope) where scope ∈ {tenant, property, department}
Decision     = evaluate(user, permission, scope context) → allow | deny
```

### Why not plain RBAC

Hotels need: a night auditor who can post charges but not refund them; an F&B manager with `pos.*` at two outlets in one property; an owner with read-everything but write-nothing; a regional revenue manager with `rate.*` across 5 of 12 properties. Plain roles explode combinatorially ("Front Desk Agent — Property B — No Refunds — v3"). Fine-grained permissions with scoped assignments keep the model linear.

### Evaluation semantics (deliberately simple)

1. Collect the user's role assignments whose scope covers the request context (tenant-scope covers all properties; property-scope covers its departments).
2. Union their permissions → the **decision set**.
3. Explicit **deny grants** (rare, tenant-admin only — e.g. "this user may never `folio.refund` anywhere") override allows.
4. Wildcards: `reservation.*` expands at role-save time, not eval time — the decision set is always a flat set of concrete strings, so evaluation is a hash lookup.

No runtime rule engine, no policy language interpretation per request. ABAC-style conditions exist for a small fixed list (see §4) and are evaluated in code.

---

## 2. Permission Catalog

Naming: `<module>.<resource?>.<action>` — actions are verbs; sensitive variants are separate permissions (deleting is not editing; refunding is not paying).

### Catalog by module (representative; full machine-readable catalog lives in `packages/permissions/catalog.ts`)

**Reservations & Front Desk**
```
reservation.view  reservation.create  reservation.edit  reservation.cancel
reservation.override_rate      reservation.override_availability
reservation.checkin  reservation.checkout  reservation.no_show
reservation.group.manage       reservation.block.manage
room.assign  room.move  room.status.update  room.block  room.upgrade.comp
walkin.create
```

**Folio & Payments**
```
folio.view  folio.create  folio.post_charge  folio.transfer  folio.split
folio.adjust            # corrections — separate from posting
payment.collect  payment.refund  payment.void
deposit.manage  paymaster.manage
folio.close  folio.reopen      # reopen = night-audit-sensitive, manager-only default
invoice.create  invoice.view  invoice.send  invoice.write_off
cashier.open  cashier.close  cashier.reconcile
```

**Rates, Inventory, Distribution**
```
rate.view  rate.manage  rate.publish  package.manage  promotion.manage
availability.view  availability.manage  overbooking.manage
channel.view  channel.manage  channel.mapping.manage  channel.kill_switch
bookingengine.configure
```

**Housekeeping & Maintenance**
```
housekeeping.task.view  housekeeping.task.manage  housekeeping.task.complete
housekeeping.schedule.manage  room.inspect
maintenance.ticket.view  maintenance.ticket.manage  maintenance.ticket.close
asset.manage
```

**POS & Restaurant**
```
pos.check.create  pos.check.view  pos.item.add  pos.item.void   # void after fire ≠ remove before
pos.check.discount  pos.check.transfer  pos.check.split  pos.check.close
pos.roomcharge.post          # the PMS↔POS bridge permission
pos.refund  pos.cash.manage  pos.shift.close
menu.manage  kds.operate  table.manage  reservation.table.manage
```

**Accounting & Finance**
```
gl.view  gl.journal.post  gl.journal.approve  gl.close_period
gl.account.manage  costcenter.manage
ar.view  ar.manage  ar.creditlimit.manage  ap.view  ap.manage  ap.approve
tax.configure  nightaudit.run  nightaudit.review
report.financial.view  budget.manage
```

**Guests & CRM**
```
guest.view  guest.create  guest.edit  guest.merge  guest.export   # export = GDPR-sensitive
guest.pii.view              # unmasked PII — masked by default
guest.note.view  guest.note.manage  guest.blacklist.manage
loyalty.manage  loyalty.points.adjust  campaign.manage  segment.manage
```

**HR & Payroll**
```
employee.view  employee.manage  employee.document.view
schedule.view  schedule.manage  timeclock.use  timeclock.adjust
leave.request  leave.approve
payroll.view  payroll.manage  payroll.run  payroll.approve
compensation.view  compensation.manage     # salary visibility is its own permission
```

**Inventory & Procurement**
```
stock.view  stock.adjust  stock.count  stock.transfer
purchase.requisition.create  purchase.order.create  purchase.order.approve
supplier.manage  receiving.manage  recipe.manage
```

**Platform / Admin / CMS / BI**
```
user.invite  user.manage  role.manage  permission.assign
property.settings.manage  tenant.settings.manage  integration.manage
webhook.manage  apikey.manage  auditlog.view  featureflag.manage
cms.page.edit  cms.page.publish  cms.media.manage  cms.blog.manage  seo.manage
report.view  report.create  report.schedule  bi.explore  ai.assistant.use
revenue.forecast.view  revenue.pricing.approve  revenue.autopilot.manage
```

~230 permissions at V1. Each catalog entry declares: key, module, description, risk tier (`standard | elevated | critical`), and default roles. **Critical-tier** permissions (`payment.refund`, `gl.close_period`, `guest.export`, `payroll.run`, `role.manage`) additionally require recent re-auth (sudo mode) and always produce detailed audit entries.

---

## 3. Roles

### System roles (templates, instantiated per tenant, tenant-customizable copies)

| Role | Scope (typical) | Sketch |
|---|---|---|
| Owner / GM | tenant or property | All view + elevated ops; not necessarily `payroll.run` |
| Front Office Manager | property | `reservation.*`, `room.*`, `folio.*`, `payment.collect/refund`, HK view |
| Front Desk Agent | property/department | reservation CRUD, check-in/out, `payment.collect`; **no** refund/override |
| Night Auditor | property | agent set + `nightaudit.run`, `folio.adjust`, GL view |
| Reservations Agent | tenant | reservation CRUD across properties; no folio ops |
| Revenue Manager | tenant or subset | `rate.*`, `availability.*`, `channel.*`, forecasts |
| Housekeeping Supervisor / Attendant | department | task manage/complete, `room.status.update` |
| F&B Manager / Server / Bartender / Kitchen | outlet (department) | graded `pos.*`; servers lack `pos.check.discount`/`pos.refund` |
| Financial Controller | tenant | `gl.*`, `ar/ap.*`, `report.financial.view`, night-audit review |
| HR Manager | tenant | `employee.*`, `payroll.*` except approve (segregation of duties option) |
| Platform roles | — | internal support (break-glass), implementation engineer |

### Tenant-defined roles
Tenants clone or compose roles in a role-builder UI (permission matrix grouped by module, searchable, with risk-tier badges and "affected users" preview). Role changes are versioned and audited; the diff is shown at save time.

### Inheritance & precedence
- Scope inheritance: tenant-scoped assignment ⊇ property ⊇ department. **No role-to-role inheritance** — flattened sets beat hierarchy debugging.
- Multiple assignments union; deny grants override; suspension beats everything.

---

## 4. Conditional permissions (closed set, evaluated in code)

| Condition | Example |
|---|---|
| Amount threshold | `payment.refund` up to X per day without `payment.refund.unlimited` |
| Own-record | `pos.item.void` only on own open checks unless `pos.check.manage` |
| Time/shift window | `timeclock.adjust` only for current pay period |
| Department match | HK attendant updates only rooms in assigned section |
| Business-date lock | postings into a closed period require `gl.close_period` reopen flow |

These are explicit parameters on the grant (stored as JSONB `conditions` on the assignment), not a general policy language — auditable, testable, enumerable.

## 5. Feature Flags (separate layer)

Permissions = *may this user*. Flags = *does this tenant/property have*. A check is `flag(tenant, 'module.pos') && can(user, 'pos.check.create')`. Flags gate: plan tiers (modules are sellable units), staged rollouts (percentage by tenant), kill switches, and per-property enablement (a property without F&B never shows POS nav). Flag state is config data in Postgres, cached in Redis, pushed to clients via the session bootstrap payload.

## 6. Runtime & API

```ts
// NestJS
@RequirePermission('folio.post_charge')
@Post('folios/:id/postings')
postCharge(...) {}

// Frontend (same catalog package)
const { can } = usePermissions();
{can('payment.refund') && <RefundButton />}
```

- **Decision set caching:** on auth, the flattened permission set for `{user, tenant}` (with per-property/department scoping retained) is computed once and cached in Redis (`perm:{tenant}:{user}`, TTL 15m) and embedded in the session bootstrap for the client. Eval = set lookup, ~O(1).
- **Invalidation:** role/assignment changes emit `permission.changed` → targeted cache bust + Socket.IO push so open sessions update without re-login.
- **Server is authoritative.** Client checks are UX only.
- API surface: `GET /me/permissions`, role CRUD, assignment CRUD, `GET /roles/:id/effective-permissions`, plus a **"why" endpoint** (`GET /permissions/explain?user=&permission=`) that returns the granting assignment chain — support gold.

## 7. Audit & Compliance Hooks

Every grant/revoke/role-edit is an audit event with actor, before/after, and reason field (required for critical tier). Quarterly access-review export (who has which critical permissions per property) ships as a standard report — required by enterprise RFPs and SOC 2.

---

Related: [05-multi-tenancy.md](05-multi-tenancy.md) · [09-security.md](09-security.md) · catalog source of truth: `packages/permissions`
