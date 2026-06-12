'use client';
import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import {
  fmtMoney,
  fmtQty,
  itemStatus,
  itemValueMinor,
  STORES,
  stockStatus,
  totalOnHand,
  totalPar,
  totalReorder,
  type Category,
  type StockItem,
  type StoreId,
} from '@/lib/inventory-demo';
import { Card, FilterChips, ParGauge, StockStatusBadge, TD, TD_NUM, TH, TH_NUM } from './shared';

const CATEGORY_LABEL: Record<Category, string> = {
  food: 'Food',
  beverage: 'Beverage',
  amenity: 'Amenities',
  linen: 'Linen',
  engineering: 'Engineering',
  minibar: 'Minibar',
};

type StoreFilter = StoreId | 'all';
type CategoryFilter = Category | 'all';
type StatusFilter = 'all' | 'attention';

/**
 * Stock — the perpetual-inventory item register. Store and category facets, par gauges per row,
 * row click opens the item drawer (levels per store, ledger slice, supplier quotes).
 */
export function StockSection({
  items,
  openItem,
}: {
  items: StockItem[];
  openItem: (id: string) => void;
}) {
  const [store, setStore] = useState<StoreFilter>('all');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items
      .filter((item) => {
        if (store !== 'all' && !item.levels.some((l) => l.storeId === store)) return false;
        if (category !== 'all' && item.category !== category) return false;
        if (status === 'attention' && itemStatus(item) === 'ok') return false;
        if (q && !`${item.name} ${item.sku}`.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => {
        const rank = { out: 0, reorder: 1, low: 2, ok: 3 } as const;
        return rank[itemStatus(a)] - rank[itemStatus(b)] || a.name.localeCompare(b.name);
      });
  }, [items, store, category, status, search]);

  const attentionCount = items.filter((i) => itemStatus(i) !== 'ok').length;

  /** When a store facet is active, gauges and quantities scope to that store's level. */
  const levelFor = (item: StockItem) => {
    if (store === 'all') return null;
    return item.levels.find((l) => l.storeId === store) ?? null;
  };

  return (
    <div className="space-y-[var(--space-3)]">
      <div className="flex flex-wrap items-center justify-between gap-[var(--space-3)]">
        <FilterChips
          options={[
            { id: 'all' as StoreFilter, label: 'All stores' },
            ...STORES.map((s) => ({ id: s.id as StoreFilter, label: s.name })),
          ]}
          value={store}
          onChange={setStore}
        />
        <label className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-[14px] -translate-y-1/2 text-[var(--ink-tertiary)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search item or SKU…"
            className="h-[var(--control-h)] w-[230px] rounded-[var(--radius-md)] border border-[var(--line-hairline)] bg-[var(--bg-surface)] pl-8 pr-3 text-[var(--font-size-ui)] outline-none placeholder:text-[var(--ink-tertiary)] focus:border-[var(--interactive-default)]"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-[var(--space-3)]">
        <FilterChips
          options={[
            { id: 'all' as CategoryFilter, label: 'All categories' },
            ...(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => ({
              id: c as CategoryFilter,
              label: CATEGORY_LABEL[c],
            })),
          ]}
          value={category}
          onChange={setCategory}
        />
        <span className="h-4 w-px bg-[var(--line-hairline)]" aria-hidden />
        <FilterChips
          options={[
            { id: 'all' as StatusFilter, label: 'Everything' },
            { id: 'attention' as StatusFilter, label: 'Needs attention', count: attentionCount },
          ]}
          value={status}
          onChange={setStatus}
        />
      </div>

      <Card>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={TH}>Item</th>
              <th className={TH}>Category</th>
              <th className={TH}>Par position{store !== 'all' ? ' · ' + STORES.find((s) => s.id === store)?.name : ''}</th>
              <th className={TH_NUM}>On hand</th>
              <th className={TH_NUM}>Unit cost</th>
              <th className={TH_NUM}>Value</th>
              <th className={TH}>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td className={TD + ' py-8 text-center text-[var(--ink-tertiary)]'} colSpan={7}>
                  No items match this view.
                </td>
              </tr>
            )}
            {rows.map((item) => {
              const level = levelFor(item);
              const onHand = level ? level.onHand : totalOnHand(item);
              const par = level ? level.par : totalPar(item);
              const reorder = level ? level.reorderPoint : totalReorder(item);
              const rowStatus = level ? stockStatus(onHand, par, reorder) : itemStatus(item);
              return (
                <tr
                  key={item.id}
                  onClick={() => openItem(item.id)}
                  className="cursor-pointer border-b border-[var(--line-hairline)] transition-colors last:border-0 hover:bg-[var(--bg-sunken)]"
                >
                  <td className={TD}>
                    <div className="font-medium">{item.name}</div>
                    <div className="font-mono text-[11px] text-[var(--ink-tertiary)]">
                      {item.sku} · {item.packUom}
                    </div>
                  </td>
                  <td className={TD + ' text-[12.5px] text-[var(--ink-secondary)]'}>
                    {CATEGORY_LABEL[item.category]}
                  </td>
                  <td className={TD}>
                    <div className="flex items-center gap-[var(--gap-sm)]">
                      <ParGauge onHand={onHand} par={par} reorderPoint={reorder} />
                      <span className="font-mono text-[11px] tabular-nums text-[var(--ink-tertiary)]">
                        {Math.round((onHand / Math.max(par, 1)) * 100)}%
                      </span>
                    </div>
                  </td>
                  <td className={TD_NUM}>
                    {fmtQty(onHand)} <span className="text-[var(--ink-tertiary)]">{item.baseUom}</span>
                  </td>
                  <td className={TD_NUM + ' text-[var(--ink-secondary)]'}>{fmtMoney(item.unitCostMinor)}</td>
                  <td className={TD_NUM}>{fmtMoney(level ? Math.round(onHand * item.unitCostMinor) : itemValueMinor(item))}</td>
                  <td className={TD}>
                    <StockStatusBadge status={rowStatus} />
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
