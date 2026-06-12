'use client';
import { CircleCheck, Info, ShieldAlert } from 'lucide-react';
import { useToast } from '@/lib/store';

const ICONS = {
  positive: { Icon: CircleCheck, color: 'var(--status-positive-ink)' },
  info: { Icon: Info, color: 'var(--status-info-ink)' },
  critical: { Icon: ShieldAlert, color: 'var(--status-critical-ink)' },
} as const;

/** Action-capable toast (doc 17 §motion: the receipt, not the gate) — bottom-right, auto-dismiss, Undo. */
export function ToastViewport() {
  const toast = useToast((s) => s.toast);
  const dismiss = useToast((s) => s.dismiss);
  if (!toast) return null;
  const { Icon, color } = ICONS[toast.tone ?? 'positive'];
  return (
    <div
      key={toast.id}
      role="status"
      className="fixed bottom-[22px] right-[22px] z-[var(--z-toast)] flex max-w-[380px] items-center gap-2.5 rounded-[var(--radius-lg)] border border-[var(--line-hairline)] bg-[var(--bg-raised)] px-4 py-3 text-[var(--font-size-ui)] shadow-[var(--shadow-e4)] animate-[toast-in_var(--motion-base)_var(--ease-standard)]"
    >
      <Icon className="size-[17px] flex-none" style={{ color }} />
      <span>{toast.text}</span>
      {toast.onUndo && (
        <button
          className="ml-1 font-semibold text-[var(--ink-accent)]"
          onClick={() => {
            toast.onUndo?.();
            dismiss();
          }}
        >
          Undo
        </button>
      )}
      <style>{`@keyframes toast-in { from { transform: translateY(10px); opacity: .5 } to { transform: none; opacity: 1 } }`}</style>
    </div>
  );
}
