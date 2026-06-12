'use client';
import { useCallback, useMemo, useState } from 'react';
import {
  Boxes,
  ChefHat,
  ClipboardCheck,
  LayoutDashboard,
  ShoppingCart,
  Truck,
} from 'lucide-react';
import { cn } from '@vela/ui';
import {
  COUNTS,
  ITEMS,
  MOVEMENTS,
  PURCHASE_ORDERS,
  RECIPES,
  REQUISITIONS as REQUISITIONS_INIT,
  reqValueMinor,
  fmtMoney,
  STORE_NAME,
  SUPPLIERS,
  type CountSheet,
  type Requisition,
  type StockItem,
} from '@/lib/inventory-demo';
import { useToast } from '@/lib/store';
import type { InvSection } from '@/components/inventory/types';
import { OverviewSection } from '@/components/inventory/overview-section';
import { StockSection } from '@/components/inventory/stock-section';
import { ItemDrawer } from '@/components/inventory/item-drawer';
import { ProcurementSection } from '@/components/inventory/procurement-section';
import { CountsSection } from '@/components/inventory/counts-section';
import { RecipesSection } from '@/components/inventory/recipes-section';
import { SuppliersSection } from '@/components/inventory/suppliers-section';

const SECTIONS: { id: InvSection; label: string; icon: typeof Boxes }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'stock', label: 'Stock', icon: Boxes },
  { id: 'procurement', label: 'Procurement', icon: ShoppingCart },
  { id: 'counts', label: 'Counts', icon: ClipboardCheck },
  { id: 'recipes', label: 'Recipes', icon: ChefHat },
  { id: 'suppliers', label: 'Suppliers', icon: Truck },
];

/**
 * Inventory & Procurement (doc modules/04) — stores → movements → counts → procurement → recipes,
 * one ledger underneath. Runs on the typed demo dataset until the backend module lands; every
 * structure mirrors the planned contracts so the SDK swap is mechanical.
 */
export default function InventoryPage() {
  const showToast = useToast((s) => s.show);
  const [section, setSection] = useState<InvSection>('overview');
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const [requisitions, setRequisitions] = useState<Requisition[]>(REQUISITIONS_INIT);
  const [counts, setCounts] = useState<CountSheet[]>(COUNTS);

  const openItem = useCallback((id: string) => setOpenItemId(id), []);
  const item = useMemo(() => ITEMS.find((i) => i.id === openItemId) ?? null, [openItemId]);

  const pendingApprovals = requisitions.filter((r) => r.status === 'pending').length;
  const countsInReview = counts.filter((c) => c.status === 'review').length;

  const decideRequisition = useCallback(
    (id: string, decision: 'approved' | 'rejected') => {
      setRequisitions((prev) => prev.map((r) => (r.id === id ? { ...r, status: decision } : r)));
      const req = requisitions.find((r) => r.id === id);
      if (!req) return;
      showToast(
        decision === 'approved'
          ? { text: `${req.number} approved — POs split by best supplier price (${fmtMoney(reqValueMinor(req, ITEMS))})` }
          : { tone: 'info', text: `${req.number} rejected — requester notified with reason` },
      );
    },
    [requisitions, showToast],
  );

  const postCount = useCallback(
    (id: string) => {
      setCounts((prev) => prev.map((c) => (c.id === id ? { ...c, status: 'posted' } : c)));
      const count = counts.find((c) => c.id === id);
      if (count)
        showToast({
          text: `Count posted — ${STORE_NAME[count.storeId]} adjustments hit stock + GL in one transaction`,
        });
    },
    [counts, showToast],
  );

  const draftRequisition = useCallback(
    (lines: { itemId: string; qty: number }[], note: string) => {
      const number = `RQ-0${489 + requisitions.filter((r) => r.number.startsWith('RQ-04') && Number(r.number.slice(3)) >= 489).length}`;
      const req: Requisition = {
        id: `req-${number}`,
        number,
        storeId: 'main',
        department: 'Purchasing',
        requestedBy: 'You',
        createdAt: new Date().toISOString(),
        status: 'pending',
        note,
        lines,
      };
      setRequisitions((prev) => [req, ...prev]);
      setSection('procurement');
      setOpenItemId(null);
      showToast({ text: `${number} drafted with ${lines.length} line${lines.length === 1 ? '' : 's'} — awaiting approval` });
    },
    [requisitions, showToast],
  );

  const draftFromItem = useCallback(
    (it: StockItem) => {
      const deficit = Math.max(
        it.packSize,
        Math.ceil(it.levels.reduce((s, l) => s + (l.par - l.onHand), 0) / it.packSize) * it.packSize,
      );
      draftRequisition([{ itemId: it.id, qty: deficit }], `Restore par — ${it.name}.`);
    },
    [draftRequisition],
  );

  const badges: Partial<Record<InvSection, number>> = {
    procurement: pendingApprovals,
    counts: countsInReview,
  };

  return (
    <div className="mx-auto max-w-[1280px] space-y-[var(--space-4)]">
      <div className="flex flex-wrap items-end justify-between gap-[var(--space-3)]">
        <div>
          <h1 className="font-display text-[var(--text-title)] font-semibold tracking-tight">Inventory</h1>
          <p className="text-[var(--text-caption)] text-[var(--ink-tertiary)]">
            Stores, movements, counts, procurement, recipe costing — one immutable ledger underneath.
          </p>
        </div>
        {/* Section tabs */}
        <div className="flex flex-wrap gap-1 rounded-[var(--radius-lg)] border border-[var(--line-hairline)] bg-[var(--bg-raised)] p-1">
          {SECTIONS.map((s) => {
            const active = s.id === section;
            const Icon = s.icon;
            const count = badges[s.id] ?? 0;
            return (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className={cn(
                  'inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-md)] px-3 text-[12.5px] transition-colors duration-[var(--motion-fast)]',
                  active
                    ? 'bg-[var(--bg-surface)] font-medium text-[var(--ink-primary)] shadow-[var(--shadow-e1,0_1px_2px_rgba(0,0,0,0.06))]'
                    : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]',
                )}
              >
                <Icon className={cn('size-[14px]', active && 'text-[var(--ink-accent)]')} />
                {s.label}
                {count > 0 && (
                  <span className="inline-flex h-[16px] min-w-[16px] items-center justify-center rounded-full border border-[var(--status-caution-line)] bg-[var(--status-caution-bg)] px-[4px] text-[10px] font-semibold tabular-nums text-[var(--status-caution-ink)]">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {section === 'overview' && (
        <OverviewSection
          items={ITEMS}
          movements={MOVEMENTS}
          requisitions={requisitions}
          pos={PURCHASE_ORDERS}
          counts={counts}
          goto={setSection}
          openItem={openItem}
        />
      )}
      {section === 'stock' && <StockSection items={ITEMS} openItem={openItem} />}
      {section === 'procurement' && (
        <ProcurementSection
          items={ITEMS}
          requisitions={requisitions}
          pos={PURCHASE_ORDERS}
          onDecide={decideRequisition}
          onCreateRequisition={draftRequisition}
        />
      )}
      {section === 'counts' && <CountsSection items={ITEMS} counts={counts} onPost={postCount} />}
      {section === 'recipes' && <RecipesSection recipes={RECIPES} />}
      {section === 'suppliers' && <SuppliersSection suppliers={SUPPLIERS} />}

      <ItemDrawer
        item={item}
        movements={MOVEMENTS}
        onClose={() => setOpenItemId(null)}
        onDraftRequisition={draftFromItem}
      />
    </div>
  );
}
