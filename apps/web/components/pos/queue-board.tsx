'use client';
import { Check, ChevronRight } from 'lucide-react';
import { usePos } from '@/lib/pos-store';
import { RS_SEED, fm } from '@/lib/pos-data';

const STEPS = ['Received', 'Kitchen', 'On the way', 'Delivered'];

/** Room Service — the delivery queue. Orders tie to rooms; settlement is a folio room charge. */
export function QueueBoard() {
  const rsAdv = usePos((s) => s.rsAdv);
  const set = usePos((s) => s.set);
  const showToast = usePos((s) => s.showToast);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-4">
      <div className="flex flex-none items-baseline gap-3.5">
        <span className="whitespace-nowrap font-display text-[22px] font-semibold tracking-tight">In-room dining</span>
        <span className="text-[12.5px] text-[var(--ink-tertiary)]">
          Orders tied to rooms — 3 of 5 arrived via QR order &amp; pay. 28-minute promise.
        </span>
      </div>
      <div className="flex max-w-[1100px] flex-col gap-3">
        {RS_SEED.map((ro) => {
          const step = Math.min(4, rsAdv[ro.id] ?? ro.step);
          const done = step >= 4;
          return (
            <div key={ro.id} className="flex items-center gap-5 rounded-[var(--radius-lg)] border border-[var(--line-hairline)] bg-[var(--bg-surface)] px-5 py-4">
              <div className="flex w-[120px] flex-none flex-col gap-0.5">
                <span className="font-display text-[24px] font-semibold leading-none tracking-tight">{ro.room}</span>
                <span className="text-[12.5px] text-[var(--ink-secondary)]">{ro.guest}</span>
                <span className="font-mono text-[11px] text-[var(--ink-tertiary)]">
                  {ro.id} · {ro.src}
                </span>
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <span className="text-[13.5px]">{ro.items}</span>
                <div className="flex items-center gap-1.5">
                  {STEPS.map((label, i) => (
                    <span key={label} className="flex items-center gap-1.5">
                      <span
                        className="size-[9px] rounded-full"
                        style={{
                          background: i < step ? 'var(--interactive-default)' : 'var(--line-strong)',
                          animation: i === step - 1 && !done ? 'pos-blink 1.6s var(--ease-standard) infinite' : 'none',
                        }}
                      />
                      <span className="text-[11px] font-semibold" style={{ color: i < step ? 'var(--ink-primary)' : 'var(--ink-tertiary)' }}>
                        {label}
                      </span>
                      {i < 3 && <span className="h-px w-[26px] bg-[var(--line-strong)]" />}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex w-[110px] flex-none flex-col items-end gap-0.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: done ? 'var(--ink-tertiary)' : 'var(--status-caution-ink)' }}>
                  {done ? `Done ${ro.due}` : `Due ${ro.due}`}
                </span>
                <span data-numeric className="font-mono text-[15px] font-semibold">
                  {fm(ro.total)}
                </span>
                <span className="text-[11px] text-[var(--ink-tertiary)]">charge to room</span>
              </div>
              {done ? (
                <span className="flex h-8 flex-none items-center gap-1.5 rounded-[var(--radius-full)] border border-[var(--status-positive-line)] bg-[var(--status-positive-bg)] px-3 text-xs font-semibold text-[var(--status-positive-ink)]">
                  <Check className="size-[13px]" />
                  Delivered
                </span>
              ) : (
                <button
                  onClick={() => {
                    set({ rsAdv: { ...rsAdv, [ro.id]: step + 1 } });
                    if (step === 3) {
                      showToast(`${ro.id} delivered — ${fm(ro.total)} posted to Room ${ro.room} folio with line detail.`);
                    }
                  }}
                  className="flex h-11 flex-none items-center gap-2 rounded-[var(--radius-md)] border border-[var(--line-strong)] bg-[var(--bg-surface)] px-4 text-[13px] font-semibold hover:bg-[var(--bg-sunken)]"
                >
                  {step === 1 ? 'Send to kitchen' : step === 2 ? 'Out for delivery' : 'Mark delivered'}
                  <ChevronRight className="size-[15px]" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
