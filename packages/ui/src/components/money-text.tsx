import { cn } from '../lib/cn';

export interface MoneyJSON {
  amount: string;
  currency: string;
}

/**
 * MoneyText — locale formatting over string-safe money (doc 17 §4 Tier-B). Money is never a float:
 * amounts arrive as decimal strings. Sign conventions: negative (refunds/credits) render rose.
 * Right-aligned tabular mono so columns of money align to the decimal.
 */
export function MoneyText({
  value,
  className,
  signed = false,
}: {
  value: MoneyJSON;
  className?: string;
  /** Show an explicit + for positive amounts (deltas). */
  signed?: boolean;
}) {
  const n = Number(value.amount);
  const negative = n < 0;
  const formatted = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: value.currency,
    minimumFractionDigits: 2,
  }).format(Math.abs(n));

  const sign = negative ? '−' : signed ? '+' : '';
  return (
    <span
      data-numeric
      className={cn(
        'font-mono tabular-nums',
        negative ? 'text-[var(--fin-refund)]' : 'text-[var(--ink-primary)]',
        className,
      )}
    >
      {sign}
      {formatted}
    </span>
  );
}
