# 12 — Performance & Scalability

> Targets: thousands of properties, millions of reservations/year, sub-second perceived UX on every operational screen. Strategy: make the hot paths boring (indexed counter reads, cached lookups), push everything else off the request path, and measure budgets in CI so speed never regresses silently.

---

## 1. Performance budgets (enforced, not aspirational)

| Surface | Budget |
|---|---|
| API single-entity read | p99 < 50 ms |
| Boards/lists (arrivals, rack, HK board) | p99 < 200 ms server, < 500 ms interactive |
| Availability search (booking engine) | p99 < 150 ms cached / < 400 ms cold |
| Reservation create (full transaction) | p99 < 500 ms |
| POS order add (terminal → KDS) | < 300 ms end-to-end |
| Event → realtime UI update | < 1 s |
| ARI change → OTA push initiated | < 5 s |
| Web vitals (staff app) | LCP < 1.5 s, INP < 200 ms |
| CMS sites | LCP < 1.5 s on 4G (ISR + CDN) |

CI gates: k6 load suites on critical endpoints per release (regression >15% fails); Lighthouse budgets on frontend bundles; `EXPLAIN` snapshot tests on hot queries.

## 2. Caching architecture (layered, invalidation-first)

| Layer | Content | Invalidation |
|---|---|---|
| CDN | static, ISR pages, media | content-hash; event-driven revalidate |
| Redis: availability grids | per property×month sellable counts | 60s TTL **+** `availability.changed` bust (event wins; TTL is the safety net) |
| Redis: rate lookups | resolved prices per plan×type×date range | `rate.price_changed` bust |
| Redis: permission sets, sessions, flags | auth path | event bust on change |
| In-process (per pod, ms-TTL) | reference data (charge codes, room types) | version-stamped, pub/sub bust |
| TanStack Query (client) | all server state | WS-driven invalidation + focus refetch |

Rules: every cache entry has an owner event that busts it; *write paths never trust caches* (booking revalidates against Postgres counters in-transaction); cache stampede control via single-flight locks on rebuild.

## 3. Database scaling sequence

1. **V1 (to ~500 properties):** one Aurora cluster; readers for boards/reports; partitioning on append-only tables; PgBouncer. This carries further than intuition suggests — a 200-room hotel generates ~100k reservations/yr; 500 properties ≈ 50M reservations/yr ≈ trivial Postgres write volume (~2/s average, spiky to hundreds/s — fine).
2. **Scale levers in order:** bigger writer → more readers + reader specialization (BI pool, OpenSearch projector pool) → analytics offload to warehouse → **tenant sharding** (cells already give geographic shards; within a cell, shard by tenant_id ranges across clusters when a cell exceeds ~2–3k heavy properties — the RLS + tenant-keyed model makes shard routing mechanical).
3. **Hot-row analysis:** the only true contention point is availability counters on peak-demand dates — per room-type-date rows keep this property-local; mitigation if ever needed: counter sub-sharding per channel with periodic merge (designed, not built).

## 4. Read/write path patterns

- **CQRS-lite:** writes → normalized core; list/board/report reads → covering indexes, materialized read models (`analytics.*`), or OpenSearch projections. No generic GraphQL resolver soup; every screen has a deliberate query plan.
- **Heavy work off-request:** PDFs, exports, imports, campaign sends, channel pushes, projections → BullMQ with per-tenant fairness weights; job status via events to UI (no polling).
- **N+1 prevention:** `include` expansions resolve via batched loaders; PR review checklist + query-count assertions in integration tests.

## 5. Realtime scaling

Socket.IO + Redis adapter; rooms per property×topic keep fan-out tight (a 500-room hotel's front desk ≈ dozens of sockets, not thousands); WS pods scale on connection count; payloads are thin notifications (ids + type) — clients refetch via Query, keeping WS bandwidth trivial and consistency guaranteed by the API.

## 6. Rate limiting & protection

- Token buckets (Redis) at three scopes: per API key/user (burst + sustained), per tenant (aggregate fairness), per endpoint class (public booking endpoints get stricter anonymous limits + bot scoring).
- Standard headers (`RateLimit-*`, `Retry-After`); 429 with problem+json. Internal queues protect OTAs (per-channel limits) and PSPs.
- Backpressure: queue-depth alarms; load-shed order: reports → projections → campaigns; transactional paths shed last (and effectively never).

## 7. Search & analytics scale

OpenSearch: time-based indices for high-volume (audit, messages) with ILM rollover; entity indices sized per cell; projector lag monitored (<5 s SLO) with replay tooling. BI heavy aggregations precomputed at projection time (daily grains), so dashboards are index lookups, not scans.

## 8. Capacity model (rule-of-thumb per 1,000 active full-service properties)

~150k staff users, ~5–10k concurrent; API ~2–5k RPS peak; reservations ~3M/yr; folio postings ~100M/yr (partitioned, ~30 GB/yr); events ~500M/yr. All comfortably within one cell of the above design — multi-cell is for geography/residency before it's for load.

---

Related: [07-database-design.md](07-database-design.md) · [11-infrastructure.md](11-infrastructure.md) · [04-system-architecture.md](04-system-architecture.md)
