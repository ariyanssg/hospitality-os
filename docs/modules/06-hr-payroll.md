# Module 06 — HR & Payroll

## Purpose
Manage the property's largest cost line — people — where hospitality is hardest: 24/7 shift coverage, high turnover, tipped wages, multi-department cross-training, and labor cost that must track occupancy. Benchmark: BambooHR's employee experience + hospitality-specific scheduling that Workday-class suites never get right for hotels.

## Features

**Core HR**
- Employee records: profile, documents (contracts, visas/permits with expiry alerts, certifications e.g. food-handler), emergency contacts, department/position assignments (multiple — a server who also works banquets), pay rates per position, org chart.
- Onboarding/offboarding checklists (auto-provisions/deprovisions platform user + roles — HR is the identity lifecycle source); offboarding triggers access revocation same-transaction.
- Leave: policies (accrual rules per jurisdiction/tenure), request → approve flow, balances, calendar overlay on scheduling.
- Performance-lite: review cycles, notes; disciplinary log (access-restricted).

**Scheduling & time**
- Shift scheduling per department with templates; demand-driven suggestions (occupancy/covers forecast → required staffing per role per day — the AI loop, see [14-ai-assistant.md](14-ai-assistant.md)); compliance rules (min rest, max hours, minor restrictions, local labor law rule packs); open-shift marketplace (staff claim published open shifts); swap requests with approval; labor budget overlay (scheduled cost vs forecast revenue = live labor %).
- Time & attendance: clock in/out (terminal PIN, mobile geofenced, badge), break tracking, exception queue (missed punches → `timeclock.adjust` with audit), overtime calculation per rule pack, tip pooling intake from POS.

**Payroll**
- Pay periods per legal entity; gross pay computation: hourly (from approved timesheets), salaried, overtime, holiday premiums, tips (POS-integrated), service-charge distribution, commissions, one-time items.
- Deductions & contributions framework (pre/post-tax, employer contributions) with **country rule packs** (launch markets first; engine is rules-driven, not hardcoded).
- Payroll run lifecycle: draft → calculate → review (variance vs last run highlighted) → approve (`payroll.approve`, segregation from `payroll.run`) → commit → payslips (portal + email) → payment file (bank/ACH formats) → GL posting (departmental wage expense + liabilities, same-transaction).
- Alternative: **payroll-export mode** for markets where we don't run native payroll yet — approved timesheets/earnings export to ADP/Deel/local bureaus, GL accrual still automatic.

**Employee self-service (mobile)**
- Schedule view, shift claim/swap, clock in/out, payslips, leave requests, tax documents, company announcements.

## Database entities
`employees`, `employment_records`, `positions`, `department_assignments`, `pay_rates`, `employee_documents`, `leave_policies`, `leave_balances`, `leave_requests`, `shifts`, `shift_templates`, `schedule_periods`, `open_shifts`, `shift_swaps`, `timeclock_entries`, `timesheets`, `tip_pools`, `payroll_runs`, `payroll_items`, `payslips`, `deduction_rules`, `earning_codes`, `labor_budgets`, `compliance_rule_packs`.

## APIs
```
CRUD /hr/employees /positions /leave-policies
POST /hr/leave-requests  /leave-requests/{id}/approve
CRUD /scheduling/schedules /shifts        POST /scheduling/schedules/{id}/publish
GET  /scheduling/suggestions?week=        POST /shifts/{id}/claim | /swap
POST /time/clock-in | /clock-out          PATCH /time/entries/{id}   (adjust, audited)
GET  /time/timesheets?period=             POST /timesheets/{id}/approve
POST /payroll/runs  /runs/{id}/calculate | /approve | /commit
GET  /payroll/runs/{id}/variance          GET /hr/labor-cost/live?date=
```

## Workflows
- **Weekly scheduling:** Thursday: system proposes next week's schedule from occupancy forecast + housekeeping credits + outlet covers → department heads adjust → compliance check runs (violations block publish) → publish → staff notified, open shifts visible → labor % vs forecast shown live as bookings move.
- **Pay run:** period ends → timesheets auto-built from punches (exceptions resolved) → tips imported from POS pools → calculate → controller reviews variance → approve → commit → payslips out, bank file generated, GL posted with department cost centers (F&B wages hit the outlet's USALI schedule automatically).

## Permissions
`employee.*`, `schedule.*`, `timeclock.*`, `leave.*`, `payroll.*`, `compensation.*` — compensation visibility separate; payroll run/approve segregated; all critical-tier.

## Dependencies
GL (postings), POS (tips, server identity), Housekeeping (credits → demand), Revenue AI (occupancy forecast), Notifications, Kernel (identity lifecycle). Consumed by BI (labor cost %, productivity KPIs: rooms-cleaned/hour, covers/server).

## Events
Emits: `employee.hired/terminated`, `shift.published/claimed`, `timeclock.entry_created`, `payroll.run_posted`, `leave.approved`.
Consumes: `occupancy.forecast_updated`, `pos.shift_closed` (tips), `nightaudit.completed` (daily labor snapshot).

## Future scalability
Native payroll country packs expansion; benefits administration; recruiting/ATS; e-learning & certification tracking; gig/agency staff marketplace integration; predictive turnover analytics.
