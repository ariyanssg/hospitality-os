import React from 'react';

/**
 * MoneyText — locale formatting over string-safe money (doc 17 §4). Money is never a float: amounts
 * arrive as decimal strings. Negative (refunds/credits) render in the refund hue. Mono + tabular so
 * columns align to the decimal.
 */
const CSS = `
.atr-money{font-family:var(--font-mono);font-variant-numeric:tabular-nums;white-space:nowrap;}
.atr-money--neg{color:var(--fin-refund);}
.atr-money--pos{color:var(--ink-primary);}
`;
if (typeof document !== 'undefined' && !document.getElementById('atr-money')) {
  const el = document.createElement('style');
  el.id = 'atr-money';
  el.textContent = CSS;
  document.head.appendChild(el);
}

export function MoneyText({ amount, currency = 'USD', signed = false, className = '', style, ...props }) {
  const n = Number(amount);
  const negative = n < 0;
  const formatted = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(Math.abs(n));
  const sign = negative ? '\u2212' : signed ? '+' : '';
  const cls = ['atr-money', negative ? 'atr-money--neg' : 'atr-money--pos', className].filter(Boolean).join(' ');
  return (
    <span data-numeric className={cls} style={style} {...props}>
      {sign}
      {formatted}
    </span>
  );
}
