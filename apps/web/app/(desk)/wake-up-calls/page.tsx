'use client';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlarmClock, CheckCircle2, RotateCcw } from 'lucide-react';
import { Badge, Button, Input, Skeleton } from '@vela/ui';
import { useSdk } from '@/lib/sdk';
import { useSession, useToast } from '@/lib/store';

const TH =
  'sticky top-0 z-[2] h-10 whitespace-nowrap bg-[var(--bg-raised)] px-[var(--cell-px)] text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--ink-tertiary)] border-b border-[var(--line-hairline)]';
const TD = 'h-[var(--row-h)] whitespace-nowrap px-[var(--cell-px)] align-middle';
const STORAGE_KEY = 'vela-wake-up-calls';

type WakeCall = { time: string; status: 'scheduled' | 'completed' };

export default function WakeUpCallsPage() {
  const sdk = useSdk();
  const propertyId = useSession((s) => s.activePropertyId);
  const showToast = useToast((s) => s.show);
  const [hydrated, setHydrated] = useState(false);
  const [calls, setCalls] = useState<Record<string, WakeCall>>({});
  const [draftTimes, setDraftTimes] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['in-house', propertyId],
    queryFn: () => sdk.inHouse(),
    enabled: !!propertyId,
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setCalls(JSON.parse(saved) as Record<string, WakeCall>);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(calls));
  }, [calls, hydrated]);

  const rows = useMemo(() => data ?? [], [data]);
  const scheduled = Object.values(calls).filter((call) => call.status === 'scheduled').length;

  const schedule = (reservationId: string, guestName: string) => {
    const time = draftTimes[reservationId] || calls[reservationId]?.time;
    if (!time) {
      showToast({ tone: 'critical', text: 'Choose a wake-up time first' });
      return;
    }
    setCalls((current) => ({ ...current, [reservationId]: { time, status: 'scheduled' } }));
    showToast({ text: `Wake-up call scheduled for ${guestName} at ${time}` });
  };

  const complete = (reservationId: string, guestName: string) => {
    setCalls((current) => ({
      ...current,
      [reservationId]: { ...(current[reservationId] ?? { time: '-' }), status: 'completed' },
    }));
    showToast({ tone: 'positive', text: `Wake-up call completed for ${guestName}` });
  };

  return (
    <div className="mx-auto max-w-[980px] space-y-[var(--space-4)]">
      <div className="flex flex-wrap items-end justify-between gap-[var(--space-3)]">
        <div>
          <h1 className="font-display text-[var(--text-title)] font-semibold tracking-tight">
            Wake-up calls
          </h1>
          <p className="text-[var(--text-caption)] text-[var(--ink-tertiary)]">
            In-house guest wake-up queue for the front desk.
          </p>
        </div>
        <Badge tone={scheduled > 0 ? 'info' : 'neutral'}>{scheduled} scheduled</Badge>
      </div>

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line-hairline)] bg-[var(--bg-surface)]">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={TH}>Guest</th>
              <th className={TH}>Room</th>
              <th className={TH}>Wake-up time</th>
              <th className={TH}>Status</th>
              <th className={TH} />
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 4 }, (_, index) => (
                <tr key={index} className="border-b border-[var(--line-hairline)] last:border-0">
                  <td className={TD} colSpan={5}>
                    <Skeleton className="h-4 w-full" />
                  </td>
                </tr>
              ))}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td className={TD + ' py-8 text-center text-[var(--ink-tertiary)]'} colSpan={5}>
                  No in-house guests.
                </td>
              </tr>
            )}
            {rows.map((guest) => {
              const call = calls[guest.id];
              return (
                <tr
                  key={guest.id}
                  className="border-b border-[var(--line-hairline)] transition-colors last:border-0 hover:bg-[var(--bg-sunken)]"
                >
                  <td className={TD}>
                    <span className="inline-flex items-center gap-2">
                      <AlarmClock className="size-[15px] text-[var(--ink-tertiary)]" />
                      <span className="font-medium">{guest.guestName}</span>
                      <span className="font-mono text-[11px] text-[var(--ink-tertiary)]">
                        {guest.confirmationNumber}
                      </span>
                    </span>
                  </td>
                  <td className={TD + ' font-mono text-[12.5px]'}>{guest.roomNumber ?? '-'}</td>
                  <td className={TD}>
                    <Input
                      type="time"
                      value={draftTimes[guest.id] ?? call?.time ?? ''}
                      onChange={(event) =>
                        setDraftTimes((current) => ({ ...current, [guest.id]: event.target.value }))
                      }
                      className="w-[130px]"
                    />
                  </td>
                  <td className={TD}>
                    {call?.status === 'completed' ? (
                      <Badge tone="positive">completed</Badge>
                    ) : call?.status === 'scheduled' ? (
                      <Badge tone="info">scheduled {call.time}</Badge>
                    ) : (
                      <Badge tone="neutral">not set</Badge>
                    )}
                  </td>
                  <td className={TD + ' text-right'}>
                    <div className="inline-flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => schedule(guest.id, guest.guestName)}
                      >
                        <RotateCcw className="size-3.5" /> Set
                      </Button>
                      {call?.status === 'scheduled' && (
                        <Button size="sm" onClick={() => complete(guest.id, guest.guestName)}>
                          <CheckCircle2 className="size-3.5" /> Done
                        </Button>
                      )}
                    </div>
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
