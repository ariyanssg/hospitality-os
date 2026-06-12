'use client';
import { useMemo, useState } from 'react';
import { Minus, Plus, TriangleAlert, X } from 'lucide-react';
import { MODS, fm, type ModGroup, type PosMenuItem } from '@/lib/pos-data';

/** Forced-choice modifier sheet — required groups gate the confirm button; allergens surface inline. */
export function ModifierSheet({
  item,
  onClose,
  onConfirm,
}: {
  item: PosMenuItem;
  onClose: () => void;
  onConfirm: (mods: string[], delta: number, qty: number) => void;
}) {
  const groups: ModGroup[] = item.mods ? MODS[item.mods] : [];
  const [sel, setSel] = useState<Record<string, Record<string, boolean>>>({});
  const [qty, setQty] = useState(1);

  const { delta, labels, reqOk } = useMemo(() => {
    let d = 0;
    const out: string[] = [];
    let ok = true;
    for (const g of groups) {
      const gs = sel[g.id] ?? {};
      const any = Object.values(gs).some(Boolean);
      if (g.req && !any) ok = false;
      for (const o of g.opts) {
        if (gs[o.id]) {
          d += o.delta;
          out.push(o.label);
        }
      }
    }
    return { delta: d, labels: out, reqOk: ok };
  }, [groups, sel]);

  const choose = (gid: string, oid: string, multi: boolean) => {
    setSel((prev) => {
      const g = { ...(prev[gid] ?? {}) };
      if (multi) g[oid] = !g[oid];
      else return { ...prev, [gid]: { [oid]: true } };
      return { ...prev, [gid]: g };
    });
  };

  const total = (item.price + delta) * qty;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--bg-overlay)]" onClick={onClose}>
      <div
        className="flex max-h-[82vh] w-[600px] flex-col rounded-[var(--radius-xl)] border border-[var(--line-hairline)] bg-[var(--bg-surface)] shadow-[var(--shadow-e4)] animate-[pos-sheet_var(--motion-slow)_var(--ease-standard)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-none items-center gap-3 border-b border-[var(--line-hairline)] px-5 py-[18px]">
          <div className="flex flex-1 flex-col gap-0.5">
            <span className="font-display text-[20px] font-semibold tracking-tight">{item.name}</span>
            {item.allergen && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--status-caution-ink)]">
                <TriangleAlert className="size-[13px]" />
                {item.allergen} allergen — surfaced from the recipe
              </span>
            )}
          </div>
          <span data-numeric className="font-mono text-[16px] text-[var(--ink-secondary)]">
            {fm(item.price)}
          </span>
          <button onClick={onClose} className="flex size-11 items-center justify-center rounded-[10px] text-[var(--ink-tertiary)] hover:bg-[var(--bg-sunken)]">
            <X className="size-[18px]" />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-[18px] overflow-auto px-5 py-3.5">
          {groups.map((g) => (
            <div key={g.id} className="flex flex-col gap-[9px]">
              <div className="flex items-center gap-[9px]">
                <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--ink-tertiary)]">{g.label}</span>
                <span
                  className="rounded-[var(--radius-full)] px-2 py-0.5 text-[10.5px] font-semibold"
                  style={
                    g.req
                      ? { background: 'var(--status-caution-bg)', color: 'var(--status-caution-ink)' }
                      : { background: 'var(--bg-sunken)', color: 'var(--ink-tertiary)' }
                  }
                >
                  {g.req ? 'Required' : 'Optional'}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {g.opts.map((o) => {
                  const on = !!sel[g.id]?.[o.id];
                  return (
                    <button
                      key={o.id}
                      onClick={() => choose(g.id, o.id, g.multi)}
                      className="flex h-12 items-center gap-2 rounded-[var(--radius-md)] border-[1.5px] px-4 text-[13.5px] font-semibold"
                      style={
                        on
                          ? { background: 'var(--interactive-selected)', color: 'var(--ink-accent)', borderColor: 'var(--interactive-default)' }
                          : { background: 'var(--bg-surface)', color: 'var(--ink-primary)', borderColor: 'var(--line-strong)' }
                      }
                    >
                      {o.label}
                      {o.delta > 0 && (
                        <span data-numeric className="font-mono text-xs text-[var(--ink-tertiary)]">
                          +${(o.delta / 100).toFixed(0)}
                        </span>
                      )}
                      {o.allergen && <TriangleAlert className="size-3 text-[var(--status-caution-ink)]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-none items-center gap-3 border-t border-[var(--line-hairline)] px-5 py-4">
          <div className="flex items-center overflow-hidden rounded-[var(--radius-md)] border border-[var(--line-strong)]">
            <button onClick={() => setQty((n) => Math.max(1, n - 1))} className="flex size-12 items-center justify-center hover:bg-[var(--bg-sunken)]">
              <Minus className="size-4" />
            </button>
            <span data-numeric className="w-11 text-center font-mono text-[16px] font-semibold">
              {qty}
            </span>
            <button onClick={() => setQty((n) => n + 1)} className="flex size-12 items-center justify-center hover:bg-[var(--bg-sunken)]">
              <Plus className="size-4" />
            </button>
          </div>
          <div className="flex-1" />
          <button onClick={onClose} className="h-12 rounded-[var(--radius-md)] px-[18px] text-[14px] font-semibold text-[var(--ink-secondary)] hover:bg-[var(--bg-sunken)]">
            Cancel
          </button>
          <button
            onClick={() => reqOk && onConfirm(labels, delta, qty)}
            className="h-12 rounded-[var(--radius-md)] px-[22px] text-[14.5px] font-semibold"
            style={
              reqOk
                ? { background: 'var(--interactive-default)', color: 'var(--ink-inverse)' }
                : { background: 'var(--interactive-disabled)', color: 'var(--ink-disabled)' }
            }
          >
            {reqOk ? `Add to check · ${fm(total)}` : 'Choose required options'}
          </button>
        </div>
        <style>{`@keyframes pos-sheet { from { transform: translateY(24px); opacity: 0 } to { transform: none; opacity: 1 } }`}</style>
      </div>
    </div>
  );
}
