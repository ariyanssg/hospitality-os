**GuestCard** — the guest identity surface used on arrivals row-expand and in the reservation drawer. Composes Avatar + Badge + MoneyText.

```jsx
<GuestCard
  name="Priya Patel"
  vip
  summary="Deluxe Suite · 2 nights · BK-1042"
  traits={["3rd stay", "prefers high floor", "allergy: nuts"]}
  ltv="8420.00"
/>
```

Keep traits short and factual — they're operational signals an agent acts on, not marketing copy.
