import { type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

/** Badge/Tag — status tone uses the semantic status triplets; color always carries meaning. */
const badge = cva(
  'inline-flex items-center gap-[var(--gap-xs)] rounded-[var(--radius-full)] border px-[var(--space-2)] py-[1px] ' +
    'text-[var(--text-micro)] font-medium uppercase tracking-wide whitespace-nowrap',
  {
    variants: {
      tone: {
        neutral: 'bg-[var(--status-neutral-bg)] text-[var(--status-neutral-ink)] border-[var(--status-neutral-line)]',
        positive: 'bg-[var(--status-positive-bg)] text-[var(--status-positive-ink)] border-[var(--status-positive-line)]',
        caution: 'bg-[var(--status-caution-bg)] text-[var(--status-caution-ink)] border-[var(--status-caution-line)]',
        critical: 'bg-[var(--status-critical-bg)] text-[var(--status-critical-ink)] border-[var(--status-critical-line)]',
        info: 'bg-[var(--status-info-bg)] text-[var(--status-info-ink)] border-[var(--status-info-line)]',
        accent: 'bg-[var(--interactive-selected)] text-[var(--ink-accent)] border-transparent',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badge> {
  /** Leading status dot in the tone's ink color — a live/state signal, not decoration. */
  dot?: boolean;
}

export function Badge({ className, tone, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badge({ tone }), className)} {...props}>
      {dot && <span aria-hidden className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
