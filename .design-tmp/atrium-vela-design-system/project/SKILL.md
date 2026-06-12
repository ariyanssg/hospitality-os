---
name: vela-design
description: Use this skill to generate well-branded interfaces and assets for Vela (the hospitality operating system) and its Atrium design system, either for production or throwaway prototypes/mocks. Contains essential design guidelines, OKLCH color + type tokens, fonts, brand assets, and the Atrium UI kit components for prototyping The Desk and other Vela surfaces.
user-invocable: true
---

Read the `readme.md` file within this skill, and explore the other available files.

This is **Atrium**, the design system for **Vela** — *the hospitality operating system*. The flagship
surface is **The Desk** (front-desk PMS): "calm surface, deep machine."

Key facts to internalize before designing:
- **Tokens** live in `styles.css` → `tokens/{primitives,semantic,fonts,base}.css`. Link `styles.css`
  and consume only the **semantic** tokens (`--bg-surface`, `--ink-primary`, `--interactive-default`,
  `--status-*`, `--room-*`, `--fin-*`, `--channel-*`). Never hardcode hex. Dark mode = `class="dark"`
  on `<html>`; density = `data-density="compact|touch"` on any scope.
- **Type:** Inter (UI), Inter Tight (display/KPI numerals, tight tracking), JetBrains Mono (IDs,
  codes, money). Tabular numerals everywhere data lives.
- **Color law:** ~90% warm-graphite neutral, ONE azure accent on the single primary action per
  region, status/room/financial colors reserved for domain meaning only — never decoration.
- **Components** are bundled in `_ds_bundle.js` under `window.AtriumVelaDesignSystem_ec9d90`
  (Button, Input, Badge, Avatar, Kbd, Skeleton, MoneyText, StatTile, PulseBar, RoomStatusChip,
  ReservationStatusBadge, GuestCard). Each has a `.prompt.md` with usage. Compose these — don't
  reinvent them.
- **Icons:** Lucide, 1.5px stroke, always label-paired; status icons always pair with color.
- **Voice:** sentence case; verb-first concrete buttons ("Post charge", never "OK"); calm, specific,
  no emoji, no blame in errors.
- **Reference UI:** `ui_kits/the-desk/` is a full interactive recreation to learn the patterns from.

If creating visual artifacts (slides, mocks, throwaway prototypes), copy assets out (`assets/*.svg`,
`styles.css`, the `tokens/` files) and create static HTML files for the user to view. If working on
production code, copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without other guidance, ask them what they want to build or design, ask
a few focused questions, and act as an expert designer who outputs HTML artifacts _or_ production
code, depending on the need.
