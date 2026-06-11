# Module 10 — Revenue Management

> Duetto/IDeaS-class intelligence, native. Their structural handicap: they see PMS data through integration pipes, hours old, rooms-only. We see every booking, cancellation, search, *and F&B cover* the moment it happens — and our recommendations apply themselves to the same rate tables the booking engine reads.

## Purpose
Maximize total property revenue (rooms first; F&B and total-revenue later) through demand forecasting, dynamic pricing, and inventory controls — autonomous where trusted, advisory where not.

## Features

**Demand intelligence**
- Forecasts per property × room type × stay date × segment: occupancy, pickup curves, cancellation/no-show/wash probability; horizon 365d, refreshed nightly + intraday for near dates; inputs: booking pace vs history, day-of-week/seasonality, events calendar (imported + custom: citywide conference flags), lead-time distributions, booking-engine search volume (demand signal *before* bookings — unique advantage), channel mix, weather hooks later.
- Group displacement analysis: quoted group vs forecast transient value → accept/counter recommendation with rate floor.
- Unconstrained demand estimation (what we'd sell with infinite rooms) for stop-sell decisions.

**Pricing engine**
- Open-pricing model (Duetto's key innovation, adopted): every room type × rate plan × channel × date prices independently off a continuous BAR recommendation — no fixed tier jumping.
- Recommendation pipeline: forecast → price elasticity model (learned per property/segment from pace response) → optimizer (objective: expected revenue incl. cancellation cost and channel net-commission) → recommended BAR + restrictions (MinLOS to protect shoulder nights, CTA on peak).
- Compset awareness: rate-shop feed integration (partner API) as model feature + UI overlay; never naive rate-matching.
- **Autopilot levels per property:** *advise* (human approves all) → *guardrails* (auto within ±X% band and floor/ceiling; outside band requires `revenue.pricing.approve`) → *auto* (full autonomy, daily digest). Trust ladder is the adoption strategy; every recommendation carries an explanation ("pace +32% vs LY, citywide event Jul 12–14, compset median +18%").
- What-if simulator: "set BAR to 289 for Jul 12" → projected pickup/revenue delta.

**Controls & execution**
- Recommendations write through the Rates API (audited, attributable, reversible); restriction recommendations (stop-sell, MinLOS) same path; overbooking-limit recommendations from wash forecasts.
- Performance attribution: realized RevPAR vs decision log ("what did autopilot earn vs holdout baseline").

**Reporting**
- Pace reports (on-the-books vs STLY by segment/channel), pickup, forecast accuracy (MAPE tracked and shown — honesty builds trust), net-RevPAR by channel (after commission/PSP costs — *our* unified data makes this trivially accurate), total-revenue views (rooms + outlets per occupied room: TRevPAR/GOPPAR with accounting data).

## ML architecture (see also [../10-ai-strategy.md](../10-ai-strategy.md))
- Feature store fed by event projections (bookings, cancellations, searches, rates history) into the analytics pipeline; models: gradient-boosted pace/cancellation models per cluster of similar properties (cold-start: cluster priors → property-specific fine-tune as data accrues); training batch (nightly/weekly), inference: nightly batch + event-triggered re-price for near-term dates on significant pace deviation.
- Models run in a separate inference service (Python, extraction-friendly) called by the module via internal API; recommendations land in `pricing_recommendations` for the execution layer. Guardrails are **deterministic code, not model output** — the model can never set a price below floor.

## Database entities
`demand_forecasts`, `forecast_accuracy_log`, `events_calendar`, `pricing_recommendations`, `pricing_decisions` (applied/overridden + actor), `autopilot_policies`, `price_floors_ceilings`, `compset_rates`, `group_displacement_analyses`, `wash_forecasts`, `pace_snapshots` (daily OTB by segment — the time-series backbone).

## APIs
```
GET  /revenue/forecast?from=&to=&segment=      GET /revenue/pace?compare=stly
GET  /revenue/recommendations?status=pending   POST /revenue/recommendations/{id}/apply | /dismiss
PUT  /revenue/autopilot-policy                 GET  /revenue/attribution?period=
POST /revenue/what-if                          GET  /revenue/net-revpar?period=
POST /revenue/group-quotes/evaluate            CRUD /revenue/events-calendar
```

## Workflows
- **Nightly cycle:** audit completes → pace snapshot → forecasts refresh → optimizer emits recommendations → autopilot applies within guardrails (rates live on booking engine + channels in seconds) → morning digest to revenue manager: applied changes, pending approvals, forecast deltas, accuracy trend.
- **Demand shock:** booking-engine searches for Oct 3–5 spike 4× at 10am (concert announced) → intraday trigger → near-date model re-prices, MinLOS 2 recommended → guardrail-bounded changes auto-apply; beyond-band suggestion pushed to manager's phone for one-tap approval.
- **Group quote:** sales enters 80 rooms × 3 nights @ corporate ask → displacement analysis: forecast transient demand would fill 60 of those at higher ADR → counter-rate recommended with rationale → quote tracked to win/loss for model feedback.

## Permissions
`revenue.forecast.view`, `revenue.pricing.approve`, `revenue.autopilot.manage`, `rate.manage` (execution), `overbooking.manage`.

## Dependencies
PMS Core (rates/availability execution, pace data), Booking Engine (search signals), Channel Manager (channel mix/net costs), Accounting (TRevPAR/GOPPAR), Events from everywhere. Inference service is a platform AI dependency.

## Events
Emits: `occupancy.forecast_updated`, `pricing.recommendation_created/applied/overridden`, `pace.anomaly_detected`.
Consumes: `reservation.*`, `booking_session.started`, `channel.reservation_received`, `nightaudit.completed`.

## Future scalability
Function-space/MICE revenue optimization; F&B demand pricing (happy-hour optimization, menu engineering loop); total-profit optimization (cost-aware, using our native cost data — beyond anything IDeaS can see); portfolio-level optimization for chains (demand steering between sister properties).
