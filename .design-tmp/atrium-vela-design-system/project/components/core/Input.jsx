import React, { forwardRef } from 'react';

/**
 * Input — Atrium Tier-A text field (doc 17 §4). Height follows the density tokens; focus ring uses
 * the accent. `invalid` flips the border to critical for inline server-error mapping.
 */
const CSS = `
.atr-input{
  display:flex;width:100%;height:var(--control-h);border-radius:var(--radius-md);
  border:1px solid var(--line-strong);background:var(--bg-surface);
  padding:0 var(--cell-px);font-family:var(--font-ui);font-size:var(--font-size-ui);
  color:var(--ink-primary);transition:border-color var(--motion-fast),box-shadow var(--motion-fast);
}
.atr-input::placeholder{color:var(--ink-tertiary);}
.atr-input:focus-visible{outline:2px solid var(--line-focus);outline-offset:2px;border-color:var(--line-focus);}
.atr-input:disabled{cursor:not-allowed;opacity:.5;}
.atr-input[aria-invalid="true"]{border-color:var(--status-critical-line);}
.atr-input[aria-invalid="true"]:focus-visible{outline-color:var(--status-critical-ink);}
.atr-input--mono{font-family:var(--font-mono);font-variant-numeric:tabular-nums;}
`;
if (typeof document !== 'undefined' && !document.getElementById('atr-input')) {
  const el = document.createElement('style');
  el.id = 'atr-input';
  el.textContent = CSS;
  document.head.appendChild(el);
}

export const Input = forwardRef(function Input(
  { type = 'text', invalid = false, mono = false, className = '', ...props },
  ref,
) {
  const cls = ['atr-input', mono && 'atr-input--mono', className].filter(Boolean).join(' ');
  return <input ref={ref} type={type} className={cls} aria-invalid={invalid || undefined} {...props} />;
});
