'use client';
import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Flame, ShieldCheck, Sparkles } from 'lucide-react';
import { Badge, RoomStatusChip, Skeleton, type RoomState } from '@vela/ui';
import type { HkBoardRoom } from '@vela/contracts';
import { useSdk } from '@/lib/sdk';
import { useCan, useSession, useToast } from '@/lib/store';

const TH =
  'sticky top-0 z-[2] h-10 whitespace-nowrap bg-[var(--bg-raised)] px-[var(--cell-px)] text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--ink-tertiary)] border-b border-[var(--line-hairline)]';
const TD = 'h-[var(--row-h)] whitespace-nowrap px-[var(--cell-px)] align-middle';

function chipState(r: HkBoardRoom): RoomState {
  if (r.occupancy === 'occupied') return 'occupied';
  if (r.hkStatus === 'inspected') return 'inspected';
  return r.hkStatus === 'clean' ? 'vacant-clean' : 'vacant-dirty';
}

/**
 * Housekeeping (front-desk concept) — the room-ready queue. Rooms that block an arrival sort
 * first; the desk advances dirty → clean → inspected and the rack flips live.
 */
export default function HousekeepingPage() {
  const sdk = useSdk();
  const qc = useQueryClient();
  const propertyId = useSession((s) => s.activePropertyId);
  const showToast = useToast((s) => s.show);
  const canUpdate = useCan('room.status.update');
  const canInspect = useCan('room.inspect');

  const { data: board, isLoading } = useQuery({
    queryKey: ['hk-board', propertyId],
    queryFn: () => sdk.hkBoard(),
    enabled: !!propertyId,
  });
  const { data: arrivals } = useQuery({
    queryKey: ['arrivals', propertyId],
    queryFn: () => sdk.arrivals(),
    enabled: !!propertyId,
  });

  /** Room types still wanted today: unassigned arrivals + assigned-but-not-ready rooms. */
  const wanted = useMemo(() => {
    const byRoomId = new Map<string, string>();
    const byType = new Map<string, number>();
    for (const a of arrivals ?? []) {
      if (a.status !== 'confirmed') continue;
      if (a.roomId) byRoomId.set(a.roomId, a.guestName);
      else byType.set(a.roomTypeCode, (byType.get(a.roomTypeCode) ?? 0) + 1);
    }
    return { byRoomId, byType };
  }, [arrivals]);

  const rows = useMemo(() => {
    const list = (board ?? []).filter(
      (r) => r.hkStatus !== 'inspected' || r.occupancy === 'vacant',
    );
    const urgency = (r: HkBoardRoom) =>
      wanted.byRoomId.has(r.roomId)
        ? 0
        : r.occupancy === 'vacant' && wanted.byType.has(r.roomTypeCode)
          ? 1
          : 2;
    const rank = { dirty: 0, clean: 1, inspected: 2 } as const;
    return [...list].sort(
      (a, b) =>
        urgency(a) - urgency(b) ||
        rank[a.hkStatus] - rank[b.hkStatus] ||
        a.number.localeCompare(b.number),
    );
  }, [board, wanted]);

  const toInspect = (board ?? []).filter((r) => r.hkStatus !== 'inspected').length;

  const advance = useMutation({
    mutationFn: ({ room, next }: { room: HkBoardRoom; next: 'clean' | 'inspected' }) =>
      sdk.updateRoomStatus(room.roomId, { hkStatus: next }),
    onSuccess: (_data, { room, next }) => {
      qc.invalidateQueries({ queryKey: ['hk-board'] });
      qc.invalidateQueries({ queryKey: ['arrivals'] });
      showToast({
        text:
          next === 'inspected'
            ? `Room ${room.number} inspected — ready to sell`
            : `Room ${room.number} marked clean — awaiting inspection`,
      });
    },
    onError: (e: Error) => showToast({ tone: 'critical', text: e.message }),
  });

  return (
    <div className="mx-auto max-w-[960px] space-y-[var(--space-4)]">
      <div className="flex flex-wrap items-end justify-between gap-[var(--space-3)]">
        <div>
          <h1 className="font-display text-[var(--text-title)] font-semibold tracking-tight">
            Housekeeping
          </h1>
          <p className="text-[var(--text-caption)] text-[var(--ink-tertiary)]">
            Room-ready queue — rooms blocking an arrival float to the top; the rack flips live.
          </p>
        </div>
        <Badge tone={toInspect > 0 ? 'caution' : 'positive'}>{toInspect} to inspect</Badge>
      </div>

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line-hairline)] bg-[var(--bg-surface)]">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={TH}>Room</th>
              <th className={TH}>Status</th>
              <th className={TH}>Open task</th>
              <th className={TH}>Next arrival</th>
              <th className={TH} />
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 6 }, (_, i) => (
                <tr key={i} className="border-b border-[var(--line-hairline)] last:border-0">
                  <td className={TD} colSpan={5}>
                    <Skeleton className="h-4 w-full" />
                  </td>
                </tr>
              ))}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td className={TD + ' py-8 text-center text-[var(--ink-tertiary)]'} colSpan={5}>
                  Every room is inspected — the house is ready.
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const blockedGuest = wanted.byRoomId.get(r.roomId);
              const typeWanted = r.occupancy === 'vacant' && wanted.byType.has(r.roomTypeCode);
              return (
                <tr
                  key={r.roomId}
                  className="border-b border-[var(--line-hairline)] transition-colors last:border-0 hover:bg-[var(--bg-sunken)]"
                >
                  <td className={TD + ' font-mono'}>
                    <span className="font-semibold">{r.number}</span>{' '}
                    <span className="text-[var(--ink-tertiary)]">
                      · {r.roomTypeCode}
                      {r.floor ? ` · fl ${r.floor}` : ''}
                    </span>
                  </td>
                  <td className={TD}>
                    <RoomStatusChip state={chipState(r)} />
                  </td>
                  <td className={TD + ' text-[12.5px] text-[var(--ink-secondary)]'}>
                    {r.openTask
                      ? `${r.openTask.taskType.replace('_', ' ')} · ${r.openTask.status}`
                      : '—'}
                  </td>
                  <td
                    className={TD + ' text-[12.5px]'}
                    style={{
                      color:
                        blockedGuest || typeWanted
                          ? 'var(--status-caution-ink)'
                          : 'var(--ink-tertiary)',
                    }}
                  >
                    {blockedGuest ? (
                      <span className="inline-flex items-center gap-1">
                        <Flame className="size-[13px]" /> {blockedGuest} — assigned here
                      </span>
                    ) : typeWanted ? (
                      <span className="inline-flex items-center gap-1">
                        <Flame className="size-[13px]" /> {r.roomTypeCode} wanted today
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className={TD + ' text-right'}>
                    {r.hkStatus === 'dirty' && canUpdate && (
                      <button
                        onClick={() => advance.mutate({ room: r, next: 'clean' })}
                        disabled={advance.isPending}
                        className="inline-flex items-center gap-1.5 rounded-[var(--radius-full)] border border-[var(--line-hairline)] bg-[var(--bg-surface)] px-2.5 py-1 text-[12px] text-[var(--ink-secondary)] transition-colors hover:bg-[var(--bg-sunken)] hover:text-[var(--ink-primary)] disabled:opacity-50"
                      >
                        <Sparkles className="size-[13px]" /> Mark clean
                      </button>
                    )}
                    {r.hkStatus === 'clean' && canInspect && (
                      <button
                        onClick={() => advance.mutate({ room: r, next: 'inspected' })}
                        disabled={advance.isPending}
                        className="inline-flex items-center gap-1.5 rounded-[var(--radius-full)] border border-[var(--line-hairline)] bg-[var(--bg-surface)] px-2.5 py-1 text-[12px] text-[var(--ink-secondary)] transition-colors hover:bg-[var(--bg-sunken)] hover:text-[var(--ink-primary)] disabled:opacity-50"
                      >
                        <ShieldCheck className="size-[13px]" /> Pass inspection
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
