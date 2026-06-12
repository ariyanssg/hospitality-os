**PulseBar** — the persistent live-vitals strip that sits under the top bar on every Desk screen. Numbers tween on change; chips click through to their board.

```jsx
<PulseBar chips={[
  { id: 'occ', label: 'Occupancy', value: '84%', delta: { dir: 'up', value: '4%' }, tone: 'info' },
  { id: 'arr', label: 'Arrivals', value: 42, progress: 0.7, onClick: () => goTo('/arrivals') },
  { id: 'queue', label: 'Unassigned', value: 3, tone: 'caution' },
  { id: 'adr', label: 'ADR', value: '$241', delta: { dir: 'up', value: '4%' }, tone: 'positive' },
]} />
```

Keep it to ~5–8 chips of genuinely live vitals. `progress` renders the day-fill meter (arrivals/departures worked).
