import { type HTMLAttributes } from 'react';
import { cn } from '../lib/cn';

/** Keyboard hint chip — the Desk is keyboard-first, so shortcuts are surfaced everywhere. */
export function Kbd({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-[var(--radius-xs)] border border-[var(--line-strong)]',
        'bg-[var(--bg-sunken)] px-1 font-mono text-[var(--text-micro)] text-[var(--ink-secondary)]',
        className,
      )}
      {...props}
    />
  );
}
