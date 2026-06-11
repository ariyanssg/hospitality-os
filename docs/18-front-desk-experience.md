# 18 — Front Desk Experience ("The Desk")

> The front desk is the platform's face: the first screen in every sales demo, the surface a GM judges in ten seconds, and the workstation a new hire must master in a day. This document specifies it as a flagship product experience — the screen that makes hotel owners say *"that's beautiful"* and IT heads say *"that's solid"* in the same meeting. Functional workflows live in [modules/01-pms-core.md](modules/01-pms-core.md); visual system in [17-design-system.md](17-design-system.md); this is the experience layer that binds them.

---

## 1. Experience thesis

Legacy front desks (OPERA) are cockpit-dense and hostile; modern ones (Mews) are clean but shallow under pressure. The Desk's position: **calm surface, deep machine** — one glance answers "what needs me now?", one keystroke starts any action, and complexity reveals itself only when summoned. Three measurable promises define it:

1. **Check-in in under 60 seconds**, keyboard-only, including payment — timed in CI E2E and shown live in demos.
2. **Zero refresh, ever** — every tile, board, and rack cell is event-driven live; an OTA booking appears on the arrivals board before the confirmation email sends.
3. **Nothing hidden, nothing modal-trapped** — every state visible in ≤ 2 interactions; agent never loses work to a dialog (drawers preserve context; drafts survive navigation).

## 2. The Desk layout (anatomy)

```
┌──────────────────────────────────────────────────────────────────────┐
│ ⌘P Property ▾   ⌘K Search & command…        + Create ▾   🔔  Avatar │ top bar (56px)
├────────┬─────────────────────────────────────────────────────────────┤
│        │  PULSE BAR  occ 84% ▲  arr 42 (12 in queue)  dep 38 (5 due)│
│  rail  │  hk: 9 rooms to inspect   ooo 3   ADR $241 ▲4%   ⚡ 2 alerts│
│        ├─────────────────────────────────────────────────────────────┤
│ Today  │                                                             │
│ Rack   │              WORKSPACE (board / rack / record)              │
│ Arrivals│                                                            │
│ In-house│                                                            │
│ Departures                                                           │
│ Folios │                                                             │
│ …      ├─────────────────────────────────────────────────────────────┤
│        │ ACTION TRAY (contextual, appears on selection)              │
└────────┴─────────────────────────────────────────────────────────────┘
```

- **Pulse bar** — the signature element: a persistent, glanceable strip of live property vitals (occupancy, arrivals/departures progress as segmented meters that fill through the day, housekeeping readiness, alerts). Numbers tween on change; each chip clicks through to its board. This is the "operating system heartbeat" owners remember from demos.
- **Workspace** — one of three modes (board, rack, record), switched by `g` shortcuts or rail; state (filters, sort, scroll) preserved per mode per session.
- **Action tray** — selection-aware command strip (select 3 arrivals → "Assign rooms · Pre-register · Message"); mirrors the right-click/`.` quick-action menu so mouse and keyboard users see the same vocabulary.

## 3. Screen specifications

### 3.1 Today (landing)
Role-tuned dashboard answering *what needs me now* in priority order: **Needs attention** stack (queue-room guests waiting, unassigned arrivals < 2h, payment failures, expiring holds, unresolved overbooking cases — each card carries its one-tap resolution), then arrival/departure progress meters, VIP strip (avatar chips with hover context), shift handover note (rich note + auto-appended exceptions from the shift: comps, refunds, incidents), and the cashier status chip. Empty state at 3 PM lull: "All clear — 12 arrivals remaining, next at 3:40 (Ito, DLX)."

### 3.2 Arrivals board
DataGrid (saved views: All / Unassigned / VIP / Groups / In queue) with **arrival-readiness scoring** — each row carries a composite chip: room assigned ✓ · room inspected ✓ · payment verified ✓ · reg-card done ✓ · key ready ✓. The board is sortable by readiness, so the desk works the exceptions, not the list. Row expand = guest context card (photo/initials, stay summary, traits: "3rd stay · prefers high floor · allergy: nuts", balance, notes). Bulk: select → auto-assign rooms (gap-optimizing suggestions per [10-ai-strategy.md §4](10-ai-strategy.md)) → pre-register.

### 3.3 Check-in flow (the 60-second demo)
Launched from anywhere: `Enter` on an arrival row, ⌘K → guest name, or ID scan. A **focused right drawer** (not a page jump — the board stays visible behind):
1. **Verify** — guest card + stay summary; ID scan autofills/validates (mismatch highlighted inline); reg-card e-sign on flip-to-guest screen or guest's phone via QR.
2. **Room** — suggested room pre-selected with reason ("412 — high floor, inspected 13:05, matches preference"); `→` cycles alternates on a mini-rack; upgrade upsell chip shows live price delta if inventory allows.
3. **Pay** — card on file verified / terminal tap; folio preview inline; deposit auto-applied.
4. **Done** — key encodes, welcome message queues, drawer closes with a settle animation; row slides from Arrivals to In-house; Pulse meter ticks.
Every step keyboard-complete (`Tab`/`Enter` advance, `Esc` parks the draft — resumable from "Needs attention"). Walk-in variant: same drawer, starts at a tonight-only room-type grid with live prices.

### 3.4 The Rack
The centerpiece (spec in [13-ux-strategy.md §4](13-ux-strategy.md), tokens in [17-design-system.md](17-design-system.md)): virtualized rooms×dates, room-status colors sacred, stay bars draggable (move/extend with live policy + rate-delta preview), hover context cards, marquee-select for block operations, OOO ranges hatched, **timeline scrubber** to glide today→next month with momentum. Filter chips (floor/type/status/feature) compose; `f` focuses the filter bar. Performance budget: 500 rooms × 30 days at 60fps on hotel-grade hardware ([12-performance-scalability.md](12-performance-scalability.md)).

### 3.5 Reservation record & folio
Single scrollable record, sticky summary header (guest · dates · room · status · balance · actions), sections: stay, guests, **folio ledger** (running balance, keyboard posting row with code-ahead, split/transfer via drag or `t`), communications thread, audit timeline ("who changed what, when" — inline, not a buried report). Presence avatars show "Ana is viewing"; concurrent edit fields lock softly with attribution.

### 3.6 Departures & checkout
Mirror of arrivals: readiness = folio balanced ✓ · no disputes ✓ · late-checkout flag. Express path: `Enter` → folio review drawer → settle → emailed invoice → done in three keystrokes; exceptions (balance, AR transfer) route to the full record with the blocking item pre-focused.

### 3.7 Shift & cashier
Cashier session chip on Today opens the drawer: takings by method, over/short live, count entry, blind-count mode, close with variance reason — a 90-second ritual instead of a back-office detour.

## 4. Innovations (the demo "wow" inventory)

| Moment | What the audience sees |
|---|---|
| **Live OTA booking** | Presenter books on Booking.com sandbox; row slides into Arrivals with channel badge in seconds — the no-sync-lag thesis made visible |
| **Dinner on the folio** | POS closes a check to room 412 (test outlet); folio line appears mid-sentence — the wedge demo |
| **⌘K everything** | "check in patel" → flow opens; "show occupancy last 12 months" → AI renders the chart inline ([modules/14-ai-assistant.md](modules/14-ai-assistant.md)) |
| **Readiness board** | "Your agents work exceptions, not lists" — owners hear labor efficiency |
| **Queue-room loop** | Guest arrives early → one tap queues → HK attendant's phone bumps the room → inspected → desk gets a toast + guest gets an SMS — cross-module choreography in 30 seconds |
| **Audit timeline** | IT head asks "who changed that rate?" → answer is on the record, two clicks, with the permission that allowed it |
| **PIN switch** | Agent swap in <2s with full attribution ([09-security.md §1](09-security.md)) — kills the shared-login objection |
| **Dark mode + density toggle** | Night-audit dark, compact ops density — the "built by people who've worked a desk" signal |

## 5. The IT-head lens (what makes them say yes)

The same surface must *audit* as well as it demos. Front-desk-specific assurances, all already architectural: per-action permissions with visible explain ("why can't I refund?" shows the missing permission, [06-permission-engine.md](06-permission-engine.md)); every mutation audit-logged with actor/before/after; shared-terminal PIN switching; sub-second p99s on commodity hardware (budgets in CI, [12](12-performance-scalability.md)); browser-only deployment (no installs, no Java applets — a pointed contrast with legacy); offline posture stated honestly (read-cache degradation + printable emergency pack, [11-infrastructure.md §4](11-infrastructure.md)); SSO/MFA enterprise-ready ([09](09-security.md)); and the status page + correlationId-on-every-error support story. The demo ends on the audit timeline and the permission matrix on purpose: beauty opens the meeting, governance closes it.

## 6. Quality gates (CI-enforced, per [14-engineering-standards.md](14-engineering-standards.md))

- E2E timed runs: check-in ≤ 60s scripted path, walk-in ≤ 12 keystrokes, checkout ≤ 3 interactions on the express path — regression fails the build.
- Keyboard-only Playwright variants for every Desk flow (pointer events forbidden).
- Rack scroll/drag at 60fps and Desk cold-start < 3s on the low-end reference device.
- Live-update latency budget: event → visible change < 1s, asserted in integration tests.
- Axe-clean + screen-reader pass on the check-in drawer and arrivals board every release.

---

Related: [modules/01-pms-core.md](modules/01-pms-core.md) (workflows) · [13-ux-strategy.md](13-ux-strategy.md) (principles) · [17-design-system.md](17-design-system.md) (components: RackGrid, BoardColumn, GuestCard, FolioLedger) · [03-product-strategy.md](03-product-strategy.md) (the demo as sales motion)
