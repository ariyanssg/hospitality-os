import React from 'react';

/**
 * PulseBar — the signature Desk element (doc 18 §2): a persistent strip of live property vitals.
 * Each chip is a caps label + display numeral, optional delta, optional segmented day-progress
 * meter, and an optional click-through to its board. The "operating system heartbeat".
 */
const CSS = `
.atr-pulse{display:flex;align-items:stretch;gap:var(--gap-lg);overflow-x:auto;
  border-bottom:1px solid var(--line-hairline);background:var(--bg-raised);
  padding:var(--space-3) var(--space-6);}
.atr-pulse__chip{display:flex;flex-direction:column;gap:2px;min-width:fit-content;text-align:left;
  border:0;background:none;border-radius:var(--radius-md);padding:var(--space-1) var(--space-2);font-family:var(--font-ui);}
.atr-pulse__chip--btn{cursor:pointer;transition:background var(--motion-fast);}
.atr-pulse__chip--btn:hover{background:var(--bg-sunken);}
.atr-pulse__label{font-size:var(--text-micro);font-weight:500;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-tertiary);}
.atr-pulse__row{display:flex;align-items:baseline;gap:var(--gap-xs);}
.atr-pulse__value{font-family:var(--font-display);font-weight:600;font-size:var(--text-heading);font-variant-numeric:tabular-nums;letter-spacing:-.01em;}
.atr-pulse__delta{font-size:var(--text-caption);font-variant-numeric:tabular-nums;}
.atr-pulse__meter{margin-top:4px;display:block;height:4px;width:100%;overflow:hidden;border-radius:var(--radius-full);background:var(--bg-sunken);}
.atr-pulse__meter span{display:block;height:100%;border-radius:var(--radius-full);background:var(--interactive-default);transition:width var(--motion-slow) var(--ease-standard);}
`;
if (typeof document !== 'undefined' && !document.getElementById('atr-pulse')) {
  const el = document.createElement('style');
  el.id = 'atr-pulse';
  el.textContent = CSS;
  document.head.appendChild(el);
}

const TONE_INK = {
  default: 'var(--ink-primary)',
  positive: 'var(--status-positive-ink)',
  caution: 'var(--status-caution-ink)',
  critical: 'var(--status-critical-ink)',
  info: 'var(--status-info-ink)',
};

export function PulseBar({ chips = [], className = '', style, ...props }) {
  return (
    <div
      className={['atr-pulse', className].filter(Boolean).join(' ')}
      style={style}
      role="status"
      aria-live="polite"
      {...props}
    >
      {chips.map((chip) => {
        const Tag = chip.onClick ? 'button' : 'div';
        return (
          <Tag
            key={chip.id}
            onClick={chip.onClick}
            className={['atr-pulse__chip', chip.onClick && 'atr-pulse__chip--btn'].filter(Boolean).join(' ')}
          >
            <span className="atr-pulse__label">{chip.label}</span>
            <span className="atr-pulse__row">
              <span data-numeric className="atr-pulse__value" style={{ color: TONE_INK[chip.tone ?? 'default'] }}>
                {chip.value}
              </span>
              {chip.delta && (
                <span
                  className="atr-pulse__delta"
                  style={{ color: chip.delta.dir === 'up' ? 'var(--status-positive-ink)' : 'var(--status-critical-ink)' }}
                >
                  {chip.delta.dir === 'up' ? '\u25B2' : '\u25BC'}{chip.delta.value}
                </span>
              )}
            </span>
            {chip.progress !== undefined && (
              <span className="atr-pulse__meter">
                <span style={{ width: `${Math.round(Math.min(1, Math.max(0, chip.progress)) * 100)}%` }} />
              </span>
            )}
          </Tag>
        );
      })}
    </div>
  );
}
