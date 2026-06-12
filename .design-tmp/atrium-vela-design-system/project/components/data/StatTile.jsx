import React from 'react';

/**
 * StatTile (KPITile) — display-numeral metric with optional delta + trend + target band
 * (doc 17 §4 Charts). The signature data-tile: big tabular display numeral, quiet caps label.
 */
const CSS = `
.atr-stat{display:flex;flex-direction:column;gap:var(--gap-xs);padding:var(--space-4);
  border:1px solid var(--line-hairline);border-radius:var(--radius-lg);background:var(--bg-surface);min-width:9rem;}
.atr-stat__label{font-size:var(--text-micro);font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-tertiary);}
.atr-stat__row{display:flex;align-items:baseline;gap:var(--gap-sm);}
.atr-stat__value{font-family:var(--font-display);font-weight:600;font-size:var(--text-display);line-height:1;font-variant-numeric:tabular-nums;letter-spacing:-.02em;}
.atr-stat__delta{font-size:var(--text-caption);font-variant-numeric:tabular-nums;font-weight:500;}
.atr-stat__delta--up{color:var(--status-positive-ink);}
.atr-stat__delta--down{color:var(--status-critical-ink);}
.atr-stat__sub{font-size:var(--text-caption);color:var(--ink-tertiary);}
`;
if (typeof document !== 'undefined' && !document.getElementById('atr-stat')) {
  const el = document.createElement('style');
  el.id = 'atr-stat';
  el.textContent = CSS;
  document.head.appendChild(el);
}

export function StatTile({ label, value, delta, sub, className = '', style, ...props }) {
  const cls = ['atr-stat', className].filter(Boolean).join(' ');
  return (
    <div className={cls} style={style} {...props}>
      <span className="atr-stat__label">{label}</span>
      <span className="atr-stat__row">
        <span data-numeric className="atr-stat__value">{value}</span>
        {delta && (
          <span className={`atr-stat__delta atr-stat__delta--${delta.dir}`}>
            {delta.dir === 'up' ? '\u25B2' : '\u25BC'}{delta.value}
          </span>
        )}
      </span>
      {sub && <span className="atr-stat__sub">{sub}</span>}
    </div>
  );
}
