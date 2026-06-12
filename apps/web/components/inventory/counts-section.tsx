'use client';
import { useState } from 'react';
import { EyeOff, ShieldCheck } from 'lucide-react';
import { Badge, Button } from '@vela/ui';
import {
  countVarianceMinor,
  fmtDate,
  fmtMoney,
  fmtQty,
  STORE_NAME,
  type CountSheet,
  type StockItem,
} from '@/lib/inventory-demo';
import { Card, CardHeader, TD, TD_NUM, TH, TH_NUM } from './shared';

const COUNT_TONE = {
  scheduled: 'neutral',
  in_progress: 'info',
  review: 'caution',
  posted: 'positive',
} as const;

const COUNT_LABEL = {
  scheduled: 'Scheduled',
  in_progress: 'In progress',
  review: 'Variance review',
  posted: 'Posted',
} as const;

/**
 * Counts — blind count sheets and the variance gate (doc 04): theoretical vs counted, shrinkage
 * value per line, and an explicit approval before the adjustment posts to stock + GL.
 */
export function CountsSection({
  items,
  counts,
  onPost,
}: {
  items: StockItem[];
  counts: CountSheet[];
  onPost: (id: string) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    counts.find((c) => c.status === 'review')?.id ?? counts[0]?.id ?? null,
  );
  const selected = counts.find((c) => c.id === selectedId) ?? null;
  const selectedVariance = selected ? countVarianceMinor(selected, items) : 0;

  return (
    <div className="grid items-start gap-[var(--space-4)] lg:grid-cols-[300px_1fr]">
      {/* Count sheets list */}
      <Card>
        <CardHeader title="Count sheets" sub="Full and cycle counts per store" />
        <div>
          {counts.map((count, i) => {
            const active = count.id === selectedId;
            const variance = countVarianceMinor(count, items);
            return (
              <button
                key={count.id}
                onClick={() => setSelectedId(count.id)}
                className={
                  'block w-full px-[var(--space-4)] py-[var(--space-3)] text-left transition-colors ' +
                  (i > 0 ? 'border-t border-[var(--line-hairline)] ' : '') +
                  (active ? 'bg-[var(--interactive-selected)]' : 'hover:bg-[var(--bg-sunken)]')
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[12.5px] font-semibold">{count.id.toUpperCase()}</span>
                  <Badge tone={COUNT_TONE[count.status]} dot={count.status === 'review'}>
                    {COUNT_LABEL[count.status]}
                  </Badge>
                </div>
                <div className="mt-0.5 text-[12.5px] text-[var(--ink-secondary)]">
                  {STORE_NAME[count.storeId]} · {count.type === 'full' ? 'Full count' : 'Cycle count'} ·{' '}
                  {fmtDate(count.scheduled)}
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[11.5px] text-[var(--ink-tertiary)]">
                  {count.blind && (
                    <span className="inline-flex items-center gap-1">
                      <EyeOff className="size-[11px]" /> Blind
                    </span>
                  )}
                  {count.lines.length > 0 && (
                    <span className="font-mono tabular-nums" style={{ color: variance < 0 ? 'var(--fin-overdue)' : undefined }}>
                      {fmtMoney(variance)} variance
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Variance detail */}
      {selected ? (
        <Card>
          <CardHeader
            title={`${STORE_NAME[selected.storeId]} — ${COUNT_LABEL[selected.status].toLowerCase()}`}
            sub={
              selected.blind
                ? 'Blind count: counters never saw theoretical quantities'
                : 'Open count sheet'
            }
            right={
              selected.status === 'review' ? (
                <Button variant="primary" size="sm" onClick={() => onPost(selected.id)}>
                  <ShieldCheck className="size-[14px]" /> Approve & post adjustment
                </Button>
              ) : undefined
            }
          />
          {selected.lines.length === 0 ? (
            <p className="p-[var(--space-5)] text-center text-[13px] text-[var(--ink-tertiary)]">
              Count not started — sheet generates from current book quantities when opened.
            </p>
          ) : (
            <>
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className={TH}>Item</th>
                    <th className={TH_NUM}>Theoretical</th>
                    <th className={TH_NUM}>Counted</th>
                    <th className={TH_NUM}>Variance</th>
                    <th className={TH_NUM}>Shrinkage value</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.lines.map((line) => {
                    const item = items.find((i) => i.id === line.itemId);
                    if (!item) return null;
                    const diff = line.counted - line.theoretical;
                    const valueMinor = Math.round(diff * item.unitCostMinor);
                    const bad = diff < 0;
                    return (
                      <tr key={line.itemId} className="border-b border-[var(--line-hairline)] last:border-0">
                        <td className={TD}>
                          <div className="font-medium">{item.name}</div>
                          <div className="font-mono text-[11px] text-[var(--ink-tertiary)]">{item.sku}</div>
                        </td>
                        <td className={TD_NUM + ' text-[var(--ink-secondary)]'}>
                          {fmtQty(line.theoretical)} {item.baseUom}
                        </td>
                        <td className={TD_NUM}>{fmtQty(line.counted)}</td>
                        <td className={TD_NUM} style={{ color: bad ? 'var(--fin-overdue)' : 'var(--ink-tertiary)' }}>
                          {diff > 0 ? '+' : ''}
                          {fmtQty(diff)}
                        </td>
                        <td className={TD_NUM} style={{ color: bad ? 'var(--fin-overdue)' : 'var(--ink-tertiary)' }}>
                          {fmtMoney(valueMinor)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-[var(--line-strong,var(--line-hairline))] bg-[var(--bg-raised)]">
                    <td className={TD + ' font-semibold'} colSpan={4}>
                      Net variance {selected.status === 'review' ? '— posts as reason-coded adjustment on approval' : ''}
                    </td>
                    <td
                      className={TD_NUM + ' font-semibold'}
                      style={{ color: selectedVariance < 0 ? 'var(--fin-overdue)' : 'var(--fin-settled)' }}
                    >
                      {fmtMoney(selectedVariance)}
                    </td>
                  </tr>
                </tfoot>
              </table>
              {selected.id === 'cnt-79' && (
                <p className="border-t border-[var(--line-hairline)] px-[var(--space-4)] py-[var(--space-3)] text-[12px] text-[var(--ink-tertiary)]">
                  House cabernet is 6 bottles under theoretical — flagged to the F&B manager with per-item shrinkage
                  value; an investigation note opens on posting (doc 04 outlet-variance workflow).
                </p>
              )}
            </>
          )}
        </Card>
      ) : (
        <Card>
          <p className="p-[var(--space-5)] text-center text-[13px] text-[var(--ink-tertiary)]">Select a count sheet.</p>
        </Card>
      )}
    </div>
  );
}
