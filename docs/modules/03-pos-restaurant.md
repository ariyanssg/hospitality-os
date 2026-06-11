# Module 03 — POS & Restaurant Operations (V1 Wedge)

> The strategic wedge: a Toast-class restaurant POS where **room charge is a database transaction, not an interface**. Full-service hotels currently run OPERA+Micros (expensive, middleware-fragile) or modern PMS + disconnected POS (folio pain). We make one folio across rooms and F&B the headline demo.

---

## Purpose

Run all F&B and retail outlets of a property — restaurants, bars, pool/beach service, room service, spa retail, gift shop — with offline-capable terminals, kitchen display, and native posting to guest folios and the GL.

## Features

**Order & service:** floor plans per outlet with table states; tabs & named checks; coursing and hold/fire; seat-level ordering (split by seat); modifiers (nested, forced choices, price-affecting); open items; quick-service mode (counter/bar: speed screen, no table); room-service mode (order tied to room, delivery tracking); item routing to prep stations; allergen flags surfaced from recipes.

**Checks & settlement:** split by seat/item/amount/percentage; merge/transfer between tables/servers/outlets; discounts & comps (reason-coded, permissioned); service charges & configurable gratuity (incl. auto-grat for large parties); taxes by item class (dine-in vs takeaway rates where law differs); settlement: cash (drawer mgmt), card via PSP P2PE terminal, **room charge**, AR/house account, member/loyalty charge, vouchers; tip handling (capture/adjust/pooling export to payroll).

**Room charge (the differentiator):**
1. Server taps Room Charge → searches guest by room/name (live PMS data, same DB — includes credit availability & charge-allowed flag).
2. Guest verification (name match + signature/PIN per property policy).
3. `POST /folios/{id}/postings` executes **in the same transaction scope as check close** — check items map to charge codes (e.g. F&B-FOOD-REST1, F&B-BEV-REST1), taxes carry over, GL journal lines generated simultaneously.
4. Folio shows itemized outlet detail (not a blob total), front desk sees it instantly, night audit reconciles outlet↔ledger automatically (they can never disagree — single source).
- No middleware, no posting queue to monitor, no "interface down" mode for online operation. (Offline terminals queue locally — see below — with server-side revalidation of room-charge eligibility at replay.)

**Kitchen Display System (KDS):** station screens (grill, fry, pantry, expo) with routing rules; course pacing; item timers with SLA colors; bump/recall; expo aggregation; all-day counts; ticket-level guest context (VIP, allergy) from PMS data.

**Menu management:** menus per outlet with dayparts (breakfast/lunch/dinner auto-switch); scheduled price changes & happy hour; 86’ing (out-of-stock toggle propagates to all terminals + QR menus in seconds); combo/prix-fixe; menu item ↔ recipe link (costing, depletion — see [04-inventory-procurement.md](04-inventory-procurement.md)).

**Guest-facing:** QR order & pay at table (mobile web, no app), digital menus, pay-at-table (split, tip, email receipt), charge-to-room from QR flow with room+name verification.

**Manager ops:** shift open/close per outlet; cash drawer counts & over/short; void/comp/discount audit screens; daily outlet flash (covers, average check, mix) live, not end-of-day.

**Table reservations:** integrated waitlist + table reservations (sync with room reservations: dinner reservation visible on guest itinerary; "in-house guest" flag on the floor plan).

## Offline-first terminal architecture

POS terminal app (PWA/Electron, touch-first):
- Local store (IndexedDB/SQLite) holds menu snapshot, floor plan, open checks, and an **append-only operation log** (open check, add item, fire, close-to-cash...).
- Online: ops post through immediately. Offline: ops queue; UI shows offline badge; cash/queueable settlements proceed; card payments go store-and-forward only if the PSP terminal supports it; room charges queue with `pending verification` flag.
- Replay on reconnect with per-op idempotency keys; server revalidates (folio still open? guest still in-house?) — failures route to a manager exception queue (e.g., post to AR review) rather than silently dropping revenue.
- Conflict scope is naturally small: a check belongs to one terminal/server at a time; transfers require connectivity.

## Database entities (module-owned)

`outlets`, `pos_terminals`, `floor_plans`, `tables_`, `menus`, `menu_categories`, `menu_items`, `modifier_groups`, `modifiers`, `daypart_schedules`, `pos_checks`, `pos_check_items`, `pos_check_item_modifiers`, `pos_check_discounts`, `pos_payments`, `kds_tickets`, `kds_stations`, `routing_rules`, `pos_shifts`, `cash_drawer_sessions`, `tip_records`, `table_reservations`, `waitlist_entries`, `void_reasons`, `comp_reasons`.

`pos_checks.folio_posting_id` links a room-charged check to its folio posting; `pos_check_items` carry `charge_code_id` + `cost_snapshot` for margin reporting.

## APIs (representative)

```
GET  /pos/outlets/{id}/floor-plan          GET  /pos/outlets/{id}/menu?daypart=
POST /pos/checks                            POST /pos/checks/{id}/items
POST /pos/checks/{id}/fire                  POST /pos/checks/{id}/split | /transfer | /merge
POST /pos/checks/{id}/discounts             POST /pos/checks/{id}/payments   (incl. type=room_charge)
POST /pos/checks/{id}/close                 POST /pos/checks/{id}/void
GET  /pos/room-charge/search?q=             (in-house guests, charge eligibility)
POST /pos/sync                              (offline op-log replay, idempotent batch)
GET  /kds/stations/{id}/tickets             POST /kds/tickets/{id}/bump
POST /pos/shifts/open | close               GET  /pos/outlets/{id}/flash
CRUD /pos/menus /menu-items /modifiers      POST /menu-items/{id}/86
```

## Workflows

**Dinner with room charge:** host seats from waitlist → server opens check on table, orders by seat → items route to KDS stations, coursing paced → guest asks to charge to room → server: Room Charge → "Patel, Room 412" → guest signs on terminal → check closes; folio posting + GL lines committed atomically; front desk and the guest-portal folio both show "Vista Restaurant — $86.40" with line detail immediately.

**86 an item:** kitchen bumps stock-out → manager (or KDS chef permission) toggles 86 → all terminals + QR menus update via Socket.IO within ~2s → POs/recipe depletion flag inventory module.

**End of shift:** server closes personal checks or transfers → cashier prints/views shift report (sales, tips, cash due) → drawer count → over/short posted → manager closes outlet day; outlet totals are already in GL (no batch export — the "daily POS import" job that every Toast+PMS hotel babysits simply doesn't exist here).

## Permissions
`pos.check.*`, `pos.item.*`, `pos.roomcharge.post`, `pos.refund`, `pos.cash.manage`, `pos.shift.close`, `menu.manage`, `kds.operate`, `table.manage` — graded server/bartender/supervisor/manager presets ([06-permission-engine.md](../06-permission-engine.md)).

## Dependencies
Folio & GL (same-transaction posting) · CRM (guest lookup, VIP/allergy flags) · Inventory (recipe depletion, 86 sync) · HR (server identities, tip→payroll export) · Kernel. Consumed by: BI (outlet analytics), AI (demand-based prep forecasting later).

## Events
Emits: `pos.check_opened/item_added/fired/closed/voided`, `pos.payment_recorded`, `pos.item_86ed`, `pos.shift_closed`.
Consumes: `reservation.checked_in/checked_out` (room-charge eligibility cache), `guest.profile_merged`, `stock.depleted` (auto-86 option).

## Future scalability
Self-service kiosks; handheld server devices (same PWA); spa/golf/activity scheduling POS (Agilysys parity); retail barcode mode; multi-outlet central production kitchens; marketplace delivery integration (room service via own staff vs third party); per-outlet P&L automation.
