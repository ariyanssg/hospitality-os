# 08 — API Standards

> API-first means the API *is* the product surface: our own frontends consume the same public REST API (dogfooding), the OpenAPI spec is generated from code and ships typed SDKs, and webhooks make us the platform others integrate with — the Mews-marketplace play with Stripe-grade ergonomics.

---

## 1. REST Conventions

- Base: `https://api.<domain>/v1`
- Resources plural, kebab-case: `/reservations`, `/rate-plans`, `/pos/checks`, `/folios/{folioId}/postings`
- Property scoping via header `X-Property-Id` (most operational endpoints), not path — keeps URLs stable across multi-property users; tenant comes from auth, never from the client.
- Verbs: `GET` (safe), `POST` (create + domain actions), `PATCH` (partial update, JSON merge semantics), `DELETE` (where domain allows). **Domain actions are explicit sub-resources**, not status PATCHes:

```
POST /reservations/{id}/check-in
POST /reservations/{id}/cancel          { "reason": "...", "waiveFee": false }
POST /folios/{id}/postings              { "chargeCode": "MINIBAR", ... }
POST /folios/{id}/payments              { "method": "card", "amount": ... }
POST /payments/{id}/refunds             { "amount": ..., "reason": "..." }
POST /rooms/{id}/status                 { "status": "clean", "inspected": true }
```

Why: state transitions have side effects (availability counters, GL postings, events) and distinct permissions; `PATCH {status: "cancelled"}` hides all of that.

- IDs are UUIDv7 strings; human refs (`confirmation_number`, `folio_number`) are separate, per-property sequenced, never used as keys.
- Field names `camelCase` in JSON (DB snake_case mapped at the boundary).
- Timestamps ISO-8601 UTC; business dates as `YYYY-MM-DD` with explicit field names (`businessDate`, `stayDate`).
- Money: `{ "amount": "142.5000", "currency": "USD" }` — amounts are strings (no float drift in any client language).

## 2. Response Envelope & Errors

Success: resource (or array) at top level + `meta` where needed. Errors are **RFC 9457 problem+json**, with a stable machine code:

```json
HTTP/1.1 409 Conflict
Content-Type: application/problem+json
{
  "type": "https://docs.<domain>/errors/availability-conflict",
  "title": "No availability for requested room type",
  "status": 409,
  "code": "AVAILABILITY_CONFLICT",
  "detail": "DLX has 0 sellable units on 2026-07-14.",
  "errors": [{ "field": "roomTypeId", "code": "NO_AVAILABILITY", "stayDate": "2026-07-14" }],
  "correlationId": "req_01HX..."
}
```

Catalogued codes (subset): `VALIDATION_FAILED` (422, with per-field `errors[]` straight from Zod), `PERMISSION_DENIED` (403, includes missing permission key), `AVAILABILITY_CONFLICT`, `STATE_CONFLICT` (409, e.g. check-in on cancelled reservation), `BUSINESS_DATE_CLOSED`, `IDEMPOTENCY_REPLAYED`, `RATE_LIMITED` (429 + `Retry-After`). Every error includes `correlationId` traceable through logs.

## 3. Pagination, Filtering, Expansion

- **Cursor pagination everywhere** (`?limit=50&cursor=...`; response `meta.nextCursor`). Offset pagination is forbidden (broken under concurrent writes, slow at depth). Cursors are opaque, signed, encode sort position.
- Filtering: flat query params with operator suffixes — `?arrivalDate[gte]=2026-07-01&status[in]=confirmed,checked_in&sort=-createdAt`. Each endpoint whitelists filterable/sortable fields in OpenAPI.
- Sparse responses by default; opt-in expansion: `?include=guest,roomStays.room` (bounded depth 2, documented per endpoint) — kills N+1 client waterfalls without GraphQL complexity.
- List endpoints support `?fields=` projection for mobile/POS bandwidth.

## 4. Idempotency, Concurrency, Caching

- All unsafe endpoints accept `Idempotency-Key` (required for payments, channel inbound, POS sync replay). Server stores key→response 24h (Redis), replays identical response, rejects same-key-different-body with 422.
- Optimistic concurrency: mutable resources return `ETag` (version); `If-Match` required on PATCH for conflict-sensitive entities (rates, settings) → 412 on stale.
- `GET` responses carry `ETag`/`Cache-Control` where safe (reference data minutes, availability seconds-private).

## 5. Versioning & Compatibility

- Path major version (`/v1`) — only for breaking-world changes, target: never before year 3.
- Within v1: **additive evolution only** (new fields, endpoints, enum values — clients must tolerate unknown fields/enums; SDKs enforce this).
- Breaking changes ship behind dated changes header (Stripe model): `X-Api-Version: 2026-06-01`; tenant default pinned at signup, upgradeable per key; ≥ 12-month deprecation window with `Deprecation` + `Sunset` headers and usage-based outreach.

## 6. AuthN/AuthZ for API consumers

- First-party apps: Better Auth sessions (cookie) — same API.
- Integrations: scoped API keys (`sk_live_...`) created per tenant with permission subsets + optional property restriction; OAuth2 client-credentials for marketplace partners later. All keys hashed at rest, prefix-identifiable, rotatable, last-used tracked.
- Rate limits per key class (see `12-performance-scalability.md`); headers `RateLimit-*` on every response.

## 7. OpenAPI Pipeline

Code-first: NestJS controllers + Zod schemas (`@anatine/zod-openapi`-style binding from `packages/contracts`) generate `openapi.json` in CI → published docs (Scalar/Stoplight), generated TypeScript SDK (`@hosp-os/sdk`, also consumed by our own frontends — guarantees the spec is real), Postman collection, and **spec-diff gate**: CI fails on undocumented breaking diff.

## 8. Webhooks

- Tenant-managed endpoints (`webhook.manage`): subscribe to event types from the public taxonomy (`reservation.created`, `folio.payment_recorded`, `room.status_changed`, ... — same events as `04-system-architecture.md §4`, public-payload variants).
- Delivery: POST JSON envelope `{id, type, occurredAt, tenantId, propertyId, apiVersion, data}`; signed `Webhook-Signature: t=...,v1=HMAC-SHA256(secret, t + '.' + body)`; replay-window check ±5 min.
- Retries: exponential backoff 8 attempts over ~24h on non-2xx; automatic disable + notification after sustained failure; dead-letter visible in dashboard with manual redelivery; per-endpoint event log (Stripe-grade debuggability).
- Ordering not guaranteed; consumers use `occurredAt` + resource refetch. Thin payloads + fetch is the documented pattern for consistency-critical consumers.

## 9. Realtime API

Socket.IO namespace `/realtime`, auth via session/API key, rooms `property:{id}:frontdesk|housekeeping|pos:{outlet}|kds:{station}`. Events mirror webhook taxonomy. Used by our apps and open to integrators (e.g., a digital key vendor listening for `reservation.checked_in`).

## 10. Example: end-to-end booking call

```http
POST /v1/reservations HTTP/1.1
X-Property-Id: 018f4a2e-...
Idempotency-Key: 7d9e0c9a-book-attempt-1
Content-Type: application/json

{
  "guest": { "id": "018f..." },
  "arrivalDate": "2026-07-14",
  "departureDate": "2026-07-17",
  "roomTypeId": "018f...",
  "ratePlanId": "018f...",
  "adults": 2, "children": 0,
  "guarantee": { "type": "card_token", "token": "tok_..." },
  "source": { "channel": "booking_engine", "promoCode": "SUMMER26" }
}
```

`201` returns the reservation with `confirmationNumber`, per-night pricing breakdown, tax detail, folio reference, and `_links` (check-in action, folio, guest). One call, transactional availability decrement, event emitted, webhook delivered.

---

Related: [04-system-architecture.md](04-system-architecture.md) · [09-security.md](09-security.md) · [12-performance-scalability.md](12-performance-scalability.md)
