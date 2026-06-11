# ADR 0001 — Night audit lives in `reservations` and reads `gl`

- Status: accepted
- Date: 2026-06-11

## Context

The night-audit / business-date roll is specified as part of PMS Core
([modules/01-pms-core.md](../modules/01-pms-core.md) "Night audit (business-date roll)"). It must:
roll `business_date`, post room+tax for in-house reservations, generate the daily journal to GL, and
produce a flash/trial balance. The module dependency graph in
[04-system-architecture.md §2](../04-system-architecture.md) declares `folio → gl` but not
`reservations → gl`.

The audit needs the in-house reservation list (reservations), the room+tax posting (folio, which
itself writes GL), and a read of the resulting trial balance (gl). No existing revenue-core module
is allowed to depend on all three.

## Decision

The night-audit orchestrator lives in the `reservations` module, and we add a **read-only** edge
`reservations → gl` to `tooling/module-graph.json` so the audit can read the trial balance after the
postings complete. Room+tax posting still flows `reservations → folio → gl`; reservations never writes
GL directly (that remains folio's job).

## Consequences

- The dependency direction stays acyclic (gl depends only on kernel).
- The added edge is narrow and read-mostly; if the audit grows, extracting a dedicated
  `night-audit`/accounting-close module reading both via their public APIs is the future seam.
