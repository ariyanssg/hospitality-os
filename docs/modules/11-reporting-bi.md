# Module 11 — Reporting & Business Intelligence

## Purpose
Answer every operational and strategic question from one consistent data layer — from the GM's morning flash to the asset manager's USALI pack to ad-hoc exploration — fixing the #1 recurring complaint against Mews/Cloudbeds-class systems: shallow, inflexible reporting.

## Architecture: the semantic layer
A governed metrics catalog (`packages/metrics`) defines every KPI **once** — occupancy, ADR, RevPAR, TRevPAR, GOPPAR, food cost %, labor %, average check, pickup, NPS — with its formula, grain, allowed dimensions, and source. Dashboards, scheduled reports, the API, *and the AI assistant* all resolve metrics through this layer; the number on the GM's phone always equals the number in the board pack. (This layer is also what makes NL analytics safe — see [14-ai-assistant.md](14-ai-assistant.md).)

Data flow: domain events → projection workers → `analytics` schema in Postgres (daily-grain fact tables: `fact_room_nights`, `fact_revenue` (by stream/cost center), `fact_covers`, `fact_labor`, `fact_channel_production`, plus snapshot tables `pace_snapshots`, `inventory_snapshots`) → OpenSearch mirrors for dashboard speed. Reports never query operational tables directly (no report can slow check-in).

## Features
- **Operational report library (the hotel canon, pixel-perfect, exportable PDF/Excel/CSV):** manager flash, daily revenue report, arrivals/departures, in-house lists, police/registration exports (jurisdictional), night-audit pack, cashier/shift reports, AR aging, trial balance & USALI P&L, group pickup, channel production, housekeeping productivity, F&B daily (covers, average check, mix), labor cost vs forecast, food-cost variance.
- **Dashboards:** role-based defaults (GM, FOM, revenue, F&B, controller, HR, owner) built from a widget library (KPI cards with vs-LY/budget deltas, time series, heatmaps, leaderboards); fully customizable per user; property-comparison views for chains; live tiles (today's occupancy ticks as bookings land — event-driven, not refresh-polling).
- **Explorer (self-service):** drag-drop metrics × dimensions × filters over the semantic layer with chart builder; saved views shareable per role; SQL escape hatch for power users against the analytics schema (read-only, governed).
- **Scheduling & distribution:** any report/dashboard → schedule (daily 7am to GM email, Monday owner pack, month-end board pack), Slack/email delivery, branded PDF.
- **Owner/asset-manager portal:** curated external access (USALI statements, STR-style benchmarks when data partnerships exist) without staff-level permissions.
- **Data export:** scheduled S3/SFTP extracts, warehouse sync (Snowflake/BigQuery connector for enterprise), full REST access to the metrics API.

## Database entities
`analytics.fact_*` and `analytics.dim_*` tables, `metric_definitions` (synced from code), `dashboards`, `dashboard_widgets`, `saved_explorations`, `report_schedules`, `report_runs`, `export_configs`.

## APIs
```
GET  /metrics                          (catalog with definitions — self-documenting)
POST /metrics/query                    { metrics, dimensions, filters, grain, compare }
CRUD /dashboards /widgets /report-schedules
GET  /reports/{key}?params=            POST /reports/{key}/render   (pdf|xlsx)
GET  /benchmarks?metric=&market=       POST /exports/run
```

## Workflows
- **GM morning:** 7am flash lands (occupancy, ADR, RevPAR vs LY/budget, outlet revenue, labor %, today's arrivals incl. VIPs, overnight issues) → taps through to live dashboard → asks the AI assistant "why is F&B down vs last Tuesday?" → semantic-layer query: banquet covers delta explains it.
- **Month-end owner pack:** controller closes period → USALI pack auto-renders → schedule delivers to ownership group portal → asset manager drills schedule line → underlying journal → folio postings (full lineage).

## Permissions
`report.view/create/schedule`, `bi.explore`, `report.financial.view` (separate — not every report viewer sees P&L), owner-portal scoped role.

## Dependencies
Every module's events; semantic layer package; Accounting (financial truth); OpenSearch. Serves: AI assistant (tool-use target), mobile apps (dashboard API).

## Events
Emits: `report.rendered/delivered`, `metric.anomaly_detected` (threshold subscriptions).
Consumes: all domain events via projections; `gl.period_closed` (statement triggers).

## Future scalability
Cross-tenant anonymized benchmarking network (our STR-lite — powerful network effect), predictive KPI overlays (forecast lines on every chart from Revenue AI), embedded analytics for marketplace partners, warehouse-native deployment for mega-chains.
