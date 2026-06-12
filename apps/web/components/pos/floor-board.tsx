'use client';
import { useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { BedDouble, Bell, ChefHat, DoorOpen, Martini } from 'lucide-react';
import type { PosCheck, PosOutlet, PosTable } from '@vela/contracts';
import { usePos } from '@/lib/pos-store';
import { useSdk } from '@/lib/sdk';
import { usePosOps, buildCheckView } from '@/lib/pos-api';
import {
  VISTA_GEOMETRY,
  VISTA_OVERLAYS,
  VISTA_SECTIONS,
  TONIGHT_RESERVATIONS,
  WAITLIST_SEED,
  fm,
  hmm,
  type TableGeometry,
} from '@/lib/pos-data';

type TableState =
  | { kind: 'vacant' }
  | { kind: 'dirty' }
  | { kind: 'reserved'; at: string; name: string }
  | { kind: 'barbusy'; money: number }
  | { kind: 'occupied'; stage: 'seated' | 'entree' | 'dessert' | 'check'; check: PosCheck; money: number; pips: number };

function chairsFor(geo: TableGeometry): Array<{ x: number; y: number; w: number; h: number; rot: number }> {
  const out: Array<{ x: number; y: number; w: number; h: number; rot: number }> = [];
  if (!geo.seats) return out;
  const cw = Math.min(24, Math.max(15, Math.round(geo.w * 0.22)));
  const ch = 7;
  if (geo.round) {
    const R = geo.w / 2;
    for (let i = 0; i < geo.seats; i++) {
      const a = (i / geo.seats) * Math.PI * 2 - Math.PI / 2;
      out.push({
        x: Math.round(geo.w / 2 + Math.cos(a) * (R + 7) - cw / 2),
        y: Math.round(geo.h / 2 + Math.sin(a) * (R + 7) - ch / 2),
        w: cw,
        h: ch,
        rot: Math.round((a * 180) / Math.PI + 90),
      });
    }
  } else {
    const top = Math.ceil(geo.seats / 2);
    const bot = geo.seats - top;
    for (let i = 0; i < top; i++) out.push({ x: Math.round((geo.w / top) * (i + 0.5) - cw / 2), y: -11, w: cw, h: ch, rot: 0 });
    for (let i = 0; i < bot; i++) out.push({ x: Math.round((geo.w / bot) * (i + 0.5) - cw / 2), y: geo.h + 4, w: cw, h: ch, rot: 0 });
  }
  return out;
}

const LEGEND = [
  { label: 'Open', line: 'var(--line-strong)', bg: 'var(--bg-surface)', dashed: false },
  { label: 'Seated / coursing', line: 'var(--interactive-default)', bg: 'var(--bg-surface)', dashed: false },
  { label: 'Check dropped', line: 'var(--fin-pending)', bg: 'var(--bg-surface)', dashed: false },
  { label: 'Reserved', line: 'var(--status-info-line)', bg: 'var(--bg-surface)', dashed: true },
  { label: 'Needs reset', line: 'var(--line-strong)', bg: 'var(--bg-sunken)', dashed: true },
];

/** Vista floor: blueprint stage, chair geometry, state rings, course pips, money chips. */
export function FloorBoard({
  outlet,
  tables,
  checks,
  now,
}: {
  outlet: PosOutlet;
  tables: PosTable[];
  checks: PosCheck[];
  now: number;
}) {
  const sdk = useSdk();
  const { invalidate } = usePosOps();
  const offline = usePos((s) => s.offline);
  const dirtyTables = usePos((s) => s.dirtyTables);
  const resetTables = usePos((s) => s.resetTables);
  const waitlistSeated = usePos((s) => s.waitlistSeated);
  const locallyClosed = usePos((s) => s.locallyClosed);
  const clientLines = usePos((s) => s.lines);
  const discounts = usePos((s) => s.discounts);
  const set = usePos((s) => s.set);
  const showToast = usePos((s) => s.showToast);
  const openCheckScreen = usePos((s) => s.openCheckScreen);

  const checksByTable = useMemo(() => {
    const m = new Map<string, PosCheck>();
    for (const c of checks) {
      if (c.tableId && !locallyClosed[c.id]) m.set(c.tableId, c);
    }
    return m;
  }, [checks, locallyClosed]);

  const seatMutation = useMutation({
    mutationFn: async ({ table, covers }: { table: PosTable; covers: number }) =>
      sdk.openPosCheck(
        { outletId: outlet.id, tableId: table.id, covers },
        { idempotencyKey: `pos-open-${table.id}-${Date.now()}` },
      ),
    onSuccess: (check) => {
      invalidate();
      openCheckScreen(check.id);
    },
    onError: () => showToast('Could not open the check — check connectivity and try again.'),
  });

  const stateFor = (t: PosTable): TableState => {
    const overlay = VISTA_OVERLAYS[t.label] ?? {};
    const check = checksByTable.get(t.id);
    if (check) {
      const view = buildCheckView(check, clientLines[check.id] ?? [], discounts[check.id], false);
      const maxCourse = Math.max(1, ...view.lines.map((l) => l.course));
      const stage = overlay.checkDropped ? 'check' : maxCourse >= 3 ? 'dessert' : maxCourse === 2 ? 'entree' : 'seated';
      return { kind: 'occupied', stage, check, money: view.total, pips: Math.min(3, maxCourse) };
    }
    if (overlay.barBusy && !resetTables[t.label]) return { kind: 'barbusy', money: overlay.barBusy };
    if (dirtyTables[t.label] || (overlay.dirty && !resetTables[t.label])) return { kind: 'dirty' };
    if (overlay.reserved && !resetTables[t.label]) return { kind: 'reserved', at: overlay.reserved.at, name: overlay.reserved.name };
    return { kind: 'vacant' };
  };

  const tapTable = (t: PosTable, st: TableState) => {
    if (st.kind === 'barbusy') {
      showToast('Bar tab is open on terminal T-02 (A. Lopez) — checks belong to one terminal at a time.');
      return;
    }
    if (st.kind === 'reserved') {
      showToast(`Reserved ${st.at} — ${st.name} (VIP). Seat early from the Tonight panel.`);
      return;
    }
    if (st.kind === 'dirty') {
      set({ dirtyTables: { ...dirtyTables, [t.label]: false }, resetTables: { ...resetTables, [t.label]: true } });
      showToast(`Table ${t.label} reset — back in the floor pool.`);
      return;
    }
    if (st.kind === 'vacant') {
      if (offline) {
        showToast('Opening a check needs connectivity — the table will seat as soon as the terminal is back online.');
        return;
      }
      seatMutation.mutate({ table: t, covers: 2 });
      return;
    }
    openCheckScreen(st.check.id);
  };

  const seatWaitlist = (w: (typeof WAITLIST_SEED)[number]) => {
    const t3 = tables.find((t) => t.label === '3');
    if (!t3 || offline) {
      showToast(offline ? 'Seating needs connectivity.' : 'No open six-top right now.');
      return;
    }
    set({ waitlistSeated: { ...waitlistSeated, [w.id]: true } });
    seatMutation.mutate({ table: t3, covers: Number(w.name.split('×')[1] ?? 2) });
    showToast(`${w.name} seated at Table 3 — quoted wait beaten.`);
  };

  const waitlist = WAITLIST_SEED.filter((w) => !waitlistSeated[w.id]);

  return (
    <div className="flex min-h-0 flex-1 gap-4 p-4">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-none items-center gap-4">
          <div className="flex flex-col">
            <span className="whitespace-nowrap font-display text-[22px] font-semibold tracking-tight">Dinner service</span>
            <span className="text-[12.5px] text-[var(--ink-tertiary)]">
              Work the exceptions — long-idle tables surface a bell.
            </span>
          </div>
          <div className="flex-1" />
          {LEGEND.map((lg) => (
            <span key={lg.label} className="flex items-center gap-1.5 text-xs text-[var(--ink-secondary)]">
              <span
                className="size-2.5 rounded-[3px]"
                style={{ background: lg.bg, border: `1.5px ${lg.dashed ? 'dashed' : 'solid'} ${lg.line}` }}
              />
              {lg.label}
            </span>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-auto rounded-[var(--radius-xl)] border border-[var(--line-hairline)] bg-[var(--bg-sunken)]">
          <div
            className="relative h-full min-h-[620px] min-w-[1080px]"
            style={{
              backgroundImage: 'radial-gradient(var(--line-strong) 1px, transparent 1.4px)',
              backgroundSize: '26px 26px',
              backgroundPosition: '13px 13px',
            }}
          >
            {VISTA_SECTIONS.map((sec) => {
              const Icon = sec.icon;
              return (
                <div
                  key={sec.label}
                  className="absolute rounded-[var(--radius-xl)] border-[1.5px] border-[var(--line-hairline)]"
                  style={{ left: `${sec.x}%`, top: `${sec.y}%`, width: `${sec.w}%`, height: `${sec.h}%` }}
                >
                  <span className="absolute -top-[13px] left-4 inline-flex h-[26px] items-center gap-[7px] rounded-[var(--radius-full)] border border-[var(--line-hairline)] bg-[var(--bg-surface)] px-[11px] text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[var(--ink-secondary)] shadow-[var(--shadow-e3)]">
                    <Icon className="size-[13px]" />
                    {sec.label}
                  </span>
                </div>
              );
            })}
            <div className="absolute flex items-center justify-center gap-2 rounded-[var(--radius-full)] border border-[var(--line-strong)] bg-[var(--bg-surface)] text-[var(--ink-tertiary)]" style={{ left: '60.5%', top: '80.5%', width: '36%', height: '8%' }}>
              <Martini className="size-[13px]" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.1em]">Bar counter</span>
            </div>
            <div className="absolute bottom-[2.5%] left-[3%] inline-flex h-7 items-center gap-[7px] rounded-[var(--radius-full)] border border-dashed border-[var(--line-strong)] bg-[var(--bg-surface)] px-3 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[var(--ink-tertiary)]">
              <DoorOpen className="size-[13px]" />
              Entrance
            </div>
            <div className="absolute bottom-[2.5%] left-[38%] inline-flex h-7 items-center gap-[7px] rounded-[var(--radius-full)] border border-dashed border-[var(--line-strong)] bg-[var(--bg-surface)] px-3 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[var(--ink-tertiary)]">
              <ChefHat className="size-[13px]" />
              Kitchen pass
            </div>

            {tables.map((t) => {
              const geo = VISTA_GEOMETRY[t.label];
              if (!geo) return null;
              const st = stateFor(t);
              const overlay = VISTA_OVERLAYS[t.label] ?? {};
              const small = geo.w <= 60;
              const occupied = st.kind === 'occupied' || st.kind === 'barbusy';

              const ring =
                st.kind === 'occupied'
                  ? st.stage === 'check'
                    ? '2px solid var(--fin-pending)'
                    : '2px solid var(--interactive-default)'
                  : st.kind === 'barbusy'
                    ? '1.5px solid var(--interactive-default)'
                    : st.kind === 'reserved'
                      ? '2px dashed var(--status-info-line)'
                      : st.kind === 'dirty'
                        ? '1.5px dashed var(--line-strong)'
                        : '1.5px solid var(--line-strong)';
              const bg = st.kind === 'dirty' ? 'var(--bg-sunken)' : 'var(--bg-surface)';
              const chairBg =
                st.kind === 'occupied'
                  ? st.stage === 'check'
                    ? 'var(--status-caution-line)'
                    : 'var(--interactive-default)'
                  : st.kind === 'reserved'
                    ? 'var(--status-info-line)'
                    : 'var(--line-strong)';

              const idleMin = st.kind === 'occupied' ? Math.max(0, Math.round((now - Date.parse(st.check.openedAt)) / 60000)) : 0;
              const sub =
                st.kind === 'occupied'
                  ? st.stage === 'check'
                    ? 'Check dropped'
                    : `${st.stage === 'seated' ? 'Seated' : st.stage === 'entree' ? 'Entrée' : 'Dessert'} · ${hmm(idleMin)}`
                  : st.kind === 'reserved'
                    ? `${st.at} · ${st.name}`
                    : st.kind === 'dirty'
                      ? 'Needs reset'
                      : st.kind === 'barbusy'
                        ? 'Tab'
                        : 'Open';
              const subInk =
                st.kind === 'occupied'
                  ? st.stage === 'check'
                    ? 'var(--fin-pending)'
                    : 'var(--ink-accent)'
                  : st.kind === 'reserved'
                    ? 'var(--status-info-ink)'
                    : 'var(--ink-tertiary)';
              const money = st.kind === 'occupied' || st.kind === 'barbusy' ? fm(st.money) : '';
              const pips = st.kind === 'occupied' && st.stage !== 'check' ? st.pips : st.kind === 'occupied' ? 3 : 0;

              return (
                <button
                  key={t.id}
                  onClick={() => tapTable(t, st)}
                  className="absolute flex cursor-pointer flex-col items-center justify-center gap-0.5 overflow-visible p-1 transition-transform duration-[var(--motion-fast)] hover:scale-[1.03]"
                  style={{
                    left: `${geo.x}%`,
                    top: `${geo.y}%`,
                    width: geo.w,
                    height: geo.h,
                    borderRadius: geo.round ? '50%' : 'var(--radius-lg)',
                    background: bg,
                    border: ring,
                    boxShadow: occupied ? 'var(--shadow-e3)' : 'none',
                  }}
                >
                  {chairsFor(geo).map((ch, i) => (
                    <span
                      key={i}
                      className="pointer-events-none absolute rounded"
                      style={{ left: ch.x, top: ch.y, width: ch.w, height: ch.h, background: chairBg, transform: `rotate(${ch.rot}deg)` }}
                    />
                  ))}
                  {overlay.attention && st.kind === 'occupied' && (
                    <span className="absolute -right-[7px] -top-[7px] z-[2] flex size-[22px] items-center justify-center rounded-full border border-[var(--status-critical-line)] bg-[var(--status-critical-bg)] text-[var(--status-critical-ink)]" style={{ animation: 'pos-blink 1.6s var(--ease-standard) infinite' }}>
                      <Bell className="size-3" />
                    </span>
                  )}
                  {overlay.guest && st.kind === 'occupied' && (
                    <span className="absolute -left-[7px] -top-[7px] z-[2] flex size-[22px] items-center justify-center rounded-full bg-[var(--interactive-default)] text-[var(--ink-inverse)]" title={`In-house hotel guest · Room ${overlay.guest.room}`}>
                      <BedDouble className="size-3" />
                    </span>
                  )}
                  <span
                    className="font-display font-semibold leading-none"
                    style={{
                      fontSize: small ? 13 : geo.w >= 120 ? 20 : 17,
                      color: st.kind === 'occupied' || st.kind === 'barbusy' ? 'var(--ink-primary)' : st.kind === 'reserved' ? 'var(--ink-secondary)' : 'var(--ink-tertiary)',
                    }}
                  >
                    {t.label}
                  </span>
                  {!small && (
                    <span className="text-center text-[10.5px] font-semibold leading-[1.2]" style={{ color: subInk }}>
                      {sub}
                    </span>
                  )}
                  {!small && money && (
                    <span data-numeric className="rounded-[var(--radius-full)] bg-[var(--bg-sunken)] px-2 py-0.5 font-mono text-[11px] font-semibold leading-[1.2] text-[var(--ink-secondary)]">
                      {money}
                    </span>
                  )}
                  {!small && pips > 0 && (
                    <span className="mt-0.5 flex items-center gap-1">
                      {[1, 2, 3].map((n) => (
                        <span key={n} className="size-1.5 rounded-full" style={{ background: n <= pips ? 'var(--interactive-default)' : 'var(--line-strong)' }} title="Course progress" />
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tonight panel */}
      <div className="flex w-[330px] min-h-0 flex-none flex-col gap-3">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--line-hairline)] bg-[var(--bg-surface)]">
          <div className="flex-none border-b border-[var(--line-hairline)] px-4 pb-2.5 pt-3.5">
            <span className="text-[15px] font-semibold">Tonight</span>
            <span className="mt-0.5 block text-xs text-[var(--ink-tertiary)]">
              42 booked · 6 walk-ins · synced with room reservations
            </span>
          </div>
          <div className="flex-1 overflow-auto p-2">
            {TONIGHT_RESERVATIONS.map((r) => (
              <div key={r.time + r.name} className="flex items-center gap-3 border-b border-[var(--line-hairline)] px-2.5 py-[11px]">
                <span data-numeric className="w-[42px] flex-none font-mono text-[13px] text-[var(--ink-secondary)]">
                  {r.time}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[13.5px] font-semibold">{r.name}</span>
                  <span className="text-[11.5px] text-[var(--ink-tertiary)]">{r.note}</span>
                </div>
                {r.chip && (
                  <span
                    className="flex h-6 items-center whitespace-nowrap rounded-[var(--radius-full)] border px-[9px] text-[11px] font-semibold"
                    style={
                      r.chip === 'VIP'
                        ? { background: 'var(--interactive-selected)', color: 'var(--ink-accent)', borderColor: 'var(--line-hairline)' }
                        : { background: 'var(--status-info-bg)', color: 'var(--status-info-ink)', borderColor: 'var(--status-info-line)' }
                    }
                  >
                    {r.chip}
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="flex-none border-t border-[var(--line-hairline)] px-4 pb-1.5 pt-2.5">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[var(--ink-tertiary)]">Waitlist</span>
          </div>
          <div className="flex-none px-2 pb-2.5 pt-1">
            {waitlist.length === 0 && (
              <span className="block px-2.5 py-2 text-[12.5px] text-[var(--ink-tertiary)]">All seated — no parties waiting.</span>
            )}
            {waitlist.map((w) => (
              <div key={w.id} className="flex items-center gap-2.5 px-2.5 py-2">
                <div className="flex min-w-0 flex-1 flex-col gap-px">
                  <span className="text-[13.5px] font-semibold">{w.name}</span>
                  <span className="text-[11.5px] text-[var(--ink-tertiary)]">Quoted {w.quoted}</span>
                </div>
                <button
                  onClick={() => seatWaitlist(w)}
                  className="h-9 rounded-[var(--radius-md)] border border-[var(--line-strong)] bg-[var(--bg-surface)] px-3.5 text-[12.5px] font-semibold hover:bg-[var(--bg-sunken)]"
                >
                  Seat now
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
