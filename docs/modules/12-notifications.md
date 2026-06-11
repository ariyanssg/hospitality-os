# Module 12 — Notifications & Messaging

## Purpose
One delivery spine for everything the platform tells humans: staff alerts, guest messaging (transactional + conversational), and system notices — multi-channel, preference-aware, rate-controlled, fully logged.

## Features

**Staff notifications**
- Channels: in-app (bell + toast via Socket.IO), push (staff mobile), email, SMS (urgent tiers), Slack/Teams webhooks per department.
- Rule subscriptions: role/department defaults (front desk: VIP arrival, OTA booking, overbooking case; engineering: urgent ticket; controller: reconciliation exception; revenue: pace anomaly) + per-user overrides, quiet hours, escalation chains (unacknowledged urgent ticket → supervisor after N minutes).
- Digest engine: low-priority events coalesce (daily summary) instead of spamming.

**Guest messaging**
- Transactional: confirmation, modification, cancellation, pre-arrival, online check-in invite, folio/invoice delivery, survey — templated (brand kit, multi-language, per-property overrides, merge fields), event-triggered.
- Conversational inbox: unified thread per guest across email, SMS, WhatsApp Business — routed to front-desk inbox with assignment, internal notes, canned responses, SLA timers; AI-drafted replies and auto-answers for routine questions ([14-ai-assistant.md](14-ai-assistant.md)) with human handoff rules.
- Compliance: consent checks per channel/purpose (marketing vs transactional separation), unsubscribe handling, send-window laws (e.g. SMS hours), full suppression lists.

**Infrastructure**
- Provider adapters: email (SES/Postmark), SMS (Twilio/local), WhatsApp BSP, push (FCM/APNs) — failover-capable, per-tenant sender identities (DKIM/SPF onboarding for tenant domains).
- Template system: versioned, preview with sample data, locale fallback chain; transactional templates separated from CRM campaign content (campaigns compose on this delivery layer).
- Delivery pipeline: BullMQ queues with per-tenant weights, retries, provider failover; status webhooks (delivered/bounced/read) ingested to per-message timeline; bounce/complaint feedback auto-manages suppression.

## Database entities
`notification_rules`, `user_notification_prefs`, `templates`, `template_versions`, `messages` (partitioned), `message_events`, `conversations`, `conversation_messages`, `canned_responses`, `suppression_lists`, `sender_identities`, `escalation_policies`.

## APIs
```
CRUD /notifications/rules /templates       GET /me/notification-prefs  PUT /me/notification-prefs
POST /messages/send                        (internal API used by all modules)
GET  /conversations?status=&assignee=      POST /conversations/{id}/reply | /assign | /close
GET  /messages/{id}/timeline               POST /templates/{id}/preview
```

## Workflows
- **VIP arrival:** `reservation.checked_in` + VIP trait → rule matches → push to GM + F&B manager with profile context chip → acknowledged in app (escalation cancelled).
- **Guest WhatsApp:** "Can we get a late checkout?" → conversation routed to front desk inbox; AI suggests reply with availability-aware options (sees tomorrow's arrivals) → agent one-taps approval → late checkout fee posted on acceptance.

## Permissions
Template/rule management under `tenant.settings.manage` + dedicated `conversation.view/reply`; guest PII in threads respects `guest.pii.view` masking.

## Dependencies
All modules (event sources), CRM (consent, identity), Kernel. Extraction candidate (stateless dispatch workers).

## Events
Emits: `message.sent/delivered/bounced`, `conversation.opened/sla_breached`.
Consumes: practically everything (rule engine over the event stream).

## Future scalability
Voice (call deflection summaries), in-app guest chat in guest app, marketing-automation depth stays in CRM (this module remains the pipe), per-tenant AI tone profiles.
