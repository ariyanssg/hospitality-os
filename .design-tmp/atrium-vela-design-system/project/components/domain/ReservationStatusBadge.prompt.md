**ReservationStatusBadge** — always use this (not a raw `Badge`) for reservation states so the label and color stay identical everywhere.

```jsx
<ReservationStatusBadge status="checked_in" />   // "In-house", positive
<ReservationStatusBadge status="confirmed" />    // "Confirmed", info
<ReservationStatusBadge status="no_show" />       // "No-show", critical
```

Keys: `inquiry` · `tentative` · `confirmed` · `checked_in` · `checked_out` · `cancelled` · `no_show` · `released`.
