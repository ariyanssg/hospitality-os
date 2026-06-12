# Atrium — the Vela Design System

> The visual + interaction language that makes a 25-module hospitality operating system feel like
> one calm, fast, premium instrument. **Atrium is a product, not a stylesheet.**

Atrium is the design system for **Vela**, *the hospitality operating system* — one platform (PMS ·
POS · booking · folio · accounting) for full-service hotels and resorts. The flagship surface is
**The Desk**, the front-desk PMS whose position is *"calm surface, deep machine"*: one glance
answers "what needs me now?", one keystroke starts any action, complexity reveals itself only when
summoned.

This project is the design system extracted from the Vela codebase. It ships the real OKLCH token
tiers, the brand type + iconography, the Tier-A/B/C component library, and a high-fidelity
recreation of The Desk.

---

## Sources

This system was built by reading the Vela product codebase (mounted locally, read-only):

- **Codebase:** `hospitality-os/` (Next.js + NestJS modular monolith, Turborepo/pnpm).
- **Design system source of truth:** `packages/ui/` — `src/styles/{primitives,semantic,index}.css`
  (the OKLCH token tiers) and `src/components/*` (Button, Badge, Input, DataGrid, Drawer,
  CommandPalette, PulseBar, MoneyText, RoomStatusChip, ReservationStatusBadge, Kbd, Skeleton).
- **Spec docs:** `docs/17-design-system.md` ("Atrium" specification), `docs/18-front-desk-experience.md`
  ("The Desk"), `docs/13-ux-strategy.md`, `docs/00-executive-summary.md`.
- **The Desk app:** `apps/web/` — `app/login`, `app/(desk)/{today,arrivals}`, `components/desk/*`.
- **Demo data:** `tooling/seed/index.ts` — property "Grand Vela — Ocean Club" (GVOC, USD), the eight
  arriving guests, and the KING/DLX/STD room types used throughout this kit.

> The reader is not assumed to have access to the codebase; everything needed is reproduced here.

---

## Brand & product context

- **Vela** — the brand. Mark: an upward **▲ "ascent" triangle** in an accent-azure rounded square,
  set with the wordmark in the display face. Tagline energy: *"calm surface, deep machine."*
- **Atrium** — the design system (this project).
- **The Desk** — the flagship front-desk experience (the primary UI kit here).
- **Audience for staff surfaces:** front-desk agents, night auditors, GMs — power users on shift.
  The product also has *guest surfaces* (booking engine, portal) that may be tenant-branded; staff
  surfaces stay platform-branded for muscle memory.

### Five signatures (why it won't look generic)

1. **Editorial-grade typography for operational data** — real hierarchy + true tabular numerals.
2. **A disciplined warm-graphite neutral palette** with **one** confident accent and status colors
   reserved exclusively for domain meaning (room states, financial states). Color always carries
   information, never decoration.
3. **Depth through layering, not borders-everywhere** — three elevation planes, 8%-opacity
   hairlines, shadows only on transient layers (popover, drawer, palette).
4. **Live-ness as identity** — the product breathes: counters tick, a new OTA booking slides into
   the arrivals board and settles. Animation is of *data*, never chrome.
5. **Density as a first-class dimension** — one component renders `comfortable` / `compact` /
   `touch` from the same token contract.

**Anti-goals:** glassmorphism; gradient hero noise; decorative illustration in operational
surfaces; animation that delays input; more than one accent hue per surface.

---

## CONTENT FUNDAMENTALS (voice & copy)

- **Tone:** calm, specific, confident, never chatty. "Built by people who've worked a desk."
- **Casing:** **sentence case everywhere** — buttons, headings, menus, labels. The only uppercase is
  the *micro caps* style for small section labels (`NEEDS ATTENTION`, `OCCUPANCY`), tracked +5%.
- **Buttons are verb-first and concrete:** "Post charge", "Check in", "Assign rooms", "Void folio" —
  **never** "OK / Submit / Save" alone.
- **Errors say what happened + what to do**, with no blame and no internal jargon. Every error
  surfaces a retry and a support handle (correlationId).
- **Person:** address the agent directly and warmly where it's a greeting ("Good day, Frankie"); the
  product itself is impersonal and precise elsewhere. Avoid "we". Avoid exclamation marks.
- **Numbers** are per-locale; money is always formatted (`$240.00`), refunds shown with a minus and
  in the refund hue. IDs/codes are mono (`BK-1042`, `F-1008`).
- **Microcopy examples (real, from the product):**
  - Empty state at the 3 PM lull: *"All clear — every arrival has a room. Next at 15:40 (Nakamura, DLX)."*
  - Arrivals subtitle: *"Work the exceptions, not the list — sort by readiness."*
  - Toast with action: *"Charge posted — Undo."*
  - Permission explain: *"Check-in not permitted for your role."*
- **Emoji:** not used in operational UI. The single brand glyph is the ▲ mark. Status is shown with
  color **and** a label/icon, never color or emoji alone.
- **Reading level:** grade 8 for any guest-facing surface; i18n from day one (sentence case, no
  string concatenation, RTL-audited).

---

## VISUAL FOUNDATIONS

**Color.** Tokens are authored in **OKLCH** for perceptually-uniform stepping (guaranteed contrast).
Three tiers: raw ramps (`tokens/primitives.css`) → semantic meaning (`tokens/semantic.css`, the only
layer components consume) → component recipes. The neutral is **warm graphite** (hue 250–264, chroma
0.003–0.015) — *not* Tailwind gray. The single accent is a **deep azure** (`--accent-600` is the
interactive default). ~90% of any staff screen is neutral; the accent appears only on the one
primary action and active/selected states per region. Status, room-status, financial-state and
channel hues are **domain tokens** — sacred, identical on every surface, never decorative.

**Type.** UI face **Inter** (variable, `ss01` + tabular numerals on globally). Display face
**Inter Tight** for page titles + KPI numerals (tight tracking, −0.01 to −0.02em). Mono
**JetBrains Mono** for IDs, codes and money in ledgers. Scale on a 1.2 ratio: display 36/40 ·
title 24/32 · heading 18/28 · body 14/20 (UI default) · body-lg 16/24 (guest) · caption 12/16 ·
micro 11/14 caps. KPI numerals are always display-face + tabular; money is right-aligned mono; table
text is never centered.

**Spacing & layout.** 4px grid — component internals on 4, layout on 8. App shell: 56px top bar,
220px nav rail, content max-widths per template (boards fluid; records 960px; settings/forms 720px;
reading 640px). Radii: xs 4 · sm 6 · md 8 (controls) · lg 12 (cards/tables) · xl 16 (panels) · full.

**Surfaces, borders & cards.** Three elevation planes: `e0` canvas (app bg) → `e1` surface
(cards/tables — **hairline border, no shadow**) → `e2` raised (sticky headers, rail) → `e3` overlay
(popovers — shadow-md) → `e4` modal/drawer/palette (shadow-lg + 40% scrim). Cards are a 1px
hairline (8% ink) on `--bg-surface`, `--radius-lg`/`--radius-xl`, **no drop shadow** unless they
float. Hairlines do the separating, not heavy borders.

**Backgrounds.** Flat tonal surfaces only — **no gradients, no imagery, no texture** in operational
chrome. Guest/marketing surfaces may use photography (warm, natural light), but the staff product is
deliberately quiet so live data is the only thing that moves.

**Elevation in dark mode.** Night auditors live in dark mode (it ships day one). Shadows are replaced
by **surface-lightening steps** (canvas → surface → raised get progressively lighter), since shadows
read poorly on dark.

**Motion & live-ness.** Durations: instant 0 · fast 120ms (hover/toggles) · base 200ms (reveals, row
enter) · slow 320ms (drawers, palette). Easing `cubic-bezier(0.2,0,0,1)`; **exit faster than enter**.
The law: *motion never blocks input* — optimistic UI renders the final state immediately; motion is
the receipt, not the gate. Data-change choreography: a new row slides in with a `--status-info-bg`
highlight that fades over 1.5s; an updated cell pulses once; a deleted row collapses; KPI numbers
tween. `prefers-reduced-motion` collapses everything to opacity.

**Interaction states.** Hover = a step to `--bg-sunken` (quiet controls) or to the next interactive
shade (`--interactive-hover`, a darker accent). Active/press = `--interactive-active` (darker still)
— **color shift, not scale-shrink**. Selected = `--interactive-selected` (an accent wash) + accent
ink. Focus = a 2px `--line-focus` ring at 2px offset, **always visible**, never `outline:none`.
Disabled = 50% opacity, pointer-events off.

**Transparency & blur.** Used sparingly: the modal/drawer/palette **scrim** is `--bg-overlay` (ink at
40% light / 60% dark). No backdrop-blur glassmorphism. Hairlines and status washes are alpha-based so
they sit correctly on any surface.

**Corner radii personality.** Slightly soft, not pill-everything: controls and inputs at 8px, cards
at 12px, large panels at 16px, badges/pills/avatars fully round. Sharp enough to feel like an
instrument, soft enough to feel premium.

**Imagery vibe.** Where photography appears (guest surfaces), it's warm, natural, architectural — not
cold or heavily filtered. The operational product itself is image-free.

---

## ICONOGRAPHY

- **System:** **Lucide** (the codebase imports `lucide-react`) is the base set — **1.5px stroke**, on
  a 16/20/24 grid. A small custom hospitality set (bed states, folio, night audit, rack, KDS, key
  card, housekeeping cart) is drawn to the same grid in the product; this kit uses the Lucide base.
- **Delivery here:** Lucide is loaded **from CDN** (`unpkg.com/lucide`) in the UI kit and rendered at
  `stroke-width: 1.5`. *(Substitution note: the codebase uses `lucide-react`; this kit uses the same
  icons via the Lucide UMD build so no build step is needed. Visual parity is exact.)*
- **Usage rules:** icons **always pair with a label in nav** (icon-only requires a tooltip); **status
  icons pair with color** — never color alone (accessibility). Common icons in The Desk:
  `layout-grid` (Today), `calendar-check` (Arrivals), `bed-double` (Rack/room), `receipt` (Folios),
  `sparkles` (Housekeeping), `search`, `command`/`⌘K`, `building-2` (property), `bell`, `check-circle-2`.
- **Emoji / unicode:** not used as icons. The one glyph treated as brand is **▲** (the Vela mark),
  and it lives only in the logo, never inline in UI.
- **Brand mark assets:** `assets/vela-mark.svg`, `assets/vela-wordmark.svg`,
  `assets/vela-wordmark-dark.svg`.

---

## INDEX — what's in this project

**Foundations (root)**
- `styles.css` — the single entrypoint consumers link. Imports, in order: fonts → primitives →
  semantic → base.
- `tokens/primitives.css` — Tier-1 raw OKLCH ramps + spacing/radii/type/motion/z scales.
- `tokens/semantic.css` — Tier-2 semantic + domain tokens (light `:root`, `.dark`, density modes).
- `tokens/fonts.css` — Inter / Inter Tight / JetBrains Mono (Google Fonts).
- `tokens/base.css` — element resets, type features, choreography keyframes.

**Components** (`components/<group>/` — each has `.jsx` + `.d.ts` + `.prompt.md`, plus a card)
- `core/` — **Button, Input, Badge, Avatar, Kbd, Skeleton**.
- `data/` — **MoneyText, StatTile, PulseBar**.
- `domain/` — **RoomStatusChip, ReservationStatusBadge, GuestCard**.

**UI kit** (`ui_kits/the-desk/`)
- `index.html` — interactive recreation of **The Desk**: sign in → Today → Arrivals board →
  reservation/check-in drawer, with the live Pulse bar, property switcher, and ⌘K command palette.
  `shell.jsx` (chrome), `screens.jsx` (views), `app.jsx` (state), `desk.css`, `data.js` (seed-derived).

**Concept** (`concepts/front-desk/`)
- `index.html` — **Front Desk — Concept**: the aspirational Desk at full fidelity. Exception-first
  Arrivals with composite 5-facet readiness scoring and bulk action tray, **the Rack** (rooms ×
  nights stay-bar grid, sacred status colors, OOO hatching, hover context cards), the stepped
  60-second check-in drawer (Verify → Room → Pay → Done with gap-optimized room suggestions and
  upsell), live zero-refresh events (an OTA booking slides in with the row-enter settle), action
  toasts with Undo, ⌘K palette, dark mode and the three density modes.

**Specimen cards** (`guidelines/*.html`) — the Design System tab cards for Type, Colors, Spacing,
Motion, Density and Brand.

**Skill** — `SKILL.md` makes this folder usable as a downloadable Claude Agent Skill.

---

## Using a component

Link `styles.css`, load `_ds_bundle.js`, then read components off the namespace:

```html
<link rel="stylesheet" href="styles.css" />
<script src="_ds_bundle.js"></script>
<script type="text/babel">
  const { Button, Badge, PulseBar } = window.AtriumVelaDesignSystem_ec9d90;
</script>
```

Dark mode: add `class="dark"` to `<html>`. Density: add `data-density="compact"` or `"touch"` to any
scope. Both re-map only semantic tokens — components need no changes.
