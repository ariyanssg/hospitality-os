'use client';
import { useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { BedDouble, Plus } from 'lucide-react';
import type { PosCheck, PosOutlet, PosTable } from '@vela/contracts';
import { usePos } from '@/lib/pos-store';
import { useSdk } from '@/lib/sdk';
import { usePosOps, buildCheckView, useNow } from '@/lib/pos-api';
import { LAGOON_TAB_META, fm, hmm } from '@/lib/pos-data';

/** Lagoon Bar — quick-service open tabs. No table required; pre-auth or charge to room. */
export function TabsBoard({
  outlet,
  tables,
  checks,
}: {
  outlet: PosOutlet;
  tables: PosTable[];
  checks: PosCheck[];
}) {
  const sdk = useSdk();
  const now = useNow(30_000);
  const { invalidate } = usePosOps();
  const offline = usePos((s) => s.offline);
  const clientLines = usePos((s) => s.lines);
  const discounts = usePos((s) => s.discounts);
  const locallyClosed = usePos((s) => s.locallyClosed);
  const openCheckScreen = usePos((s) => s.openCheckScreen);
  const showToast = usePos((s) => s.showToast);

  const tableLabel = useMemo(() => new Map(tables.map((t) => [t.id, t.label])), [tables]);

  const newTab = useMutation({
    mutationFn: () =>
      sdk.openPosCheck(
        { outletId: outlet.id, covers: 1 },
        { idempotencyKey: `pos-tab-${Date.now()}` },
      ),
    onSuccess: (check) => {
      invalidate();
      openCheckScreen(check.id);
    },
    onError: () => showToast('Could not open the tab — check connectivity and try again.'),
  });

  const open = checks.filter((c) => !locallyClosed[c.id]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-4">
      <div className="flex flex-none items-baseline gap-3.5">
        <span className="whitespace-nowrap font-display text-[22px] font-semibold tracking-tight">Open tabs</span>
        <span className="text-[12.5px] text-[var(--ink-tertiary)]">
          Quick-service mode — no table required. Pre-auth or charge to room.
        </span>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] content-start gap-3.5">
        {open.map((c) => {
          const label = (c.tableId && tableLabel.get(c.tableId)) || `Tab #${c.checkNumber}`;
          const meta = LAGOON_TAB_META[label];
          const view = buildCheckView(c, clientLines[c.id] ?? [], discounts[c.id], true);
          const ageMin = Math.max(0, Math.round((now - Date.parse(c.openedAt)) / 60000));
          return (
            <button
              key={c.id}
              onClick={() => openCheckScreen(c.id)}
              className="flex min-h-32 cursor-pointer flex-col gap-2.5 rounded-[var(--radius-lg)] border border-[var(--line-hairline)] bg-[var(--bg-surface)] p-4 text-left hover:bg-[var(--bg-sunken)]"
            >
              <div className="flex items-center gap-2">
                <span className="flex-1 text-[16px] font-semibold">{label}</span>
                {meta?.guest && (
                  <span className="flex size-6 items-center justify-center rounded-full bg-[var(--interactive-default)] text-[var(--ink-inverse)]" title="In-house guest">
                    <BedDouble className="size-[13px]" />
                  </span>
                )}
              </div>
              <span className="text-xs text-[var(--ink-tertiary)]">{meta?.sub ?? 'Walk-up · card on file'}</span>
              <div className="flex-1" />
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-[var(--ink-secondary)]">
                  {view.lines.length} item{view.lines.length === 1 ? '' : 's'} · {hmm(ageMin)}
                </span>
                <span className="flex-1" />
                <span data-numeric className="font-mono text-[16px] font-semibold">
                  {fm(view.total)}
                </span>
              </div>
            </button>
          );
        })}
        <button
          onClick={() => (offline ? showToast('Opening a tab needs connectivity.') : newTab.mutate())}
          className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] border-[1.5px] border-dashed border-[var(--line-strong)] bg-transparent text-[14px] font-semibold text-[var(--ink-secondary)] hover:bg-[var(--bg-sunken)]"
        >
          <Plus className="size-[22px]" />
          New tab
        </button>
      </div>
    </div>
  );
}
