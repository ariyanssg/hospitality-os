'use client';
import { Badge } from '@vela/ui';
import {
  fmtDate,
  fmtMoney,
  fmtMoneyCompact,
  ITEMS,
  QUOTES,
  SUPPLIER_NAME,
  type Supplier,
} from '@/lib/inventory-demo';
import { Card, CardHeader, MiniBar, TD, TD_NUM, TH, TH_NUM } from './shared';

function scoreColor(v: number): string {
  return v >= 90 ? 'var(--status-positive-ink)' : v >= 80 ? 'var(--status-info-ink)' : 'var(--status-caution-ink)';
}

/**
 * Suppliers — scorecards (price competitiveness, delivery reliability, quality) plus the
 * multi-supplier price comparison that drives PO splitting (doc 04 supplier registry).
 */
export function SuppliersSection({ suppliers }: { suppliers: Supplier[] }) {
  const comparable = QUOTES.reduce<Record<string, typeof QUOTES>>((acc, q) => {
    (acc[q.itemId] ??= []).push(q);
    return acc;
  }, {});
  const multiQuoted = Object.entries(comparable).filter(([, qs]) => qs.length > 1);

  return (
    <div className="space-y-[var(--space-4)]">
      {/* Scorecards */}
      <div className="grid gap-[var(--space-3)] md:grid-cols-2 xl:grid-cols-3">
        {suppliers.map((sup) => {
          const onTime = Math.round((sup.deliveryHistory.filter(Boolean).length / sup.deliveryHistory.length) * 100);
          return (
            <Card key={sup.id} className="p-[var(--space-4)]">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-display text-[var(--text-body-lg)] font-semibold tracking-tight">{sup.name}</h3>
                  <p className="text-[11.5px] text-[var(--ink-tertiary)]">
                    {sup.categories.join(' · ')} · lead {sup.leadDays}d · price list to {fmtDate(sup.priceListValidTo)}
                  </p>
                </div>
                <Badge tone={sup.openPoMinor > 0 ? 'info' : 'neutral'}>
                  {fmtMoneyCompact(sup.openPoMinor)} open
                </Badge>
              </div>

              <div className="mt-[var(--space-3)] space-y-[var(--space-2)]">
                {(
                  [
                    ['Price', sup.scores.price],
                    ['Delivery', sup.scores.delivery],
                    ['Quality', sup.scores.quality],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[64px_1fr_34px] items-center gap-[var(--gap-sm)]">
                    <span className="text-[11.5px] text-[var(--ink-tertiary)]">{label}</span>
                    <MiniBar pct={value} color={scoreColor(value)} />
                    <span className="text-right font-mono text-[11.5px] tabular-nums" style={{ color: scoreColor(value) }}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-[var(--space-3)] flex items-center justify-between">
                <span className="text-[11px] text-[var(--ink-tertiary)]">Last 8 deliveries</span>
                <div className="flex items-end gap-[3px]" aria-label={`${onTime}% on time`}>
                  {sup.deliveryHistory.map((ok, i) => (
                    <span
                      key={i}
                      className="w-[7px] rounded-[2px]"
                      style={{
                        height: ok ? 16 : 8,
                        background: ok ? 'var(--status-positive-ink)' : 'var(--status-critical-ink)',
                        opacity: 0.4 + (i / sup.deliveryHistory.length) * 0.6,
                      }}
                    />
                  ))}
                  <span className="ml-1.5 font-mono text-[11.5px] tabular-nums text-[var(--ink-secondary)]">{onTime}%</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Price comparison */}
      <Card>
        <CardHeader
          title="Multi-supplier price comparison"
          sub="POs auto-split by best valid price at creation — deltas vs best quote shown"
        />
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={TH}>Item</th>
              <th className={TH}>Best quote</th>
              <th className={TH_NUM}>Best price</th>
              <th className={TH}>Alternative</th>
              <th className={TH_NUM}>Delta</th>
            </tr>
          </thead>
          <tbody>
            {multiQuoted.map(([itemId, qs]) => {
              const item = ITEMS.find((i) => i.id === itemId);
              if (!item) return null;
              const sorted = [...qs].sort((a, b) => a.unitCostMinor - b.unitCostMinor);
              const best = sorted[0];
              const alt = sorted[1];
              if (!item || !best || !alt) return null;
              const deltaPct = ((alt.unitCostMinor - best.unitCostMinor) / best.unitCostMinor) * 100;
              return (
                <tr key={itemId} className="border-b border-[var(--line-hairline)] last:border-0">
                  <td className={TD + ' font-medium'}>{item.name}</td>
                  <td className={TD + ' text-[13px]'}>
                    {SUPPLIER_NAME[best.supplierId]}{' '}
                    {best.supplierId === item.preferredSupplierId && <Badge tone="accent">Preferred</Badge>}
                  </td>
                  <td className={TD_NUM}>{fmtMoney(best.unitCostMinor)} / {item.baseUom}</td>
                  <td className={TD + ' text-[13px] text-[var(--ink-secondary)]'}>{SUPPLIER_NAME[alt.supplierId]}</td>
                  <td className={TD_NUM} style={{ color: 'var(--status-caution-ink)' }}>
                    +{deltaPct.toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
