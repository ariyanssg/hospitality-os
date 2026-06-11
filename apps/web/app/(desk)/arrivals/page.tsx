'use client';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Circle } from 'lucide-react';
import {
  Badge,
  DataGrid,
  MoneyText,
  ReservationStatusBadge,
  type ColumnDef,
} from '@vela/ui';
import type { ArrivalRow } from '@vela/contracts';
import { useSdk } from '@/lib/sdk';
import { useSession } from '@/lib/store';
import { ReservationDrawer } from '@/components/desk/reservation-drawer';

const VIEWS = ['All', 'Unassigned', 'VIP', 'In queue'] as const;

export default function ArrivalsPage() {
  const sdk = useSdk();
  const propertyId = useSession((s) => s.activePropertyId);
  const [view, setView] = useState<(typeof VIEWS)[number]>('All');
  const [selected, setSelected] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['arrivals', propertyId],
    queryFn: () => sdk.arrivals(),
    enabled: !!propertyId,
  });

  const rows = useMemo(() => {
    const all = data ?? [];
    if (view === 'Unassigned') return all.filter((a) => !a.roomAssigned);
    return all;
  }, [data, view]);

  const columns = useMemo<ColumnDef<ArrivalRow, unknown>[]>(
    () => [
      {
        accessorKey: 'confirmationNumber',
        header: 'Conf.',
        cell: (c) => <span className="font-mono text-[var(--ink-secondary)]">{c.getValue<string>()}</span>,
      },
      {
        accessorKey: 'guestName',
        header: 'Guest',
        cell: (c) => <span className="font-medium">{c.getValue<string>()}</span>,
      },
      {
        accessorKey: 'departureDate',
        header: 'Stay',
        cell: (c) => (
          <span className="font-mono text-[var(--text-caption)] text-[var(--ink-tertiary)]">
            {c.row.original.arrivalDate} → {c.getValue<string>()}
          </span>
        ),
      },
      {
        id: 'pax',
        header: 'Pax',
        cell: (c) => (
          <span className="tabular-nums text-[var(--ink-secondary)]">
            {c.row.original.adults}+{c.row.original.children}
          </span>
        ),
      },
      {
        id: 'readiness',
        header: 'Readiness',
        cell: (c) => {
          const ready = c.row.original.roomAssigned;
          return (
            <span className="inline-flex items-center gap-1 text-[var(--text-caption)]">
              {ready ? (
                <CheckCircle2 className="size-4 text-[var(--status-positive-ink)]" />
              ) : (
                <Circle className="size-4 text-[var(--ink-disabled)]" />
              )}
              <span className={ready ? 'text-[var(--status-positive-ink)]' : 'text-[var(--ink-tertiary)]'}>
                {ready ? 'Room assigned' : 'Unassigned'}
              </span>
            </span>
          );
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: (c) => <ReservationStatusBadge status={c.getValue<string>()} />,
      },
      {
        accessorKey: 'balance',
        header: 'Balance',
        cell: (c) => <MoneyText value={c.row.original.balance} className="text-[var(--font-size-ui)]" />,
      },
    ],
    [],
  );

  return (
    <div className="space-y-[var(--space-4)]">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-[var(--text-title)] font-semibold tracking-tight">Arrivals</h1>
          <p className="text-[var(--text-caption)] text-[var(--ink-tertiary)]">
            Work the exceptions, not the list — sort by readiness.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-[var(--radius-md)] border border-[var(--line-hairline)] bg-[var(--bg-surface)] p-1">
          {VIEWS.map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={
                'rounded-[var(--radius-sm)] px-[var(--space-3)] py-1 text-[var(--text-caption)] transition-colors ' +
                (view === v
                  ? 'bg-[var(--interactive-selected)] font-medium text-[var(--ink-accent)]'
                  : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]')
              }
            >
              {v}
              {v === 'Unassigned' && data && (
                <Badge tone="caution" className="ml-1.5">
                  {data.filter((a) => !a.roomAssigned).length}
                </Badge>
              )}
            </button>
          ))}
        </div>
      </div>

      <DataGrid
        data={rows}
        columns={columns}
        loading={isLoading}
        getRowId={(r) => r.id}
        onRowActivate={(r) => setSelected(r.id)}
        empty="No arrivals for the current business date."
      />

      <ReservationDrawer reservationId={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
