import React from 'react';

/**
 * Badge — Atrium status tag (doc 17 §4). Tone uses the semantic status triplets; color always
 * carries meaning, never decoration. Pill shape, micro caps. Use `dot` for a leading status dot.
 */
const CSS = `
.atr-badge{
  display:inline-flex;align-items:center;gap:var(--gap-xs);border-radius:var(--radius-full);
  border:1px solid transparent;padding:1px var(--space-2);font-family:var(--font-ui);
  font-size:var(--text-micro);font-weight:500;text-transform:uppercase;letter-spacing:.04em;
  white-space:nowrap;line-height:1.4;
}
.atr-badge__dot{width:.45em;height:.45em;border-radius:var(--radius-full);background:currentColor;}
.atr-badge--neutral{background:var(--status-neutral-bg);color:var(--status-neutral-ink);border-color:var(--status-neutral-line);}
.atr-badge--positive{background:var(--status-positive-bg);color:var(--status-positive-ink);border-color:var(--status-positive-line);}
.atr-badge--caution{background:var(--status-caution-bg);color:var(--status-caution-ink);border-color:var(--status-caution-line);}
.atr-badge--critical{background:var(--status-critical-bg);color:var(--status-critical-ink);border-color:var(--status-critical-line);}
.atr-badge--info{background:var(--status-info-bg);color:var(--status-info-ink);border-color:var(--status-info-line);}
.atr-badge--accent{background:var(--interactive-selected);color:var(--ink-accent);border-color:transparent;}
`;
if (typeof document !== 'undefined' && !document.getElementById('atr-badge')) {
  const el = document.createElement('style');
  el.id = 'atr-badge';
  el.textContent = CSS;
  document.head.appendChild(el);
}

export function Badge({ tone = 'neutral', dot = false, children, className = '', ...props }) {
  const cls = ['atr-badge', `atr-badge--${tone}`, className].filter(Boolean).join(' ');
  return (
    <span className={cls} {...props}>
      {dot && <span className="atr-badge__dot" aria-hidden="true" />}
      {children}
    </span>
  );
}
