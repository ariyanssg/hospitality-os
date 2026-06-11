# Module 13 — Mobile Applications

## Purpose
Three mobile surfaces, one API: a staff app that runs the hotel from a pocket, a guest app/portal that replaces the front-desk queue, and the POS terminal app (specced in [03-pos-restaurant.md](03-pos-restaurant.md)). Mobile-first is an architecture claim here — every workflow these apps need exists as public API.

## Features

### Staff App (React Native / Expo)
Role-adaptive: one app, modules appear by permission.
- **GM/manager:** live dashboard (today tiles from BI API), approvals inbox (rate overrides, refunds over threshold, schedule swaps, PO approvals — all approval flows unified), AI assistant chat, property switcher.
- **Front desk:** arrivals board, mobile check-in (ID scan, e-sign, key issue via lock integration), guest lookup, conversation inbox.
- **Housekeeping attendant:** task list (offline-capable op-queue), room status updates, photo capture, minibar posting, maintenance quick-report — optimized for one-thumb use on a cart.
- **Engineering:** ticket queue, asset history scan (QR on asset), parts lookup, PM checklists.
- **F&B manager:** outlet flash, 86 board, reservations/waitlist.
- **All staff:** schedule view, shift claim/swap, clock in/out (geofenced), payslips, announcements, push notifications with deep links.

Offline: op-queue pattern (same as POS) for housekeeping/maintenance mutations; read caches for boards; conflict resolution server-side with exception surfacing.

### Guest App / Web Portal (PWA-first, optional native shell)
No-download-required is the design constraint: every flow works from a confirmation-email link (magic-link auth); native app adds wallet keys + push for loyalty members.
- Journey: booking management (view/modify/cancel within policy), online check-in (ID upload, reg-card e-sign, arrival time, upsell offers), digital key (lock-vendor integrations: Assa Abloy/Salto/dormakaba adapters), in-stay: folio live view (room + F&B itemized — transparency competitors can't match), service requests (housekeeping, maintenance, concierge → routed to module queues), F&B: QR order to room/pool, restaurant booking, chat (→ conversation inbox), express checkout (review folio → pay → receipt → key deactivation), loyalty: balance, member rates, redemption.
- Localization: full multi-language, RTL support.

## Architecture notes
- Both apps consume the public REST API + Socket.IO; zero private endpoints (dogfooding guarantee).
- Auth: staff via Better Auth (device-bound refresh, biometric unlock, PIN for shared devices); guest via magic link/OTP, scoped to reservation context.
- Push: FCM/APNs through Notifications module.
- Code sharing: `packages/contracts` (types/SDK), `packages/metrics` (KPI rendering), design tokens shared with web (NativeWind).
- Release strategy: Expo OTA updates for JS-layer changes; store releases monthly cadence.

## Database entities
Minimal module-owned state: `devices` (push tokens, device binding), `guest_sessions`, `digital_keys` (issuance log), `app_announcements`. Everything else belongs to owning modules.

## APIs
Consumes existing module APIs; adds:
```
POST /devices/register              POST /guest/magic-link  /guest/verify-otp
POST /reservations/{id}/online-checkin
POST /digital-keys/issue            POST /digital-keys/{id}/revoke
GET  /guest/itinerary               GET  /guest/folio-live
```

## Workflows
- **Skip the desk:** T-1d push "check in now" → guest completes online check-in + upsell accepts late checkout → arrival day: room-ready push at 14:10 (HK completion event) → digital key issued → guest walks straight to room 412. Front desk saw it all on the arrivals board, zero interaction required.
- **Manager approval on the move:** refund request over agent threshold → GM push → context card (folio, reason, guest history) → approve with Face ID (sudo re-auth) → agent unblocked in seconds.

## Permissions
Same engine as web (decision sets in session bootstrap); device-trust adds a factor for critical approvals; guest portal uses reservation-scoped capability tokens, not the staff permission system.

## Dependencies
Every module's API; lock-vendor adapter layer; Notifications. Nothing depends on mobile.

## Events
Emits: `guest.online_checkin_completed`, `digital_key.issued`, `service_request.created` (typed per queue).
Consumes: `housekeeping.task_completed` (room-ready push), `reservation.*`, approval-flow events.

## Future scalability
Wearable/watch complications for managers (occupancy glance), kiosk mode (same guest flows on lobby hardware), offline-first expansion, Apple/Google Wallet key + loyalty passes, voice intents ("Hey Siri, today's occupancy").
