import { type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

/** Avatar — identity chip with initials fallback + optional presence dot (doc 17 §4). */
const avatar = cva(
  'relative inline-flex flex-none items-center justify-center rounded-full ' +
    'bg-[var(--interactive-selected)] font-semibold text-[var(--ink-accent)]',
  {
    variants: {
      size: {
        sm: 'size-6 text-[var(--text-micro)]',
        md: 'size-8 text-[var(--text-caption)]',
        lg: 'size-10 text-[var(--font-size-ui)]',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

const PRESENCE: Record<string, string> = {
  online: 'bg-[var(--status-positive-ink)]',
  away: 'bg-[var(--status-caution-ink)]',
  busy: 'bg-[var(--status-critical-ink)]',
};

export interface AvatarProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof avatar> {
  name: string;
  src?: string;
  presence?: 'online' | 'away' | 'busy';
}

function initialsOf(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function Avatar({ name, src, presence, size, className, ...props }: AvatarProps) {
  return (
    <span className={cn(avatar({ size }), className)} title={name} {...props}>
      {src ? (
        <img src={src} alt={name} className="size-full rounded-full object-cover" />
      ) : (
        initialsOf(name)
      )}
      {presence && (
        <span
          aria-hidden
          className={cn(
            'absolute -bottom-px -right-px size-2 rounded-full shadow-[0_0_0_2px_var(--bg-surface)]',
            PRESENCE[presence],
          )}
        />
      )}
    </span>
  );
}
