'use client';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/cn';

/**
 * Button — Tier-A primitive on semantic tokens (doc 17 §4). 5 variants × 3 sizes × loading.
 * One primary action per view region (color usage law, doc 17 §3): only `primary` uses the accent.
 */
const button = cva(
  'inline-flex items-center justify-center gap-[var(--gap-sm)] whitespace-nowrap rounded-[var(--radius-md)] font-medium ' +
    'transition-colors duration-[var(--motion-fast)] focus-visible:outline-2 focus-visible:outline-offset-2 ' +
    'focus-visible:outline-[var(--line-focus)] disabled:pointer-events-none disabled:opacity-50 select-none',
  {
    variants: {
      variant: {
        primary:
          'bg-[var(--interactive-default)] text-[var(--ink-inverse)] hover:bg-[var(--interactive-hover)] active:bg-[var(--interactive-active)]',
        secondary:
          'bg-[var(--bg-surface)] text-[var(--ink-primary)] border border-[var(--line-strong)] hover:bg-[var(--bg-sunken)]',
        ghost: 'bg-transparent text-[var(--ink-secondary)] hover:bg-[var(--bg-sunken)] hover:text-[var(--ink-primary)]',
        danger:
          'bg-[var(--status-critical-ink)] text-[var(--ink-inverse)] hover:opacity-90 active:opacity-80',
        link: 'bg-transparent text-[var(--ink-accent)] underline-offset-4 hover:underline px-0 h-auto',
      },
      size: {
        sm: 'h-8 px-[var(--space-3)] text-[var(--text-caption)]',
        md: 'h-[var(--control-h)] px-[var(--space-4)] text-[var(--font-size-ui)]',
        lg: 'h-11 px-[var(--space-6)] text-[var(--text-body-lg)]',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, loading, disabled, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(button({ variant, size }), className)}
      disabled={disabled ?? loading}
      aria-busy={loading}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});
