'use client';
import { useMemo } from 'react';
import { AlertTriangle, ArrowRight, Clock3, PackageCheck } from 'lucide-react';
import { Badge, StatTile } from '@vela/ui';
import {
  fmtMoney,
  fmtMoneyCompact,
  fmtQty,
  fmtTs,
  itemStatus,
  itemValueMinor,
  poValueMinor,
  STORE_NAME,
  suggestedOrders,
  totalOnHand,
  totalPar,
  totalReorder,
  type CountSheet,
  type Movement,
  type PurchaseOrder,
  type Requisition,
  type StockItem,
  type StoreId,
} from '@/lib/inventory-demo';
import type { InvSection } from './types';
import { Card, CardHeader, DeltaMoney, MiniBar, MOVEMENT_LABEL, MOVEMENT_TONE, ParGauge, TD, TH } from './shared';

const STORE_BAR_COLOR: Record<StoreId, string> = {
  main: 'var(--channel-direct)',
  banyan: 'var(--channel-ota)',
  poolbar: 'var(--channel-corporate)',
  hk: 'var(--channel-group)',
  eng: 'var(--channel-walkin)',
  minibar: 'var(--fin-pending)',
};

/**
 * Overview — the command center. KPIs first, then the two questions an F&B controller asks every
 * morning (doc 04): "what needs attention" and "what moved". Everything links into its section.
 */
export function OverviewSection({
  items,
  movements,
  requisitions,
  pos,
  counts,
  goto,
  openItem,
}: {
  items: StockItem[];
  movements: Movement[];
  requisitions: Requisition[];
  pos: PurchaseOrder[];
  counts: CountSheet[];
  goto: (s: InvSection) => void;
  openItem: (id: string) => void;
}) {
  const stockValue = useMemo(() => items.reduce((s, i) => s + itemValueMinor(i), 0), [items]);
  const lowItems = useMemo(
    () => items.filter((i) => itemStatus(i) !== 'ok').sort((a, b) => totalOnHand(a) / totalPar(a) - totalOnHand(b) / totalPar(b)),
    [items],
  );
  const expiring = useMemo(
    () => items.filter((i) => i.nextExpiry && i.nextExpiry <= '2026-06-16' && (i.expiringQty ?? 0) > 0),
    [items],
  );
  const openPos = pos.filter((p) => !['matched', 'received'].includes(p.status));
  const openPoValue = openPos.reduce((s, p) => s + poValueMinor(p), 0);
  const pendingReqs = requisitions.filter((r) => r.status === 'pending').length;
  const countsInReview = counts.filter((c) => c.status === 'review').length;
  const suggestions = useMemo(() => suggestedOrders(items), [items]);

  const storeValue = useMemo(() => {
    const map = new Map<StoreId, number>();
    for (const item of items)
      for (const level of item.levels)
        map.set(level.storeId, (map.get(level.storeId) ?? 0) + Math.round(level.onHand * item.unitCostMinor));
    const total = [...map.values()].reduce((a, b) => a + b, 0);
    return [...map.entries()]
      .map(([storeId, value]) => ({ storeId, value, pct: (value / total) * 100 }))
      .sort((a, b) => b.value - a.value);
  }, [items]);

  return (
    <div className="space-y-[var(--space-4)]">
      {/* KPI band */}
      <div className="grid grid-cols-2 gap-[var(--space-3)] lg:grid-cols-5">
        <StatTile label="Stock on hand" value={fmtMoneyCompact(stockValue)} sub="weighted-average valuation" />
        <StatTile
          label="Food cost"
          value="28.4%"
          delta={{ dir: 'down', value: '1.1 pt' }}
          sub="MTD theoretical · Banyan"
        />
        <StatTile
          label="Below par"
          value={lowItems.length}
          sub={`${lowItems.filter((i) => itemStatus(i) === 'reorder' || itemStatus(i) === 'out').length} at reorder point`}
        />
        <StatTile label="Open PO value" value={fmtMoneyCompact(openPoValue)} sub={`${openPos.length} purchase orders in flight`} />
        <StatTile
          label="Awaiting action"
          value={pendingReqs + countsInReview}
          sub={`${pendingReqs} approvals · ${countsInReview} count in review`}
        />
      </div>

      <div className="grid gap-[var(--space-4)] xl:grid-cols-[1.25fr_1fr]">
        {/* Needs attention */}
        <Card>
          <CardHeader
            title={
              <span className="inline-flex items-center gap-2">
                <AlertTriangle className="size-4 text-[var(--status-caution-ink)]" />
                Needs attention
              </span>
            }
            sub="Reorder breaches and expiring batches — par-driven, occupancy-linked"
            right={
              <button
                onClick={() => goto('stock')}
                className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--ink-accent)] hover:underline"
              >
                All stock <ArrowRight className="size-3" />
              </button>
            }
          />
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={TH}>Item</th>
                <th className={TH}>Par position</th>
                <th className={TH}>On hand</th>
                <th className={TH}>Signal</th>
              </tr>
            </thead>
            <tbody>
              {lowItems.slice(0, 6).map((item) => {
                const onHand = totalOnHand(item);
                const sugg = suggestions.find((s) => s.item.id === item.id);
                return (
                  <tr
                    key={item.id}
                    onClick={() => openItem(item.id)}
                    className="cursor-pointer border-b border-[var(--line-hairline)] transition-colors last:border-0 hover:bg-[var(--bg-sunken)]"
                  >
                    <td className={TD}>
                      <div className="font-medium">{item.name}</div>
                      <div className="font-mono text-[11px] text-[var(--ink-tertiary)]">{item.sku}</div>
                    </td>
                    <td className={TD}>
                      <ParGauge onHand={onHand} par={totalPar(item)} reorderPoint={totalReorder(item)} />
                    </td>
                    <td className={TD + ' font-mono tabular-nums'}>
                      {fmtQty(onHand)} <span className="text-[var(--ink-tertiary)]">{item.baseUom}</span>
                    </td>
                    <td className={TD + ' text-[12px] text-[var(--ink-secondary)]'}>
                      {sugg ? `Order ${fmtQty(sugg.qty)} ${item.baseUom} · ${fmtMoneyCompact(sugg.valueMinor)}` : '—'}
                    </td>
                  </tr>
                );
              })}
              {expiring.map((item) => (
                <tr
                  key={item.id + '-exp'}
                  onClick={() => openItem(item.id)}
                  className="cursor-pointer border-b border-[var(--line-hairline)] transition-colors last:border-0 hover:bg-[var(--bg-sunken)]"
                >
                  <td className={TD}>
                    <div className="font-medium">{item.name}</div>
                    <div className="font-mono text-[11px] text-[var(--ink-tertiary)]">{item.sku}</div>
                  </td>
                  <td className={TD} colSpan={2}>
                    <span className="inline-flex items-center gap-1.5 text-[12px] text-[var(--status-caution-ink)]">
                      <Clock3 className="size-[13px]" />
                      {fmtQty(item.expiringQty ?? 0)} {item.baseUom} expires{' '}
                      {new Date(item.nextExpiry + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                  </td>
                  <td className={TD + ' text-[12px] text-[var(--ink-secondary)]'}>Use-first or waste-log</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <div className="space-y-[var(--space-4)]">
          {/* Store valuation breakdown */}
          <Card>
            <CardHeader
              title="Value by store"
              sub="Perpetual valuation — every movement posts GL automatically"
            />
            <div className="space-y-[var(--space-3)] p-[var(--space-4)]">
              {storeValue.map(({ storeId, value, pct }) => (
                <div key={storeId} className="grid grid-cols-[130px_1fr_72px] items-center gap-[var(--gap-md)]">
                  <span className="truncate text-[12.5px] text-[var(--ink-secondary)]">{STORE_NAME[storeId]}</span>
                  <MiniBar pct={pct} color={STORE_BAR_COLOR[storeId]} />
                  <span className="text-right font-mono text-[12px] tabular-nums text-[var(--ink-primary)]">
                    {fmtMoneyCompact(value)}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Suggested orders teaser */}
          <Card>
            <CardHeader
              title={
                <span className="inline-flex items-center gap-2">
                  <PackageCheck className="size-4 text-[var(--ink-accent)]" />
                  Suggested orders
                </span>
              }
              sub={`${suggestions.length} items · ${fmtMoney(suggestions.reduce((s, x) => s + x.valueMinor, 0))} to restore par`}
              right={
                <button
                  onClick={() => goto('procurement')}
                  className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--ink-accent)] hover:underline"
                >
                  Review <ArrowRight className="size-3" />
                </button>
              }
            />
            <div className="flex flex-wrap gap-1.5 p-[var(--space-4)]">
              {suggestions.slice(0, 6).map((s) => (
                <Badge key={s.item.id} tone="caution">
                  {s.item.name.split(',')[0]} · {fmtQty(s.qty)}
                </Badge>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Movement ledger */}
      <Card>
        <CardHeader
          title="Movement ledger"
          sub="Immutable, double-sided — receipts, transfers, issues, waste, POS depletion (doc 04)"
        />
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={TH}>When</th>
              <th className={TH}>Type</th>
              <th className={TH}>Item</th>
              <th className={TH}>Flow</th>
              <th className={TH + ' text-right'}>Qty</th>
              <th className={TH + ' text-right'}>Value</th>
              <th className={TH}>Reference</th>
            </tr>
          </thead>
          <tbody>
            {movements.slice(0, 9).map((mv) => {
              const item = items.find((i) => i.id === mv.itemId);
              return (
                <tr
                  key={mv.id}
                  onClick={() => openItem(mv.itemId)}
                  className="cursor-pointer border-b border-[var(--line-hairline)] transition-colors last:border-0 hover:bg-[var(--bg-sunken)]"
                >
                  <td className={TD + ' font-mono text-[12px] text-[var(--ink-tertiary)]'}>{fmtTs(mv.ts)}</td>
                  <td className={TD}>
                    <Badge tone={MOVEMENT_TONE[mv.type]}>{MOVEMENT_LABEL[mv.type]}</Badge>
                  </td>
                  <td className={TD + ' font-medium'}>{item?.name ?? mv.itemId}</td>
                  <td className={TD + ' text-[12px] text-[var(--ink-secondary)]'}>
                    {mv.fromStore ? STORE_NAME[mv.fromStore] : 'Vendor'}
                    {' → '}
                    {mv.toStore ? STORE_NAME[mv.toStore] : mv.type === 'waste' ? 'Waste log' : mv.type === 'depletion' ? 'COGS' : 'Expense'}
                  </td>
                  <td className={TD + ' text-right font-mono tabular-nums'}>
                    {mv.qty > 0 ? '+' : ''}
                    {fmtQty(mv.qty)} <span className="text-[var(--ink-tertiary)]">{item?.baseUom}</span>
                  </td>
                  <td className={TD + ' text-right'}>
                    <DeltaMoney minor={mv.valueMinor} text={fmtMoney(mv.valueMinor)} />
                  </td>
                  <td className={TD + ' font-mono text-[11.5px] text-[var(--ink-tertiary)]'}>
                    {mv.ref}
                    {mv.reason ? ` · ${mv.reason}` : ''}
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
