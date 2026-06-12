'use client';
import { X } from 'lucide-react';
import { usePos } from '@/lib/pos-store';

/** Terminal toast — bottom-center, action-capable ("Fired to grill — View KDS"). */
export function PosToast() {
  const toast = usePos((s) => s.toast);
  const dismiss = usePos((s) => s.dismissToast);
  if (!toast) return null;
  return (
    <div
      key={toast.id}
      role="status"
      className="fixed bottom-[26px] left-1/2 z-[var(--z-toast)] flex max-w-[680px] -translate-x-1/2 items-center gap-3.5 rounded-[var(--radius-lg)] border border-[var(--line-hairline)] bg-[var(--bg-raised)] py-[13px] pl-[18px] pr-2 shadow-[var(--shadow-e4)] animate-[pos-toast_var(--motion-base)_var(--ease-standard)]"
    >
      <span className="text-[13.5px] leading-[1.45]">{toast.text}</span>
      {toast.action && (
        <button
          className="flex h-9 flex-none items-center whitespace-nowrap rounded-[var(--radius-md)] bg-[var(--interactive-selected)] px-3 text-[13px] font-semibold text-[var(--ink-accent)]"
          onClick={() => {
            toast.onAction?.();
            dismiss();
          }}
        >
          {toast.action}
        </button>
      )}
      <button
        aria-label="Dismiss"
        className="flex size-[30px] flex-none items-center justify-center text-[var(--ink-tertiary)]"
        onClick={dismiss}
      >
        <X className="size-[15px]" />
      </button>
      <style>{`@keyframes pos-toast { from { transform: translate(-50%, 16px); opacity: 0 } to { transform: translate(-50%, 0); opacity: 1 } }`}</style>
    </div>
  );
}
