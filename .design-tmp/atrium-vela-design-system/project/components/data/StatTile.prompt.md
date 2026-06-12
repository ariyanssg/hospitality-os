**StatTile** — a single KPI in the display face. Use in dashboard grids and the Today landing.

```jsx
<StatTile label="Occupancy" value="84%" delta={{ dir: 'up', value: '4%' }} sub="vs. yesterday" />
<StatTile label="ADR" value="$241" delta={{ dir: 'up', value: '4%' }} />
<StatTile label="Unassigned" value={3} />
```

Delta `up` is positive (emerald), `down` is critical (rose). Keep the value to one glanceable number.
