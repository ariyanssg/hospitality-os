'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Banknote,
  Check,
  CloudOff,
  Lock,
  Receipt,
  RefreshCw,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';
import type { PosOutlet } from '@vela/contracts';
import { StatTile } from '@vela/ui';
import { usePos } from '@/lib/pos-store';
import { useSdk } from '@/lib/sdk';
import { useSession } from '@/lib/store';
import {
  BOARD_86,
  HOURLY,
  INSIGHTS,
  LEADERS,
  MENU_BY_ID,
  MIX_BARS,
  MOVERS,
  fm,
  moneyToCents,
} from '@/lib/pos-data';

const AUDIT_CHIP = {
  Void: {
    bg: 'var(--status-critical-bg)',
    line: 'var(--status-critical-line)',
    ink: 'var(--status-critical-ink)',
  },
  Comp: {
    bg: 'var(--status-positive-bg)',
    line: 'var(--status-positive-line)',
    ink: 'var(--status-positive-ink)',
  },
  Discount: {
    bg: 'var(--status-info-bg)',
    line: 'var(--status-info-line)',
    ink: 'var(--status-info-ink)',
  },
} as const;

/** Manager ops: live flash, 86 board, audit trail, shift close, sync & replay exceptions. */
export function ManagerScreen({
  outlets,
  openChecks,
}: {
  outlets: PosOutlet[];
  openChecks: number;
}) {
  const sdk = useSdk();
  const s = usePos();
  const propertyId = useSession((st) => st.activePropertyId);
  const [shiftBusy, setShiftBusy] = useState(false);
  const [variance, setVariance] = useState<string | null>(null);

  const { data: closed = [] } = useQuery({
    queryKey: ['pos', 'closed-checks', propertyId],
    queryFn: () => sdk.listPosChecks({ status: 'closed', limit: 100 }),
    enabled: !!propertyId && !s.offline,
  });
  const closedSales = closed.reduce((a, c) => a + moneyToCents(c.total), 0);
  const closedCovers = closed.reduce((a, c) => a + c.covers, 0);
  const netSales = 971400 + closedSales;
  const covers = 142 + closedCovers;
  const avgCheck = closed.length ? Math.round(closedSales / closed.length) : 6840;

  const countDrawer = () => {
    const outlet = outlets.find((o) => o.code === s.outletCode) ?? outlets[0];
    if (!outlet) return;
    if (s.offline) {
      s.showToast('Drawer count posts to cash management — needs connectivity.');
      return;
    }
    setShiftBusy(true);
    void sdk
      .openPosShift({ outletId: outlet.id }, { idempotencyKey: `pos-shift-${outlet.id}` })
      .then((shift) =>
        sdk.closePosShift(
          shift.id,
          { countedTotal: { amount: '1430.00', currency: 'USD' } },
          { idempotencyKey: `pos-shift-close-${shift.id}` },
        ),
      )
      .then((shift) => {
        const v = shift.variance ? fm(moneyToCents(shift.variance)) : '$0.00';
        setVariance(v);
        s.set({ drawerCounted: true });
        s.showToast(`Drawer counted $1,430.00 — over/short ${v} posted to cash management.`);
      })
      .catch(() => s.showToast('Shift close failed — is a shift already closed for this outlet?'))
      .finally(() => setShiftBusy(false));
  };

  const closeDay = () => {
    if (!s.drawerCounted) {
      s.showToast('Count the drawer first — over/short must post before close.');
      return;
    }
    s.set({ dayClosed: true });
    s.showToast('Outlet day closed — totals are already in the GL. There is no batch export.');
  };

  const hmax = Math.max(...HOURLY.map((h) => h.v));
  const mmax = Math.max(...MOVERS.map((m) => m.qty));
  const lmax = Math.max(...LEADERS.map((l) => l.sales));

  return (
    <div className="min-h-0 flex-1 overflow-auto p-4">
      <div className="grid min-w-[1200px] grid-cols-[400px_1fr_400px] items-start gap-3.5">
        {/* ── Col 1 — Flash ── */}
        <div className="flex flex-col gap-3.5">
          <div className="flex items-baseline gap-2.5">
            <span className="whitespace-nowrap font-display text-[20px] font-semibold tracking-tight">
              Outlet flash
            </span>
            <span className="text-xs text-[var(--ink-tertiary)]">Live — not end-of-day</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <StatTile
              label="Net sales"
              value={fm(netSales)}
              delta={{ dir: 'up', value: '12%' }}
              sub="vs. last Friday"
            />
            <StatTile
              label="Covers"
              value={String(covers)}
              delta={{ dir: 'up', value: '9' }}
              sub="turn 1.8"
            />
            <StatTile
              label="Avg check"
              value={fm(avgCheck)}
              delta={{ dir: 'up', value: '4%' }}
              sub="per cover $34.20"
            />
            <StatTile
              label="Void rate"
              value="0.8%"
              sub={`${s.audits.filter((a) => a.type === 'Void').length} voids · ${s.audits.filter((a) => a.type === 'Comp').length} comps`}
            />
          </div>

          <div className="flex flex-col gap-2.5 rounded-[var(--radius-xl)] border border-[var(--line-hairline)] bg-[var(--bg-surface)] p-4">
            <div className="flex items-baseline gap-2.5">
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[var(--ink-tertiary)]">
                Sales by hour
              </span>
              <span className="flex-1" />
              <span className="flex items-center gap-[5px] text-[11px] text-[var(--ink-tertiary)]">
                <span className="size-2 rounded-sm bg-[var(--interactive-default)]" />
                actual
              </span>
              <span className="flex items-center gap-[5px] text-[11px] text-[var(--ink-tertiary)]">
                <span className="size-2 rounded-sm border border-dashed border-[var(--line-strong)] bg-[var(--bg-sunken)]" />
                forecast
              </span>
            </div>
            <div className="flex h-[118px] items-end gap-[9px]">
              {HOURLY.map((h) => (
                <div
                  key={h.label}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-[5px]"
                >
                  <span
                    data-numeric
                    className="font-mono text-[10px]"
                    style={{
                      color: h.kind === 'now' ? 'var(--ink-accent)' : 'var(--ink-tertiary)',
                    }}
                  >
                    ${(h.v / 1000).toFixed(1)}k
                  </span>
                  <span
                    className="w-full rounded-t-md transition-[height] duration-[var(--motion-slow)]"
                    style={{
                      height: `${Math.max(8, Math.round((h.v / hmax) * 100))}%`,
                      background:
                        h.kind === 'fc'
                          ? 'var(--bg-sunken)'
                          : h.kind === 'now'
                            ? 'var(--interactive-default)'
                            : 'var(--interactive-selected)',
                      border: h.kind === 'fc' ? '1px dashed var(--line-strong)' : 'none',
                    }}
                  />
                  <span
                    className="text-[10.5px] font-semibold"
                    style={{
                      color: h.kind === 'now' ? 'var(--ink-accent)' : 'var(--ink-tertiary)',
                    }}
                  >
                    {h.label}
                  </span>
                </div>
              ))}
            </div>
            <span className="flex items-center gap-[7px] text-[11.5px] text-[var(--ink-tertiary)]">
              <Sparkles className="size-3" />
              Peak forecast 20:00 — currently pacing +12% above the demand model.
            </span>
          </div>

          <div className="flex flex-col gap-3 rounded-[var(--radius-xl)] border border-[var(--line-hairline)] bg-[var(--bg-surface)] p-4">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[var(--ink-tertiary)]">
              Sales mix
            </span>
            {MIX_BARS.map((mx) => (
              <div key={mx.label} className="flex flex-col gap-[5px]">
                <div className="flex justify-between text-[12.5px]">
                  <span className="font-semibold text-[var(--ink-secondary)]">{mx.label}</span>
                  <span data-numeric className="font-mono text-[var(--ink-secondary)]">
                    {mx.amt} · {mx.pct}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-[var(--radius-full)] bg-[var(--bg-sunken)]">
                  <div
                    className="h-full rounded-[var(--radius-full)] bg-[var(--interactive-default)]"
                    style={{ width: `${mx.width}%` }}
                  />
                </div>
              </div>
            ))}
            <div className="flex gap-3.5 border-t border-[var(--line-hairline)] pt-1.5">
              {[
                { name: 'Vista Restaurant', amt: '$6,214' },
                { name: 'Lagoon Bar', amt: '$2,288' },
                { name: 'Room Service', amt: '$1,212' },
              ].map((os) => (
                <div key={os.name} className="flex flex-col gap-px">
                  <span className="text-[11px] text-[var(--ink-tertiary)]">{os.name}</span>
                  <span data-numeric className="font-mono text-[13.5px] font-semibold">
                    {os.amt}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-[var(--radius-xl)] border border-[var(--line-hairline)] bg-[var(--bg-surface)] p-4">
            <span className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[var(--ink-tertiary)]">
              <Sparkles className="size-[13px]" />
              Insights
            </span>
            {INSIGHTS.map((ins) => (
              <div
                key={ins.title}
                className="flex flex-col gap-2 rounded-[var(--radius-lg)] bg-[var(--bg-sunken)] p-3"
              >
                <span className="text-[13px] font-semibold">{ins.title}</span>
                <span className="text-[12.5px] leading-[1.5] text-[var(--ink-secondary)]">
                  {ins.body}
                </span>
                <button
                  onClick={() => s.showToast(ins.toast)}
                  className="h-9 self-start rounded-[var(--radius-md)] border border-[var(--line-strong)] bg-[var(--bg-surface)] px-[13px] text-xs font-semibold hover:bg-[var(--bg-sunken)]"
                >
                  {ins.cta}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Col 2 — 86 board, movers, audit ── */}
        <div className="flex flex-col gap-3.5">
          <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--line-hairline)] bg-[var(--bg-surface)]">
            <div className="flex items-baseline gap-2.5 border-b border-[var(--line-hairline)] px-4 pb-2.5 pt-3.5">
              <span className="text-[15px] font-semibold">86 board</span>
              <span className="text-xs text-[var(--ink-tertiary)]">
                Propagates to 6 terminals + QR menus in ~2 s
              </span>
            </div>
            {BOARD_86.map((b) => {
              const item = MENU_BY_ID.get(b.id);
              if (!item) return null;
              const is86 = !!s.e86[b.id];
              const hint = is86 ? (b.hint86 ?? "86'd just now · propagated") : (b.hint ?? '');
              return (
                <div
                  key={b.id}
                  className="flex items-center gap-3 border-b border-[var(--line-hairline)] px-4 py-3"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span
                      className="text-[14px] font-semibold"
                      style={{ textDecoration: is86 ? 'line-through' : 'none' }}
                    >
                      {item.name}
                    </span>
                    {hint && (
                      <span
                        className="flex items-center gap-1.5 text-[11.5px]"
                        style={{
                          color: is86 ? 'var(--status-critical-ink)' : 'var(--status-caution-ink)',
                        }}
                      >
                        {hint}
                      </span>
                    )}
                  </div>
                  {!is86 && b.quick && (
                    <button
                      onClick={() => {
                        s.set({ e86: { ...s.e86, [b.id]: true } });
                        s.showToast(`${item.name} 86'd — synced to 6 terminals + QR menus in ~2s.`);
                      }}
                      className="flex h-[34px] items-center rounded-[var(--radius-md)] border border-[var(--status-caution-line)] bg-[var(--status-caution-bg)] px-3 text-xs font-semibold text-[var(--status-caution-ink)]"
                    >
                      86 now
                    </button>
                  )}
                  <button
                    role="switch"
                    aria-checked={is86}
                    onClick={() => {
                      s.set({ e86: { ...s.e86, [b.id]: !is86 } });
                      s.showToast(
                        `${item.name} ${!is86 ? "86'd" : 'restored'} — synced to 6 terminals + QR menus in ~2s.`,
                      );
                    }}
                    className="relative h-[30px] w-[52px] flex-none rounded-[var(--radius-full)] transition-colors duration-[var(--motion-fast)]"
                    style={{
                      background: is86
                        ? 'var(--status-critical-ink)'
                        : 'var(--interactive-disabled)',
                    }}
                  >
                    <span
                      className="absolute top-[3px] size-6 rounded-full bg-[var(--bg-surface)] shadow-[var(--shadow-e3)] transition-[left] duration-[var(--motion-fast)]"
                      style={{ left: is86 ? 25 : 3 }}
                    />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--line-hairline)] bg-[var(--bg-surface)]">
            <div className="flex items-baseline gap-2.5 border-b border-[var(--line-hairline)] px-4 pb-2.5 pt-3.5">
              <span className="text-[15px] font-semibold">Top movers</span>
              <span className="text-xs text-[var(--ink-tertiary)]">
                Tonight vs last Friday — feeds prep &amp; depletion
              </span>
            </div>
            {MOVERS.map((mv, i) => (
              <div
                key={mv.name}
                className="flex items-center gap-3 border-b border-[var(--line-hairline)] px-4 py-2.5"
              >
                <span
                  data-numeric
                  className="w-3.5 flex-none font-mono text-[11px] text-[var(--ink-tertiary)]"
                >
                  {i + 1}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[13px] font-semibold">{mv.name}</span>
                    <span className="flex-1" />
                    <span data-numeric className="font-mono text-xs text-[var(--ink-secondary)]">
                      ×{mv.qty}
                    </span>
                  </div>
                  <span className="h-[5px] overflow-hidden rounded-[3px] bg-[var(--bg-sunken)]">
                    <span
                      className="block h-full rounded-[3px] bg-[var(--interactive-default)]"
                      style={{ width: `${Math.round((mv.qty / mmax) * 100)}%` }}
                    />
                  </span>
                </div>
                <span
                  data-numeric
                  className="w-[52px] flex-none text-right font-mono text-[11.5px] font-semibold"
                  style={{
                    color: mv.up ? 'var(--status-positive-ink)' : 'var(--status-critical-ink)',
                  }}
                >
                  {mv.trend}
                </span>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--line-hairline)] bg-[var(--bg-surface)]">
            <div className="flex items-baseline gap-2.5 border-b border-[var(--line-hairline)] px-4 pb-2.5 pt-3.5">
              <span className="text-[15px] font-semibold">Voids · comps · discounts</span>
              <span className="text-xs text-[var(--ink-tertiary)]">
                Every adjustment is reason-coded and approver-stamped
              </span>
            </div>
            {s.audits.slice(0, 6).map((au, i) => {
              const chip = AUDIT_CHIP[au.type];
              return (
                <div
                  key={`${au.t}-${i}`}
                  className="flex items-center gap-3 border-b border-[var(--line-hairline)] px-4 py-[11px]"
                >
                  <span
                    data-numeric
                    className="w-[38px] flex-none font-mono text-xs text-[var(--ink-tertiary)]"
                  >
                    {au.t}
                  </span>
                  <span
                    className="inline-flex h-[22px] w-16 flex-none items-center justify-center rounded-[var(--radius-full)] border text-[10.5px] font-bold"
                    style={{ background: chip.bg, borderColor: chip.line, color: chip.ink }}
                  >
                    {au.type}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-px">
                    <span className="truncate whitespace-nowrap text-[13px] font-semibold">
                      {au.item}
                    </span>
                    <span className="text-[11px] text-[var(--ink-tertiary)]">
                      {au.reason} · {au.by} → approved {au.appr}
                    </span>
                  </div>
                  <span
                    data-numeric
                    className="flex-none font-mono text-[13px] text-[var(--fin-refund)]"
                  >
                    {fm(-au.amt)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Col 3 — Leaders, shift close, sync ── */}
        <div className="flex flex-col gap-3.5">
          <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--line-hairline)] bg-[var(--bg-surface)]">
            <div className="flex items-baseline gap-2.5 border-b border-[var(--line-hairline)] px-4 pb-2.5 pt-3.5">
              <span className="text-[15px] font-semibold">Servers tonight</span>
              <span className="text-xs text-[var(--ink-tertiary)]">Sales · tips captured</span>
            </div>
            {LEADERS.map((ld) => (
              <div
                key={ld.ini}
                className="flex items-center gap-3 border-b border-[var(--line-hairline)] px-4 py-2.5"
              >
                <span className="inline-flex size-[34px] flex-none items-center justify-center rounded-full border border-[var(--line-hairline)] bg-[var(--bg-sunken)] text-[11.5px] font-semibold text-[var(--ink-secondary)]">
                  {ld.ini}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[13px] font-semibold">{ld.name}</span>
                    <span className="text-[11px] text-[var(--ink-tertiary)]">{ld.meta}</span>
                    <span className="flex-1" />
                    <span data-numeric className="font-mono text-[12.5px] font-semibold">
                      ${ld.sales.toLocaleString()}
                    </span>
                  </div>
                  <span className="h-[5px] overflow-hidden rounded-[3px] bg-[var(--bg-sunken)]">
                    <span
                      className="block h-full rounded-[3px] bg-[var(--interactive-default)]"
                      style={{ width: `${Math.round((ld.sales / lmax) * 100)}%` }}
                    />
                  </span>
                </div>
                <span
                  data-numeric
                  className="w-12 flex-none text-right font-mono text-[11.5px] text-[var(--ink-tertiary)]"
                >
                  ${ld.tips}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3.5 rounded-[var(--radius-xl)] border border-[var(--line-hairline)] bg-[var(--bg-surface)] p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-[15px] font-semibold">Close outlet day</span>
              <span className="font-mono text-[11px] text-[var(--ink-tertiary)]">
                opened 16:00 · M. Ramos
              </span>
            </div>
            <div className="flex flex-col">
              {[
                {
                  label: 'Open checks',
                  sub: `${openChecks} open — close or transfer before end of shift`,
                  done: openChecks === 0,
                  icon: openChecks ? Receipt : Check,
                  iconBg: openChecks ? 'var(--status-caution-bg)' : 'var(--status-positive-bg)',
                  iconInk: openChecks ? 'var(--status-caution-ink)' : 'var(--status-positive-ink)',
                  btn: 'View',
                  onTap: () => s.set({ screen: 'floor' }),
                },
                {
                  label: 'Cash drawer T-03',
                  sub: s.drawerCounted
                    ? `Counted $1,430.00 · over/short ${variance ?? '−$2.50'} posted`
                    : 'Expected $1,432.50 — count to reconcile',
                  done: s.drawerCounted,
                  icon: s.drawerCounted ? Check : Banknote,
                  iconBg: s.drawerCounted ? 'var(--status-positive-bg)' : 'var(--bg-sunken)',
                  iconInk: s.drawerCounted ? 'var(--status-positive-ink)' : 'var(--ink-secondary)',
                  btn: s.drawerCounted ? '' : shiftBusy ? 'Counting…' : 'Count',
                  onTap: countDrawer,
                },
                {
                  label: 'Tips captured',
                  sub: '$612.40 — pooled, export to payroll ready',
                  done: true,
                  icon: Check,
                  iconBg: 'var(--status-positive-bg)',
                  iconInk: 'var(--status-positive-ink)',
                  btn: '',
                  onTap: () => undefined,
                },
                {
                  label: 'GL posting',
                  sub: 'Continuous — every check posted journal lines at close',
                  done: true,
                  icon: Check,
                  iconBg: 'var(--status-positive-bg)',
                  iconInk: 'var(--status-positive-ink)',
                  btn: '',
                  onTap: () => undefined,
                },
              ].map((ss) => {
                const Icon = ss.icon;
                return (
                  <div
                    key={ss.label}
                    className="flex items-center gap-3 border-b border-[var(--line-hairline)] py-[11px]"
                  >
                    <span
                      className="flex size-[26px] flex-none items-center justify-center rounded-full"
                      style={{ background: ss.iconBg, color: ss.iconInk }}
                    >
                      <Icon className="size-3.5" />
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-px">
                      <span className="text-[13.5px] font-semibold">{ss.label}</span>
                      <span className="text-[11.5px] text-[var(--ink-tertiary)]">{ss.sub}</span>
                    </div>
                    {ss.btn && (
                      <button
                        onClick={ss.onTap}
                        className="flex h-[38px] items-center rounded-[var(--radius-md)] border border-[var(--line-strong)] bg-[var(--bg-surface)] px-[13px] text-xs font-semibold hover:bg-[var(--bg-sunken)]"
                      >
                        {ss.btn}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <button
              onClick={closeDay}
              disabled={s.dayClosed}
              className="h-12 w-full rounded-[var(--radius-md)] text-[14px] font-semibold disabled:cursor-not-allowed"
              style={
                s.dayClosed
                  ? { background: 'var(--interactive-disabled)', color: 'var(--ink-disabled)' }
                  : { background: 'var(--interactive-default)', color: 'var(--ink-inverse)' }
              }
            >
              {s.dayClosed ? 'Outlet day closed — in GL' : 'Close outlet day'}
            </button>
            <span className="text-[11.5px] leading-[1.5] text-[var(--ink-tertiary)]">
              Outlet totals are already in the general ledger — closing the day reconciles counts
              only. There is no batch export to babysit.
            </span>
          </div>

          <div className="flex flex-col gap-3 rounded-[var(--radius-xl)] border border-[var(--line-hairline)] bg-[var(--bg-surface)] p-4">
            <span className="text-[15px] font-semibold">Sync &amp; exceptions</span>
            <div
              className="flex items-center gap-2.5 rounded-[var(--radius-lg)] border px-3 py-[11px]"
              style={{
                background: s.offline ? 'var(--status-caution-bg)' : 'var(--status-positive-bg)',
                borderColor: s.offline
                  ? 'var(--status-caution-line)'
                  : 'var(--status-positive-line)',
              }}
            >
              {s.offline ? (
                <CloudOff className="size-[17px] text-[var(--status-caution-ink)]" />
              ) : (
                <RefreshCw className="size-[17px] text-[var(--status-positive-ink)]" />
              )}
              <span
                className="flex-1 text-[12.5px] font-semibold"
                style={{
                  color: s.offline ? 'var(--status-caution-ink)' : 'var(--status-positive-ink)',
                }}
              >
                {s.offline
                  ? `T-03 offline — ${s.opQueue.length} ops queued locally, replay on reconnect`
                  : 'All 6 terminals in sync — op log idle'}
              </span>
            </div>
            <div className="flex flex-col gap-[9px] rounded-[var(--radius-lg)] border border-[var(--status-caution-line)] bg-[var(--status-caution-bg)] p-3">
              <span className="flex items-center gap-2 text-[12.5px] font-bold text-[var(--status-caution-ink)]">
                <TriangleAlert className="size-3.5" />1 replay exception
              </span>
              <span className="text-[12.5px] leading-[1.5] text-[var(--ink-primary)]">
                Room charge $64.20 — check #1019. Guest checked out before the op-log replay;
                revalidation failed. Route it, don&apos;t drop it.
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    s.showToast('Posted to AR review — revenue routed, night audit will reconcile.')
                  }
                  className="h-[38px] rounded-[var(--radius-md)] bg-[var(--interactive-default)] px-[13px] text-xs font-semibold text-[var(--ink-inverse)] hover:bg-[var(--interactive-hover)]"
                >
                  Post to AR review
                </button>
                <button
                  onClick={() =>
                    s.showToast('Void requires a reason code — opening the audit form.')
                  }
                  className="h-[38px] rounded-[var(--radius-md)] border border-[var(--line-strong)] bg-[var(--bg-surface)] px-[13px] text-xs font-semibold"
                >
                  Void with reason
                </button>
              </div>
            </div>
            <span className="flex items-center gap-2 text-[11.5px] text-[var(--ink-tertiary)]">
              <Lock className="size-3" />
              Idempotent replay · server-side revalidation · append-only op log
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
