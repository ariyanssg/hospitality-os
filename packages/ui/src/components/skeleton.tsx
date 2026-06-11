import { type HTMLAttributes } from 'react';
import { cn } from '../lib/cn';

/** Loading skeleton — should match the final layout so there is no reflow on data arrival. */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-[var(--radius-sm)] bg-[var(--bg-sunken)]', className)}
      {...props}
    />
  );
}
