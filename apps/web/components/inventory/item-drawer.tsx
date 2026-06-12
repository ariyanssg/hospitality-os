'use client';
import { useMemo } from 'react';
import { Clock3, FilePlus2 } from 'lucide-react';
import { Badge, Button, Drawer } from '@vela/ui';
import {
  fmtMoney,
  fmtQty,
  fmtTs,
  QUOTES,
  STORE_NAME,
  stockStatus,
  SUPPLIER_NAME,
  totalOnHand,
  type Movement,
  type StockItem,
} from '@/lib/inventory-demo';
import { DeltaMoney, MOVEMENT_LABEL, MOVEMENT_TONE, ParGauge, StockStatusBadge } from './shared';

function SectionLabel({ children }: { children: string }) {
  return (
    <h3 className="text-[var(--text-micro)] font-semibold uppercase tracking-wide text-[var(--ink-tertiary)]">
      {children}
    </h3>
  );
}

/**
 * Item drawer — one SKU's whole story: position per store, the ledger slice that explains "why
 * did it change", and the multi-supplier quote comparison used at PO creation (doc 04).
 */
export function ItemDrawer({
  item,
  movements,
  onClose,
  onDraftRequisition,
}: {
  item: StockItem | null;
  movements: Movement[];
  onClose: () => void;
  onDraftRequisition: (item: StockItem) => void;
}) {
  const itemMoves = useMemo(
    () => movements.filter((m) => m.itemId === item?.id).slice(0, 8),
    [movements, item],
  );
  const quotes = useMemo(
    () =>
      QUOTES.filter((q) => q.itemId === item?.id).sort((a, b) => a.unitCostMinor - b.unitCostMinor),
    [item],
  );

  if (!item) return null;
  const onHand = totalOnHand(item);

  return (
    <Drawer
      open={!!item}
      onClose={onClose}
      title={item.name}
      description={`${item.sku} · ${item.packUom} · weighted-average ${fmtMoney(item.unitCostMinor)} / ${item.baseUom}`}
      width="lg"
      footer={
        <div className="flex items-center justify-between gap-[var(--gap-md)]">
          <span className="text-[var(--text-caption)] text-[var(--ink-tertiary)]">
            Position value{' '}
            <span className="font-mono font-medium text-[var(--ink-primary)]">
              {fmtMoney(Math.round(onHand * item.unitCostMinor))}
            </span>
          </span>
          <Button variant="primary" size="sm" onClick={() => onDraftRequisition(item)}>
            <FilePlus2 className="size-[14px]" /> Draft requisition
          </Button>
        </div>
      }
    >
      <div className="space-y-[var(--space-5)]">
        {item.perishable && item.nextExpiry && (
          <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--status-caution-line)] bg-[var(--status-caution-bg)] px-[var(--space-3)] py-[var(--space-2)] text-[12.5px] text-[var(--status-caution-ink)]">
            <Clock3 className="size-[14px]" />
            Perishable — next batch expires {fmtTs(item.nextExpiry + 'T00:00:00Z').split(',')[0]}
            {item.expiringQty ? ` (${fmtQty(item.expiringQty)} ${item.baseUom})` : ''}. FIFO pick enforced at issue.
          </div>
        )}

        <section className="space-y-[var(--space-2)]">
          <SectionLabel>Position by store</SectionLabel>
          <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--line-hairline)]">
            {item.levels.map((level, i) => {
              const st = stockStatus(level.onHand, level.par, level.reorderPoint);
              return (
                <div
                  key={level.storeId}
                  className={
                    'grid grid-cols-[1fr_130px_110px_auto] items-center gap-[var(--gap-md)] px-[var(--space-3)] py-[var(--space-2)] ' +
                    (i > 0 ? 'border-t border-[var(--line-hairline)]' : '')
                  }
                >
                  <span className="text-[13px] font-medium">{STORE_NAME[level.storeId]}</span>
                  <ParGauge onHand={level.onHand} par={level.par} reorderPoint={level.reorderPoint} />
                  <span className="text-right font-mono text-[12.5px] tabular-nums">
                    {fmtQty(level.onHand)}
                    <span className="text-[var(--ink-tertiary)]"> / {fmtQty(level.par)} {item.baseUom}</span>
                  </span>
                  <StockStatusBadge status={st} />
                </div>
              );
            })}
          </div>
          <p className="text-[11.5px] text-[var(--ink-tertiary)]">
            Bar = on hand vs par · tick = reorder point. Suggested orders round up to {item.packUom}.
          </p>
        </section>

        {quotes.length > 0 && (
          <section className="space-y-[var(--space-2)]">
            <SectionLabel>Supplier quotes</SectionLabel>
            <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--line-hairline)]">
              {quotes.map((q, i) => {
                const best = i === 0;
                const preferred = q.supplierId === item.preferredSupplierId;
                return (
                  <div
                    key={q.supplierId}
                    className={
                      'flex items-center justify-between gap-[var(--gap-md)] px-[var(--space-3)] py-[var(--space-2)] ' +
                      (i > 0 ? 'border-t border-[var(--line-hairline)]' : '')
                    }
                  >
                    <span className="inline-flex items-center gap-2 text-[13px]">
                      {SUPPLIER_NAME[q.supplierId]}
                      {preferred && <Badge tone="accent">Preferred</Badge>}
                      {best && quotes.length > 1 && <Badge tone="positive">Best price</Badge>}
                    </span>
                    <span className="font-mono text-[12.5px] tabular-nums">
                      {fmtMoney(q.unitCostMinor)} / {item.baseUom}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="space-y-[var(--space-2)]">
          <SectionLabel>Recent movements</SectionLabel>
          {itemMoves.length === 0 ? (
            <p className="text-[12.5px] text-[var(--ink-tertiary)]">No movements in the window.</p>
          ) : (
            <ol className="relative space-y-0 border-l border-[var(--line-hairline)] pl-[var(--space-4)]">
              {itemMoves.map((mv) => (
                <li key={mv.id} className="relative py-[var(--space-2)]">
                  <span
                    aria-hidden
                    className="absolute left-[-21px] top-[14px] size-[7px] rounded-full border border-[var(--bg-surface)]"
                    style={{
                      background:
                        mv.valueMinor > 0 ? 'var(--fin-settled)' : mv.type === 'waste' ? 'var(--fin-overdue)' : 'var(--ink-disabled)',
                    }}
                  />
                  <div className="flex items-baseline justify-between gap-[var(--gap-md)]">
                    <span className="inline-flex items-center gap-2">
                      <Badge tone={MOVEMENT_TONE[mv.type]}>{MOVEMENT_LABEL[mv.type]}</Badge>
                      <span className="text-[12.5px] text-[var(--ink-secondary)]">
                        {mv.fromStore ? STORE_NAME[mv.fromStore] : 'Vendor'} →{' '}
                        {mv.toStore ? STORE_NAME[mv.toStore] : mv.type === 'waste' ? 'Waste log' : 'COGS'}
                      </span>
                    </span>
                    <span className="font-mono text-[12px] tabular-nums">
                      {mv.qty > 0 ? '+' : ''}
                      {fmtQty(mv.qty)} {item.baseUom} · <DeltaMoney minor={mv.valueMinor} text={fmtMoney(mv.valueMinor)} />
                    </span>
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] text-[var(--ink-tertiary)]">
                    {fmtTs(mv.ts)} · {mv.ref} · {mv.actor}
                    {mv.reason ? ` · ${mv.reason}` : ''}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </Drawer>
  );
}
