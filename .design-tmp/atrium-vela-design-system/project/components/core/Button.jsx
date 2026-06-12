import React, { forwardRef } from 'react';

/**
 * Button — Atrium Tier-A primitive (doc 17 §4). 5 variants × 3 sizes × loading/disabled.
 * Color usage law: only `primary` uses the accent — one primary action per view region.
 * Styling is pure CSS custom properties so the button re-themes (light/dark) and re-densifies
 * (comfortable/compact/touch) with zero JS.
 */
const CSS = `
.atr-btn{
  --_h: var(--control-h);
  display:inline-flex;align-items:center;justify-content:center;gap:var(--gap-sm);
  white-space:nowrap;border-radius:var(--radius-md);font-family:var(--font-ui);font-weight:500;
  height:var(--_h);padding:0 var(--space-4);font-size:var(--font-size-ui);line-height:1;
  border:1px solid transparent;cursor:pointer;user-select:none;
  transition:background var(--motion-fast) var(--ease-standard),
             color var(--motion-fast) var(--ease-standard),
             border-color var(--motion-fast) var(--ease-standard), opacity var(--motion-fast);
}
.atr-btn:focus-visible{outline:2px solid var(--line-focus);outline-offset:2px;}
.atr-btn:disabled{pointer-events:none;opacity:.5;}
.atr-btn--sm{height:2rem;padding:0 var(--space-3);font-size:var(--text-caption);}
.atr-btn--lg{height:2.75rem;padding:0 var(--space-6);font-size:var(--text-body-lg);}
.atr-btn--primary{background:var(--interactive-default);color:var(--ink-inverse);}
.atr-btn--primary:hover{background:var(--interactive-hover);}
.atr-btn--primary:active{background:var(--interactive-active);}
.atr-btn--secondary{background:var(--bg-surface);color:var(--ink-primary);border-color:var(--line-strong);}
.atr-btn--secondary:hover{background:var(--bg-sunken);}
.atr-btn--ghost{background:transparent;color:var(--ink-secondary);}
.atr-btn--ghost:hover{background:var(--bg-sunken);color:var(--ink-primary);}
.atr-btn--danger{background:var(--status-critical-ink);color:var(--ink-inverse);}
.atr-btn--danger:hover{opacity:.9;}
.atr-btn--danger:active{opacity:.8;}
.atr-btn--link{background:transparent;color:var(--ink-accent);height:auto;padding:0;border:0;text-underline-offset:4px;}
.atr-btn--link:hover{text-decoration:underline;}
.atr-btn__spin{width:1em;height:1em;animation:atr-spin .7s linear infinite;}
@keyframes atr-spin{to{transform:rotate(360deg);}}
`;
if (typeof document !== 'undefined' && !document.getElementById('atr-button')) {
  const el = document.createElement('style');
  el.id = 'atr-button';
  el.textContent = CSS;
  document.head.appendChild(el);
}

const Spinner = () => (
  <svg className="atr-btn__spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, disabled, children, className = '', style, ...props },
  ref,
) {
  const cls = ['atr-btn', `atr-btn--${variant}`, size !== 'md' && `atr-btn--${size}`, className]
    .filter(Boolean)
    .join(' ');
  return (
    <button
      ref={ref}
      className={cls}
      style={style}
      disabled={disabled ?? loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
});
