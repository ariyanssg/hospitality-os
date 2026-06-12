import React from 'react';

/** Kbd — keyboard hint chip. The Desk is keyboard-first, so shortcuts surface everywhere. */
const CSS = `
.atr-kbd{
  display:inline-flex;align-items:center;justify-content:center;height:1.25rem;min-width:1.25rem;
  padding:0 .25rem;border-radius:var(--radius-xs);border:1px solid var(--line-strong);
  background:var(--bg-sunken);font-family:var(--font-mono);font-size:var(--text-micro);
  color:var(--ink-secondary);line-height:1;
}
`;
if (typeof document !== 'undefined' && !document.getElementById('atr-kbd')) {
  const el = document.createElement('style');
  el.id = 'atr-kbd';
  el.textContent = CSS;
  document.head.appendChild(el);
}

export function Kbd({ children, className = '', ...props }) {
  return (
    <kbd className={['atr-kbd', className].filter(Boolean).join(' ')} {...props}>
      {children}
    </kbd>
  );
}
