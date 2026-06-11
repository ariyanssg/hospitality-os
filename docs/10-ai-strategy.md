# 10 — AI Strategy

> AI is not a chat widget on the pricing page. It is three layers wired into the core: **predictive** (forecasts that move money), **conversational** (a governed assistant over the whole OS), and **ambient** (automation inside every workflow). The unfair input: we natively own rooms + F&B + labor + cost + guest data per property — no competitor's models see that breadth.

---

## 1. Layer map

| Layer | What | Where specced |
|---|---|---|
| Predictive | Demand/occupancy forecasting, dynamic pricing, cancellation/wash, labor demand, consumption forecasting, predictive maintenance | [modules/10-revenue-management.md](modules/10-revenue-management.md), [modules/06-hr-payroll.md](modules/06-hr-payroll.md), [modules/04-inventory-procurement.md](modules/04-inventory-procurement.md) |
| Conversational | Staff assistant (NL analytics, action execution), guest assistant (grounded messaging), proactive briefings | [modules/14-ai-assistant.md](modules/14-ai-assistant.md) |
| Ambient | Smart room assignment, sentiment routing, anomaly detection, smart scheduling, AI search, content generation | woven into module specs |

## 2. Predictive platform

- **Data foundation:** event-stream projections → analytics fact tables + `pace_snapshots` (daily OTB time series) — the training corpus accrues automatically from operations; no ETL projects per model.
- **Model portfolio (pragmatic, mostly gradient-boosted/statistical — deep nets only where they earn it):**
  - Demand & pickup curves per property×roomtype×segment; cancellation/no-show/wash probability per reservation.
  - Price response (elasticity) per property cluster; optimizer with deterministic guardrails (floors/ceilings/bands are code, never model output).
  - Labor demand (HK credits, outlet covers → staffing suggestions); consumption forecasting (procurement suggestions); maintenance risk scoring (asset history).
  - Guest models: LTV, churn/win-back propensity, upsell acceptance, send-time optimization.
- **Cold start:** property clusters (size/segment/geography) provide priors; per-property fine-tuning as ~90 days of data accrues; design partners seed clusters.
- **Serving:** Python inference service (FastAPI) — the one deliberate exception to the TypeScript monolith, extraction-native from day one; batch (nightly) + triggered (pace anomaly) inference; recommendations land in module tables for execution by module code under permissions/guardrails.
- **Honesty loop:** every forecast logged vs actual (MAPE published in-product); every autonomous decision attributable and reversible; holdout baselines measure autopilot lift. Trust is the adoption currency.

## 3. Conversational platform (Claude API)

- **Gateway:** all model calls through an internal AI gateway — model routing (fast model for intent/classification; strongest models for reasoning/action composition), per-tenant quotas & budgets, prompt versioning, caching, full audit log (tenant-visible), zero-retention provider terms.
- **Tools = the public API:** tool definitions generated from our OpenAPI spec; every call executes with the *user's* auth context through the same permission guards — the assistant has no privileges of its own. Writes require explicit confirmation cards; critical-tier actions require sudo.
- **Grounding:** semantic metrics layer for all numbers (NL analytics can only query governed metrics — "Show occupancy trends across all properties over the last 12 months" resolves to `POST /metrics/query`, permission-scoped, identical to the dashboard's number); tenant-scoped retrieval (OpenSearch k-NN) for policies/content with citations.
- **Surfaces:** command palette (⌘K → ask), assistant panel, mobile, guest channels (WhatsApp/SMS/web chat) with confidence-based human handoff.
- **Evaluation as CI:** golden-question suites (metric accuracy, refusal correctness, permission-leak probes, prompt-injection resistance on guest channels) gate every release; production sampling into human review.

## 4. Ambient intelligence (selected)

- **Smart room assignment:** optimizer balancing preferences, attribute requests, housekeeping sequencing, maintenance windows, and future-stay fragmentation (gap minimization) — suggested-first, one-keystroke accept.
- **Sentiment & routing:** every inbound guest message/survey scored; detractors auto-open service-recovery tickets with summaries.
- **Anomaly detection:** refund spikes per cashier, void patterns per server, reconciliation drift, pace deviations — briefed, not alarm-spammed.
- **AI search:** global ⌘K accepts natural language ("folio for the German couple who checked out Tuesday") → entity-resolved results.
- **Content generation:** CMS copy/translations in brand voice, campaign drafts, review responses (approval-gated).

## 5. Governance & risk

- Per-tenant AI enablement flags (jurisdiction/comfort); EU AI Act posture: our uses are limited/minimal-risk categories, documented; no automated decisions with legal effect on guests without human review (pricing is commercial, allowed; but e.g. blacklisting requires human action).
- PII minimization in prompts; no cross-tenant context; model cost guardrails (budget alerts, automatic downgrade to cached/smaller paths on overage).
- Failure posture: AI down ⇒ platform fully operational minus assistance — no AI in any transactional critical path.

## 6. Sequencing

V1: smart room assignment, AI search, sentiment routing (cheap, visible wins) → V2: revenue autopilot (advise→guardrails), guest assistant on owned channels, GM briefings → V3: NL analytics GA, action execution, labor/procurement forecasting → V4: total-profit optimization, autonomous routine agents under policy.

---

Related: [modules/14-ai-assistant.md](modules/14-ai-assistant.md) · [modules/10-revenue-management.md](modules/10-revenue-management.md) · [modules/11-reporting-bi.md](modules/11-reporting-bi.md)
