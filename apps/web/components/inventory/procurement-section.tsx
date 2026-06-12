'use client';
import { useMemo, useState } from 'react';
import { Check, ChevronRight, ScanLine, Sparkles, X } from 'lucide-react';
import { Badge, Button, Drawer } from '@vela/ui';
import {
  fmtDate,
  fmtMoney,
  fmtMoneyCompact,
  fmtQty,
  poValueMinor,
  reqValueMinor,
  STORE_NAME,
  SUPPLIER_NAME,
  SUPPLIERS,
  suggestedOrders,
  type PoStatus,
  type PurchaseOrder,
  type Requisition,
  type StockItem,
} from '@/lib/inventory-demo';
import { Card, CardHeader, TD, TD_NUM, TH, TH_NUM } from './shared';

const PO_TONE: Record<PoStatus, 'neutral' | 'info' | 'caution' | 'positive' | 'critical'> = {
  sent: 'neutral',
  acknowledged: 'info',
  partial: 'caution',
  received: 'positive',
  matched: 'positive',
  exception: 'critical',
};

const PO_LABEL: Record<PoStatus, string> = {
  sent: 'Sent',
  acknowledged: 'Acknowledged',
  partial: 'Partially received',
  received: 'Received',
  matched: '3-way matched',
  exception: 'Match exception',
};

/**
 * Procurement — the requisition → approval → PO → receiving → 3-way-match pipeline (doc 04).
 * The stage strip is the mental model; the tables below are the work queues.
 */
export function ProcurementSection({
  items,
  requisitions,
  pos,
  onDecide,
  onCreateRequisition,
}: {
  items: StockItem[];
  requisitions: Requisition[];
  pos: PurchaseOrder[];
  onDecide: (id: string, decision: 'approved' | 'rejected') => void;
  onCreateRequisition: (lines: { itemId: string; qty: number }[], note: string) => void;
}) {
  const [openPo, setOpenPo] = useState<PurchaseOrder | null>(null);
  const suggestions = useMemo(() => suggestedOrders(items), [items]);

  const pending = requisitions.filter((r) => r.status === 'pending');
  const inFlight = pos.filter((p) => ['sent', 'acknowledged', 'partial'].includes(p.status));
  const exceptions = pos.filter((p) => p.status === 'exception');

  const stages = [
    { label: 'Suggested', count: suggestions.length, value: suggestions.reduce((s, x) => s + x.valueMinor, 0), hint: 'par + forecast' },
    { label: 'Awaiting approval', count: pending.length, value: pending.reduce((s, r) => s + reqValueMinor(r, items), 0), hint: 'approval matrix' },
    { label: 'POs in flight', count: inFlight.length, value: inFlight.reduce((s, p) => s + poValueMinor(p), 0), hint: 'sent → receiving' },
    { label: 'Match exceptions', count: exceptions.length, value: exceptions.reduce((s, p) => s + poValueMinor(p), 0), hint: 'PO ↔ GRN ↔ invoice' },
  ];

  return (
    <div className="space-y-[var(--space-4)]">
      {/* Pipeline strip */}
      <div className="flex flex-wrap items-stretch gap-[var(--space-2)]">
        {stages.map((stage, i) => (
          <div key={stage.label} className="flex items-center gap-[var(--space-2)]">
            <div
              className={
                'flex min-w-[170px] flex-col gap-0.5 rounded-[var(--radius-lg)] border px-[var(--space-4)] py-[var(--space-3)] ' +
                (stage.label === 'Match exceptions' && stage.count > 0
                  ? 'border-[var(--status-critical-line)] bg-[var(--status-critical-bg)]'
                  : 'border-[var(--line-hairline)] bg-[var(--bg-surface)]')
              }
            >
              <span className="text-[var(--text-micro)] font-semibold uppercase tracking-wide text-[var(--ink-tertiary)]">
                {stage.label}
              </span>
              <span className="flex items-baseline gap-2">
                <span className="font-display text-[22px] font-semibold leading-none tabular-nums">{stage.count}</span>
                <span className="font-mono text-[12px] tabular-nums text-[var(--ink-secondary)]">
                  {fmtMoneyCompact(stage.value)}
                </span>
              </span>
              <span className="text-[11px] text-[var(--ink-tertiary)]">{stage.hint}</span>
            </div>
            {i < stages.length - 1 && <ChevronRight className="size-4 text-[var(--ink-disabled)]" />}
          </div>
        ))}
      </div>

      <div className="grid gap-[var(--space-4)] xl:grid-cols-[1fr_1.3fr]">
        {/* Suggested orders */}
        <Card className="self-start">
          <CardHeader
            title={
              <span className="inline-flex items-center gap-2">
                <Sparkles className="size-4 text-[var(--ink-accent)]" />
                Suggested orders
              </span>
            }
            sub="Par/reorder driven, scaled by occupancy and covers forecast"
            right={
              suggestions.length > 0 ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    onCreateRequisition(
                      suggestions.map((s) => ({ itemId: s.item.id, qty: s.qty })),
                      'Auto-suggested: restore par across stores.',
                    )
                  }
                >
                  Draft all as requisition
                </Button>
              ) : undefined
            }
          />
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={TH}>Item</th>
                <th className={TH_NUM}>Order qty</th>
                <th className={TH_NUM}>Value</th>
                <th className={TH}>Driver</th>
              </tr>
            </thead>
            <tbody>
              {suggestions.map((s) => (
                <tr key={s.item.id} className="border-b border-[var(--line-hairline)] last:border-0">
                  <td className={TD}>
                    <div className="font-medium">{s.item.name}</div>
                    <div className="font-mono text-[11px] text-[var(--ink-tertiary)]">
                      {SUPPLIER_NAME[s.item.preferredSupplierId]}
                    </div>
                  </td>
                  <td className={TD_NUM}>
                    {fmtQty(s.qty)} <span className="text-[var(--ink-tertiary)]">{s.item.baseUom}</span>
                  </td>
                  <td className={TD_NUM}>{fmtMoney(s.valueMinor)}</td>
                  <td className={TD + ' max-w-[180px] truncate text-[11.5px] text-[var(--ink-tertiary)]'}>{s.driver}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <div className="space-y-[var(--space-4)]">
          {/* Requisitions — approval queue */}
          <Card>
            <CardHeader
              title="Requisitions"
              sub="Approval matrix by amount and department — decisions are audited"
            />
            <div>
              {requisitions.map((req, i) => {
                const value = reqValueMinor(req, items);
                return (
                  <div
                    key={req.id}
                    className={
                      'flex flex-wrap items-center justify-between gap-[var(--space-3)] px-[var(--space-4)] py-[var(--space-3)] ' +
                      (i > 0 ? 'border-t border-[var(--line-hairline)]' : '')
                    }
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[12.5px] font-semibold">{req.number}</span>
                        <span className="text-[13px] font-medium">{req.department}</span>
                        {req.status === 'pending' ? (
                          <Badge tone="caution" dot>Awaiting approval</Badge>
                        ) : req.status === 'approved' ? (
                          <Badge tone="positive">Approved → PO</Badge>
                        ) : (
                          <Badge tone="critical">Rejected</Badge>
                        )}
                      </div>
                      <div className="mt-0.5 text-[12px] text-[var(--ink-tertiary)]">
                        {req.requestedBy} · {STORE_NAME[req.storeId]} · {req.lines.length} lines ·{' '}
                        <span className="font-mono tabular-nums text-[var(--ink-secondary)]">{fmtMoney(value)}</span>
                        {req.note ? <span className="italic"> — {req.note}</span> : null}
                      </div>
                    </div>
                    {req.status === 'pending' && (
                      <div className="flex gap-[var(--gap-sm)]">
                        <Button variant="secondary" size="sm" onClick={() => onDecide(req.id, 'rejected')}>
                          <X className="size-[13px]" /> Reject
                        </Button>
                        <Button variant="primary" size="sm" onClick={() => onDecide(req.id, 'approved')}>
                          <Check className="size-[13px]" /> Approve
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Purchase orders */}
          <Card>
            <CardHeader title="Purchase orders" sub="Click a PO for lines, receiving progress, and the match trail" />
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={TH}>PO</th>
                  <th className={TH}>Supplier</th>
                  <th className={TH_NUM}>Value</th>
                  <th className={TH}>Expected</th>
                  <th className={TH}>Receiving</th>
                  <th className={TH}>Status</th>
                </tr>
              </thead>
              <tbody>
                {pos.map((po) => {
                  const totalQty = po.lines.reduce((s, l) => s + l.qty, 0);
                  const receivedQty = po.lines.reduce((s, l) => s + l.received, 0);
                  const pct = Math.round((receivedQty / Math.max(totalQty, 1)) * 100);
                  return (
                    <tr
                      key={po.id}
                      onClick={() => setOpenPo(po)}
                      className="cursor-pointer border-b border-[var(--line-hairline)] transition-colors last:border-0 hover:bg-[var(--bg-sunken)]"
                    >
                      <td className={TD + ' font-mono text-[12.5px] font-semibold'}>{po.number}</td>
                      <td className={TD + ' text-[13px]'}>{SUPPLIER_NAME[po.supplierId]}</td>
                      <td className={TD_NUM}>{fmtMoney(poValueMinor(po))}</td>
                      <td className={TD + ' font-mono text-[12px] text-[var(--ink-secondary)]'}>{fmtDate(po.expected)}</td>
                      <td className={TD}>
                        <div className="flex items-center gap-[var(--gap-sm)]">
                          <div className="h-[5px] w-[70px] rounded-[var(--radius-full)] bg-[var(--bg-sunken)]">
                            <div
                              className="h-full rounded-[var(--radius-full)]"
                              style={{
                                width: `${pct}%`,
                                background: pct === 100 ? 'var(--fin-settled)' : 'var(--fin-pending)',
                              }}
                            />
                          </div>
                          <span className="font-mono text-[11px] tabular-nums text-[var(--ink-tertiary)]">{pct}%</span>
                        </div>
                      </td>
                      <td className={TD}>
                        <Badge tone={PO_TONE[po.status]} dot={po.status === 'exception'}>
                          {PO_LABEL[po.status]}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>
      </div>

      {/* PO drawer */}
      <Drawer
        open={!!openPo}
        onClose={() => setOpenPo(null)}
        title={openPo ? `${openPo.number} — ${SUPPLIER_NAME[openPo.supplierId]}` : ''}
        description={
          openPo
            ? `Created ${fmtDate(openPo.createdAt.slice(0, 10))} · expected ${fmtDate(openPo.expected)} · ${PO_LABEL[openPo.status]}`
            : undefined
        }
        width="md"
        footer={
          openPo && ['sent', 'acknowledged', 'partial'].includes(openPo.status) ? (
            <div className="flex justify-end">
              <Button variant="primary" size="sm">
                <ScanLine className="size-[14px]" /> Open receiving (GRN)
              </Button>
            </div>
          ) : undefined
        }
      >
        {openPo && (
          <div className="space-y-[var(--space-4)]">
            {openPo.exceptionNote && (
              <div className="rounded-[var(--radius-md)] border border-[var(--status-critical-line)] bg-[var(--status-critical-bg)] px-[var(--space-3)] py-[var(--space-2)] text-[12.5px] text-[var(--status-critical-ink)]">
                {openPo.exceptionNote} Route: accept variance → AP voucher, or dispute → credit note.
              </div>
            )}
            <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--line-hairline)]">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className={TH}>Line</th>
                    <th className={TH_NUM}>Ordered</th>
                    <th className={TH_NUM}>Received</th>
                    <th className={TH_NUM}>Unit cost</th>
                    <th className={TH_NUM}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {openPo.lines.map((line) => {
                    const item = items.find((i) => i.id === line.itemId);
                    const short = line.received > 0 && line.received < line.qty;
                    return (
                      <tr key={line.itemId} className="border-b border-[var(--line-hairline)] last:border-0">
                        <td className={TD + ' text-[13px] font-medium'}>{item?.name ?? line.itemId}</td>
                        <td className={TD_NUM}>
                          {fmtQty(line.qty)} <span className="text-[var(--ink-tertiary)]">{item?.baseUom}</span>
                        </td>
                        <td
                          className={TD_NUM}
                          style={{ color: short ? 'var(--status-caution-ink)' : undefined }}
                        >
                          {fmtQty(line.received)}
                        </td>
                        <td className={TD_NUM + ' text-[var(--ink-secondary)]'}>{fmtMoney(line.unitCostMinor)}</td>
                        <td className={TD_NUM}>{fmtMoney(line.qty * line.unitCostMinor)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[11.5px] text-[var(--ink-tertiary)]">
              Receiving posts stock + GL in one transaction; over-delivery and quality rejection follow store policy.
              Supplier lead time:{' '}
              {SUPPLIERS.find((s) => s.id === openPo.supplierId)?.leadDays} days.
            </p>
          </div>
        )}
      </Drawer>
    </div>
  );
}
