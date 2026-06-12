'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../lib/cn';

/**
 * Drawer — right-side, the workhorse for quick views (doc 17 §4: reservation peek, folio peek,
 * check-in). Preserves the board behind it (no page jump). Escape parks the draft; focus moves in
 * and restores on close. Lightweight (no external dep) — a full stackable version lands later.
 */
export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 'md',
  testId,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: 'sm' | 'md' | 'lg';
  testId?: string;
}): ReactNode {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      restoreRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  const widthClass = width === 'sm' ? 'w-[380px]' : width === 'lg' ? 'w-[680px]' : 'w-[520px]';

  return (
    <div
      className="fixed inset-0 z-[var(--z-drawer)] flex justify-end"
      role="dialog"
      aria-modal="true"
      data-testid={testId}
    >
      <button
        aria-label="Close"
        className="absolute inset-0 bg-[var(--bg-overlay)] animate-[fade_var(--motion-base)]"
        onClick={onClose}
        tabIndex={-1}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          'relative flex h-full max-w-[92vw] flex-col bg-[var(--bg-surface)] shadow-[var(--shadow-e4)] outline-none',
          'animate-[drawer-in_var(--motion-slow)_var(--ease-standard)]',
          widthClass,
        )}
      >
        <header className="flex items-start justify-between gap-[var(--gap-md)] border-b border-[var(--line-hairline)] px-[var(--space-6)] py-[var(--space-4)]">
          <div>
            <h2 className="font-display text-[var(--text-heading)] font-semibold text-[var(--ink-primary)]">
              {title}
            </h2>
            {description && (
              <p className="mt-0.5 text-[var(--text-caption)] text-[var(--ink-tertiary)]">
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close drawer"
            className="rounded-[var(--radius-sm)] p-1 text-[var(--ink-tertiary)] hover:bg-[var(--bg-sunken)] hover:text-[var(--ink-primary)]"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-[var(--space-6)] py-[var(--space-4)]">
          {children}
        </div>
        {footer && (
          <footer className="border-t border-[var(--line-hairline)] bg-[var(--bg-raised)] px-[var(--space-6)] py-[var(--space-4)]">
            {footer}
          </footer>
        )}
      </div>
      <style>{`
        @keyframes drawer-in { from { transform: translateX(16px); opacity: .6 } to { transform: none; opacity: 1 } }
        @keyframes fade { from { opacity: 0 } to { opacity: 1 } }
      `}</style>
    </div>
  );
}
