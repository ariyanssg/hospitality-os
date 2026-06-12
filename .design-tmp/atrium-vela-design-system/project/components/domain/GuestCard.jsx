import React from 'react';
import { Avatar } from '../core/Avatar.jsx';
import { Badge } from '../core/Badge.jsx';
import { MoneyText } from '../data/MoneyText.jsx';

/**
 * GuestCard — the row-expand / drawer identity card (doc 18 §3.2): photo/initials, VIP, stay
 * summary, traits ("3rd stay \u00B7 prefers high floor \u00B7 allergy: nuts"), and an LTV chip.
 * A Tier-C domain component — composes the primitives, never re-implements them.
 */
const CSS = `
.atr-guest{display:flex;flex-direction:column;gap:var(--gap-md);padding:var(--space-4);
  border:1px solid var(--line-hairline);border-radius:var(--radius-lg);background:var(--bg-surface);font-family:var(--font-ui);}
.atr-guest__head{display:flex;align-items:center;gap:var(--gap-md);}
.atr-guest__name{display:flex;align-items:center;gap:var(--gap-sm);font-weight:600;color:var(--ink-primary);}
.atr-guest__meta{font-size:var(--text-caption);color:var(--ink-tertiary);}
.atr-guest__ltv{margin-left:auto;text-align:right;}
.atr-guest__ltv-label{font-size:var(--text-micro);text-transform:uppercase;letter-spacing:.05em;color:var(--ink-tertiary);}
.atr-guest__traits{display:flex;flex-wrap:wrap;gap:var(--gap-xs);}
.atr-guest__trait{font-size:var(--text-caption);color:var(--ink-secondary);background:var(--bg-sunken);
  border:1px solid var(--line-hairline);border-radius:var(--radius-full);padding:1px var(--space-2);white-space:nowrap;}
`;
if (typeof document !== 'undefined' && !document.getElementById('atr-guest')) {
  const el = document.createElement('style');
  el.id = 'atr-guest';
  el.textContent = CSS;
  document.head.appendChild(el);
}

export function GuestCard({ name, photo, vip = false, summary, traits = [], ltv, currency = 'USD', className = '', style, ...props }) {
  return (
    <div className={['atr-guest', className].filter(Boolean).join(' ')} style={style} {...props}>
      <div className="atr-guest__head">
        <Avatar name={name} src={photo} size="lg" />
        <div>
          <div className="atr-guest__name">
            {name}
            {vip && <Badge tone="accent">VIP</Badge>}
          </div>
          {summary && <div className="atr-guest__meta">{summary}</div>}
        </div>
        {ltv !== undefined && ltv !== null && (
          <div className="atr-guest__ltv">
            <div className="atr-guest__ltv-label">Lifetime value</div>
            <MoneyText amount={ltv} currency={currency} />
          </div>
        )}
      </div>
      {traits.length > 0 && (
        <div className="atr-guest__traits">
          {traits.map((t, i) => (
            <span key={i} className="atr-guest__trait">{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}
