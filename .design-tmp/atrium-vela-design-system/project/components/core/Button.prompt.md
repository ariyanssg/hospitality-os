**Button** — the primary interactive control; use `variant="primary"` for the single most important action in a region, everything else is `secondary`/`ghost`.

```jsx
<Button variant="primary">Post charge</Button>
<Button variant="secondary">Cancel</Button>
<Button variant="ghost" size="sm">Skip</Button>
<Button variant="danger">Void folio</Button>
<Button loading>Checking in…</Button>
```

Variants: `primary` (accent), `secondary` (bordered surface), `ghost` (quiet), `danger` (critical ink), `link` (inline). Sizes: `sm` / `md` / `lg`. Verb-first labels, sentence case ("Post charge", never "OK"). Pass an icon as a child before the label.
