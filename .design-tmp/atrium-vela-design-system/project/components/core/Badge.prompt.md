**Badge** — compact status tag. Tone must map to real meaning (never decorative color).

```jsx
<Badge tone="positive">In-house</Badge>
<Badge tone="caution" dot>12 in queue</Badge>
<Badge tone="critical">No-show</Badge>
<Badge tone="accent">VIP</Badge>
```

Tones: `neutral` / `positive` / `caution` / `critical` / `info` / `accent`. Prefer `ReservationStatusBadge` for reservation states so labels stay consistent across the product.
