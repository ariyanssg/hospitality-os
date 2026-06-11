'use client';
import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, type = 'text', ...props }, ref) {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          'flex h-[var(--control-h)] w-full rounded-[var(--radius-md)] border border-[var(--line-strong)] bg-[var(--bg-surface)]',
          'px-[var(--cell-px)] text-[var(--font-size-ui)] text-[var(--ink-primary)]',
          'placeholder:text-[var(--ink-tertiary)] transition-colors duration-[var(--motion-fast)]',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--line-focus)] focus-visible:border-[var(--line-focus)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
    );
  },
);
