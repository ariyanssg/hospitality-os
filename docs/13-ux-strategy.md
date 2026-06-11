# 13 — UX Strategy

> The emotional pitch: hotel software that feels like Linear, reads like Stripe, and composes like Notion — at a front desk with a queue of arrivals and one hand on the phone. Speed and clarity aren't aesthetics here; they're labor economics.

---

## 1. Design language

- **Foundation:** Tailwind + shadcn/ui, customized into a real design system (`packages/ui`): design tokens (color, type scale, spacing, radii, elevation, motion) themed light/dark from day one; density variants (`comfortable` for managers/settings, `compact` for ops boards, `touch` for POS/kiosk — 44px+ targets). Full specification — token tiers, typography/color/motion/iconography systems, complete component inventory, pattern library, governance — in [17-design-system.md](17-design-system.md) ("Atrium").
- **Personality:** calm neutral surfaces, one confident accent per tenant-brandable palette (staff app stays platform-branded; guest surfaces take hotel branding), generous data typography (tabular numerals everywhere money or counts appear), subtle motion (150–200ms, never decorative-blocking).
- **Information density without clutter:** the OPERA lesson is that density ≠ noise. Boards use layered disclosure — a rack cell shows status color + guest surname; hover/focus reveals the context card; enter opens the record. Manager dashboards default to 6–8 KPI tiles, not 40.
- Accessibility: WCAG 2.2 AA across staff + guest surfaces (contrast-checked tokens, full keyboard paths, screen-reader landmarks, reduced-motion). Audited per release; it's also a procurement checkbox enterprise buyers ask for.

## 2. The three ergonomic modes

| Mode | User | Optimized for |
|---|---|---|
| **Keyboard-first** | front desk, reservations, finance | zero-mouse flows, command palette, shortcuts, inline edit |
| **Touch-first** | POS, kiosk, housekeeping/maintenance mobile | large targets, thumb reach, offline grace, glanceable state |
| **Glance-first** | GM/owner dashboards, mobile approvals | prioritized cards, deltas-vs-expectation, one-tap actions |

## 3. Keyboard & command system (the Linear DNA)

- **⌘K command palette:** global — actions ("check in Patel", "post charge", "set OOO 412"), navigation, entity jump (type a confirmation number, room, guest), and AI queries in the same field (NL falls through to the assistant).
- **Global shortcuts:** `g a` arrivals, `g r` rack, `g h` housekeeping, `g f` folios, `/` search, `n r` new reservation, `?` shortcut overlay. Per-screen single-key verbs (rack: `c` check-in, `m` move, `s` status). All remappable; all discoverable via the overlay.
- **Flow completeness:** every core front-desk task (walk-in, check-in, checkout, post, pay) is executable keyboard-only — measured in CI by E2E tests that forbid pointer events.

## 4. Signature screens (form follows workflow)

*(The front desk, as the flagship surface, has a full experience spec: [18-front-desk-experience.md](18-front-desk-experience.md).)*

- **Today (per role):** the landing surface — arrivals/departures/alerts for FOM; covers/86s/labor for F&B; flash + exceptions for GM. Answers "what needs me now?" before any navigation.
- **The Rack:** virtualized rooms×dates grid (500 rooms × 30 days smooth), drag to move/extend (policy-checked with live rate delta preview), color = status, badges = VIP/notes/OOO; right-click/`.` quick actions; filter bar (floor, type, status).
- **Reservation record:** single scrollable record with sticky summary header (no OPERA tab maze) — stay, guests, folio, comms, audit timeline in one column; every field inline-editable with permission-aware affordances.
- **Folio screen:** ledger-style postings with running balance, keyboard posting row (code-ahead charge codes), split/transfer via drag or `t`; settlement drawer.
- **POS terminal:** seat-aware order pad, max 2-tap depth to any common item (favorites + search), fire/course strip, check operations under one consistent action sheet; offline badge state.
- **Housekeeping board:** floor strips with status chips; attendant mobile view is a vertical task stack with swipe-complete.
- **Channel health, AI assistant panel, BI explorer:** specced in their modules.

## 5. Interaction principles

1. **Optimistic by default** for reversible ops (status changes, assignments) with instant rollback toasts; pessimistic-with-progress for money.
2. **Realtime everywhere:** boards never need refresh (WS-driven cache patching); presence hints ("Ana is editing this reservation") prevent front-desk collisions.
3. **Minimal clicks, measured:** core flows have click/keystroke budgets (walk-in ≤ 12 keystrokes + 0 required mouse, check-in ≤ 5 interactions) tracked in analytics; regressions are design bugs.
4. **Empty/error/loading states are designed, not defaulted:** skeletons match layout; errors say what to do next (and carry `correlationId` for support).
5. **Undo over confirm** where reversible; typed-confirmation only for destructive/financial finality (period close).
6. **Progressive disclosure of depth:** advanced folio routing, derived rates, etc. live behind "advanced" seams — present for the power user, invisible to the new hire. Onboarding tooltips driven by usage telemetry (show what this user hasn't used).
7. **Multi-property fluency:** persistent property switcher (`⌘P`), cross-property views badge data by property color; corporate users get comparison-first layouts.

## 6. Performance as UX

Budgets in [12-performance-scalability.md](12-performance-scalability.md) (LCP < 1.5s, INP < 200ms); route-level code splitting per app area; prefetch on hover/intent; virtualized lists everywhere data exceeds a screen; **measured cold-start to first action < 3 s** on hotel-grade hardware (the front desk PC is not an M3 Max — test on cheap hardware in CI device lab).

## 7. Research & quality loop

Design-partner shadowing (front desk shifts, restaurant rushes — workflows are designed from observation, not personas); usability tests per major flow before build; in-app feedback affordance routed to product triage; quarterly heuristic audits against this doc; a public component storybook keeps implementation honest to spec.

---

Related: [03-product-strategy.md](03-product-strategy.md) (principle 7) · [modules/13-mobile-apps.md](modules/13-mobile-apps.md) · [14-engineering-standards.md](14-engineering-standards.md) (frontend standards)
