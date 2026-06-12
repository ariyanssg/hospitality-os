'use client';
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { PulseBar, type PulseChip } from '@vela/ui';
import { useSdk } from '@/lib/sdk';
import { useSession } from '@/lib/store';

function fmtMoney(m: { amount: string; currency: string } | null | undefined): string {
  if (!m) return '—';
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: m.currency,
    maximumFractionDigits: 0,
  }).format(Number(m.amount));
}

/**
 * Live pulse bar (doc 18 §2) — property vitals from the manager flash + the operational boards.
 * Every chip clicks through to its board; numbers move as the desk works.
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
  const { data: departures } = useQuery({
    queryKey: ['departures', propertyId],
    queryFn: () => sdk.departures(),
    enabled: !!propertyId,
  });
  const { data: flash } = useQuery({
    queryKey: ['manager-flash', propertyId],
    queryFn: () => sdk.managerFlash(),
    enabled: !!propertyId,
  });
  const { data: hkBoard } = useQuery({
    queryKey: ['hk-board', propertyId],
    queryFn: () => sdk.hkBoard(),
    enabled: !!propertyId,
  });

  const chips: PulseChip[] = useMemo(() => {
    const total = arrivals?.length ?? 0;
    const assigned = arrivals?.filter((a) => a.roomAssigned).length ?? 0;
    const hkDirty = hkBoard?.filter((r) => r.hkStatus !== 'inspected').length ?? 0;
    return [
      {
        id: 'occ',
        label: 'Occupancy',
        value: flash ? `${Math.round(Number(flash.occupancyPct))}%` : '—',
        tone: 'info',
      },
      {
        id: 'arr',
        label: 'Arrivals',
        value: total,
        progress: total ? assigned / total : 0,
        onClick: () => router.push('/arrivals'),
      },
      {
        id: 'queue',
        label: 'Unassigned',
        value: total - assigned,
        tone: total - assigned > 0 ? 'caution' : 'positive',
      },
      {
        id: 'dep',
        label: 'Departures',
        value: departures?.length ?? 0,
        onClick: () => router.push('/departures'),
      },
      {
        id: 'inh',
        label: 'In-house',
        value: flash?.inHouse ?? '—',
        onClick: () => router.push('/inhouse'),
      },
      {
        id: 'hk',
        label: 'HK to inspect',
        value: hkDirty,
        tone: hkDirty > 0 ? 'caution' : 'positive',
        onClick: () => router.push('/housekeeping'),
      },
      {
        id: 'adr',
        label: 'ADR',
        value: fmtMoney(flash?.adr),
        tone: 'positive',
      },
      {
        id: 'revpar',
        label: 'RevPAR',
        value: fmtMoney(flash?.revpar),
      },
    ];
  }, [arrivals, departures, flash, hkBoard, router]);

  return <PulseBar chips={chips} />;
}
