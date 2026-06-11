# Module 09 — Channel Manager

> Built-in, not bolted-on. The industry's 30–90 second sync window (and the overbookings it causes) exists because channel managers are *separate companies* polling PMSs. Ours consumes `availability.changed` events in-process and pushes deltas in seconds.

## Purpose
Distribute ARI (Availability, Rates, Inventory/restrictions) to OTAs and receive reservations back — Booking.com, Expedia, Agoda, Airbnb, Trip.com first — with conflict-safe, observable, per-channel-controllable sync.

## Architecture

```
availability.changed / rate.price_changed / restriction.changed (outbox events)
        │
        ▼
  Delta Computer (per property×channel: did anything *mapped* change?)
        │ coalescing window 1–2s (batch bursts, e.g. bulk rate update)
        ▼
  Channel Push Queues (BullMQ, per channel; per-OTA rate limits; priority:
        closeouts/stop-sells jump the queue — they prevent overbookings)
        │
        ▼
  OTA Adapters (one per channel, common interface):
        BookingCom (Connectivity API, XML/JSON)   Expedia (EQC/Rapid)
        Agoda (YCS)   Airbnb (API: listing-based model)   TripCom
        │
        ▼
  Push results → sync ledger (full request/response audit) → status dashboard
```

Inbound: OTA webhooks/queues → adapter normalizes → **canonical channel reservation** → idempotent materializer creates/modifies/cancels the PMS reservation (Idempotency-Key = channel booking ref + revision).

### Adapter contract
```ts
interface ChannelAdapter {
  pushAri(deltas: AriDelta[]): Promise<PushResult>;
  pullReservations?(since): Promise<ChannelReservation[]>;   // for poll-based channels
  handleInbound(payload): ChannelReservation;                 // webhook normalization
  confirmReservation(ref): Promise<void>;                     // ack per OTA spec
  capabilities: { ratePlans: boolean; losPricing: boolean; occupancyPricing: boolean; ... };
}
```
Capabilities drive mapping UI (don't offer what the channel can't do).

## Features

- **Mapping studio:** room types ↔ channel room IDs, rate plans ↔ channel rate IDs, with validation (occupancy mismatches flagged), bulk clone across properties, derived channel pricing (e.g. Booking.com = BAR +2% to cover commission delta) — markups/markdowns per channel as rate derivation rules, not copies.
- **Inventory policy:** pooled inventory by default (all channels sell the same counters — no allocation silos); optional per-channel caps; stop-sell on threshold ("close OTAs when ≤ 2 left, keep direct open" — margin protection).
- **Reservation materialization:** guest matching (CRM dedup), virtual-card payment data → PSP-tokenized just-in-time, OTA-specific semantics normalized (Airbnb alteration requests → modification approvals queue; Booking.com no-show waivers).
- **Conflict resolution:** inbound booking vs just-sold-out → counter constraint rejects → policy engine: auto-rebook to mapped upgrade type if available (audit-logged) else overbooking case opened with guided resolution (relocation workflow, OTA messaging templates); rate-parity monitor (what each channel shows vs expected, drift alerts).
- **Sync observability (the trust feature):** per-channel health dashboard — last push, queue depth, error rate, OTA latency; full per-message ledger ("show me exactly what we sent Booking.com for July 14"); **kill switch per channel** (`channel.kill_switch`) that mass-closes availability remotely when a channel misbehaves.
- **Self-onboarding:** guided connection flows per OTA (credentials/OAuth, property match, mapping wizard, test-mode validation against OTA sandboxes, go-live checklist).
- Metasearch feeds (Google Hotel Center via booking-engine pricing) managed here for unified distribution view.

## Database entities
`channels`, `channel_connections`, `channel_room_mappings`, `channel_rate_mappings`, `channel_pricing_rules`, `channel_inventory_policies`, `ari_push_log` (partitioned), `channel_reservations` (raw + normalized payloads), `materialization_log`, `overbooking_cases`, `parity_snapshots`, `channel_health_stats`.

## APIs
```
CRUD /channels/connections          POST /channels/connections/{id}/test | /activate | /kill
CRUD /channels/{id}/mappings        POST /channels/{id}/full-sync       (resync all ARI)
GET  /channels/{id}/health          GET  /channels/{id}/push-log?date=&roomType=
GET  /channels/reservations?status=unmaterialized
POST /channels/reservations/{id}/rematerialize
GET  /distribution/parity           GET  /overbooking-cases  POST .../{id}/resolve
```

## Workflows
- **Rate update fan-out:** revenue manager bulk-updates BAR for July → one `rate.price_changed` batch → delta computer finds 3 mapped channels → derived prices computed → pushes complete in < 5s → dashboard shows per-channel confirmation. The same change is live on the booking engine *instantly* (same tables — direct always wins the freshness race).
- **OTA booking burst:** city-wide event sells out; two Booking.com reservations land for the last room seconds apart → first materializes (counter decrements; closeout push fires immediately) → second hits the constraint → auto-upgrade policy places it in the mapped suite, guest notified per template → zero relocations.
- **Channel outage:** Expedia API erroring → circuit breaker pauses queue, alerts, retries with backoff → on recovery, coalesced current-state push (not replay of stale deltas).

## Permissions
`channel.view/manage`, `channel.mapping.manage`, `channel.kill_switch`, `overbooking.manage`.

## Dependencies
PMS Core (events in, reservations out), CRM (guest matching), PSP (virtual cards), Booking Engine (metasearch pricing). Strong extraction candidate (workers already isolated).

## Events
Emits: `channel.reservation_received/materialized/failed`, `channel.push_failed`, `channel.parity_drift`, `overbooking.case_opened`.
Consumes: `availability.changed`, `rate.price_changed`, `restriction.changed`, `reservation.cancelled` (guest-initiated → OTA notify where supported).

## Future scalability
GDS connectivity (Sabre/Amadeus via switch partner) for corporate RFP business; wholesaler/bedbank APIs; channel-manager-as-API for white-label; AI-driven channel mix optimization (shift inventory toward net-RevPAR-best channels automatically).
