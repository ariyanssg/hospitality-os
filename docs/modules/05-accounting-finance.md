# Module 05 — Accounting & Finance

> Hospitality accounting's dirty secret: in almost every hotel, the PMS and the accounting system disagree, and a human reconciles them monthly. Here they cannot disagree — operational postings *are* journal entries. USALI-native from day one.

## Purpose
Full general ledger, AR, AP, tax, and financial reporting, generated from operations in real time rather than imported in batches.

## Features

**General Ledger**
- Chart of accounts: USALI-aligned templates (Uniform System of Accounts for the Lodging Industry — the standard every hotel asset manager expects), tenant-customizable, per-property + consolidated chain view.
- Cost centers / dimensions on every journal line: property, department (rooms, F&B per outlet, A&G, S&M, POM, utilities), and optional project — enabling departmental P&L (USALI schedules) natively.
- Journal entries: system-generated (folio postings, POS, payroll accrual, inventory movements, depreciation) and manual (`gl.journal.post`, dual-approval option via `gl.journal.approve`); always balanced (DB constraint: Σ debits = Σ credits per entry); immutable — corrections are reversing entries.
- Business-date alignment: journals carry the hotel business date from night audit; period close (`gl.close_period`) locks posting per property+period with controlled reopen.
- Multi-currency: transaction + base amounts with FX snapshots; realized/unrealized FX gain-loss routines; consolidated reporting currency for chains.

**Control accounts wired to operations**
| Operational ledger | GL control account | Source |
|---|---|---|
| Guest ledger (in-house folios) | Guest Ledger (asset) | folio postings |
| City ledger (AR) | Accounts Receivable | folio→AR transfers, corporate invoicing |
| Advance deposits | Deposit Liability | pre-arrival payments |
| Inventory | Inventory Asset | stock movements |
| Payroll clearing | Payroll Liabilities | payroll runs |

Trial balance ties to operational subledgers **by construction**; the night-audit report proves it daily (any drift = bug alarm, not month-end surprise).

**Accounts Receivable**
- AR accounts for companies/agents/groups: credit limits, terms, statements, aging (30/60/90), dunning schedules with templated reminders, direct-bill approval workflow, payment application (auto-match by invoice ref, partials, on-account), write-offs (`invoice.write_off`), commission handling for OTA/agent models (gross/net).

**Accounts Payable**
- Vendor bills (from 3-way match or direct entry), approval matrix, payment runs (batch, payment-method aware), vendor statements reconciliation, 1099/withholding hooks per jurisdiction.

**Tax management**
- Tax engine shared with PMS/POS (rules per charge code/jurisdiction, inclusive/exclusive, compounding, exemptions); tax sub-ledger and filing-period reports (VAT return data, occupancy tax remittance); e-invoicing/fiscalization adapter layer per country (expansion-gated, see [16-risks-and-future.md](../16-risks-and-future.md)).

**Banking & reconciliation**
- Bank account registry; statement import (OFX/CSV/feeds later); rule-based auto-matching (PSP payouts ↔ payment batches — including fee splitting; AP payments; AR receipts); exception queue; PSP settlement reconciliation automated (the deposit-to-bank vs revenue-by-day report controllers actually want).

**Financial statements & close**
- Real-time P&L (USALI departmental schedules), balance sheet, cash flow (indirect), budget vs actual (budgets per account×cost-center×month), forecast integration from Revenue AI; month-end close checklist workflow (recurring journals, accruals, depreciation schedules on assets).

## Database entities
`gl_accounts`, `account_templates`, `cost_centers`, `journal_entries`, `journal_lines`, `accounting_periods`, `ar_accounts`, `ar_invoices`, `ar_payments`, `ar_applications`, `dunning_schedules`, `ap_vendors` (extends suppliers), `ap_bills`, `ap_payments`, `payment_runs`, `bank_accounts`, `bank_statements`, `bank_statement_lines`, `reconciliation_matches`, `tax_ledger_entries`, `budgets`, `budget_lines`, `fx_rates`, `recurring_journals`, `fixed_assets`, `depreciation_schedules`.

## APIs
```
CRUD /gl/accounts /cost-centers /budgets
POST /gl/journal-entries          POST /gl/journal-entries/{id}/approve | /reverse
POST /gl/periods/{id}/close | /reopen
GET  /gl/trial-balance?asOf=&property=        GET /gl/statements/pnl?period=&schedule=usali
CRUD /ar/accounts                 POST /ar/invoices  /ar/payments  /ar/applications
GET  /ar/aging                    POST /ar/dunning/run
CRUD /ap/bills                    POST /ap/payment-runs  /ap/payment-runs/{id}/execute
POST /banking/statements/import   GET  /banking/reconciliation/exceptions
GET  /tax/returns?period=&jurisdiction=
```

## Workflows
- **Daily journal (automatic):** night audit closes business date → summarized journal per revenue/tax/settlement stream posts with full drill-down (journal line → folio postings/POS checks behind it) → controller's morning flash shows P&L through yesterday, tied to bank-pending PSP payouts.
- **Direct bill:** corporate guest checks out → room+tax folio window transfers to company AR → invoice generated and emailed → 30 days later auto-reminder → payment received → cashier applies against invoice → aging clears.
- **Month-end:** close checklist — subledger tie-out report (should always pass), accrue utilities, run depreciation, post payroll accrual, lock period; consolidated chain P&L available the same day. Target: day-3 close for a full-service property (industry norm: day 10+).

## Permissions
`gl.*`, `ar.*`, `ap.*`, `tax.configure`, `report.financial.view`, `budget.manage` — period close and journal approval are critical-tier (sudo + reason).

## Dependencies
Consumes postings from PMS Core, POS, Inventory, Payroll (all same-transaction or evented with outbox guarantees). PSP adapter for payout data. Provides: BI financial datasets, statutory export formats.

## Events
Emits: `gl.journal_posted`, `gl.period_closed`, `invoice.issued/paid/overdue`, `ap.payment_executed`, `reconciliation.exception_raised`.
Consumes: `folio.*`, `pos.check_closed`, `stock.*`, `payroll.run_posted`, `nightaudit.completed`.

## Future scalability
Multi-entity consolidation with eliminations (management companies), owner statements & distributions (condo-hotel/branded residences), ERP export bridges (SAP/Oracle/NetSuite for groups that mandate corporate ERP) — we still win the property-level ledger and feed corporate, statutory e-invoicing country packs, AI-assisted close (anomaly detection on journals).
