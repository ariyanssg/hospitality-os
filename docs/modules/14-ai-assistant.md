# Module 14 — AI Assistant

## Purpose
The conversational layer over the whole OS: staff ask questions in natural language, get governed answers and take actions; guests get instant, accurate responses; managers get proactive intelligence. Built on the Claude API with tool use — the assistant is an orchestrator over the platform's own APIs and semantic layer, never a free-styling oracle. (Platform-wide AI strategy: [../10-ai-strategy.md](../10-ai-strategy.md).)

## Features

**Staff assistant (in command palette, dashboard panel, and mobile)**
- **NL analytics:** "Show occupancy trends across all properties over the last 12 months" → resolves through the semantic-layer metrics API (`POST /metrics/query`) → chart + narrative + drill link. The assistant can only query defined metrics with the caller's permission scope — numbers always match BI ([11-reporting-bi.md](11-reporting-bi.md)).
- **Operational Q&A:** "Which arrivals today are VIPs with open requests?", "What's housekeeping's pace vs forecast?" — tool calls against module APIs, permission-filtered.
- **Action execution with confirmation:** "Move the Patel reservation to a high-floor king and waive the upgrade fee" → assistant composes the API calls (room move + adjustment), presents a confirmation card showing exactly what will happen, executes on approval. Writes always require explicit confirm; critical-tier actions additionally require sudo. The assistant has **no permissions of its own** — it acts as the user, through the same guards.
- **Explain anything:** "Why is this folio balance wrong?" → walks postings; "Why did the rate change last night?" → reads pricing decision log with rationale.
- **Report generation:** "Build me a Monday email comparing outlet revenue by property" → composes + schedules via reporting APIs.

**Guest assistant**
- Conversational channel coverage (WhatsApp/SMS/chat via Notifications inbox): answers grounded in property knowledge base (CMS content, policies, hours) + reservation context ("your room has a 14:00 check-in; want to add early check-in for $30?") with retrieval over tenant-scoped content; routine actions (booking modification within policy, restaurant booking, service requests) executed via guest-scoped APIs; confidence-based human handoff (low confidence, complaint sentiment, payment disputes → front desk inbox with full context summary).
- Strict guardrails: only tenant's own content, no pricing improvisation (quotes come from the rates API), conversation logs retained, per-tenant tone configuration, opt-out always available.

**Proactive intelligence (event-stream agents)**
- Watchers over the event stream produce briefings, not alarms-spam: morning GM brief (auto-narrative over flash report: "Occupancy 84%, +6 vs LY. Group pickup behind cutoff by 12 rooms — cutoff is Friday."), anomaly callouts (refund-rate spike at pool bar; reconciliation drift), meeting prep ("summarize the Acme Corp account before my 2pm" — production, AR status, open issues).

## Architecture
- **Models:** Claude API (latest Claude models; Haiku-class for routing/classification, Sonnet/Opus-class for reasoning and action composition) behind an internal gateway: per-tenant budgets/quotas, response caching, prompt versioning, full audit of prompts/completions (tenant-visible AI log).
- **Tool surface:** generated from the OpenAPI spec — each tool maps to an endpoint with the caller's auth context; tool allowlist per surface (guest assistant gets a tiny set; staff set is permission-filtered at runtime).
- **Retrieval:** tenant-scoped knowledge base (CMS content, policies, SOPs uploaded by tenant) embedded → OpenSearch k-NN; citations in answers.
- **Memory:** conversation history per user/thread; durable preferences (GM's favorite metrics) stored as user settings, not model memory.
- **Data boundaries:** no cross-tenant context ever; PII minimization in prompts (tokens/refs over raw identifiers where feasible); zero-retention agreement with model provider; per-tenant AI enable/disable and feature flags.
- **Evaluation:** golden-question suite per release (metric accuracy, refusal correctness, permission leakage probes) in CI; sampled human review queue in production.

## Database entities
`ai_threads`, `ai_messages`, `ai_action_logs` (proposed vs executed calls), `ai_usage_ledger` (tokens/cost per tenant), `knowledge_documents`, `knowledge_chunks` (vectors in OpenSearch), `ai_settings`, `eval_runs`.

## APIs
```
POST /ai/threads  /ai/threads/{id}/messages     (SSE streaming)
POST /ai/actions/{id}/confirm | /reject
CRUD /ai/knowledge-documents                    GET /ai/usage?period=
PUT  /ai/settings                               GET /ai/audit-log
```

## Workflows
- **Revenue question to action:** GM: "How are we pacing for the marathon weekend?" → pace + forecast tools → "+18% vs LY, two OTA channels still open at BAR −5%" → GM: "close the discount on those channels" → confirmation card (restriction change, 2 channels, 3 dates) → confirm → channel pushes fire; decision logged with conversation link.
- **Guest after-hours:** 23:40 WhatsApp: "flight delayed, arriving 2am — will my room hold?" → assistant checks reservation (guaranteed, card on file) → "You're guaranteed for late arrival; night team is expecting you. Want me to note 2am?" → note posted to reservation; front desk brief includes it.

## Permissions
`ai.assistant.use` (+ runtime filtering by the user's real permissions for every tool call); tenant-level AI feature flags; knowledge-base management under `tenant.settings.manage`.

## Dependencies
Claude API; semantic layer/BI; every module's API (tools); Notifications (guest channels); OpenSearch (retrieval). The AI gateway is an extraction-ready service from day one.

## Events
Emits: `ai.action_executed`, `ai.handoff_requested`, `ai.anomaly_briefed`.
Consumes: full event stream (watchers), `conversation.opened` (guest threads).

## Future scalability
Voice interface; autonomous routine agents with budgets (e.g., "rebalance housekeeping boards when call-offs happen" under policy); agentic OTA dispute filing; AI-assisted onboarding (configure a property by conversation); fine-tuned per-vertical assistants.
