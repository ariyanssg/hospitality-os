'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  Check,
  Clock3,
  CreditCard,
  FilePenLine,
  KeyRound,
  ScanLine,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Avatar, Badge, Button, Kbd, MoneyText, Skeleton, cn } from '@vela/ui';
import type { ArrivalRow, HkBoardRoom } from '@vela/contracts';
import { useSdk } from '@/lib/sdk';
import { useCan, useSession, useToast } from '@/lib/store';

const STEPS = ['Verify', 'Room', 'Pay', 'Done'] as const;

function Stepper({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`Step ${step + 1} of 4`}>
      {STEPS.map((s, i) => (
        <span key={s} className="flex items-center gap-1.5">
          {i > 0 && <span className="h-px w-3.5 bg-[var(--line-strong)]" />}
          <span
            className={cn(
              'inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide',
              i === step
                ? 'text-[var(--ink-accent)]'
                : i < step
                  ? 'text-[var(--status-positive-ink)]'
                  : 'text-[var(--ink-disabled)]',
            )}
          >
            <span
              className={cn(
                'grid size-[18px] place-items-center rounded-full border-[1.5px] font-mono text-[10px]',
                i === step
                  ? 'border-[var(--accent-500)] bg-[var(--interactive-selected)]'
                  : i < step
                    ? 'border-[var(--status-positive-line)] bg-[var(--status-positive-bg)]'
                    : 'border-[var(--line-strong)]',
              )}
            >
              {i < step ? '✓' : i + 1}
            </span>
            {s}
          </span>
        </span>
      ))}
    </div>
  );
}

function VerifyFlag({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-[7px] rounded-[var(--radius-md)] border border-[var(--line-hairline)] bg-[var(--bg-sunken)] px-3 py-2 text-[13px]',
        ok ? 'text-[var(--status-positive-ink)]' : 'text-[var(--ink-tertiary)]',
      )}
    >
      {children}
    </span>
  );
}

/**
 * The 60-second check-in (doc 18 §3.3, front-desk concept): Verify → Room → Pay → Done in one
 * drawer. Room suggestions come from the live housekeeping board (ready rooms first); the commit is
 * one real check-in transaction — permission-guarded, audited, evented.
 */
export function CheckinDrawer({
  reservationId,
  onClose,
}: {
  reservationId: string | null;
  onClose: () => void;
}) {
  const sdk = useSdk();
  const qc = useQueryClient();
  const propertyId = useSession((s) => s.activePropertyId);
  const showToast = useToast((s) => s.show);
  const canCheckIn = useCan('reservation.checkin');

  const [step, setStep] = useState(0);
  const [roomId, setRoomId] = useState<string | null>(null);
  const primaryActionRef = useRef<HTMLButtonElement>(null);

  const { data: arrivals } = useQuery({
    queryKey: ['arrivals', propertyId],
    queryFn: () => sdk.arrivals(),
    enabled: !!propertyId,
  });
  const arrival: ArrivalRow | null = arrivals?.find((a) => a.id === reservationId) ?? null;

  const { data: reservation } = useQuery({
    queryKey: ['reservation', reservationId],
    queryFn: () => sdk.getReservation(reservationId!),
    enabled: !!reservationId,
  });
  const { data: guest } = useQuery({
    queryKey: ['guest', reservation?.guestId],
    queryFn: () => sdk.getGuest(reservation!.guestId),
    enabled: !!reservation?.guestId,
  });
  const { data: hkBoard } = useQuery({
    queryKey: ['hk-board', propertyId],
    queryFn: () => sdk.hkBoard(),
    enabled: !!propertyId,
  });
  const { data: deposits } = useQuery({
    queryKey: ['deposits', reservationId],
    queryFn: () => sdk.listDeposits(reservationId!),
    enabled: !!reservationId,
  });

  // Reset the flow whenever a different reservation opens.
  useEffect(() => {
    setStep(0);
    setRoomId(null);
  }, [reservationId]);

  useEffect(() => {
    if (!reservationId) return;
    primaryActionRef.current?.focus();
  }, [reservationId, step]);

  /** Ready rooms of the booked type, inspected first — the HK board is the source of truth. */
  const suggestions = useMemo(() => {
    if (!hkBoard || !arrival) return [] as HkBoardRoom[];
    const rank = { inspected: 0, clean: 1, dirty: 2 } as const;
    return hkBoard
      .filter((r) => r.occupancy === 'vacant' && r.roomTypeCode === arrival.roomTypeCode)
      .sort((a, b) => rank[a.hkStatus] - rank[b.hkStatus] || a.number.localeCompare(b.number))
      .slice(0, 4);
  }, [hkBoard, arrival]);

  const pickedRoomId = roomId ?? arrival?.roomId ?? suggestions[0]?.roomId ?? null;
  const pickedRoom =
    hkBoard?.find((r) => r.roomId === pickedRoomId) ??
    (arrival?.roomId && pickedRoomId === arrival.roomId
      ? ({ number: arrival.roomNumber ?? '—' } as Pick<HkBoardRoom, 'number'>)
      : null);

  const heldDeposits = (deposits ?? []).filter((d) => d.status === 'held');
  const depositTotal = heldDeposits.reduce((n, d) => n + Number(d.amount.amount), 0);
  const total = reservation ? Number(reservation.total.amount) : 0;
  const due = Math.max(0, total - depositTotal);
  const currency = reservation?.currency ?? 'USD';
  const money = (n: number) => ({ amount: n.toFixed(2), currency });

  const checkIn = useMutation({
    mutationFn: () => sdk.checkIn(reservationId!, pickedRoomId ? { roomId: pickedRoomId } : {}),
    onSuccess: () => {
      setStep(3);
      qc.invalidateQueries({ queryKey: ['arrivals'] });
      qc.invalidateQueries({ queryKey: ['hk-board'] });
      qc.invalidateQueries({ queryKey: ['manager-flash'] });
      qc.invalidateQueries({ queryKey: ['reservation', reservationId] });
      showToast({
        text: `${arrival?.guestName ?? 'Guest'} checked in — room ${pickedRoom?.number ?? ''}`,
      });
    },
    onError: (e: Error) => showToast({ tone: 'critical', text: e.message }),
  });

  const queueRoom = useMutation({
    mutationFn: () =>
      sdk.queueRoom(reservationId!, {
        roomId: pickedRoomId ?? undefined,
        notes: 'Guest waiting at front desk',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['arrivals'] });
      qc.invalidateQueries({ queryKey: ['hk-board'] });
      qc.invalidateQueries({ queryKey: ['hk-tasks'] });
      showToast({
        tone: 'info',
        text: `${arrival?.guestName ?? 'Guest'} added to housekeeping queue`,
      });
    },
    onError: (e: Error) => showToast({ tone: 'critical', text: e.message }),
  });

  const advance = () => {
    if (step === 2) checkIn.mutate();
    else if (step === 3) onClose();
    else setStep((s) => s + 1);
  };

  // Keyboard: Esc parks the draft, Enter advances (outside buttons).
  useEffect(() => {
    if (!reservationId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'BUTTON') advance();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  if (!reservationId) return null;

  return (
    <div
      className="fixed inset-0 z-[var(--z-drawer)] flex justify-end"
      role="dialog"
      aria-modal="true"
      data-testid="golden-checkin-drawer"
      data-flow="desk-checkin"
      data-flow-step={STEPS[step]!.toLowerCase()}
    >
      <button
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-[var(--bg-overlay)] animate-[fade_var(--motion-base)]"
      />
      <div className="relative flex h-full w-[560px] max-w-[94vw] flex-col bg-[var(--bg-surface)] shadow-[var(--shadow-e4)] animate-[drawer-in_var(--motion-slow)_var(--ease-standard)]">
        {/* Header with stepper */}
        <header className="flex items-center gap-3 border-b border-[var(--line-hairline)] px-6 py-3.5">
          <div className="min-w-0 flex-1">
            <h2 className="m-0 truncate font-display text-[17px] font-semibold">
              Check in — {arrival?.guestName ?? '…'}
            </h2>
            <span className="font-mono text-[11px] text-[var(--ink-tertiary)]">
              {arrival?.confirmationNumber} · {arrival?.roomTypeCode} ·{' '}
              {reservation?.nights.length ?? '—'}N
            </span>
          </div>
          <Stepper step={step} />
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {!arrival || !reservation ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : (
            <>
              {step === 0 && (
                <div className="flex flex-col gap-4">
                  {/* Guest identity card */}
                  <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--line-hairline)] bg-[var(--bg-raised)] p-4">
                    <Avatar name={arrival.guestName} size="lg" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{arrival.guestName}</span>
                        {guest?.vipTier && <Badge tone="accent">VIP {guest.vipTier}</Badge>}
                      </div>
                      <div className="text-[var(--text-caption)] text-[var(--ink-tertiary)]">
                        {arrival.roomTypeCode} · {reservation.nights.length} night
                        {reservation.nights.length > 1 ? 's' : ''} · {arrival.adults} adult
                        {arrival.adults > 1 ? 's' : ''}
                        {arrival.children > 0 ? ` · ${arrival.children} child` : ''}
                      </div>
                      {guest?.email && (
                        <div className="font-mono text-[var(--text-micro)] text-[var(--ink-tertiary)]">
                          {guest.email}
                        </div>
                      )}
                    </div>
                    <MoneyText value={reservation.total} className="text-[var(--text-heading)]" />
                  </div>

                  <section>
                    <h3 className="mb-2.5 text-[var(--text-micro)] font-semibold uppercase tracking-wide text-[var(--ink-tertiary)]">
                      Identity &amp; registration
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      <VerifyFlag ok={!!guest?.nationality || !!guest?.email}>
                        <ScanLine className="size-[15px]" />
                        {guest?.nationality
                          ? `ID on profile — ${guest.nationality}`
                          : guest?.email
                            ? 'Profile on file'
                            : 'No ID on profile'}
                      </VerifyFlag>
                      <VerifyFlag ok={false}>
                        <FilePenLine className="size-[15px]" /> Reg card — signs at the desk
                      </VerifyFlag>
                      <VerifyFlag ok={depositTotal > 0 || due === 0}>
                        <CreditCard className="size-[15px]" />
                        {depositTotal > 0
                          ? `Deposit held — ${new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(depositTotal)}`
                          : due === 0
                            ? 'Fully settled'
                            : 'Payment pending'}
                      </VerifyFlag>
                      <VerifyFlag ok>
                        <ShieldCheck className="size-[15px]" /> Consent on record (marketing: no)
                      </VerifyFlag>
                    </div>
                  </section>
                  <p className="m-0 text-[12px] text-[var(--ink-tertiary)]">
                    Mismatches highlight inline — nothing blocks until payment. <Kbd>Enter</Kbd>{' '}
                    continues.
                  </p>
                </div>
              )}

              {step === 1 && (
                <div className="flex flex-col gap-3">
                  <h3 className="m-0 text-[var(--text-micro)] font-semibold uppercase tracking-wide text-[var(--ink-tertiary)]">
                    Suggested rooms — ready first, from the live housekeeping board
                  </h3>
                  {suggestions.length === 0 && (
                    <p className="text-[var(--text-caption)] text-[var(--ink-tertiary)]">
                      No vacant {arrival.roomTypeCode} rooms right now — check the housekeeping
                      queue.
                    </p>
                  )}
                  {suggestions.map((s, i) => {
                    const picked = pickedRoomId === s.roomId;
                    const ready = s.hkStatus === 'inspected';
                    return (
                      <button
                        key={s.roomId}
                        onClick={() => setRoomId(s.roomId)}
                        data-testid="golden-checkin-room-choice"
                        data-room-ready={ready ? 'true' : 'false'}
                        aria-pressed={picked}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-[var(--radius-lg)] border bg-[var(--bg-surface)] px-3.5 py-3 text-left transition-colors duration-[var(--motion-fast)]',
                          picked
                            ? 'border-[var(--accent-500)] bg-[var(--interactive-selected)] shadow-[inset_0_0_0_1px_var(--accent-500)]'
                            : 'border-[var(--line-hairline)] hover:bg-[var(--bg-sunken)]',
                        )}
                      >
                        <span className="font-mono text-base font-semibold">{s.number}</span>
                        <span className="flex-1">
                          <span className="block text-[13px]">
                            {s.roomTypeCode}
                            {s.floor ? ` · floor ${s.floor}` : ''}
                          </span>
                          <span
                            className="block text-[11.5px]"
                            style={{
                              color: ready
                                ? 'var(--status-positive-ink)'
                                : 'var(--status-caution-ink)',
                            }}
                          >
                            {ready
                              ? '✓ Inspected — ready now'
                              : s.hkStatus === 'clean'
                                ? 'Clean — awaiting inspection'
                                : 'Housekeeping in progress'}
                          </span>
                        </span>
                        {i === 0 && <Badge tone="accent">Suggested</Badge>}
                        {arrival.roomQueued && picked && <Badge tone="caution">Queued</Badge>}
                        {picked && <Check className="size-4 text-[var(--ink-accent)]" />}
                      </button>
                    );
                  })}
                  {pickedRoomId && pickedRoom && (
                    <Button
                      variant="secondary"
                      onClick={() => queueRoom.mutate()}
                      loading={queueRoom.isPending}
                      disabled={!canCheckIn || arrival.roomQueued}
                      data-testid="golden-checkin-queue-room"
                      title={
                        arrival.roomQueued
                          ? 'This arrival is already in the housekeeping queue'
                          : canCheckIn
                            ? undefined
                            : 'Check-in not permitted for your role'
                      }
                    >
                      <Clock3 className="size-3.5" />
                      {arrival.roomQueued
                        ? 'Queued for housekeeping'
                        : `Queue room ${pickedRoom.number} for housekeeping`}
                    </Button>
                  )}
                </div>
              )}

              {step === 2 && (
                <div className="flex flex-col gap-4">
                  <h3 className="m-0 text-[var(--text-micro)] font-semibold uppercase tracking-wide text-[var(--ink-tertiary)]">
                    Folio preview
                  </h3>
                  <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line-hairline)]">
                    {reservation.nights.map((n) => (
                      <div
                        key={n.stayDate}
                        className="flex items-center justify-between gap-3 border-b border-[var(--line-hairline)] px-3.5 py-2"
                      >
                        <span className="font-mono text-[var(--text-caption)] text-[var(--ink-secondary)]">
                          {n.stayDate} — room {pickedRoom?.number ?? '—'}
                        </span>
                        <MoneyText value={n.price} className="text-[var(--font-size-ui)]" />
                      </div>
                    ))}
                    {depositTotal > 0 && (
                      <div className="flex items-center justify-between gap-3 border-b border-[var(--line-hairline)] px-3.5 py-2">
                        <span className="text-[13px] text-[var(--ink-secondary)]">
                          Deposit on file — auto-applies at settlement
                        </span>
                        <MoneyText
                          value={money(-depositTotal)}
                          className="text-[var(--font-size-ui)]"
                        />
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-3 bg-[var(--bg-sunken)] px-3.5 py-2 font-semibold">
                      <span className="text-[13px]">Due at desk</span>
                      <MoneyText value={money(due)} />
                    </div>
                  </div>
                  <p className="m-0 text-[12px] text-[var(--ink-tertiary)]">
                    {due === 0
                      ? 'Nothing to collect — fully covered.'
                      : 'Balance posts to the guest folio — collect at the desk or from In-house.'}
                  </p>
                </div>
              )}

              {step === 3 && (
                <div
                  className="flex flex-col items-center gap-4 px-3 py-9 text-center"
                  data-testid="golden-checkin-success"
                >
                  <span className="grid size-16 place-items-center rounded-full bg-[var(--status-positive-bg)] text-[var(--status-positive-ink)] animate-[pop_.45s_var(--ease-standard)]">
                    <Check className="size-[30px]" />
                  </span>
                  <h3 className="m-0 max-w-[380px] font-display text-xl font-semibold leading-snug">
                    {arrival.guestName.split(' ')[0]} is in-house — room {pickedRoom?.number ?? ''}
                  </h3>
                  <div className="flex flex-col gap-1.5 text-[13px] text-[var(--ink-secondary)]">
                    <span className="inline-flex items-center gap-2">
                      <KeyRound className="size-3.5 text-[var(--status-positive-ink)]" /> Room set
                      occupied — rack updated live
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Sparkles className="size-3.5 text-[var(--status-positive-ink)]" />{' '}
                      Housekeeping sees the occupancy flip
                    </span>
                  </div>
                  <p className="m-0 text-[12px] text-[var(--ink-tertiary)]">
                    Audit row written — actor, before/after, permission.
                  </p>
                  <style>{`@keyframes pop { 0% { transform: scale(.6); opacity: 0 } 70% { transform: scale(1.08) } 100% { transform: scale(1); opacity: 1 } }`}</style>
                </div>
              )}
            </>
          )}
        </div>

        <footer className="flex items-center gap-2.5 border-t border-[var(--line-hairline)] bg-[var(--bg-raised)] px-6 py-3.5">
          <span className="text-[12px] text-[var(--ink-tertiary)]">
            <Kbd>esc</Kbd> parks the draft — nothing is lost
          </span>
          <span className="flex-1" />
          {step > 0 && step < 3 && (
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
          )}
          <Button
            ref={primaryActionRef}
            onClick={advance}
            loading={checkIn.isPending}
            disabled={!canCheckIn || (step === 2 && !pickedRoomId)}
            title={canCheckIn ? undefined : 'Check-in not permitted for your role'}
            data-testid="golden-checkin-primary"
          >
            {step === 0
              ? 'Verified — choose room'
              : step === 1
                ? `Room ${pickedRoom?.number ?? '—'} — to payment`
                : step === 2
                  ? 'Complete check-in'
                  : 'Close'}
            {step < 3 && <ArrowRight className="size-3.5" />}
          </Button>
        </footer>
        <style>{`
          @keyframes drawer-in { from { transform: translateX(20px); opacity: .6 } to { transform: none; opacity: 1 } }
          @keyframes fade { from { opacity: 0 } to { opacity: 1 } }
        `}</style>
      </div>
    </div>
  );
}
