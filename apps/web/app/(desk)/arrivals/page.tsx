'use client';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CornerDownLeft, Printer, WandSparkles } from 'lucide-react';
import { Badge, MoneyText, ReservationStatusBadge, Skeleton } from '@vela/ui';
import type { ArrivalRow } from '@vela/contracts';
import { useSdk } from '@/lib/sdk';
import { useDeskIntent, useSession, useToast } from '@/lib/store';
import { readinessScore } from '@/lib/readiness';
import { ReadyChip, ChannelDot } from '@/components/desk/ready-chip';
import { ActionTray, TrayButton } from '@/components/desk/action-tray';
import { CheckinDrawer } from '@/components/desk/checkin-drawer';

const VIEWS = ['All', 'Unassigned', 'VIP', 'In queue'] as const;
type View = (typeof VIEWS)[number];

function nightsOf(a: ArrivalRow): number {
  return Math.max(
    1,
    Math.round((Date.parse(a.departureDate) - Date.parse(a.arrivalDate)) / 86_400_000),
  );
}

const TH =
  'sticky top-0 z-[2] h-10 whitespace-nowrap bg-[var(--bg-raised)] px-[var(--cell-px)] text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--ink-tertiary)] border-b border-[var(--line-hairline)]';
const TD = 'h-[var(--row-h)] whitespace-nowrap px-[var(--cell-px)] align-middle';

/**
 * Arrivals board (front-desk concept) — sorted by composite readiness so exceptions
 * float to the top; row selection feeds the bulk action tray; Enter starts check-in.
 */
export default function ArrivalsPage() {
  const sdk = useSdk();
  const propertyId = useSession((s) => s.activePropertyId);
  const showToast = useToast((s) => s.show);
  const [view, setView] = useState<View>('All');
  const [open, setOpen] = useState<string | null>(null);
  const [checked, setChecked] = useState<ReadonlySet<string>>(new Set());

  // ⌘K hands off a check-in target — open the drawer and consume the intent.
  const checkinIntent = useDeskIntent((s) => s.checkinId);
  const clearCheckin = useDeskIntent((s) => s.clearCheckin);
  useEffect(() => {
    if (checkinIntent) {
      setOpen(checkinIntent);
      clearCheckin();
    }
  }, [checkinIntent, clearCheckin]);

  const { data, isLoading } = useQuery({
    queryKey: ['arrivals', propertyId],
    queryFn: () => sdk.arrivals(),
    enabled: !!propertyId,
  });

  const rows = useMemo(() => {
    let r = data ?? [];
    if (view === 'Unassigned') r = r.filter((a) => !a.roomAssigned);
    else if (view === 'VIP') r = r.filter((a) => a.vipTier);
    else if (view === 'In queue')
      r = r.filter(
        (a) => a.roomAssigned && a.roomHkStatus !== 'inspected' && a.status !== 'checked_in',
      );
    return [...r].sort(
      (x, y) => readinessScore(x) - readinessScore(y) || x.guestName.localeCompare(y.guestName),
    );
  }, [data, view]);

  const unassigned = data?.filter((a) => !a.roomAssigned).length ?? 0;
  const allChecked = rows.length > 0 && rows.every((a) => checked.has(a.id));

  const toggle = (ids: string[], replace = false) =>
    setChecked((prev) => {
      if (replace) return new Set(ids);
      const next = new Set(prev);
      for (const id of ids) {
        if (next.has(id)) next.delete(id);
        else next.add(id);
      }
      return next;
    });

  const checkedRows = rows.filter((a) => checked.has(a.id));
  const startable = checkedRows.find((a) => a.status === 'confirmed');

  return (
    <div className="space-y-[var(--space-4)]">
      <div className="flex flex-wrap items-end justify-between gap-[var(--space-3)]">
        <div>
          <h1 className="font-display text-[var(--text-title)] font-semibold tracking-tight">
            Arrivals
          </h1>
          <p className="text-[var(--text-caption)] text-[var(--ink-tertiary)]">
            Sorted by readiness — exceptions float to the top.{' '}
            <CornerDownLeft className="inline size-[11px]" /> starts check-in.
          </p>
        </div>
        <div className="flex gap-0.5 rounded-[var(--radius-md)] border border-[var(--line-hairline)] bg-[var(--bg-surface)] p-[3px]">
          {VIEWS.map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={
                'inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-[5px] text-[12px] transition-colors ' +
                (view === v
                  ? 'bg-[var(--interactive-selected)] font-medium text-[var(--ink-accent)]'
                  : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]')
              }
            >
              {v}
              {v === 'Unassigned' && unassigned > 0 && <Badge tone="caution">{unassigned}</Badge>}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line-hairline)] bg-[var(--bg-surface)]">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={TH} style={{ width: 34 }}>
                <input
                  type="checkbox"
                  aria-label="Select all"
                  checked={allChecked}
                  onChange={() => toggle(allChecked ? [] : rows.map((a) => a.id), true)}
                  className="size-[15px] cursor-pointer accent-[var(--interactive-default)]"
                />
              </th>
              <th className={TH}>Conf.</th>
              <th className={TH}>Guest</th>
              <th className={TH}>Channel</th>
              <th className={TH}>Stay</th>
              <th className={TH}>Readiness</th>
              <th className={TH}>Status</th>
              <th className={TH} style={{ textAlign: 'right' }}>
                Balance
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 5 }, (_, i) => (
                <tr key={i} className="border-b border-[var(--line-hairline)] last:border-0">
                  <td className={TD} colSpan={8}>
                    <Skeleton className="h-4 w-full" />
                  </td>
                </tr>
              ))}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td className={TD + ' py-8 text-center text-[var(--ink-tertiary)]'} colSpan={8}>
                  {view === 'All'
                    ? 'No arrivals for the current business date.'
                    : `No arrivals in “${view}”.`}
                </td>
              </tr>
            )}
            {rows.map((a) => (
              <tr
                key={a.id}
                tabIndex={0}
                onClick={() => setOpen(a.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setOpen(a.id);
                }}
                className={
                  'cursor-pointer border-b border-[var(--line-hairline)] transition-colors last:border-0 hover:bg-[var(--bg-sunken)] focus-visible:bg-[var(--bg-sunken)] focus-visible:shadow-[inset_2px_0_0_var(--line-focus)] focus-visible:outline-none ' +
                  (checked.has(a.id) ? 'bg-[var(--interactive-selected)]' : '')
                }
              >
                <td className={TD} onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    aria-label={`Select ${a.guestName}`}
                    checked={checked.has(a.id)}
                    onChange={() => toggle([a.id])}
                    className="size-[15px] cursor-pointer accent-[var(--interactive-default)]"
                  />
                </td>
                <td className={TD + ' font-mono text-[12px] text-[var(--ink-secondary)]'}>
                  {a.confirmationNumber}
                </td>
                <td className={TD}>
                  <span className="inline-flex items-center gap-2">
                    <span className="font-medium">{a.guestName}</span>
                    {a.vipTier && <Badge tone="accent">VIP</Badge>}
                    <span className="font-mono text-[11px] text-[var(--ink-tertiary)]">
                      {a.adults}+{a.children}
                    </span>
                  </span>
                </td>
                <td className={TD}>
                  <ChannelDot channel={a.channel} />
                </td>
                <td className={TD + ' font-mono text-[12px] text-[var(--ink-tertiary)]'}>
                  {nightsOf(a)}N · {a.roomTypeCode}
                  {a.roomNumber ? ` · ${a.roomNumber}` : ''}
                </td>
                <td className={TD}>
                  <ReadyChip arrival={a} />
                </td>
                <td className={TD}>
                  <ReservationStatusBadge status={a.status} />
                </td>
                <td className={TD + ' text-right'}>
                  <MoneyText value={a.balance} className="text-[var(--font-size-ui)]" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ActionTray count={checked.size} onClear={() => setChecked(new Set())}>
        {startable && (
          <TrayButton
            onClick={() => {
              setOpen(startable.id);
              setChecked(new Set());
            }}
          >
            <CornerDownLeft className="size-[15px]" /> Start check-in
          </TrayButton>
        )}
        <TrayButton
          onClick={() => {
            showToast({
              tone: 'info',
              text: `Auto-assign queued for ${checked.size} arrival${checked.size > 1 ? 's' : ''} — rooms confirm at check-in`,
            });
            setChecked(new Set());
          }}
        >
          <WandSparkles className="size-[15px]" /> Auto-assign
        </TrayButton>
        <TrayButton
          onClick={() => {
            showToast({ text: `Reg cards queued to front-desk printer (${checked.size})` });
            setChecked(new Set());
          }}
        >
          <Printer className="size-[15px]" /> Reg cards
        </TrayButton>
      </ActionTray>

      <CheckinDrawer reservationId={open} onClose={() => setOpen(null)} />
    </div>
  );
}
