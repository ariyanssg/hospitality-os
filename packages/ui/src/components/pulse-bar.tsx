'use client';
import { type ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface PulseChip {
  id: string;
  label: string;
  value: ReactNode;
  /** Optional segmented meter 0..1 that fills through the day (arrivals/departures progress). */
  progress?: number;
  delta?: { dir: 'up' | 'down'; value: string };
  tone?: 'default' | 'positive' | 'caution' | 'critical' | 'info';
  onClick?: () => void;
}

const toneInk: Record<NonNullable<PulseChip['tone']>, string> = {
  default: 'var(--ink-primary)',
  positive: 'var(--status-positive-ink)',
  caution: 'var(--status-caution-ink)',
  critical: 'var(--status-critical-ink)',
  info: 'var(--status-info-ink)',
};

/**
 * PulseBar — the signature Desk element (doc 18 §2): a persistent strip of live property vitals.
 * Numbers tween on change; each chip clicks through to its board. The "operating system heartbeat".
 */
export function PulseBar({ chips, className }: { chips: PulseChip[]; className?: string }) {
  return (
    <div
      className={cn(
        'flex items-stretch gap-[var(--gap-lg)] overflow-x-auto border-b border-[var(--line-hairline)] bg-[var(--bg-raised)]',
        'px-[var(--space-6)] py-[var(--space-3)]',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      {chips.map((chip) => {
        const Tag = chip.onClick ? 'button' : 'div';
        return (
          <Tag
            key={chip.id}
            onClick={chip.onClick}
            className={cn(
              'group flex min-w-fit flex-col gap-[2px] rounded-[var(--radius-md)] px-[var(--space-2)] py-[var(--space-1)] text-left',
              chip.onClick && 'hover:bg-[var(--bg-sunken)] transition-colors duration-[var(--motion-fast)]',
            )}
          >
            <span className="text-[var(--text-micro)] font-medium uppercase tracking-wide text-[var(--ink-tertiary)]">
              {chip.label}
            </span>
            <span className="flex items-baseline gap-[var(--gap-xs)]">
              <span
                data-numeric
                className="font-display text-[var(--text-heading)] font-semibold tabular-nums"
                style={{ color: toneInk[chip.tone ?? 'default'] }}
              >
                {chip.value}
              </span>
              {chip.delta && (
                <span
                  className="text-[var(--text-caption)] tabular-nums"
                  style={{
                    color:
                      chip.delta.dir === 'up' ? 'var(--status-positive-ink)' : 'var(--status-critical-ink)',
                  }}
                >
                  {chip.delta.dir === 'up' ? '▲' : '▼'}
                  {chip.delta.value}
                </span>
              )}
            </span>
            {chip.progress !== undefined && (
              <span className="mt-1 block h-1 w-full overflow-hidden rounded-full bg-[var(--bg-sunken)]">
                <span
                  className="block h-full rounded-full bg-[var(--interactive-default)] transition-[width] duration-[var(--motion-slow)]"
                  style={{ width: `${Math.round(Math.min(1, Math.max(0, chip.progress)) * 100)}%` }}
                />
              </span>
            )}
          </Tag>
        );
      })}
    </div>
  );
}
