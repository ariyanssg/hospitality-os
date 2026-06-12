import React from 'react';

/**
 * RoomStatusChip — the room-status colors are sacred (doc 17 §3): identical across rack, boards,
 * mobile, reports. Pairs a color dot with a label (color-never-alone, accessibility). The legend is
 * learned once and trusted everywhere.
 */
const LABELS = {
  'vacant-clean': 'Vacant \u00B7 Clean',
  'vacant-dirty': 'Vacant \u00B7 Dirty',
  occupied: 'Occupied',
  inspected: 'Inspected',
  ooo: 'Out of order',
  oos: 'Out of service',
  arrival: 'Arrival',
  departure: 'Departure',
};

const CSS = `
.atr-room{display:inline-flex;align-items:center;gap:var(--gap-xs);font-family:var(--font-ui);
  font-size:var(--text-caption);color:var(--ink-secondary);}
.atr-room__dot{width:.625rem;height:.625rem;border-radius:var(--radius-full);flex:none;}
.atr-room--solid{padding:2px var(--space-2);border-radius:var(--radius-full);
  background:var(--bg-sunken);border:1px solid var(--line-hairline);}
`;
if (typeof document !== 'undefined' && !document.getElementById('atr-room')) {
  const el = document.createElement('style');
  el.id = 'atr-room';
  el.textContent = CSS;
  document.head.appendChild(el);
}

export function RoomStatusChip({ state, label, chip = false, className = '', ...props }) {
  const cls = ['atr-room', chip && 'atr-room--solid', className].filter(Boolean).join(' ');
  return (
    <span className={cls} {...props}>
      <span className="atr-room__dot" style={{ background: `var(--room-${state})` }} aria-hidden="true" />
      {label ?? LABELS[state] ?? state}
    </span>
  );
}
