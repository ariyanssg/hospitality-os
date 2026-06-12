'use client';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RoomStatusChip, Skeleton } from '@vela/ui';
import type { RoomRackRow } from '@vela/contracts';
import { useSdk } from '@/lib/sdk';
import { useSession } from '@/lib/store';
import { CheckinDrawer } from '@/components/desk/checkin-drawer';

const CELL_W = 76;
const ROOM_W = 148;
const NIGHTS = 14;

type StayKind = 'inhouse' | 'arrival' | 'departure' | 'future';
const KIND_LABEL: Record<StayKind, string> = {
  inhouse: 'In-house',
  arrival: 'Arriving today',
  future: 'Confirmed',
  departure: 'Departing',
};
const KIND_CLASS: Record<StayKind, string> = {
  inhouse: 'bg-[var(--room-occupied)] text-[var(--ink-inverse)]',
  departure: 'bg-[var(--room-departure)] text-[var(--ink-inverse)]',
  arrival:
    'border-[1.5px] border-[var(--room-arrival)] bg-[var(--bg-surface)] text-[var(--ink-primary)] shadow-[inset_3px_0_0_var(--room-arrival)]',
  future: 'border border-[var(--line-strong)] bg-[var(--bg-sunken)] text-[var(--ink-secondary)]',
};

function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function roomState(r: RoomRackRow): string {
  if (r.occupancy === 'occupied') return 'occupied';
  if (r.hkStatus === 'inspected') return 'inspected';
  return r.hkStatus === 'clean' ? 'vacant-clean' : 'vacant-dirty';
}

interface Hover {
  guest: string;
  kind: StayKind;
  room: string;
  nights: number;
  fromDate: string;
  toDate: string;
  x: number;
  y: number;
}

/**
 * The Rack (front-desk concept) — rooms × 14 nights from the business date.
 * Stay bars use the sacred kind colors; arrivals click straight into check-in.
 */
export default function RackPage() {
  const sdk = useSdk();
  const propertyId = useSession((s) => s.activePropertyId);
  const [rtFilter, setRtFilter] = useState('All');
  const [hover, setHover] = useState<Hover | null>(null);
  const [checkinId, setCheckinId] = useState<string | null>(null);

  const { data: flash } = useQuery({
    queryKey: ['manager-flash', propertyId],
    queryFn: () => sdk.managerFlash(),
    enabled: !!propertyId,
  });
  const today = flash?.businessDate;

  const days = useMemo(() => {
    if (!today) return [];
    return Array.from({ length: NIGHTS }, (_, i) => {
      const iso = addDays(today, i);
      const d = new Date(iso + 'T00:00:00Z');
      return {
        i,
        iso,
        dow: d.toLocaleDateString(undefined, { weekday: 'short', timeZone: 'UTC' }).toUpperCase(),
        num: d.getUTCDate(),
        month: d.toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' }),
        weekend: [0, 6].includes(d.getUTCDay()),
      };
    });
  }, [today]);

  const { data: rack, isLoading } = useQuery({
    queryKey: ['room-rack', propertyId, today],
    queryFn: () => sdk.roomRack({ from: today!, to: addDays(today!, NIGHTS) }),
    enabled: !!propertyId && !!today,
  });

  const roomTypes = useMemo(
    () => ['All', ...new Set((rack ?? []).map((r) => r.roomTypeCode))],
    [rack],
  );
  const shown = useMemo(
    () =>
      rtFilter === 'All' ? (rack ?? []) : (rack ?? []).filter((r) => r.roomTypeCode === rtFilter),
    [rack, rtFilter],
  );

  const dayIndex = (iso: string) => Math.round((Date.parse(iso) - Date.parse(today!)) / 86_400_000);

  return (
    <div className="space-y-[var(--space-4)]">
      <div className="flex flex-wrap items-end justify-between gap-[var(--space-3)]">
        <div>
          <h1 className="font-display text-[var(--text-title)] font-semibold tracking-tight">
            Rack
          </h1>
          <p className="text-[var(--text-caption)] text-[var(--ink-tertiary)]">
            {NIGHTS} nights from the business date — arrival bars click straight into check-in.
          </p>
        </div>
        <div className="flex gap-0.5 rounded-[var(--radius-md)] border border-[var(--line-hairline)] bg-[var(--bg-surface)] p-[3px]">
          {roomTypes.map((rt) => (
            <button
              key={rt}
              onClick={() => setRtFilter(rt)}
              className={
                'rounded-[var(--radius-sm)] px-3 py-[5px] text-[12px] transition-colors ' +
                (rtFilter === rt
                  ? 'bg-[var(--interactive-selected)] font-medium text-[var(--ink-accent)]'
                  : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]')
              }
            >
              {rt}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line-hairline)] bg-[var(--bg-surface)]">
        <div className="max-h-[calc(100vh-290px)] overflow-auto">
          {isLoading || !today ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }, (_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <div
              className="grid min-w-max"
              style={{ gridTemplateColumns: `${ROOM_W}px repeat(${days.length}, ${CELL_W}px)` }}
            >
              {/* header row */}
              <div className="sticky left-0 top-0 z-[4] flex h-[46px] items-center border-b border-r border-[var(--line-hairline)] border-r-[var(--line-strong)] bg-[var(--bg-raised)] px-3">
                <span className="text-[9.5px] font-semibold tracking-[0.06em] text-[var(--ink-tertiary)]">
                  {days[0]?.month.toUpperCase()} — ROOMS
                </span>
              </div>
              {days.map((d) => (
                <div
                  key={d.iso}
                  className={
                    'sticky top-0 z-[2] flex h-[46px] flex-col items-center justify-center gap-px border-b border-l border-[var(--line-hairline)] ' +
                    (d.i === 0 ? 'bg-[var(--interactive-selected)]' : 'bg-[var(--bg-raised)]')
                  }
                >
                  <span className="text-[9.5px] font-semibold tracking-[0.06em] text-[var(--ink-tertiary)]">
                    {d.i === 0 ? 'TODAY' : d.dow}
                  </span>
                  <span
                    className={
                      'font-display text-[14px] font-semibold tabular-nums ' +
                      (d.i === 0
                        ? 'text-[var(--ink-accent)]'
                        : d.weekend
                          ? 'text-[var(--ink-tertiary)]'
                          : '')
                    }
                  >
                    {d.num}
                  </span>
                </div>
              ))}
              {/* room rows */}
              {shown.map((r) => (
                <div key={r.roomId} className="contents">
                  <div className="sticky left-0 z-[3] flex h-11 items-center gap-2 border-b border-r border-[var(--line-hairline)] border-r-[var(--line-strong)] bg-[var(--bg-raised)] px-3">
                    <span className="font-mono text-[13px] font-semibold">{r.number}</span>
                    <span className="text-[10px] tracking-[0.04em] text-[var(--ink-tertiary)]">
                      {r.roomTypeCode}
                    </span>
                    <span
                      title={roomState(r)}
                      className="ml-auto size-[9px] flex-none rounded-full"
                      style={{ background: `var(--room-${roomState(r)})` }}
                    />
                  </div>
                  {days.map((d) => (
                    <div
                      key={d.iso}
                      className={
                        'relative h-11 border-b border-l border-[var(--line-hairline)] ' +
                        (d.i === 0
                          ? 'bg-[oklch(from_var(--accent-500)_l_c_h_/_.055)]'
                          : d.weekend
                            ? 'bg-[oklch(20%_0.015_260_/_.022)] dark:bg-[oklch(100%_0_0_/_.02)]'
                            : '')
                      }
                    >
                      {r.stays.map((s) => {
                        const start = dayIndex(s.fromDate);
                        const nights = dayIndex(s.toDate) - start;
                        const visStart = Math.max(0, start);
                        const clipped = visStart - start;
                        const visNights = Math.min(nights - clipped, days.length - visStart);
                        if (visNights <= 0 || visStart !== d.i) return null;
                        const kind: StayKind =
                          s.status === 'checked_in'
                            ? dayIndex(s.toDate) === 0
                              ? 'departure'
                              : 'inhouse'
                            : start === 0
                              ? 'arrival'
                              : 'future';
                        return (
                          <button
                            key={s.reservationId}
                            onClick={() => {
                              if (kind === 'arrival') setCheckinId(s.reservationId);
                            }}
                            onMouseEnter={(e) =>
                              setHover({
                                guest: s.guestName,
                                kind,
                                room: r.number,
                                nights,
                                fromDate: s.fromDate,
                                toDate: s.toDate,
                                x: e.clientX,
                                y: e.clientY,
                              })
                            }
                            onMouseMove={(e) =>
                              setHover((h) => (h ? { ...h, x: e.clientX, y: e.clientY } : h))
                            }
                            onMouseLeave={() => setHover(null)}
                            className={
                              'absolute top-[7px] z-[1] flex h-[30px] cursor-pointer items-center gap-1.5 overflow-hidden whitespace-nowrap rounded-[var(--radius-full)] px-[9px] text-[12px] font-medium transition-[box-shadow,filter] duration-[var(--motion-fast)] hover:z-[2] hover:shadow-[var(--shadow-e3)] hover:brightness-[1.04] ' +
                              KIND_CLASS[kind]
                            }
                            style={{
                              left: 3,
                              width: visNights * CELL_W - 8,
                              borderTopLeftRadius: clipped ? 2 : undefined,
                              borderBottomLeftRadius: clipped ? 2 : undefined,
                            }}
                          >
                            {s.guestName}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        {(
          [
            ['In-house', 'var(--room-occupied)', undefined],
            ['Arriving today', 'var(--bg-surface)', '1.5px solid var(--room-arrival)'],
            ['Departing', 'var(--room-departure)', undefined],
            ['Confirmed', 'var(--bg-sunken)', '1px solid var(--line-strong)'],
          ] as const
        ).map(([label, bg, border]) => (
          <span
            key={label}
            className="inline-flex items-center gap-1.5 text-[12px] text-[var(--ink-secondary)]"
          >
            <span className="h-[10px] w-[18px] rounded-[5px]" style={{ background: bg, border }} />
            {label}
          </span>
        ))}
        <span className="flex-1" />
        <RoomStatusChip state="vacant-clean" />
        <RoomStatusChip state="vacant-dirty" />
        <RoomStatusChip state="inspected" />
        <RoomStatusChip state="occupied" />
      </div>

      {hover && (
        <div
          className="pointer-events-none fixed z-[var(--z-toast)] w-[280px] rounded-[var(--radius-lg)] border border-[var(--line-hairline)] bg-[var(--bg-raised)] p-3.5 shadow-[var(--shadow-e4)]"
          style={{
            left: Math.min(
              hover.x + 14,
              (typeof window !== 'undefined' ? window.innerWidth : 1200) - 300,
            ),
            top: Math.min(
              hover.y + 14,
              (typeof window !== 'undefined' ? window.innerHeight : 800) - 170,
            ),
          }}
        >
          <div className="mb-2 flex items-center justify-between">
            <b className="text-[14px]">{hover.guest}</b>
            <span
              className={
                'text-[11px] font-semibold uppercase tracking-[0.04em] ' +
                (hover.kind === 'arrival'
                  ? 'text-[var(--status-info-ink)]'
                  : 'text-[var(--ink-tertiary)]')
              }
            >
              {KIND_LABEL[hover.kind]}
            </span>
          </div>
          <div className="flex flex-col gap-1 text-[12.5px] text-[var(--ink-secondary)]">
            <span>
              Room {hover.room} · {hover.nights} night{hover.nights > 1 ? 's' : ''}
            </span>
            <span className="font-mono text-[11.5px] text-[var(--ink-tertiary)]">
              {hover.fromDate} → {hover.toDate}
            </span>
            {hover.kind === 'arrival' && (
              <span className="text-[11.5px] text-[var(--ink-tertiary)]">
                Click to start check-in
              </span>
            )}
          </div>
        </div>
      )}

      <CheckinDrawer reservationId={checkinId} onClose={() => setCheckinId(null)} />
    </div>
  );
}
