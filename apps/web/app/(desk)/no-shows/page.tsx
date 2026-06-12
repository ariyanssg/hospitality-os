'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RotateCcw } from 'lucide-react';
import { Badge, Button, MoneyText, ReservationStatusBadge, Skeleton } from '@vela/ui';
import { useSdk } from '@/lib/sdk';
import { useCan, useSession, useToast } from '@/lib/store';

const TH =
  'sticky top-0 z-[2] h-10 whitespace-nowrap bg-[var(--bg-raised)] px-[var(--cell-px)] text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--ink-tertiary)] border-b border-[var(--line-hairline)]';
const TD = 'h-[var(--row-h)] whitespace-nowrap px-[var(--cell-px)] align-middle';

export default function NoShowsPage() {
  const sdk = useSdk();
  const qc = useQueryClient();
  const propertyId = useSession((s) => s.activePropertyId);
  const showToast = useToast((s) => s.show);
  const canReinstate = useCan('reservation.reinstate');

  const { data, isLoading } = useQuery({
    queryKey: ['reservations', propertyId, 'no_show'],
    queryFn: () => sdk.listReservations({ status: 'no_show', limit: 100 }),
    enabled: !!propertyId,
  });
  const rows = data ?? [];

  const reinstate = useMutation({
    mutationFn: (id: string) => sdk.reinstate(id, { reason: 'Front-desk reinstatement' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations'] });
      qc.invalidateQueries({ queryKey: ['arrivals'] });
      qc.invalidateQueries({ queryKey: ['available-rooms'] });
      qc.invalidateQueries({ queryKey: ['manager-flash'] });
      showToast({ tone: 'positive', text: 'Reservation reinstated' });
    },
    onError: (error: Error) => showToast({ tone: 'critical', text: error.message }),
  });

  return (
    <div className="mx-auto max-w-[980px] space-y-[var(--space-4)]">
      <div className="flex flex-wrap items-end justify-between gap-[var(--space-3)]">
        <div>
          <h1 className="font-display text-[var(--text-title)] font-semibold tracking-tight">
            No-shows
          </h1>
          <p className="text-[var(--text-caption)] text-[var(--ink-tertiary)]">
            Reservations marked no-show by the desk or night audit.
          </p>
        </div>
        <Badge tone={rows.length > 0 ? 'critical' : 'neutral'}>{rows.length} no-show</Badge>
      </div>

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line-hairline)] bg-[var(--bg-surface)]">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={TH}>Conf.</th>
              <th className={TH}>Guest</th>
              <th className={TH}>Stay</th>
              <th className={TH}>Status</th>
              <th className={TH} style={{ textAlign: 'right' }}>
                Total
              </th>
              <th className={TH} />
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 4 }, (_, index) => (
                <tr key={index} className="border-b border-[var(--line-hairline)] last:border-0">
                  <td className={TD} colSpan={6}>
                    <Skeleton className="h-4 w-full" />
                  </td>
                </tr>
              ))}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td className={TD + ' py-8 text-center text-[var(--ink-tertiary)]'} colSpan={6}>
                  No no-show reservations.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-[var(--line-hairline)] transition-colors last:border-0 hover:bg-[var(--bg-sunken)]"
              >
                <td className={TD + ' font-mono text-[12px] text-[var(--ink-secondary)]'}>
                  {row.confirmationNumber}
                </td>
                <td className={TD}>
                  <span className="font-medium">{row.guestName}</span>{' '}
                  <span className="font-mono text-[11px] text-[var(--ink-tertiary)]">
                    {row.adults}+{row.children}
                  </span>
                </td>
                <td className={TD + ' font-mono text-[12px] text-[var(--ink-tertiary)]'}>
                  {row.arrivalDate} to {row.departureDate}
                </td>
                <td className={TD}>
                  <ReservationStatusBadge status={row.status} />
                </td>
                <td className={TD + ' text-right'}>
                  <MoneyText value={row.total} className="text-[var(--font-size-ui)]" />
                </td>
                <td className={TD + ' text-right'}>
                  {canReinstate && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => reinstate.mutate(row.id)}
                      loading={reinstate.isPending}
                    >
                      <RotateCcw className="size-3.5" /> Reinstate
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
