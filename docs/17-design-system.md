# 17 — Design System Specification ("Atrium")

> The design system is a product, not a stylesheet. Codename **Atrium**: the visual and interaction language that makes a 25-module operating system feel like one calm, fast, premium instrument — and makes every new screen cheap to build *well*. Strategy-level UX (ergonomic modes, signature screens, interaction principles) lives in [13-ux-strategy.md](13-ux-strategy.md); this document specifies the system itself: tokens, foundations, components, patterns, and governance.

---

## 1. Design position (why it won't look generic)

shadcn/ui is the chassis, not the identity. Default-shadcn products all look the same; an award-grade product needs an opinionated layer above it. Atrium's distinctiveness comes from five deliberate signatures:

1. **Editorial-grade typography for operational data** — a serious type hierarchy with true tabular numerals, not card soup.
2. **A disciplined, hue-shifted neutral palette** (warm graphite, not Tailwind gray) with **one confident accent** and *status colors reserved exclusively for domain meaning* (room states, financial states) — color always carries information, never decoration.
3. **Surface depth through layering, not borders-everywhere**: three elevation planes (canvas → surface → raised), hairline separators at 8% opacity, shadows only on transient layers (popovers, drawers, palette).
4. **Live-ness as identity**: the product visibly breathes — counters tick, presence dots glow, a new OTA booking slides into the arrivals board with a 200 ms settle. The "operating system" feel is animation of *data*, never of chrome.
5. **Density as a first-class dimension** — the same component renders `comfortable`, `compact`, and `touch` from one token contract; ops screens feel like a trading terminal, settings feel like a document, POS feels like an instrument panel.

Anti-goals: glassmorphism, gradient hero noise, decorative illustration in operational surfaces, animation that delays input, more than one accent hue per surface.

## 2. Token architecture (three tiers, CSS variables, OKLCH)

```
packages/ui/tokens/
├── primitives.css      # tier 1: raw scales — never used directly in components
├── semantic.css        # tier 2: meaning — what components consume
├── components.css      # tier 3: per-component recipes (only where needed)
└── themes/             # dark, high-contrast, tenant-brand (guest surfaces)
```

- **Tier 1 primitives:** OKLCH color ramps (perceptually uniform → guaranteed contrast stepping): `graphite.0–1000` (neutral, chroma 0.005–0.015 warm), `accent.50–950`, plus fixed domain ramps (`emerald/amber/rose/sky/violet`); spacing scale (4px base: 0.5–96); radii (`xs 4, sm 6, md 8, lg 12, xl 16, full`); type scale (below); motion primitives (durations/easings); z-index scale; shadow ramp.
- **Tier 2 semantic (the only API components may use):**
  - Surfaces: `--bg-canvas`, `--bg-surface`, `--bg-raised`, `--bg-sunken`, `--bg-overlay`
  - Ink: `--ink-primary`, `--ink-secondary`, `--ink-tertiary`, `--ink-disabled`, `--ink-inverse`, `--ink-accent`
  - Lines: `--line-hairline`, `--line-strong`, `--line-focus`
  - Interactive: `--interactive-{default,hover,active,selected,disabled}`
  - Status: `--status-{positive,caution,critical,info,neutral}-{bg,ink,line}`
  - **Domain tokens** (hospitality-specific, the layer generic systems lack):
    `--room-{vacant-clean,vacant-dirty,occupied,inspected,ooo,oos,arrival,departure}`
    `--fin-{posted,pending,settled,refund,void,overdue}`
    `--channel-{direct,ota,corporate,group,walkin}` (categorical, used in mix charts & badges)
  - Density: `--control-h`, `--row-h`, `--cell-px`, `--gap-{xs..xl}`, `--font-ui` — these are what the three density modes re-map.
- **Theming:** dark mode = tier-2 remap (primitives untouched), shipped day one and *designed first for ops boards* (night auditors live in dark mode); high-contrast theme for AA+ contexts; **tenant brand themes apply only to guest surfaces** (booking engine, portal, CMS sites, emails) via a constrained brand kit — accent, logo, type pairing from a vetted list, radius personality — staff surfaces stay platform-branded for support consistency and muscle memory.
- Tokens compile to CSS variables consumed by Tailwind v4 `@theme`; a `tokens.json` build feeds Figma variables and React Native (NativeWind) so web/mobile/Figma can never drift.

## 3. Foundations

### Typography
- **UI face:** Inter (variable) with `ss01`, `tnum` enabled globally for data contexts; **display face:** a distinctive grotesk (e.g. Söhne-class) reserved for page titles, KPI numerals, and marketing/guest surfaces — this single pairing decision does most of the "premium" work. **Mono:** Geist Mono/JetBrains for IDs, codes, amounts in ledgers.
- Scale (1.2 ratio, rem): `display 36/40`, `title 24/32`, `heading 18/28`, `body 14/20` (UI default), `body-lg 16/24` (guest surfaces), `caption 12/16`, `micro 11/14 caps tracked`. Compact density drops body to 13/18.
- Rules: KPI numerals always display-face + tabular; money right-aligned mono with currency in caption ink; never center-align table text; line length ≤ 72ch in reading surfaces.

### Color usage law
- 90% of any staff screen is neutral; accent appears only on the primary action and active states (one primary button per view region).
- Status colors are *never* used for non-status meaning; room-status colors are sacred and identical across rack, boards, mobile, and reports (legend learned once).
- Data-viz palettes: categorical (6 hues, colorblind-safe, mapped stably — direct channel is *always* the same hue), sequential (accent ramp) for heatmaps (occupancy calendar), diverging (rose↔emerald through graphite) for variance vs budget/forecast. Charts get 2px lines, no gradients-under-lines by default, dotted projection segments for forecast continuation.

### Iconography
Lucide as base (1.5px stroke, 16/20/24 grid) + a custom hospitality set drawn to the same grid (~40: bed states, folio, night audit, rack, KDS, key card, housekeeping cart, OTA logos in mono). Icons always pair with labels in nav; icon-only requires tooltip; status icons pair with color (never color alone — accessibility).

### Spatial system
4px grid; component internals on 4, layout on 8; three page gutters by breakpoint; app shell: 56px top bar, 240px nav rail (collapsible to 64px icon rail; user-controlled, remembered), content max-widths per template (boards: fluid; records: 960px; settings/forms: 720px; reading: 640px).

### Elevation & depth
`e0` canvas (app background) · `e1` surface (cards, table containers — hairline, no shadow) · `e2` raised (sticky headers, rail — subtle ambient) · `e3` overlay (popovers/menus — shadow-md) · `e4` modal/palette/drawer (shadow-lg + scrim 40%). Dark mode replaces shadows with surface-lightening steps.

### Motion
- Tokens: `instant 0ms` (state swaps), `fast 120ms` (hover, toggles), `base 200ms` (reveals, row enter), `slow 320ms` (drawers, palette), spring preset for drag-settle. Easing: `cubic-bezier(0.2, 0, 0, 1)` standard; exit faster than enter.
- Law: motion never blocks input (optimistic UI renders final state immediately; motion is the receipt, not the gate); data-change choreography — new row slides+highlights (`--status-info-bg` fading over 1.5s), updated cell pulses once, deleted row collapses; numbers tween on live KPI tiles; `prefers-reduced-motion` collapses everything to opacity.

## 4. Component inventory (packages/ui)

**Tier A — primitives (shadcn-derived, token-rewired):** Button (5 variants × 3 sizes × loading/icon states), IconButton, Input, Textarea (auto-grow), Select/Combobox (async, creatable, keyboard-complete), Checkbox/Radio/Switch, Slider, Badge/Tag, Avatar (+presence), Tooltip, Popover, DropdownMenu/ContextMenu, Dialog/AlertDialog, **Drawer (right-side, stackable — the workhorse for quick views: reservation peek, folio peek, guest card; depth ≤ 2 then promote to page)**, Tabs, Accordion, Toast (action-capable: "Charge posted — Undo"), Skeleton, Progress, Breadcrumbs, Pagination(cursor), Kbd, EmptyState (illustrated, action-first), ErrorState (correlationId + retry).

**Tier B — data & input systems (where PMS quality is won or lost):**
- **DataGrid** (TanStack Table core): virtualized 100k+ rows, sticky header/columns, column resize/reorder/pin/hide with per-user persistence, sort/multi-sort, inline filters, row selection + bulk action bar, inline cell edit (permission-aware), expandable rows, footer aggregates, density-reactive row height, CSV/Excel export, saved views (named filter+column sets, shareable per role), keyboard navigation (arrow/enter/escape semantics), loading skeleton matching final layout. Every list screen in the product is this one component configured — consistency by construction.
- **Date system (hospitality-grade):** DateField (typed entry, locale), DateRangePicker with **stay semantics** (nights count, business-date awareness, min/max LOS hints), OccupancyCalendar (month grid, heat-shaded, price/availability per cell — shared by booking engine and rate manager), ScheduleTimeline (HR shifts), RelativeTime (live "2m ago").
- MoneyInput (currency-aware, string-safe), MoneyText (locale formatting, sign/color conventions: refunds rose, credits emerald), PercentDelta (▲▼ vs comparison), PhoneInput, GuestPicker / RoomPicker / ChargeCodeCombobox (async domain pickers with recent/suggested sections), FileDrop (ID scan, document upload with preview), SignaturePad, OTP/PIN input.
- **FormScaffold:** RHF + Zod-wired layout (sections, sticky footer save bar with dirty-state, inline server-error mapping from problem+json `errors[]`, unsaved-changes guard, autosave variant for settings, explicit-save for financial forms).
- Charts (`packages/ui/charts`, Recharts-or-visx wrapped): Line/Area (forecast-dotted), Bar (stacked mix), Sparkline, Donut (mix), Heatmap, KPITile (display numeral + delta + spark + target band), Leaderboard. All consume the semantic data-viz tokens; all render skeleton → data with number tween.

**Tier C — domain components (the moat layer):**
RackGrid (virtualized rooms×dates with drag-move/extend) · RoomStatusChip · ReservationStatusBadge · StayBar (arrival→departure visualization) · FolioLedger (running balance rows, posting entry row) · BoardColumn (arrivals/departures/HK task stacks) · GuestCard (identity + VIP + traits + LTV chip) · TimelineFeed (audit/comms on records) · CommandPalette (⌘K: actions/nav/entities/AI in one field, per [13-ux-strategy.md §3](13-ux-strategy.md)) · GlobalSearch results · ApprovalCard (mobile one-tap with context) · ChannelHealthTile · SyncLedgerRow · FloorPlanCanvas (POS tables) · KDSTicket · ShiftCell · OccupancyGauge · NightAuditChecklist · AIConfirmationCard (proposed actions diff) · PermissionGate (render-control wrapper) · PropertySwitcher (⌘P) · DensityProvider / ThemeProvider.

Each component ships: Storybook story matrix (states × densities × themes), axe-clean a11y test, visual-regression snapshot (Chromatic-class), usage doc with do/don't, and RN parity tag (full / adapted / web-only).

## 5. Pattern library (assembled UX, documented in Storybook "Patterns")

- **Page templates:** Board (filter bar + DataGrid/columns + bulk bar), Record (sticky summary header + single-column sections + right rail timeline), Settings (nav-anchored sections, autosave), Wizard (numbered, resumable — onboarding, group block setup, channel connect), Explorer (BI), Terminal (POS full-bleed).
- **Navigation model:** rail = modules (permission-filtered, ≤ 9 visible + "More"), top bar = property switcher / global search / create button (context-aware) / notifications / avatar; breadcrumbs only on depth ≥ 3; every entity URL-addressable (deep links shareable; palette and search produce URLs).
- Drawer-vs-page rule: peek/edit-one-thing = drawer; multi-section or destination users bookmark = page.
- Bulk operations, import/migration flow (column-map → validate → preview diff → commit with progress), long-running job pattern (toast → notification center with result link), confirmation ladder (reversible: undo toast · semi: confirm dialog · destructive/financial-final: typed confirmation + sudo), error recovery (every ErrorState offers retry + support handle with correlationId), offline pattern (POS/mobile: banner + queued-ops counter + sync status, per module specs), onboarding pattern (empty states teach; checklist drives first-property setup; feature-flag-aware tours), notification etiquette (badge ≤ 99, group by entity, quiet hours).
- **Microcopy & voice:** calm, specific, verb-first buttons ("Post charge", never "OK/Submit"); errors say what happened + what to do, no blame, no jargon-leak of internals; sentence case everywhere; numbers per locale; i18n from day one (ICU MessageFormat, no concatenation, pseudo-locale CI check, RTL-flipped layouts audited — logical CSS properties only); reading-level target grade 8 for guest surfaces.

## 6. Accessibility (system-level guarantees)

WCAG 2.2 AA as CI gate, not aspiration: token pairs published with contrast ratios (semantic pairs guaranteed ≥ 4.5:1 text / 3:1 UI); focus always visible (`--line-focus` 2px offset ring, never `outline:none` without replacement); full keyboard paths tested per golden flow; touch targets ≥ 44px in touch density; color-never-alone (icons/labels accompany status); live regions for realtime updates (rack changes announced politely); modals/drawers trap + restore focus; axe in component CI + quarterly manual audit with screen readers (NVDA/VoiceOver) on the 12 golden flows.

## 7. Governance & delivery

- **Source of truth = code** (`packages/ui`); Figma library mirrors via tokens.json sync — design drift fails a weekly diff check.
- Public **Storybook** (storybook.<domain>) doubles as the brand's engineering showroom.
- Contribution model: proposal → design review (token impact, a11y, density matrix) → build with full story matrix → adopt; product teams may not ship one-off styled components (lint rule blocks raw hex/tailwind-palette colors and arbitrary px outside packages/ui).
- Versioning: semver, changesets, codemods for breaking component API changes; deprecation window 2 minor versions.
- Quality bars per release: axe-clean, visual-regression diff approved, bundle budget (ui package tree-shakeable; no component > 15kb gz), interaction perf (DataGrid 100k rows @ 60fps scroll on reference low-end hardware).
- Team: founding design engineer owns Atrium from Phase 0 (it is the first "product" built — see [15-implementation-roadmap.md](15-implementation-roadmap.md) Phase 0 deliverables).

---

Related: [13-ux-strategy.md](13-ux-strategy.md) (strategy & flows) · [14-engineering-standards.md](14-engineering-standards.md) (`packages/ui` placement, CI) · [modules/13-mobile-apps.md](modules/13-mobile-apps.md) (RN parity)
