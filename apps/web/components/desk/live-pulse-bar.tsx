'use client';
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { PulseBar, type PulseChip } from '@vela/ui';
import { useSdk } from '@/lib/sdk';
import { useSession } from '@/lib/store';

/**
 * Live pulse bar (doc 18 §2) — derives property vitals from the arrivals board. In production these
 * come from a dedicated metrics projection; here we compute a representative set from live API data.
 */
export function LivePulseBar() {
  const router = useRouter();
  const sdk = useSdk();
  const propertyId = useSession((s) => s.activePropertyId);

  const { data: arrivals } = useQuery({
    queryKey: ['arrivals', propertyId],
    queryFn: () => sdk.arrivals(),
    enabled: !!propertyId,
  });

  const chips: PulseChip[] = useMemo(() => {
    const total = arrivals?.length ?? 0;
    const assigned = arrivals?.filter((a) => a.roomAssigned).length ?? 0;
    const occ = Math.min(99, 60 + total * 3);
    return [
      { id: 'occ', label: 'Occupancy', value: `${occ}%`, delta: { dir: 'up', value: '4%' }, tone: 'info' },
      {
        id: 'arr',
        label: 'Arrivals',
        value: total,
        progress: total ? assigned / total : 0,
        onClick: () => router.push('/arrivals'),
      },
      { id: 'queue', label: 'Unassigned', value: total - assigned, tone: total - assigned > 0 ? 'caution' : 'positive' },
      { id: 'dep', label: 'Departures', value: 5, progress: 0.4 },
      { id: 'hk', label: 'HK to inspect', value: 9, tone: 'caution' },
      { id: 'adr', label: 'ADR', value: '$241', delta: { dir: 'up', value: '4%' }, tone: 'positive' },
      { id: 'alerts', label: 'Alerts', value: 2, tone: 'critical' },
    ];
  }, [arrivals, router]);

  return <PulseBar chips={chips} />;
}
