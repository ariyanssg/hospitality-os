'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowBigUpDash,
  ArrowRight,
  BedDouble,
  CircleAlert,
  CreditCard,
  GitCompareArrows,
  Siren,
  Sparkles,
  TrendingUp,
  WandSparkles,
} from 'lucide-react';
import { Badge, MoneyText, StatTile } from '@vela/ui';
import { useSdk } from '@/lib/sdk';
import { useSession, useToast } from '@/lib/store';
import { readinessScore } from '@/lib/readiness';
import { CheckinDrawer } from '@/components/desk/checkin-drawer';

/** Assistive layer — approve-before-publish suggestions (preview surface; engine lands later). */
const AI_SUGGESTIONS = [
  {
    id: 'ai1',
    icon: TrendingUp,
    confidence: '87%',
    title: 'Raise KING BAR +8% Fri–Sat',
    body: 'City event detected · forecast occupancy 92% · comp set trending +6%. Publishes to all channels on approval.',
    actions: ['Approve & publish', 'Simulate'],
  },
  {
    id: 'ai2',
    icon: ArrowBigUpDash,
    confidence: '3 ranked',
    title: 'Upgrade offers likely to convert',
    body: 'Ranked by stay history and tonight’s sell-through. Offers surface inside each guest’s check-in flow.',
    actions: ['Queue offers'],
  },
  {
    id: 'ai3',
    icon: Siren,
    confidence: 'new',
    title: 'F&B voids +18% vs 4-week trend',
    body: 'Concentrated in POS shift 2 (Tue–Wed). Pattern matches training-gap, not leakage.',
    actions: ['Open report'],
  },
  {
    id: 'ai4',
    icon: GitCompareArrows,
    confidence: '2 items',
    title: 'Gateway captures unmatched',
    body: 'Two captures have no posting match. Auto-match suggestions ready for review.',
    actions: ['Review matches'],
  },
];

/** Distribution health (preview surface) — the zero-lag thesis, observable. */
const CHANNELS = [
  { name: 'Booking.com', ok: true, lag: '4s', note: 'parity OK' },
  { name: 'Expedia', ok: false, lag: '9s', note: 'rate-map warning · DLX' },
  { name: 'GDS', ok: true, lag: '11s', note: 'parity OK' },
  { name: 'Booking engine', ok: true, lag: '<1s', note: 'direct' },
];

export default function TodayPage() {
  const router = useRouter();
  const sdk = useSdk();
  const me = useSession((s) => s.me);
  const propertyId = useSession((s) => s.activePropertyId);
  const showToast = useToast((s) => s.show);
  const [openId, setOpenId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const { data: arrivals } = useQuery({
    queryKey: ['arrivals', propertyId],
    queryFn: () => sdk.arrivals(),
    enabled: !!propertyId,
  });
  const { data: flash } = useQuery({
    queryKey: ['manager-flash', propertyId],
    queryFn: () => sdk.managerFlash(),
    enabled: !!propertyId,
  });
  const { data: cashier } = useQuery({
    queryKey: ['cashier-session', propertyId],
    queryFn: () => sdk.currentCashierSession(),
    enabled: !!propertyId,
  });

  const all = useMemo(() => arrivals ?? [], [arrivals]);
  const unassigned = all.filter((a) => !a.roomAssigned);
  const unpaid = all.filter((a) => a.roomAssigned && Number(a.balance.amount) > 0);
  const ready = all.filter((a) => readinessScore(a) === 5).length;
  const ai = AI_SUGGESTIONS.filter((s) => !dismissed.has(s.id));

  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="mx-auto max-w-[980px] space-y-[var(--space-5)]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[var(--text-title)] font-semibold tracking-tight">
            {greet}, {me?.name?.split(' ')[0]}
          </h1>
          <p className="text-[var(--text-caption)] text-[var(--ink-tertiary)]">
            {all.length} arrivals on the book · {ready} fully ready — work the exceptions first.
          </p>
        </div>
        {cashier ? (
          <Badge tone="positive">Cashier session open</Badge>
        ) : (
          <Badge tone="neutral">No cashier session</Badge>
        )}
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Occupancy"
          value={flash ? `${Math.round(Number(flash.occupancyPct))}%` : '—'}
          sub={flash ? `${flash.occupiedRooms} of ${flash.physicalRooms} rooms` : undefined}
        />
        <StatTile
          label="Arrivals"
          value={all.length}
          sub={`${all.length - unassigned.length} assigned · ${unassigned.length} to place`}
        />
        <StatTile
          label="Departures"
          value={flash?.departuresToday ?? '—'}
          sub={flash ? `${flash.inHouse} in-house` : undefined}
        />
        <StatTile
          label="ADR"
          value={
            flash?.adr
              ? new Intl.NumberFormat(undefined, {
                  style: 'currency',
                  currency: flash.adr.currency,
                  maximumFractionDigits: 0,
                }).format(Number(flash.adr.amount))
              : '—'
          }
          sub="room revenue / occupied room"
        />
      </div>

      {/* Needs attention — exception-first */}
      <section className="rounded-[var(--radius-xl)] border border-[var(--line-hairline)] bg-[var(--bg-surface)] p-[var(--space-5)]">
        <div className="mb-2.5 flex items-center gap-2">
          <CircleAlert className="size-4 text-[var(--status-caution-ink)]" />
          <h2 className="text-[var(--text-heading)] font-semibold">Needs attention</h2>
          <Badge tone="caution">{unassigned.length + unpaid.length}</Badge>
        </div>
        {unassigned.length + unpaid.length === 0 ? (
          <p className="text-[var(--text-caption)] text-[var(--ink-tertiary)]">
            All clear — every arrival has a room and a settled folio.
          </p>
        ) : (
          <ul>
            {unassigned.map((a) => (
              <li
                key={a.id}
                onClick={() => setOpenId(a.id)}
                className="-mx-3 flex cursor-pointer items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 transition-colors duration-[var(--motion-fast)] hover:bg-[var(--bg-sunken)]"
              >
                <span className="grid size-[30px] flex-none place-items-center rounded-[var(--radius-md)] bg-[var(--status-caution-bg)] text-[var(--status-caution-ink)]">
                  <BedDouble className="size-[15px]" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-medium">
                    {a.guestName} arrives today — no room assigned
                  </span>
                  <span className="block text-[var(--text-caption)] text-[var(--ink-tertiary)]">
                    {a.roomTypeCode} · {a.adults}+{a.children} pax ·{' '}
                    <span className="font-mono">{a.confirmationNumber}</span>
                  </span>
                </span>
                <span className="ml-auto">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenId(a.id);
                    }}
                    className="inline-flex h-8 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--line-hairline)] bg-[var(--bg-surface)] px-2.5 text-[13px] transition-colors hover:bg-[var(--bg-sunken)]"
                  >
                    <WandSparkles className="size-[13px]" /> Assign
                  </button>
                </span>
              </li>
            ))}
            {unpaid.map((a) => (
              <li
                key={a.id}
                onClick={() => setOpenId(a.id)}
                className="-mx-3 flex cursor-pointer items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 transition-colors duration-[var(--motion-fast)] hover:bg-[var(--bg-sunken)]"
              >
                <span className="grid size-[30px] flex-none place-items-center rounded-[var(--radius-md)] bg-[var(--status-critical-bg)] text-[var(--status-critical-ink)]">
                  <CreditCard className="size-[15px]" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-medium">
                    Payment outstanding — {a.guestName}
                  </span>
                  <span className="block text-[var(--text-caption)] text-[var(--ink-tertiary)]">
                    Room {a.roomNumber} · balance <MoneyText value={a.balance} />
                  </span>
                </span>
                <span className="ml-auto">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenId(a.id);
                    }}
                    className="inline-flex h-8 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--line-hairline)] bg-[var(--bg-surface)] px-2.5 text-[13px] transition-colors hover:bg-[var(--bg-sunken)]"
                  >
                    <CreditCard className="size-[13px]" /> Collect at check-in
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Vela AI — assistive, approve-before-publish */}
      {ai.length > 0 && (
        <section className="rounded-[var(--radius-xl)] border border-[var(--line-hairline)] bg-[var(--bg-surface)] p-[var(--space-5)]">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="size-4 text-[var(--ink-accent)]" />
            <h2 className="text-[var(--text-heading)] font-semibold">Vela AI</h2>
            <span className="text-[11.5px] text-[var(--ink-tertiary)]">
              assistive · approve-before-publish · preview
            </span>
          </div>
          <div className="grid gap-2.5 md:grid-cols-2">
            {ai.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.id}
                  className="flex flex-col gap-1.5 rounded-[var(--radius-lg)] border border-[var(--line-hairline)] bg-[var(--bg-canvas)] px-3.5 py-3"
                >
                  <div className="flex items-center gap-2 text-[13.5px]">
                    <Icon className="size-[15px] flex-none text-[var(--ink-accent)]" />
                    <b>{s.title}</b>
                    <span className="ml-auto rounded-full bg-[var(--interactive-selected)] px-[7px] py-px font-mono text-[10.5px] text-[var(--ink-accent)]">
                      {s.confidence}
                    </span>
                  </div>
                  <p className="m-0 text-[12.5px] leading-normal text-[var(--ink-secondary)]">
                    {s.body}
                  </p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    {s.actions.map((label, i) => (
                      <button
                        key={label}
                        onClick={() =>
                          showToast({
                            tone: 'info',
                            text: `${label} — queued for review (preview)`,
                          })
                        }
                        className={
                          'inline-flex h-7 items-center rounded-[var(--radius-md)] border border-[var(--line-hairline)] bg-[var(--bg-surface)] px-2.5 text-[12.5px] transition-colors hover:bg-[var(--bg-sunken)]' +
                          (i === 0 ? ' font-medium text-[var(--ink-accent)]' : '')
                        }
                      >
                        {label}
                      </button>
                    ))}
                    <button
                      onClick={() => setDismissed((d) => new Set([...d, s.id]))}
                      className="ml-auto text-[12px] text-[var(--ink-tertiary)] hover:text-[var(--ink-primary)]"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Distribution health */}
      <section className="rounded-[var(--radius-xl)] border border-[var(--line-hairline)] bg-[var(--bg-surface)] p-[var(--space-5)]">
        <div className="mb-2.5 flex items-center gap-2">
          <h3 className="text-[var(--text-micro)] font-semibold uppercase tracking-wide text-[var(--ink-tertiary)]">
            Distribution health
          </h3>
          <span className="text-[11.5px] text-[var(--ink-tertiary)]">
            same availability counters the desk writes — zero sync lag by construction
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {CHANNELS.map((c) => (
            <div
              key={c.name}
              className="flex items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--line-hairline)] bg-[var(--bg-canvas)] px-3 py-2.5"
            >
              <span
                className="size-2 flex-none rounded-full"
                style={{
                  background: c.ok ? 'var(--status-positive-ink)' : 'var(--status-caution-ink)',
                }}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium">{c.name}</span>
                <span
                  className="block text-[11.5px]"
                  style={{ color: c.ok ? 'var(--ink-tertiary)' : 'var(--status-caution-ink)' }}
                >
                  {c.note}
                </span>
              </span>
              <span className="font-mono text-[11.5px] text-[var(--ink-tertiary)]">{c.lag}</span>
            </div>
          ))}
        </div>
      </section>

      <button
        onClick={() => router.push('/arrivals')}
        className="inline-flex h-8 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--line-hairline)] bg-[var(--bg-surface)] px-2.5 text-[13px] transition-colors hover:bg-[var(--bg-sunken)]"
      >
        Open arrivals board <ArrowRight className="size-[13px]" />
      </button>

      <CheckinDrawer reservationId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}
