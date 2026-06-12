import { type HTMLAttributes } from 'react';
import { cn } from '../lib/cn';

/**
 * StatTile (KPI tile) — display-numeral metric with optional delta + subline (doc 17 §4).
 * The signature data tile: big tabular display numeral, quiet caps label.
 */
export interface StatTileProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  delta?: { dir: 'up' | 'down'; value: string };
  sub?: string;
}

export function StatTile({ label, value, delta, sub, className, ...props }: StatTileProps) {
  return (
    <div
      className={cn(
        'flex min-w-36 flex-col gap-[var(--gap-xs)] rounded-[var(--radius-lg)] border border-[var(--line-hairline)] bg-[var(--bg-surface)] p-[var(--space-4)]',
        className,
      )}
      {...props}
    >
      <span className="text-[var(--text-micro)] font-semibold uppercase tracking-wide text-[var(--ink-tertiary)]">
        {label}
      </span>
      <span className="flex items-baseline gap-[var(--gap-sm)]">
        <span className="font-display text-[28px] font-semibold leading-none tracking-tight tabular-nums">
          {value}
        </span>
        {delta && (
          <span
            className={cn(
              'text-[var(--text-caption)] font-medium tabular-nums',
              delta.dir === 'up' ? 'text-[var(--status-positive-ink)]' : 'text-[var(--status-critical-ink)]',
            )}
          >
            {delta.dir === 'up' ? '▲' : '▼'}
            {delta.value}
          </span>
        )}
      </span>
      {sub && <span className="text-[var(--text-caption)] text-[var(--ink-tertiary)]">{sub}</span>}
    </div>
  );
}
