'use client';
import { useMemo, useState } from 'react';
import {
  ArrowRightLeft,
  BadgePercent,
  BedDouble,
  ChevronLeft,
  Clock,
  Flame,
  LayoutGrid,
  Leaf,
  Merge,
  Minus,
  NotebookPen,
  Pause,
  Plus,
  Receipt,
  Search,
  SlidersHorizontal,
  Sparkles,
  Split,
  TriangleAlert,
  X,
} from 'lucide-react';
import type { PosCheck, PosTable } from '@vela/contracts';
import { cn } from '@vela/ui';
import { usePos } from '@/lib/pos-store';
import { usePosOps, buildCheckView, type DisplayLine } from '@/lib/pos-api';
import {
  CATS,
  MENU,
  MENU_BY_ID,
  OUTLETS,
  VISTA_OVERLAYS,
  LAGOON_TAB_META,
  clockOf,
  fm,
  type OutletKey,
  type PosMenuItem,
} from '@/lib/pos-data';
import { ModifierSheet } from './modifier-sheet';

const VOID_REASONS = ['Server error', 'Guest changed mind', 'Kitchen remake', '86 after order'];
const NO_LINES: never[] = [];

const STATUS_DOT: Record<DisplayLine['status'], string> = {
  unsent: 'var(--line-strong)',
  held: 'var(--status-caution-ink)',
  kitchen: 'var(--status-info-ink)',
  served: 'var(--status-positive-ink)',
};

function Chip({ label, active, onTap }: { label: string; active: boolean; onTap: () => void }) {
  return (
    <button
      onClick={onTap}
      className={cn(
        'h-9 rounded-lg px-[13px] text-[12.5px] font-semibold transition-colors duration-[var(--motion-fast)]',
        active
          ? 'bg-[var(--bg-surface)] text-[var(--ink-accent)] shadow-[var(--shadow-e3)]'
          : 'text-[var(--ink-tertiary)]',
      )}
    >
      {label}
    </button>
  );
}

/** Order entry: course-timeline check panel + menu grid with 86/low-stock/allergen states. */
export function OrderScreen({
  check,
  tables,
}: {
  check: PosCheck | undefined;
  tables: PosTable[];
}) {
  const s = usePos();
  const { fireLines, voidServerLine } = usePosOps();
  const [modItem, setModItem] = useState<PosMenuItem | null>(null);

  const outletCfg = OUTLETS[s.outletCode] ?? OUTLETS.VISTA!;
  const outletKey: OutletKey = outletCfg.key;
  const quick = outletKey !== 'vista';

  const clientLines = usePos((st) => (check ? st.lines[check.id] : undefined)) ?? NO_LINES;
  const discount = usePos((st) => (check ? st.discounts[check.id] : undefined));
  const view = useMemo(
    () => buildCheckView(check, clientLines, discount, quick),
    [check, clientLines, discount, quick],
  );

  if (!check) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <div className="flex max-w-[420px] flex-col items-center gap-3.5 p-12 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-[var(--bg-sunken)] text-[var(--ink-tertiary)]">
            <NotebookPen className="size-[26px]" />
          </span>
          <span className="font-display text-[19px] font-semibold">
            No check open on this terminal
          </span>
          <span className="text-[13.5px] text-[var(--ink-secondary)]">
            {outletKey === 'lagoon'
              ? 'Open a tab from the Tabs board — quick-service mode, no table required.'
              : outletKey === 'rs'
                ? 'Room-service orders arrive in the Queue — tied to a room with delivery tracking.'
                : 'Pick a table from the floor to start a check, or seat a party from the waitlist.'}
          </span>
          <button
            onClick={() => s.set({ screen: 'floor' })}
            className="h-12 rounded-[var(--radius-md)] bg-[var(--interactive-default)] px-[22px] text-[14.5px] font-semibold text-[var(--ink-inverse)] hover:bg-[var(--interactive-hover)]"
          >
            {outletKey === 'lagoon'
              ? 'Go to tabs'
              : outletKey === 'rs'
                ? 'Go to queue'
                : 'Go to floor'}
          </button>
        </div>
      </div>
    );
  }

  const tableLabel = tables.find((t) => t.id === check.tableId)?.label ?? null;
  const displayLabel = tableLabel
    ? outletKey === 'vista'
      ? `Table ${tableLabel}`
      : tableLabel
    : `Tab #${check.checkNumber}`;
  const guest =
    (tableLabel && outletKey === 'vista' && VISTA_OVERLAYS[tableLabel]?.guest) ||
    (tableLabel && outletKey === 'lagoon' && LAGOON_TAB_META[tableLabel]?.guest) ||
    null;

  const seatNums = [...new Set([1, 2, ...view.lines.map((l) => l.seat)])].sort((a, b) => a - b);
  const selLineObj = view.lines.find(
    (l) => l.key === s.selLine || (l.uid !== null && l.uid !== undefined && l.uid === s.selLine),
  );

  // ── Check actions ──
  const addItem = (mi: PosMenuItem) => {
    if (s.e86[mi.id]) {
      s.showToast(`${mi.name} is 86'd — out of stock across all terminals and QR menus.`);
      return;
    }
    if (mi.mods) {
      setModItem(mi);
      return;
    }
    pushClient(mi, [], 0, 1);
  };

  const pushClient = (mi: PosMenuItem, mods: string[], modDelta: number, qty: number) => {
    s.addLine(check.id, {
      itemId: mi.id,
      name: mi.name,
      qty,
      price: mi.price,
      bev: !!mi.bev,
      seat: s.selSeat,
      course: quick ? 1 : s.selCourse,
      status: 'new',
      mods,
      modDelta,
      station: mi.station,
    });
  };

  const sendAll = () => {
    const toFire = clientLines.filter((l) => l.status === 'new');
    const hasServerUnsent = view.lines.some((l) => l.source === 'server' && l.status === 'unsent');
    if (!toFire.length && !hasServerUnsent) {
      s.showToast('Nothing to send — every item is already with the kitchen.');
      return;
    }
    const stations = [...new Set(toFire.map((l) => l.station))];
    void fireLines(check.id, toFire, hasServerUnsent).then((r) => {
      s.showToast(
        r === 'queued'
          ? 'Offline — fire queued in the op log with an idempotency key.'
          : `Fired to ${stations.join(' · ') || 'kitchen'} — routing rules applied.`,
        'View KDS',
        () => s.set({ screen: 'kds' }),
      );
    });
  };

  const fireCourse = (course: number) => {
    const toFire = clientLines.filter(
      (l) => l.course === course && (l.status === 'new' || l.status === 'held'),
    );
    if (!toFire.length) return;
    void fireLines(check.id, toFire, false).then((r) => {
      s.showToast(
        r === 'queued'
          ? `Course ${course} queued — fires on reconnect.`
          : `Course ${course} fired — routing rules applied.`,
      );
    });
  };

  const holdCourse = (course: number) => {
    s.updateLines(
      check.id,
      clientLines.map((l) =>
        l.course === course && l.status === 'new' ? { ...l, status: 'held' } : l,
      ),
    );
    s.showToast(`Course ${course} held — fire when the table is ready.`);
  };

  const lineOp = (op: 'inc' | 'dec' | 'repeat' | 'comp' | 'void', reason?: string) => {
    if (!selLineObj) return;
    if (selLineObj.source === 'client') {
      const lines = [...clientLines];
      const i = lines.findIndex((l) => l.uid === selLineObj.uid);
      if (i < 0) return;
      const l = lines[i]!;
      if (op === 'inc') lines[i] = { ...l, qty: l.qty + 1 };
      if (op === 'dec') {
        if (l.qty <= 1) lines.splice(i, 1);
        else lines[i] = { ...l, qty: l.qty - 1 };
      }
      if (op === 'repeat') {
        const mi = MENU_BY_ID.get(l.itemId);
        if (mi) pushClient(mi, l.mods, l.modDelta, l.qty);
      }
      if (op === 'comp') {
        lines[i] = { ...l, comp: true };
        s.addAudit({
          type: 'Comp',
          item: l.name,
          amt: (l.price + l.modDelta) * l.qty,
          reason: 'Guest recovery',
          by: 'F. Doyle',
          appr: 'M. Ramos',
        });
        s.showToast('Comp applied — reason-coded and on the manager audit trail.');
      }
      if (op === 'void') {
        lines.splice(i, 1);
        s.addAudit({
          type: 'Void',
          item: l.name,
          amt: (l.price + l.modDelta) * l.qty,
          reason: reason ?? 'Server error',
          by: 'F. Doyle',
          appr: 'M. Ramos',
        });
        s.showToast(`Voided · ${reason} — logged for audit.`);
      }
      if (op !== 'repeat') s.updateLines(check.id, lines);
      s.set({ selLine: op === 'inc' ? s.selLine : null, voidOpen: false });
      return;
    }
    // Lines already with the kitchen: adjustments are reason-coded negative postings.
    if (op === 'inc' || op === 'dec') {
      s.showToast('Already with the kitchen — repeat to add another, or void with a reason.');
      return;
    }
    if (op === 'repeat') {
      const mi = MENU.find((m) => m.name === selLineObj.name);
      if (mi)
        pushClient(
          mi,
          selLineObj.mods,
          selLineObj.cents / selLineObj.qty - mi.price,
          selLineObj.qty,
        );
      s.set({ selLine: null });
      return;
    }
    const kind = op === 'comp' ? 'Comp' : 'Void';
    void voidServerLine(
      check.id,
      { name: selLineObj.name, cents: selLineObj.cents },
      op === 'comp' ? 'Guest recovery' : (reason ?? 'Server error'),
    ).then((r) => {
      s.addAudit({
        type: kind,
        item: selLineObj.name,
        amt: selLineObj.cents,
        reason: op === 'comp' ? 'Guest recovery' : (reason ?? 'Server error'),
        by: 'F. Doyle',
        appr: 'M. Ramos',
      });
      s.showToast(
        r === 'queued'
          ? `${kind} queued in the op log — applies on reconnect.`
          : op === 'comp'
            ? 'Comp applied — reason-coded and on the manager audit trail.'
            : `Voided · ${reason} — logged for audit.`,
      );
    });
    s.set({ selLine: null, voidOpen: false });
  };

  // ── Course groups ──
  const courseGroups = view.courses.map((course) => {
    const items = view.lines.filter((l) => l.course === course);
    const hasNew = items.some((l) => l.status === 'unsent');
    const hasHeld = items.some((l) => l.status === 'held');
    const hasKitchen = items.some((l) => l.status === 'kitchen');
    const state = hasNew
      ? {
          label: `${items.filter((l) => l.status === 'unsent').length} unsent`,
          ink: 'var(--ink-secondary)',
          bg: 'var(--bg-sunken)',
          node: 'var(--line-strong)',
          fill: 'var(--bg-surface)',
        }
      : hasHeld
        ? {
            label: 'Held — ready to fire',
            ink: 'var(--status-caution-ink)',
            bg: 'var(--status-caution-bg)',
            node: 'var(--status-caution-ink)',
            fill: 'var(--status-caution-bg)',
          }
        : hasKitchen
          ? {
              label: 'In kitchen',
              ink: 'var(--status-info-ink)',
              bg: 'var(--status-info-bg)',
              node: 'var(--status-info-ink)',
              fill: 'var(--status-info-ink)',
            }
          : {
              label: 'Served',
              ink: 'var(--status-positive-ink)',
              bg: 'var(--status-positive-bg)',
              node: 'var(--status-positive-ink)',
              fill: 'var(--status-positive-ink)',
            };
    return { course, items, hasNew, hasHeld, state };
  });

  // ── Menu ──
  const cats = CATS[outletKey];
  const catId = cats.some((c) => c.id === s.cat) ? s.cat : cats[0]!.id;
  const ql = s.q.trim().toLowerCase();
  const wide = !!ql || s.mfilter !== 'all';
  const catIds = new Set(cats.map((c) => c.id));
  const menuItems = MENU.filter((m) => (wide ? catIds.has(m.cat) : m.cat === catId))
    .filter((m) => !ql || m.name.toLowerCase().includes(ql))
    .filter((m) => (s.mfilter === 'popular' ? m.popular : s.mfilter === 'veg' ? m.veg : true));

  const statusSummary = (
    [
      ['served', 'served', 'var(--status-positive-ink)'],
      ['kitchen', 'in kitchen', 'var(--status-info-ink)'],
      ['held', 'held', 'var(--status-caution-ink)'],
      ['unsent', 'unsent', 'var(--line-strong)'],
    ] as const
  )
    .map(([k, label, dot]) => ({ n: view.lines.filter((l) => l.status === k).length, label, dot }))
    .filter((x) => x.n > 0);

  const hasSnapper = view.lines.some((l) => l.name === 'Snapper a la talla');
  const albCount = view.lines
    .filter((l) => l.name === 'Albariño · glass')
    .reduce((a, l) => a + l.qty, 0);
  const upsellOn = outletKey === 'vista' && hasSnapper && albCount < 3 && !s.upsellDismissed;

  const unsent = view.unsentCount;

  return (
    <div className="flex min-h-0 flex-1">
      {/* ── Check panel ── */}
      <div className="flex w-[470px] min-h-0 flex-none flex-col border-r border-[var(--line-hairline)] bg-[var(--bg-surface)]">
        <div className="flex flex-none items-center gap-3 border-b border-[var(--line-hairline)] px-4 py-3.5">
          <button
            onClick={() => s.set({ screen: 'floor' })}
            className="flex size-11 flex-none items-center justify-center rounded-[10px] border border-[var(--line-hairline)] text-[var(--ink-secondary)] hover:bg-[var(--bg-sunken)]"
          >
            <ChevronLeft className="size-[19px]" />
          </button>
          <div className="flex min-w-0 flex-1 flex-col gap-px">
            <div className="flex items-center gap-2.5">
              <span className="whitespace-nowrap font-display text-[19px] font-semibold tracking-tight">
                {displayLabel}
              </span>
              {guest && (
                <span className="flex h-[26px] items-center gap-1.5 rounded-[var(--radius-full)] bg-[var(--interactive-selected)] px-2.5 text-[11.5px] font-semibold text-[var(--ink-accent)]">
                  <BedDouble className="size-[13px]" />
                  {guest.name} · Room {guest.room}
                </span>
              )}
            </div>
            <span className="text-xs text-[var(--ink-tertiary)]">
              {check.covers} covers · opened {clockOf(new Date(check.openedAt))} · Frankie D.
            </span>
          </div>
          <span data-numeric className="font-mono text-[12.5px] text-[var(--ink-tertiary)]">
            #{check.checkNumber}
          </span>
        </div>

        {!quick && (
          <div className="flex flex-none flex-wrap items-center gap-2.5 border-b border-[var(--line-hairline)] px-4 py-2.5">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[var(--ink-tertiary)]">
              Adding to
            </span>
            <span className="inline-flex gap-0.5 rounded-[10px] bg-[var(--bg-sunken)] p-[3px]">
              {seatNums.map((n) => (
                <Chip
                  key={n}
                  label={`Seat ${n}`}
                  active={s.selSeat === n}
                  onTap={() => s.set({ selSeat: n })}
                />
              ))}
              <Chip
                label="+"
                active={false}
                onTap={() => s.set({ selSeat: Math.max(...seatNums) + 1 })}
              />
            </span>
            <span className="inline-flex gap-0.5 rounded-[10px] bg-[var(--bg-sunken)] p-[3px]">
              {[1, 2, 3].map((n) => (
                <Chip
                  key={n}
                  label={`C${n}`}
                  active={s.selCourse === n}
                  onTap={() => s.set({ selCourse: n })}
                />
              ))}
            </span>
          </div>
        )}

        {/* Course timeline */}
        <div className="min-h-[130px] flex-1 overflow-auto px-2 py-1.5">
          {courseGroups.map((cg, ci) => (
            <div key={cg.course} className="flex pl-1 pt-0.5">
              <div className="flex w-[26px] flex-none flex-col items-center">
                <span
                  className="mt-[9px] size-[13px] flex-none rounded-full border-[2.5px] shadow-[0_0_0_3px_var(--bg-surface)]"
                  style={{ borderColor: cg.state.node, background: cg.state.fill }}
                />
                {ci < courseGroups.length - 1 && (
                  <span className="mt-[3px] w-0.5 flex-1 rounded bg-[var(--line-hairline)]" />
                )}
              </div>
              <div className="min-w-0 flex-1 pb-2.5 pl-1">
                <div className="flex items-center gap-2 px-2 pb-1 pt-1.5">
                  <span className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[var(--ink-tertiary)]">
                    {quick ? 'Items' : `Course ${cg.course}`}
                  </span>
                  <span
                    className="inline-flex h-5 items-center rounded-[var(--radius-full)] px-2 text-[10.5px] font-semibold"
                    style={{ background: cg.state.bg, color: cg.state.ink }}
                  >
                    {cg.state.label}
                  </span>
                  <span className="flex-1" />
                  {cg.hasNew && !quick && (
                    <button
                      onClick={() => holdCourse(cg.course)}
                      className="flex h-8 items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--line-strong)] bg-[var(--bg-surface)] px-3 text-xs font-semibold hover:bg-[var(--bg-sunken)]"
                    >
                      <Pause className="size-[13px]" />
                      Hold
                    </button>
                  )}
                  {(cg.hasNew || cg.hasHeld) && (
                    <button
                      onClick={() => fireCourse(cg.course)}
                      className="flex h-8 items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--line-strong)] bg-[var(--bg-surface)] px-3 text-xs font-semibold hover:bg-[var(--bg-sunken)]"
                    >
                      <Flame className="size-[13px]" />
                      Fire
                    </button>
                  )}
                </div>
                {cg.items.map((ln) => (
                  <button
                    key={ln.key}
                    onClick={() =>
                      s.set({
                        selLine: s.selLine === (ln.uid ?? ln.key) ? null : (ln.uid ?? ln.key),
                        voidOpen: false,
                      })
                    }
                    className="flex w-full items-start gap-2.5 rounded-[var(--radius-md)] px-2 py-[9px] text-left hover:bg-[var(--bg-sunken)]"
                    style={{
                      background:
                        s.selLine === (ln.uid ?? ln.key)
                          ? 'var(--interactive-selected)'
                          : undefined,
                    }}
                  >
                    <span
                      data-numeric
                      className="flex h-[22px] w-6 flex-none items-center justify-center rounded-[var(--radius-xs)] bg-[var(--bg-sunken)] font-mono text-[11.5px] font-semibold text-[var(--ink-secondary)]"
                    >
                      {ln.qty}×
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-px">
                      <span
                        className="text-[14px] font-semibold"
                        style={{ textDecoration: ln.comp ? 'line-through' : 'none' }}
                      >
                        {ln.name}
                      </span>
                      {ln.mods.length > 0 && (
                        <span className="text-[11.5px] text-[var(--ink-tertiary)]">
                          {ln.mods.join(' · ')}
                        </span>
                      )}
                      {ln.comp && (
                        <span className="text-[11.5px] font-semibold text-[var(--status-positive-ink)]">
                          Comp — guest recovery
                        </span>
                      )}
                    </span>
                    <span className="flex flex-none items-center gap-2">
                      <span
                        className="size-[7px] rounded-full"
                        style={{ background: STATUS_DOT[ln.status] }}
                        title={ln.status}
                      />
                      {!quick && (
                        <span className="rounded-[var(--radius-xs)] bg-[var(--bg-sunken)] px-[5px] py-0.5 text-[10.5px] font-semibold text-[var(--ink-tertiary)]">
                          S{ln.seat}
                        </span>
                      )}
                      <span
                        data-numeric
                        className="font-mono text-[13.5px]"
                        style={{
                          color: ln.comp ? 'var(--ink-tertiary)' : 'var(--ink-primary)',
                          textDecoration: ln.comp ? 'line-through' : 'none',
                        }}
                      >
                        {fm(ln.comp ? 0 : ln.cents)}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Selection actions */}
        {selLineObj && (
          <div className="flex flex-none items-center gap-1.5 border-t border-[var(--line-hairline)] bg-[var(--bg-sunken)] px-3 py-2.5">
            <span className="min-w-0 flex-1 truncate whitespace-nowrap text-xs font-semibold text-[var(--ink-secondary)]">
              {selLineObj.qty}× {selLineObj.name}
            </span>
            {!s.voidOpen ? (
              <span className="flex items-center gap-1.5">
                <button
                  onClick={() => lineOp('dec')}
                  className="flex size-10 items-center justify-center rounded-[var(--radius-md)] border border-[var(--line-strong)] bg-[var(--bg-surface)]"
                >
                  <Minus className="size-4" />
                </button>
                <button
                  onClick={() => lineOp('inc')}
                  className="flex size-10 items-center justify-center rounded-[var(--radius-md)] border border-[var(--line-strong)] bg-[var(--bg-surface)]"
                >
                  <Plus className="size-4" />
                </button>
                <button
                  onClick={() => lineOp('repeat')}
                  className="h-10 rounded-[var(--radius-md)] border border-[var(--line-strong)] bg-[var(--bg-surface)] px-3 text-[12.5px] font-semibold"
                >
                  Repeat
                </button>
                <button
                  onClick={() => lineOp('comp')}
                  className="h-10 rounded-[var(--radius-md)] border border-[var(--line-strong)] bg-[var(--bg-surface)] px-3 text-[12.5px] font-semibold"
                >
                  Comp
                </button>
                <button
                  onClick={() => s.set({ voidOpen: true })}
                  className="h-10 rounded-[var(--radius-md)] border border-[var(--status-critical-line)] bg-[var(--status-critical-bg)] px-3 text-[12.5px] font-semibold text-[var(--status-critical-ink)]"
                >
                  Void
                </button>
              </span>
            ) : (
              <span className="flex flex-wrap items-center gap-1.5">
                {VOID_REASONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => lineOp('void', r)}
                    className="h-9 rounded-[var(--radius-full)] border border-[var(--line-strong)] bg-[var(--bg-surface)] px-[11px] text-xs font-semibold"
                  >
                    {r}
                  </button>
                ))}
              </span>
            )}
            <button
              onClick={() => s.set({ selLine: null, voidOpen: false })}
              className="flex size-9 items-center justify-center text-[var(--ink-tertiary)]"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        {/* Totals */}
        <div className="flex flex-none flex-col gap-[5px] border-t border-[var(--line-hairline)] px-4 py-3">
          {statusSummary.length > 0 && (
            <div className="flex items-center gap-3 pb-1">
              {statusSummary.map((su) => (
                <span
                  key={su.label}
                  className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-[var(--ink-secondary)]"
                >
                  <span className="size-[7px] rounded-full" style={{ background: su.dot }} />
                  {su.n} {su.label}
                </span>
              ))}
            </div>
          )}
          <div className="flex justify-between text-[13px] text-[var(--ink-secondary)]">
            <span>Subtotal</span>
            <span data-numeric className="font-mono">
              {fm(view.sub)}
            </span>
          </div>
          {view.svc > 0 && (
            <div className="flex justify-between text-[13px] text-[var(--ink-secondary)]">
              <span>Service · auto-gratuity 20%</span>
              <span data-numeric className="font-mono">
                {fm(view.svc)}
              </span>
            </div>
          )}
          {view.disc > 0 && (
            <div className="flex justify-between text-[13px] text-[var(--fin-refund)]">
              <span>{view.discLabel ?? 'Discount'}</span>
              <span data-numeric className="font-mono">
                {fm(-view.disc)}
              </span>
            </div>
          )}
          <div className="mt-[3px] flex items-baseline justify-between border-t border-[var(--line-hairline)] pt-1.5">
            <span className="text-[14px] font-semibold">Total</span>
            <span data-numeric className="font-display text-[24px] font-semibold tracking-tight">
              {fm(view.total)}
            </span>
          </div>
          <span className="text-[10.5px] text-[var(--ink-tertiary)]">
            Menu prices include dine-in tax — totals post to the ledger as-is.
          </span>
        </div>

        <div className="flex flex-none flex-col gap-2 px-4 pb-3.5">
          <div className="flex gap-2">
            <button
              onClick={sendAll}
              className="flex h-[54px] flex-[1.4] items-center justify-center gap-[9px] rounded-[var(--radius-md)] text-[15px] font-semibold"
              style={{
                background: unsent ? 'var(--interactive-default)' : 'var(--interactive-disabled)',
                color: unsent ? 'var(--ink-inverse)' : 'var(--ink-disabled)',
              }}
            >
              <Flame className="size-[17px]" />
              {unsent ? `Send ${unsent} to kitchen` : 'Send'}
            </button>
            <button
              onClick={() => s.set({ payStep: 'summary' })}
              className="flex h-[54px] flex-1 items-center justify-center gap-[9px] rounded-[var(--radius-md)] border border-[var(--line-strong)] bg-[var(--bg-surface)] text-[15px] font-semibold hover:bg-[var(--bg-sunken)]"
            >
              <Receipt className="size-[17px]" />
              Pay
            </button>
          </div>
          <div className="flex justify-between gap-1">
            {(
              [
                { label: 'Split', icon: Split, onTap: () => s.set({ payStep: 'summary' }) },
                {
                  label: 'Transfer',
                  icon: ArrowRightLeft,
                  onTap: () =>
                    s.showToast(
                      s.offline
                        ? 'Transfers require connectivity — a check belongs to one terminal at a time.'
                        : 'Transfer check — pick a destination table or server.',
                    ),
                },
                {
                  label: 'Merge',
                  icon: Merge,
                  onTap: () =>
                    s.showToast(`Merge — pick the check to absorb into #${check.checkNumber}.`),
                },
                {
                  label: 'Discount',
                  icon: BadgePercent,
                  onTap: () => s.set({ payStep: 'summary' }),
                },
              ] as const
            ).map((a) => {
              const Icon = a.icon;
              return (
                <button
                  key={a.label}
                  onClick={a.onTap}
                  className="flex h-[38px] flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-md)] text-[12.5px] font-semibold text-[var(--ink-secondary)] hover:bg-[var(--bg-sunken)]"
                >
                  <Icon className="size-3.5" />
                  {a.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Menu ── */}
      <div className="flex min-w-0 min-h-0 flex-1 flex-col">
        <div className="flex flex-none items-center gap-3 px-4 py-3">
          <span className="inline-flex h-[34px] items-center gap-[7px] whitespace-nowrap rounded-[var(--radius-full)] border border-[var(--line-hairline)] bg-[var(--bg-surface)] px-3 text-[12.5px] font-semibold text-[var(--ink-secondary)]">
            <Clock className="size-3.5" />
            {outletCfg.daypartChip}
          </span>
          <span className="inline-flex gap-0.5 rounded-[10px] border border-[var(--line-hairline)] bg-[var(--bg-surface)] p-[3px]">
            {(
              [
                { id: 'all', label: 'All', icon: LayoutGrid },
                { id: 'popular', label: 'Popular', icon: Flame },
                { id: 'veg', label: 'Vegetarian', icon: Leaf },
              ] as const
            ).map((f) => {
              const Icon = f.icon;
              const active = s.mfilter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => s.set({ mfilter: f.id })}
                  className={cn(
                    'inline-flex h-[34px] items-center gap-[7px] whitespace-nowrap rounded-lg px-[13px] text-[12.5px] font-semibold transition-colors duration-[var(--motion-fast)]',
                    active
                      ? 'bg-[var(--interactive-selected)] text-[var(--ink-accent)]'
                      : 'text-[var(--ink-tertiary)]',
                  )}
                >
                  <Icon className="size-3.5" />
                  {f.label}
                </button>
              );
            })}
          </span>
          <div className="flex-1" />
          <div className="relative w-[300px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--ink-tertiary)]" />
            <input
              value={s.q}
              onChange={(e) => s.set({ q: e.target.value })}
              placeholder="Search menu"
              className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--line-strong)] bg-[var(--bg-surface)] pl-[38px] pr-3 text-[14px] text-[var(--ink-primary)] outline-none focus:border-[var(--line-focus)]"
            />
          </div>
        </div>

        {upsellOn && (
          <div className="mx-4 mb-2.5 flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--line-hairline)] bg-[var(--interactive-selected)] px-3.5 py-[11px]">
            <Sparkles className="size-[17px] flex-none text-[var(--ink-accent)]" />
            <span className="flex-1 text-[13px]">
              Pairs with the snapper — Albariño by the glass. Guests add it 64% of the time.
            </span>
            <button
              onClick={() => {
                const alb = MENU_BY_ID.get('albarino');
                if (alb) pushClient(alb, [], 0, 1);
                s.set({ upsellDismissed: true });
              }}
              className="h-[38px] rounded-[var(--radius-md)] bg-[var(--interactive-default)] px-3.5 text-[12.5px] font-semibold text-[var(--ink-inverse)] hover:bg-[var(--interactive-hover)]"
            >
              Add · $11
            </button>
            <button
              onClick={() => s.set({ upsellDismissed: true })}
              className="flex size-[34px] items-center justify-center text-[var(--ink-tertiary)]"
            >
              <X className="size-[15px]" />
            </button>
          </div>
        )}

        <div className="flex min-h-0 flex-1">
          <div className="flex w-[184px] flex-none flex-col gap-1 overflow-auto pb-3 pl-4 pr-2">
            {cats.map((mc) => {
              const Icon = mc.icon;
              const active = catId === mc.id && !wide;
              return (
                <button
                  key={mc.id}
                  onClick={() => s.set({ cat: mc.id, q: '', mfilter: 'all' })}
                  className={cn(
                    'relative flex h-[50px] flex-none items-center gap-2.5 rounded-[var(--radius-md)] pl-4 pr-3 text-left text-[13.5px] font-semibold transition-colors duration-[var(--motion-fast)]',
                    active
                      ? 'bg-[var(--interactive-selected)] text-[var(--ink-accent)]'
                      : 'text-[var(--ink-secondary)] hover:bg-[var(--bg-sunken)]',
                  )}
                >
                  <span
                    className="absolute bottom-[11px] left-[3px] top-[11px] w-[3px] rounded-sm"
                    style={{ background: active ? 'var(--interactive-default)' : 'transparent' }}
                  />
                  <Icon className="size-[17px]" />
                  <span className="min-w-0 flex-1 truncate">{mc.label}</span>
                  <span data-numeric className="font-mono text-[11px] text-[var(--ink-tertiary)]">
                    {MENU.filter((m) => m.cat === mc.id).length}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="min-w-0 flex-1 overflow-auto pb-4 pl-2 pr-4">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(172px,1fr))] content-start gap-2.5">
              {menuItems.map((mi) => {
                const is86 = !!s.e86[mi.id];
                const low = !is86 && mi.id === 'lobster';
                const CatIcon = cats.find((c) => c.id === mi.cat)?.icon ?? LayoutGrid;
                return (
                  <button
                    key={mi.id}
                    onClick={() => addItem(mi)}
                    className="relative flex min-h-[118px] flex-col gap-2 rounded-[var(--radius-lg)] border border-[var(--line-hairline)] bg-[var(--bg-surface)] p-3 text-left transition-[box-shadow,transform] duration-[var(--motion-fast)] hover:-translate-y-px hover:shadow-[var(--shadow-e3)]"
                    style={{ opacity: is86 ? 0.45 : 1 }}
                  >
                    <span className="flex items-start gap-2">
                      <span
                        className="flex size-[30px] flex-none items-center justify-center rounded-[9px]"
                        style={{
                          background: mi.popular
                            ? 'var(--interactive-selected)'
                            : 'var(--bg-sunken)',
                          color: mi.popular ? 'var(--ink-accent)' : 'var(--ink-secondary)',
                        }}
                      >
                        <CatIcon className="size-[15px]" />
                      </span>
                      <span className="flex-1" />
                      {mi.popular && !is86 && (
                        <span className="flex h-[21px] items-center gap-1 rounded-[var(--radius-full)] bg-[var(--interactive-selected)] px-[7px] text-[10px] font-bold text-[var(--ink-accent)]">
                          <Flame className="size-2.5" />
                          Popular
                        </span>
                      )}
                      {is86 && (
                        <span className="flex h-[21px] items-center rounded-[var(--radius-xs)] border border-[var(--status-critical-line)] bg-[var(--status-critical-bg)] px-2 text-[10.5px] font-bold tracking-[0.04em] text-[var(--status-critical-ink)]">
                          86
                        </span>
                      )}
                      {low && (
                        <span className="flex h-[21px] items-center rounded-[var(--radius-xs)] border border-[var(--status-caution-line)] bg-[var(--status-caution-bg)] px-2 text-[10.5px] font-semibold text-[var(--status-caution-ink)]">
                          4 left
                        </span>
                      )}
                    </span>
                    <span className="text-[14px] font-semibold leading-[1.3]">{mi.name}</span>
                    <span className="flex-1" />
                    <span className="flex items-center gap-[7px]">
                      <span data-numeric className="font-mono text-[14px] font-semibold">
                        {fm(mi.price)}
                      </span>
                      <span className="flex-1" />
                      {mi.veg && (
                        <Leaf
                          className="size-[13px] text-[var(--status-positive-ink)]"
                          aria-label="Vegetarian"
                        />
                      )}
                      {mi.allergen && (
                        <TriangleAlert
                          className="size-[13px] text-[var(--status-caution-ink)]"
                          aria-label={`${mi.allergen} allergen`}
                        />
                      )}
                      {mi.mods && (
                        <SlidersHorizontal
                          className="size-[13px] text-[var(--ink-tertiary)]"
                          aria-label="Has forced choices"
                        />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {modItem && (
        <ModifierSheet
          item={modItem}
          onClose={() => setModItem(null)}
          onConfirm={(mods, delta, qty) => {
            pushClient(modItem, mods, delta, qty);
            setModItem(null);
          }}
        />
      )}
    </div>
  );
}
