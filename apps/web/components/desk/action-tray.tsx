'use client';
import { type ReactNode } from 'react';
import { X } from 'lucide-react';

/**
 * Selection-aware action tray (doc 18 §3.2) — floats up from the bottom when rows are checked.
 * Inverted surface so it reads as a transient tool, not page content.
 */
export function ActionTray({
  count,
  onClear,
  children,
}: {
  count: number;
  onClear: () => void;
  children: ReactNode;
}) {
  if (!count) return null;
  return (
    <div
      role="toolbar"
      aria-label="Bulk actions"
      className="fixed bottom-[22px] left-1/2 z-[var(--z-overlay)] flex -translate-x-1/2 items-center gap-1 rounded-[var(--radius-lg)] bg-[var(--ink-primary)] p-2 pl-1 text-[var(--bg-canvas)] shadow-[var(--shadow-e4)] animate-[tray-in_var(--motion-base)_var(--ease-standard)]"
    >
      <span className="border-r border-[var(--line-strong)] px-2.5 text-[var(--font-size-ui)] font-semibold tabular-nums">
        {count} selected
      </span>
      {children}
      <button
        onClick={onClear}
        aria-label="Clear selection"
        className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] px-2.5 py-1.5 text-[var(--font-size-ui)] hover:bg-[var(--bg-overlay)]"
      >
        <X className="size-[15px]" />
      </button>
      <style>{`@keyframes tray-in { from { transform: translate(-50%, 12px) } to { transform: translate(-50%, 0) } }`}</style>
    </div>
  );
}

/** A button inside the tray. */
export function TrayButton({ onClick, children }: { onClick?: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] px-2.5 py-1.5 text-[var(--font-size-ui)] hover:bg-[var(--bg-overlay)]"
    >
      {children}
    </button>
  );
}
