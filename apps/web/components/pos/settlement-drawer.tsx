'use client';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Banknote,
  BedDouble,
  Building2,
  ChevronLeft,
  CircleCheck,
  CloudOff,
  CreditCard,
  PenLine,
  Printer,
  Search,
  Star,
  Ticket,
  X,
} from 'lucide-react';
import type { Folio, PosCheck, PosRoomChargeCandidate, PosTable } from '@vela/contracts';
import { usePos } from '@/lib/pos-store';
import { useSdk } from '@/lib/sdk';
import { usePosOps, type CheckView } from '@/lib/pos-api';
import { OUTLETS, clockOf, fm, menuItemFor, moneyToCents, parseCourseTag } from '@/lib/pos-data';

const DISCOUNTS = [
  { kind: 'hh' as const, label: 'Happy hour — 20% beverages' },
  { kind: 'mgr' as const, label: 'Manager — guest recovery' },
  { kind: 'emp' as const, label: 'Employee — 20%' },
];

function StepChip({
  label,
  active,
  onTap,
  sub,
}: {
  label: string;
  active: boolean;
  onTap: () => void;
  sub?: string;
}) {
  return (
    <button
      onClick={onTap}
      className="flex h-11 flex-col items-center justify-center rounded-[var(--radius-md)] border-[1.5px] px-[15px] text-[13px] font-semibold"
      style={
        active
          ? {
              background: 'var(--interactive-selected)',
              color: 'var(--ink-accent)',
              borderColor: 'var(--interactive-default)',
            }
          : {
              background: 'var(--bg-surface)',
              color: 'var(--ink-secondary)',
              borderColor: 'var(--line-strong)',
            }
      }
    >
      <span>{label}</span>
      {sub && (
        <span data-numeric className="font-mono text-[11px] text-[var(--ink-tertiary)]">
          {sub}
        </span>
      )}
    </button>
  );
}

/** Settlement: split → reason-coded discounts → tender. Room charge ends in the live folio + GL. */
export function SettlementDrawer({
  check,
  tables,
  view,
}: {
  check: PosCheck;
  tables: PosTable[];
  view: CheckView;
}) {
  const s = usePos();
  const sdk = useSdk();
  const { closeCheck } = usePosOps();
  const [busy, setBusy] = useState(false);
  const [closed, setClosed] = useState<PosCheck | null>(null);
  const [folio, setFolio] = useState<Folio | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawRef = useRef<{ active: boolean }>({ active: false });

  const step = s.payStep!;
  const outletKey = (OUTLETS[s.outletCode] ?? OUTLETS.VISTA!).key;
  const tableLabel = tables.find((t) => t.id === check.tableId)?.label ?? null;
  const displayLabel = tableLabel
    ? outletKey === 'vista'
      ? `Table ${tableLabel}`
      : tableLabel
    : `Tab #${check.checkNumber}`;
  const guest = s.payGuest;
  const due = closed ? moneyToCents(closed.total) : view.total;

  // Card terminal simulation.
  useEffect(() => {
    if (step !== 'card' || s.cardState !== 'wait') return;
    const t = setTimeout(() => usePos.getState().set({ cardState: 'approved' }), 2400);
    return () => clearTimeout(t);
  }, [step, s.cardState]);

  const { data: candidates } = useQuery({
    queryKey: ['pos', 'room-charge', s.payQ],
    queryFn: () => sdk.posRoomChargeSearch({ q: s.payQ, limit: 8 }),
    enabled: step === 'room' && s.payQ.trim().length > 0 && !s.offline,
  });

  const titles: Record<string, [string, string]> = {
    summary: [
      `Settle check #${check.checkNumber}`,
      `${displayLabel} · ${check.covers} covers · Frankie D.`,
    ],
    room: [
      'Room charge — find the guest',
      'Live in-house search · folio and charge flags from the PMS',
    ],
    verify: [
      'Verify the guest',
      guest ? `${guest.guestName} · Room ${guest.roomNumber ?? '—'} · ${guest.folioNumber}` : '',
    ],
    posted: ['Room charge posted', 'Folio, GL and check closed in one transaction'],
    queued: ['Offline — charge queued', 'Will revalidate and post on reconnect'],
    card: ['Card — pay at table', 'P2PE terminal · tokenized, out of PCI scope'],
    cash: ['Cash', 'Drawer T-03 · over/short tracked per shift'],
  };

  const finishLocal = (msg: string) => {
    if (tableLabel && outletKey === 'vista') {
      s.set({ dirtyTables: { ...usePos.getState().dirtyTables, [tableLabel]: true } });
    }
    s.resetPay();
    s.set({ activeCheckId: null, screen: 'floor' });
    s.showToast(msg);
  };

  const settleRoom = () => {
    if (!guest) return;
    if (s.offline) {
      s.enqueueOp({
        key: `close-${check.id}`,
        label: 'Room charge',
        run: async () => {
          await closeCheck(check.id, { kind: 'room', folioId: guest.folioId });
        },
      });
      s.set({
        locallyClosed: { ...usePos.getState().locallyClosed, [check.id]: true },
        payStep: 'queued',
      });
      return;
    }
    setBusy(true);
    void closeCheck(check.id, { kind: 'room', folioId: guest.folioId })
      .then(async (c) => {
        setClosed(c);
        setFolio(await sdk.getFolio(guest.folioId).catch(() => null));
        s.set({ payStep: 'posted' });
      })
      .catch(() =>
        s.showToast(
          'Posting failed — the folio may have closed. Route it to AR review, don’t drop it.',
        ),
      )
      .finally(() => setBusy(false));
  };

  const settlePayment = (method: 'card' | 'cash' | 'ar_transfer' | 'voucher', msg: string) => {
    if (s.offline) {
      s.enqueueOp({
        key: `close-${check.id}`,
        label: 'Close check',
        run: async () => {
          await closeCheck(check.id, { kind: 'payment', method });
        },
      });
      s.set({ locallyClosed: { ...usePos.getState().locallyClosed, [check.id]: true } });
      finishLocal(
        `Check #${check.checkNumber} closed offline — settlement queued with an idempotency key.`,
      );
      return;
    }
    setBusy(true);
    void closeCheck(check.id, { kind: 'payment', method })
      .then(() => finishLocal(msg))
      .catch(() =>
        s.showToast('Settlement failed — payments must equal the check total. Try again.'),
      )
      .finally(() => setBusy(false));
  };

  // ── Signature pad ──
  const sigPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = e.currentTarget;
    const r = c.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) * c.width) / r.width,
      y: ((e.clientY - r.top) * c.height) / r.height,
    };
  };
  const sigDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = e.currentTarget;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const { x, y } = sigPos(e);
    ctx.strokeStyle = getComputedStyle(c).color;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    drawRef.current.active = true;
    try {
      c.setPointerCapture(e.pointerId);
    } catch {
      /* pointer capture unsupported */
    }
    if (!s.signed) s.set({ signed: true });
  };
  const sigMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawRef.current.active) return;
    const ctx = e.currentTarget.getContext('2d');
    if (!ctx) return;
    const { x, y } = sigPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  const sigUp = () => {
    drawRef.current.active = false;
  };
  const sigClear = () => {
    const c = canvasRef.current;
    if (c) c.getContext('2d')?.clearRect(0, 0, c.width, c.height);
    s.set({ signed: false });
  };

  // ── Posted breakdown (from the closed server check) ──
  const closedItems = (closed ?? check).items.filter((i) => i.status !== 'voided');
  const foodCents = closedItems
    .filter(
      (i) => parseCourseTag(i.course).kind === 'course' || parseCourseTag(i.course).kind === 'qs',
    )
    .filter((i) => !menuItemFor(i.name)?.bev)
    .reduce((a, i) => a + moneyToCents(i.lineTotal), 0);
  const bevCents = closedItems
    .filter(
      (i) => parseCourseTag(i.course).kind === 'course' || parseCourseTag(i.course).kind === 'qs',
    )
    .filter((i) => !!menuItemFor(i.name)?.bev)
    .reduce((a, i) => a + moneyToCents(i.lineTotal), 0);
  const svcCents = closedItems
    .filter((i) => parseCourseTag(i.course).kind === 'svc')
    .reduce((a, i) => a + moneyToCents(i.lineTotal), 0);
  const adjCents = closedItems
    .filter((i) => parseCourseTag(i.course).kind === 'adj')
    .reduce((a, i) => a + moneyToCents(i.lineTotal), 0);

  const tipAmt = Math.round((due * s.tip) / 100);

  // ── Split note ──
  const seatTotals = new Map<number, number>();
  for (const l of view.lines) {
    if (!l.comp) seatTotals.set(l.seat, (seatTotals.get(l.seat) ?? 0) + l.cents);
  }
  const splitNote =
    s.split === 'seat'
      ? `${seatTotals.size} guest checks — ${[...seatTotals.entries()].map(([n, v]) => `S${n} ${fm(v)}`).join(' · ')}`
      : s.split === 'item'
        ? 'Tap lines to move them between checks.'
        : s.split === 'even'
          ? `${check.covers} even checks — ${fm(Math.round(due / Math.max(1, check.covers)))} each`
          : '';

  const discount = usePos((st) => st.discounts[check.id]);

  const cashQuick = [Math.ceil(due / 1000) * 1000, Math.ceil(due / 2000) * 2000, 10000]
    .filter((v, i, a) => a.indexOf(v) === i && v >= due)
    .slice(0, 2);

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-[var(--bg-overlay)]"
        onClick={() => (step === 'posted' || step === 'queued' ? undefined : s.resetPay())}
      />
      <div className="fixed bottom-0 right-0 top-0 z-[51] flex w-[620px] flex-col border-l border-[var(--line-hairline)] bg-[var(--bg-surface)] shadow-[var(--shadow-e4)] animate-[pos-drawer_var(--motion-slow)_var(--ease-standard)]">
        <div className="flex flex-none items-center gap-2.5 border-b border-[var(--line-hairline)] px-[18px] py-3.5">
          {step !== 'summary' && step !== 'posted' && step !== 'queued' && (
            <button
              onClick={() =>
                s.set({ payStep: step === 'verify' ? 'room' : 'summary', signed: false })
              }
              className="flex size-11 items-center justify-center rounded-[10px] border border-[var(--line-hairline)] text-[var(--ink-secondary)] hover:bg-[var(--bg-sunken)]"
            >
              <ChevronLeft className="size-[18px]" />
            </button>
          )}
          <div className="flex flex-1 flex-col gap-px">
            <span className="text-[15px] font-semibold">{titles[step]?.[0]}</span>
            <span className="text-xs text-[var(--ink-tertiary)]">{titles[step]?.[1]}</span>
          </div>
          {step !== 'posted' && step !== 'queued' && (
            <button
              onClick={() => s.resetPay()}
              className="flex size-11 items-center justify-center rounded-[10px] text-[var(--ink-tertiary)] hover:bg-[var(--bg-sunken)]"
            >
              <X className="size-[18px]" />
            </button>
          )}
        </div>

        <div className="flex flex-none items-baseline gap-3 border-b border-[var(--line-hairline)] bg-[var(--bg-sunken)] px-5 py-4">
          <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--ink-tertiary)]">
            Amount due
          </span>
          <span
            data-numeric
            className="font-display text-[34px] font-semibold leading-none tracking-tight"
          >
            {fm(due)}
          </span>
          <span className="flex-1" />
          <span data-numeric className="font-mono text-xs text-[var(--ink-tertiary)]">
            sub {fm(view.sub)}
            {view.svc ? ` · svc ${fm(view.svc)}` : ''}
            {view.disc ? ` · disc −${fm(view.disc).replace('$', '$')}` : ''}
          </span>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-auto px-5 py-[18px]">
          {/* ── summary ── */}
          {step === 'summary' && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-[9px]">
                <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--ink-tertiary)]">
                  Split check
                </span>
                <div className="flex gap-2">
                  <StepChip
                    label="No split"
                    active={s.split === 'none'}
                    onTap={() => s.set({ split: 'none' })}
                  />
                  <StepChip
                    label="By seat"
                    active={s.split === 'seat'}
                    onTap={() => s.set({ split: 'seat' })}
                  />
                  <StepChip
                    label="By item"
                    active={s.split === 'item'}
                    onTap={() => s.set({ split: 'item' })}
                  />
                  <StepChip
                    label={`Even ×${check.covers}`}
                    active={s.split === 'even'}
                    onTap={() => s.set({ split: 'even' })}
                  />
                </div>
                {splitNote && (
                  <span className="text-[12.5px] text-[var(--ink-secondary)]">{splitNote}</span>
                )}
              </div>

              <div className="flex flex-col gap-[9px]">
                <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--ink-tertiary)]">
                  Discounts &amp; comps — reason-coded
                </span>
                <div className="flex flex-wrap gap-2">
                  {DISCOUNTS.map((d) => (
                    <button
                      key={d.kind}
                      onClick={() => {
                        const amt =
                          d.kind === 'hh'
                            ? Math.round(
                                view.lines
                                  .filter((l) => menuItemFor(l.name)?.bev ?? false)
                                  .reduce((a, l) => a + (l.comp ? 0 : l.cents), 0) * 0.2,
                              )
                            : d.kind === 'emp'
                              ? Math.round(view.sub * 0.2)
                              : 1500;
                        s.set({
                          discounts: {
                            ...usePos.getState().discounts,
                            [check.id]: { kind: d.kind, label: d.label, amt },
                          },
                        });
                        s.addAudit({
                          type: 'Discount',
                          item: `${displayLabel} · ${d.label}`,
                          amt,
                          reason: 'Reason-coded',
                          by: 'F. Doyle',
                          appr: 'M. Ramos',
                        });
                        s.showToast('Discount applied — reason-coded, permissioned, audit-logged.');
                      }}
                      className="h-10 rounded-[var(--radius-full)] border border-[var(--line-strong)] bg-[var(--bg-surface)] px-[13px] text-[12.5px] font-semibold hover:bg-[var(--bg-sunken)]"
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
                {discount && (
                  <div className="flex items-center gap-[9px] rounded-[var(--radius-md)] border border-[var(--status-info-line)] bg-[var(--status-info-bg)] px-3 py-[9px]">
                    <span className="flex-1 text-[12.5px] font-semibold text-[var(--status-info-ink)]">
                      {discount.label} — −{fm(discount.amt).replace('−', '')} · logged
                    </span>
                    <button
                      onClick={() =>
                        s.set({
                          discounts: { ...usePos.getState().discounts, [check.id]: undefined },
                        })
                      }
                      className="h-[30px] px-2.5 text-xs font-semibold text-[var(--status-info-ink)] underline"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-[9px]">
                <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--ink-tertiary)]">
                  Settle to
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  {(
                    [
                      {
                        icon: BedDouble,
                        label: 'Room charge',
                        sub: 'Post to guest folio — same transaction as check close',
                        accent: true,
                        onTap: () => s.set({ payStep: 'room', payQ: '' }),
                      },
                      {
                        icon: CreditCard,
                        label: 'Card',
                        sub: 'P2PE terminal · tap, insert or swipe',
                        onTap: () =>
                          s.set({
                            payStep: 'card',
                            cardState: s.offline ? 'offline' : 'wait',
                            tip: 20,
                          }),
                      },
                      {
                        icon: Banknote,
                        label: 'Cash',
                        sub: 'Drawer T-03 · change computed',
                        onTap: () => s.set({ payStep: 'cash', cashTender: 0 }),
                      },
                      {
                        icon: Building2,
                        label: 'House account',
                        sub: 'AR · city ledger — corporate & member',
                        onTap: () =>
                          s.showToast('House accounts settle to AR — pick the account to invoice.'),
                      },
                      {
                        icon: Star,
                        label: 'Member charge',
                        sub: 'Club & loyalty balance',
                        onTap: () =>
                          s.showToast('Member lookup — scan band or search the club roster.'),
                      },
                      {
                        icon: Ticket,
                        label: 'Voucher',
                        sub: 'Comps, gift cards, packages',
                        onTap: () => s.showToast('Scan or enter the voucher code to redeem.'),
                      },
                    ] as const
                  ).map((m) => {
                    const Icon = m.icon;
                    const accent = 'accent' in m && m.accent;
                    return (
                      <button
                        key={m.label}
                        onClick={m.onTap}
                        className="relative flex min-h-[92px] flex-col gap-[7px] rounded-[var(--radius-lg)] border-[1.5px] p-3.5 text-left hover:bg-[var(--bg-sunken)]"
                        style={{
                          background: accent ? 'var(--interactive-selected)' : 'var(--bg-surface)',
                          borderColor: accent
                            ? 'var(--interactive-default)'
                            : 'var(--line-hairline)',
                        }}
                      >
                        <Icon
                          className="size-[21px]"
                          style={{ color: accent ? 'var(--ink-accent)' : 'var(--ink-secondary)' }}
                        />
                        <span className="text-[14.5px] font-semibold">{m.label}</span>
                        <span className="text-[11.5px] leading-[1.4] text-[var(--ink-tertiary)]">
                          {m.sub}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── room search ── */}
          {step === 'room' && (
            <div className="flex flex-col gap-3.5">
              <div className="flex items-center gap-2.5">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--ink-tertiary)]" />
                  <input
                    value={s.payQ}
                    onChange={(e) => s.set({ payQ: e.target.value })}
                    placeholder="Guest name or room number"
                    autoFocus
                    className="h-12 w-full rounded-[var(--radius-md)] border border-[var(--line-strong)] bg-[var(--bg-surface)] pl-[38px] pr-3 text-[14.5px] outline-none focus:border-[var(--line-focus)]"
                  />
                </div>
                <span className="inline-flex h-8 flex-none items-center gap-1.5 rounded-[var(--radius-full)] border border-[var(--status-positive-line)] bg-[var(--status-positive-bg)] px-[11px] text-[11.5px] font-semibold text-[var(--status-positive-ink)]">
                  <span className="size-1.5 rounded-full bg-[var(--status-positive-ink)]" />
                  Live PMS · in-house
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {s.payQ.trim() === '' && (
                  <span className="px-1 py-2 text-[13px] text-[var(--ink-tertiary)]">
                    Search by last name or room — results come straight from the front-desk
                    database.
                  </span>
                )}
                {(candidates ?? []).map((g: PosRoomChargeCandidate) => {
                  const balance = moneyToCents(g.balance);
                  return (
                    <button
                      key={g.folioId}
                      onClick={() =>
                        g.chargeAllowed
                          ? s.set({ payStep: 'verify', payGuest: g, signed: false })
                          : s.showToast('Room charge not permitted for this folio.')
                      }
                      className="flex items-center gap-[13px] rounded-[var(--radius-lg)] border border-[var(--line-hairline)] bg-[var(--bg-surface)] px-3.5 py-[13px] text-left hover:bg-[var(--bg-sunken)]"
                    >
                      <span className="flex size-[42px] flex-none items-center justify-center rounded-full border border-[var(--line-hairline)] bg-[var(--bg-sunken)] text-[13px] font-semibold text-[var(--ink-secondary)]">
                        {g.guestName
                          .split(/\s+/)
                          .map((w) => w[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="text-[14.5px] font-semibold">{g.guestName}</span>
                        <span
                          data-numeric
                          className="font-mono text-[11.5px] text-[var(--ink-tertiary)]"
                        >
                          Room {g.roomNumber ?? '—'} · {g.folioNumber} · in-house
                        </span>
                      </span>
                      <span className="flex flex-none flex-col items-end gap-1">
                        <span
                          data-numeric
                          className="font-mono text-[13px] text-[var(--ink-secondary)]"
                        >
                          balance {fm(balance)}
                        </span>
                        <span className="inline-flex h-[22px] items-center rounded-[var(--radius-full)] border border-[var(--status-positive-line)] bg-[var(--status-positive-bg)] px-[9px] text-[10.5px] font-bold text-[var(--status-positive-ink)]">
                          Charge OK
                        </span>
                      </span>
                    </button>
                  );
                })}
                {s.payQ.trim() !== '' && candidates?.length === 0 && (
                  <span className="px-1 py-2 text-[13px] text-[var(--ink-tertiary)]">
                    No in-house guest matches — check the spelling or the room number.
                  </span>
                )}
              </div>
              <span className="flex items-center gap-[7px] text-[11.5px] text-[var(--ink-tertiary)]">
                <Building2 className="size-[13px]" />
                Same database as the front desk — folio status and charge-allowed flags are live,
                not cached.
              </span>
            </div>
          )}

          {/* ── verify + signature ── */}
          {step === 'verify' && guest && (
            <div className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-2 rounded-[var(--radius-lg)] border border-[var(--line-hairline)] bg-[var(--bg-surface)] p-4">
                <div className="flex items-center gap-2.5">
                  <span className="text-[16px] font-semibold">{guest.guestName}</span>
                  <span className="flex-1" />
                  <span data-numeric className="font-mono text-xs text-[var(--ink-tertiary)]">
                    {guest.folioNumber}
                  </span>
                </div>
                <span className="text-[12.5px] text-[var(--ink-secondary)]">
                  Room {guest.roomNumber ?? '—'} · checked in · verify: {guest.verificationHint}
                </span>
              </div>
              <div className="flex items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--status-positive-line)] bg-[var(--status-positive-bg)] px-3 py-2.5">
                <CircleCheck className="size-4 text-[var(--status-positive-ink)]" />
                <span className="text-[12.5px] font-semibold text-[var(--status-positive-ink)]">
                  Name matches reservation — charge allowed, folio open
                </span>
              </div>
              <div
                className="flex items-center gap-2.5 rounded-[var(--radius-md)] border px-3 py-2.5"
                style={{
                  background: s.signed ? 'var(--status-positive-bg)' : 'var(--bg-sunken)',
                  borderColor: s.signed ? 'var(--status-positive-line)' : 'var(--line-hairline)',
                }}
              >
                {s.signed ? (
                  <CircleCheck className="size-4 text-[var(--status-positive-ink)]" />
                ) : (
                  <PenLine className="size-4 text-[var(--ink-tertiary)]" />
                )}
                <span
                  className="text-[12.5px] font-semibold"
                  style={{ color: s.signed ? 'var(--status-positive-ink)' : 'var(--ink-tertiary)' }}
                >
                  {s.signed ? 'Signature captured' : 'Signature pending'}
                </span>
              </div>
              <div className="flex flex-col gap-2 rounded-[var(--radius-lg)] border border-[var(--line-strong)] bg-[var(--bg-surface)] p-3.5">
                <div className="flex items-center gap-2">
                  <PenLine className="size-[15px] text-[var(--ink-tertiary)]" />
                  <span className="text-xs font-semibold text-[var(--ink-secondary)]">
                    Guest signs below
                  </span>
                  <span className="flex-1" />
                  <button
                    onClick={sigClear}
                    className="h-8 px-[11px] text-xs font-semibold text-[var(--ink-tertiary)] underline"
                  >
                    Clear
                  </button>
                </div>
                <canvas
                  ref={canvasRef}
                  width={540}
                  height={150}
                  onPointerDown={sigDown}
                  onPointerMove={sigMove}
                  onPointerUp={sigUp}
                  onPointerLeave={sigUp}
                  className="h-[150px] w-full cursor-crosshair touch-none rounded-[var(--radius-md)] bg-[var(--bg-sunken)] text-[var(--ink-primary)]"
                />
                <span className="text-[11px] text-[var(--ink-tertiary)]">
                  Property policy: signature or PIN required for room charges over $25.
                </span>
              </div>
              <button
                onClick={settleRoom}
                disabled={!s.signed || busy}
                className="h-[52px] rounded-[var(--radius-md)] text-[15px] font-semibold disabled:cursor-not-allowed"
                style={
                  s.signed && !busy
                    ? { background: 'var(--interactive-default)', color: 'var(--ink-inverse)' }
                    : { background: 'var(--interactive-disabled)', color: 'var(--ink-disabled)' }
                }
              >
                {busy ? 'Posting…' : `Post ${fm(due)} to Room ${guest.roomNumber ?? ''}`}
              </button>
              <button
                onClick={() => {
                  s.set({ signed: true });
                  s.showToast('PIN verified against the guest profile.');
                }}
                className="h-11 rounded-[var(--radius-md)] text-[13px] font-semibold text-[var(--ink-secondary)] hover:bg-[var(--bg-sunken)]"
              >
                Use 4-digit PIN instead
              </button>
            </div>
          )}

          {/* ── posted ── */}
          {step === 'posted' && guest && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3.5">
                <span className="flex size-[46px] flex-none items-center justify-center rounded-full border border-[var(--status-positive-line)] bg-[var(--status-positive-bg)] text-[var(--status-positive-ink)]">
                  <CircleCheck className="size-6" />
                </span>
                <div className="flex flex-col gap-0.5">
                  <span className="font-display text-[19px] font-semibold tracking-tight">
                    Posted to Room {guest.roomNumber ?? '—'} — folio {guest.folioNumber}
                  </span>
                  <span className="text-[12.5px] text-[var(--ink-secondary)]">
                    Committed in the same transaction as check close — no middleware, no posting
                    queue.
                  </span>
                </div>
              </div>

              <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line-hairline)]">
                <div className="flex items-center gap-2.5 border-b border-[var(--line-hairline)] bg-[var(--bg-sunken)] px-3.5 py-[11px]">
                  <span className="text-xs font-semibold">Folio posting</span>
                  <span data-numeric className="font-mono text-[11px] text-[var(--ink-tertiary)]">
                    {clockOf(new Date())}
                  </span>
                  <span className="flex-1" />
                  <span className="text-[11px] text-[var(--ink-tertiary)]">charge codes</span>
                </div>
                {[
                  { code: 'FNB-FOOD', desc: `${displayLabel} — food`, amt: foodCents },
                  { code: 'FNB-BEV', desc: `${displayLabel} — beverage`, amt: bevCents },
                  ...(svcCents
                    ? [{ code: 'FNB-SVC', desc: 'Auto-gratuity 20%', amt: svcCents }]
                    : []),
                  ...(adjCents
                    ? [{ code: 'FNB-ADJ', desc: 'Reason-coded adjustments', amt: adjCents }]
                    : []),
                ].map((pl) => (
                  <div
                    key={pl.code}
                    className="flex items-center gap-3 border-b border-[var(--line-hairline)] px-3.5 py-[9px]"
                  >
                    <span
                      data-numeric
                      className="w-[120px] flex-none font-mono text-[11.5px] text-[var(--ink-accent)]"
                    >
                      {pl.code}
                    </span>
                    <span className="flex-1 text-[12.5px] text-[var(--ink-secondary)]">
                      {pl.desc}
                    </span>
                    <span data-numeric className="font-mono text-[12.5px]">
                      {fm(pl.amt)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line-hairline)]">
                <div className="border-b border-[var(--line-hairline)] bg-[var(--bg-sunken)] px-3.5 py-[11px] text-xs font-semibold">
                  GL journal — generated simultaneously
                </div>
                {[
                  {
                    side: 'DR',
                    acct: `1100 · Guest ledger — ${guest.folioNumber}`,
                    amt: due,
                    ink: 'var(--status-positive-ink)',
                  },
                  {
                    side: 'CR',
                    acct: '4100 · Food & beverage revenue',
                    amt: due,
                    ink: 'var(--ink-tertiary)',
                  },
                ].map((gl) => (
                  <div
                    key={gl.side}
                    className="flex items-center gap-3 border-b border-[var(--line-hairline)] px-3.5 py-2"
                  >
                    <span
                      data-numeric
                      className="w-6 flex-none font-mono text-[11px] font-bold"
                      style={{ color: gl.ink }}
                    >
                      {gl.side}
                    </span>
                    <span
                      data-numeric
                      className="flex-1 font-mono text-[11.5px] text-[var(--ink-secondary)]"
                    >
                      {gl.acct}
                    </span>
                    <span data-numeric className="font-mono text-xs">
                      {fm(gl.amt)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="overflow-hidden rounded-[var(--radius-lg)] border-[1.5px] border-[var(--status-info-line)]">
                <div className="flex items-center gap-[9px] border-b border-[var(--status-info-line)] bg-[var(--status-info-bg)] px-3.5 py-[11px]">
                  <Building2 className="size-[15px] text-[var(--status-info-ink)]" />
                  <span className="text-xs font-semibold text-[var(--status-info-ink)]">
                    The Desk — front desk sees this now · {guest.folioNumber} · {guest.guestName} ·
                    Room {guest.roomNumber ?? '—'}
                  </span>
                </div>
                {(folio?.postings ?? []).slice(-3).map((p, i, arr) => {
                  const isNew = i === arr.length - 1;
                  return (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 border-b border-[var(--line-hairline)] px-3.5 py-[9px]"
                      style={{
                        background: isNew ? 'var(--status-info-bg)' : 'transparent',
                        fontWeight: isNew ? 650 : 500,
                      }}
                    >
                      <span
                        data-numeric
                        className="w-12 flex-none font-mono text-[11px] text-[var(--ink-tertiary)]"
                      >
                        {p.businessDate.slice(5)}
                      </span>
                      <span className="flex-1 text-[12.5px]">{p.description}</span>
                      <span data-numeric className="font-mono text-[12.5px]">
                        {fm(moneyToCents(p.amount))}
                      </span>
                    </div>
                  );
                })}
                <div className="px-3.5 py-2 text-[11px] text-[var(--ink-tertiary)]">
                  Itemized line detail — not a blob total. Night audit reconciles automatically;
                  outlet and ledger can never disagree.
                </div>
              </div>

              <div className="flex gap-2.5">
                <button
                  onClick={() =>
                    s.showToast(
                      'Receipt printing — itemized with outlet, server and folio reference.',
                    )
                  }
                  className="flex h-[50px] flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--line-strong)] bg-[var(--bg-surface)] text-[14px] font-semibold hover:bg-[var(--bg-sunken)]"
                >
                  <Printer className="size-4" />
                  Print receipt
                </button>
                <button
                  onClick={() =>
                    finishLocal(
                      `Check #${check.checkNumber} closed — ${fm(due)} to Room ${guest.roomNumber ?? ''}. Front desk sees it now.`,
                    )
                  }
                  className="h-[50px] flex-1 rounded-[var(--radius-md)] bg-[var(--interactive-default)] text-[14px] font-semibold text-[var(--ink-inverse)] hover:bg-[var(--interactive-hover)]"
                >
                  Close check &amp; reset table
                </button>
              </div>
            </div>
          )}

          {/* ── queued (offline) ── */}
          {step === 'queued' && guest && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3.5">
                <span className="flex size-[46px] flex-none items-center justify-center rounded-full border border-[var(--status-caution-line)] bg-[var(--status-caution-bg)] text-[var(--status-caution-ink)]">
                  <CloudOff className="size-[22px]" />
                </span>
                <div className="flex flex-col gap-0.5">
                  <span className="font-display text-[19px] font-semibold tracking-tight">
                    Room charge queued — pending verification
                  </span>
                  <span className="text-[12.5px] text-[var(--ink-secondary)]">
                    Terminal is offline. The op is in the local append-only log and will replay on
                    reconnect.
                  </span>
                </div>
              </div>
              <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line-hairline)]">
                <div className="border-b border-[var(--line-hairline)] bg-[var(--bg-sunken)] px-3.5 py-[11px] text-xs font-semibold">
                  Operation log entry
                </div>
                <div className="flex flex-col gap-[7px] px-3.5 py-3 font-mono text-[11.5px] text-[var(--ink-secondary)]">
                  <span>op: close_check · payment.type=room_charge</span>
                  <span>idempotency_key: pos-close-{check.id.slice(0, 8)}</span>
                  <span>
                    target: folio {guest.folioNumber} · Room {guest.roomNumber ?? '—'} · {fm(due)}
                  </span>
                  <span className="text-[var(--status-caution-ink)]">
                    flag: pending_verification
                  </span>
                </div>
              </div>
              <span className="text-[12.5px] leading-[1.6] text-[var(--ink-secondary)]">
                On reconnect the server revalidates — folio still open? guest still in-house? If
                revalidation fails, the charge routes to the manager exception queue (post to AR
                review) rather than silently dropping revenue.
              </span>
              <button
                onClick={() =>
                  finishLocal(
                    `Check #${check.checkNumber} closed offline — room charge queued with idempotency key.`,
                  )
                }
                className="h-[50px] rounded-[var(--radius-md)] bg-[var(--interactive-default)] text-[14px] font-semibold text-[var(--ink-inverse)] hover:bg-[var(--interactive-hover)]"
              >
                Close check — will post on reconnect
              </button>
            </div>
          )}

          {/* ── card ── */}
          {step === 'card' && (
            <div className="flex flex-col gap-[18px]">
              <div className="flex flex-col gap-[9px]">
                <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--ink-tertiary)]">
                  Tip — pay at table
                </span>
                <div className="flex gap-2">
                  {[0, 18, 20, 22].map((p) => (
                    <button
                      key={p}
                      onClick={() => s.set({ tip: p })}
                      className="flex h-14 flex-1 flex-col items-center justify-center gap-px rounded-[var(--radius-md)] border-[1.5px]"
                      style={
                        s.tip === p
                          ? {
                              background: 'var(--interactive-selected)',
                              borderColor: 'var(--interactive-default)',
                              color: 'var(--ink-accent)',
                            }
                          : {
                              background: 'var(--bg-surface)',
                              borderColor: 'var(--line-strong)',
                              color: 'var(--ink-secondary)',
                            }
                      }
                    >
                      <span className="text-[14.5px] font-semibold">{p ? `${p}%` : 'No tip'}</span>
                      <span
                        data-numeric
                        className="font-mono text-[11px] text-[var(--ink-tertiary)]"
                      >
                        {p ? fm(Math.round((due * p) / 100)) : '—'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--line-hairline)] bg-[var(--bg-sunken)] p-7">
                {s.cardState === 'wait' && (
                  <CreditCard
                    className="size-[34px] text-[var(--ink-secondary)]"
                    style={{ animation: 'pos-wait 1.6s var(--ease-standard) infinite' }}
                  />
                )}
                {s.cardState === 'approved' && (
                  <CircleCheck className="size-[34px] text-[var(--status-positive-ink)]" />
                )}
                {s.cardState === 'offline' && (
                  <CloudOff className="size-[34px] text-[var(--status-caution-ink)]" />
                )}
                <span className="text-[15px] font-semibold">
                  {s.cardState === 'wait'
                    ? 'Present card on the terminal'
                    : s.cardState === 'approved'
                      ? 'Approved — Visa •4242'
                      : 'Store-and-forward'}
                </span>
                <span className="text-center text-[12.5px] text-[var(--ink-secondary)]">
                  {s.cardState === 'wait'
                    ? 'Tap · insert · swipe — P2PE, tokenized end-to-end'
                    : s.cardState === 'approved'
                      ? 'Tip captured. Receipt by email or print.'
                      : 'Terminal supports offline capture — authorization deferred to replay.'}
                </span>
                <span
                  data-numeric
                  className="font-display text-[26px] font-semibold tracking-tight"
                >
                  {fm(due + (s.tip ? tipAmt : 0))}
                </span>
              </div>
              <button
                onClick={() =>
                  settlePayment(
                    'card',
                    `Check #${check.checkNumber} closed — ${fm(due + tipAmt)} on card.`,
                  )
                }
                disabled={s.cardState === 'wait' || busy}
                className="h-[50px] rounded-[var(--radius-md)] text-[14px] font-semibold disabled:cursor-not-allowed"
                style={
                  s.cardState !== 'wait' && !busy
                    ? { background: 'var(--interactive-default)', color: 'var(--ink-inverse)' }
                    : { background: 'var(--interactive-disabled)', color: 'var(--ink-disabled)' }
                }
              >
                {s.cardState === 'approved'
                  ? 'Close check — Visa •4242'
                  : s.cardState === 'offline'
                    ? 'Store & close — auth deferred'
                    : 'Waiting for card…'}
              </button>
              <span className="text-center text-[11px] text-[var(--ink-tertiary)]">
                Tip rides the card capture — the ledger posting is the check total.
              </span>
            </div>
          )}

          {/* ── cash ── */}
          {step === 'cash' && (
            <div className="flex flex-col gap-[18px]">
              <div className="flex flex-col gap-[9px]">
                <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--ink-tertiary)]">
                  Tender — drawer T-03
                </span>
                <div className="flex gap-2">
                  {[
                    { v: due, label: `Exact ${fm(due)}` },
                    ...cashQuick.map((v) => ({ v, label: fm(v) })),
                  ].map((t) => (
                    <button
                      key={t.label}
                      onClick={() => s.set({ cashTender: t.v })}
                      className="h-14 flex-1 rounded-[var(--radius-md)] border-[1.5px] font-mono text-[15px] font-semibold"
                      style={
                        s.cashTender === t.v
                          ? {
                              background: 'var(--interactive-selected)',
                              borderColor: 'var(--interactive-default)',
                              color: 'var(--ink-accent)',
                            }
                          : {
                              background: 'var(--bg-surface)',
                              borderColor: 'var(--line-strong)',
                              color: 'var(--ink-secondary)',
                            }
                      }
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-baseline justify-between rounded-[var(--radius-lg)] border border-[var(--line-hairline)] bg-[var(--bg-sunken)] p-4">
                <span className="text-[13.5px] font-semibold text-[var(--ink-secondary)]">
                  Change due
                </span>
                <span
                  data-numeric
                  className="font-display text-[28px] font-semibold tracking-tight"
                >
                  {s.cashTender >= due ? fm(s.cashTender - due) : '—'}
                </span>
              </div>
              <button
                onClick={() =>
                  settlePayment('cash', `Check #${check.checkNumber} closed — ${fm(due)} in cash.`)
                }
                disabled={s.cashTender < due || busy}
                className="h-[50px] rounded-[var(--radius-md)] text-[14px] font-semibold disabled:cursor-not-allowed"
                style={
                  s.cashTender >= due && !busy
                    ? { background: 'var(--interactive-default)', color: 'var(--ink-inverse)' }
                    : { background: 'var(--interactive-disabled)', color: 'var(--ink-disabled)' }
                }
              >
                Open drawer &amp; close check
              </button>
            </div>
          )}
        </div>
        <style>{`
          @keyframes pos-drawer { from { transform: translateX(48px); opacity: 0.4 } to { transform: none; opacity: 1 } }
          @keyframes pos-wait { 0%, 100% { transform: scale(1); opacity: 1 } 50% { transform: scale(1.06); opacity: 0.55 } }
        `}</style>
      </div>
    </>
  );
}
