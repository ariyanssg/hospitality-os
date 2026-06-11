# Module 02 — Housekeeping & Maintenance

## Purpose
Keep rooms sellable. Housekeeping turns departures into inspected-clean inventory on time; maintenance keeps assets functioning and rooms out-of-order windows minimal. Both are mobile-first (attendants and engineers work on phones, often offline in concrete stairwells).

## Features

**Housekeeping**
- Live room-status board (floor/section grid) synced bidirectionally with front desk; statuses: `dirty/clean/inspected × vacant/occupied` + `do_not_disturb`, `refused_service`.
- Task generation engine: rules per property — departure clean, stayover service (daily or green-program opt-out), linen-change cadence (e.g. every 3rd night for long-stay), turndown, deep-clean schedules; **queue-room priority** (waiting arrival bumps task to top and notifies attendant).
- Attendant assignment: sections/boards built daily — auto-balanced by credits (room-size/type weighted workload units), respecting attendant skills and floors; drag-to-rebalance.
- Mobile attendant app: ordered task list, room detail (next arrival time, VIP, preferences, notes), start/finish timer, status update, photo capture, minibar consumption posting (→ folio), lost & found logging, inline maintenance reporting (photo + category → ticket in 10 seconds).
- Inspection workflow: supervisor checklist per room type, pass/fail per item, fail → reopen task with notes.
- Linen/amenity par tracking hooks into Inventory module.
- Forecasting: tomorrow's workload from arrivals/departures/stayovers → suggested staffing (feeds HR scheduling).

**Maintenance**
- Ticket lifecycle: `reported → triaged → assigned → in_progress → done → verified`; priorities with SLA timers; categories (plumbing, HVAC, electrical, FF&E...).
- Sources: staff app (any employee with `maintenance.ticket.view`), housekeeping inline report, guest request (portal/SMS), preventive schedule.
- Preventive maintenance: recurring schedules per asset class (PM every N days/usage cycles), auto-generated tickets, completion checklists.
- Asset registry: assets per room/area (HVAC unit, TV, boiler), serial/warranty, service history, cost log (parts from Inventory, labor hours).
- Out-of-order/out-of-service integration: ticket can place a room OOO (availability decrement, `overbooking.manage`-grade permission) with expected-return date; return-to-service requires inspection.

## Database entities
`housekeeping_tasks`, `task_rules`, `housekeeping_sections`, `attendant_boards`, `room_credits`, `inspection_checklists`, `inspection_results`, `minibar_items`, `minibar_postings`, `lost_found_items`, `maintenance_tickets`, `ticket_comments`, `assets`, `asset_categories`, `pm_schedules`, `pm_checklists`.
(Room status itself lives in PMS Core `rooms`/`room_status_log`; this module mutates it via PMS API.)

## APIs
```
GET  /housekeeping/board?floor=&section=     GET  /housekeeping/my-tasks
POST /housekeeping/tasks/{id}/start | /complete | /skip
POST /rooms/{id}/status                       POST /housekeeping/boards/generate
POST /housekeeping/minibar-postings           POST /lost-found
CRUD /maintenance/tickets                     POST /maintenance/tickets/{id}/assign | /complete | /verify
CRUD /assets  /pm-schedules                   POST /rooms/{id}/out-of-order
```

## Workflows
- **Morning board generation:** night audit completion event → engine builds today's tasks from occupancy + rules → auto-assigns to scheduled attendants (HR shift data) → supervisors adjust → attendants see lists at clock-in.
- **Departure turn:** checkout event → task flips to `departure clean` priority ordering by next-arrival time → attendant completes → supervisor inspects (or auto-inspect policy for low-risk) → room `inspected/vacant` → front-desk rack and booking availability update in real time; queued arrival auto-notified.
- **Guest-reported issue:** guest texts "AC not cooling" → AI assistant classifies → ticket created (room, category, priority) → engineer assigned by zone/skill → guest notified on resolution; recurring AC tickets on same asset surface a replacement recommendation.

## Permissions
`housekeeping.task.*`, `housekeeping.schedule.manage`, `room.status.update`, `room.inspect`, `maintenance.ticket.*`, `asset.manage`, OOO via `availability.manage`.

## Dependencies
PMS Core (room status, arrivals/queue), HR (shifts → assignment), Inventory (parts, linen pars), Notifications, Folio (minibar posting). Consumed by BI (clean-time analytics, MTTR), AI (predictive maintenance).

## Events
Emits: `housekeeping.task_created/completed`, `room.inspection_failed`, `maintenance.ticket_created/closed`, `room.out_of_order_set/cleared`, `minibar.posted`.
Consumes: `reservation.checked_out/checked_in`, `nightaudit.completed`, `shift.published`.

## Future scalability
IoT door-lock/occupancy signals for service timing; robot vacuum integration; predictive maintenance from asset telemetry; computer-vision inspection assist; contractor portal for outsourced engineering.
