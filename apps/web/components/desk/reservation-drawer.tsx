'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BedDouble, CheckCircle2, LogIn } from 'lucide-react';
import {
  Badge,
  Button,
  Drawer,
  MoneyText,
  ReservationStatusBadge,
  Skeleton,
} from '@vela/ui';
import { useSdk } from '@/lib/sdk';
import { useCan } from '@/lib/store';

/** Reservation record drawer (doc 18 §3.5): summary header, stay nights, folio ledger, check-in. */
export function ReservationDrawer({
  reservationId,
  onClose,
}: {
  reservationId: string | null;
  onClose: () => void;
}) {
  const sdk = useSdk();
  const qc = useQueryClient();
  const canCheckIn = useCan('reservation.checkin');

  const { data: reservation, isLoading } = useQuery({
    queryKey: ['reservation', reservationId],
    queryFn: () => sdk.getReservation(reservationId!),
    enabled: !!reservationId,
  });

  const { data: folio } = useQuery({
    queryKey: ['folio', reservation?.folioId],
    queryFn: () => sdk.getFolio(reservation!.folioId!),
    enabled: !!reservation?.folioId,
  });

  const checkIn = useMutation({
    mutationFn: () => sdk.checkIn(reservationId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservation', reservationId] });
      qc.invalidateQueries({ queryKey: ['arrivals'] });
    },
  });

  return (
    <Drawer
      open={!!reservationId}
      onClose={onClose}
      width="lg"
      title={reservation ? `${reservation.confirmationNumber}` : 'Reservation'}
      description={reservation ? `${reservation.arrivalDate} → ${reservation.departureDate}` : undefined}
      footer={
        reservation?.status === 'confirmed' && (
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-caption)] text-[var(--ink-tertiary)]">
              {canCheckIn ? 'Ready to check in' : 'Check-in not permitted for your role'}
            </span>
            <Button onClick={() => checkIn.mutate()} loading={checkIn.isPending} disabled={!canCheckIn}>
              <LogIn className="size-4" /> Check in
            </Button>
          </div>
        )
      }
    >
      {isLoading || !reservation ? (
        <div className="space-y-3">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <div className="space-y-[var(--space-6)]">
          {/* Sticky summary */}
          <section className="flex items-center justify-between rounded-[var(--radius-lg)] border border-[var(--line-hairline)] bg-[var(--bg-raised)] p-[var(--space-4)]">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-full bg-[var(--interactive-selected)]">
                <BedDouble className="size-5 text-[var(--ink-accent)]" />
              </span>
              <div>
                <div className="font-medium">
                  {reservation.adults} adult{reservation.adults > 1 ? 's' : ''}
                  {reservation.children > 0 ? `, ${reservation.children} child` : ''}
                </div>
                <div className="text-[var(--text-caption)] text-[var(--ink-tertiary)]">
                  {reservation.nights.length} night{reservation.nights.length > 1 ? 's' : ''}
                </div>
              </div>
            </div>
            <div className="text-right">
              <ReservationStatusBadge status={reservation.status} />
              <div className="mt-1 text-[var(--text-heading)]">
                <MoneyText value={reservation.total} />
              </div>
            </div>
          </section>

          {/* Stay nights */}
          <section>
            <h3 className="mb-2 text-[var(--text-micro)] font-semibold uppercase tracking-wide text-[var(--ink-tertiary)]">
              Stay
            </h3>
            <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line-hairline)]">
              {reservation.nights.map((n) => (
                <div
                  key={n.stayDate}
                  className="flex items-center justify-between border-b border-[var(--line-hairline)] px-[var(--space-4)] py-2 last:border-0"
                >
                  <span className="font-mono text-[var(--text-caption)] text-[var(--ink-secondary)]">{n.stayDate}</span>
                  <MoneyText value={n.price} className="text-[var(--font-size-ui)]" />
                </div>
              ))}
            </div>
          </section>

          {/* Folio ledger */}
          {folio && (
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-[var(--text-micro)] font-semibold uppercase tracking-wide text-[var(--ink-tertiary)]">
                  Folio {folio.folioNumber}
                </h3>
                <Badge tone={folio.status === 'open' ? 'info' : 'neutral'}>{folio.status}</Badge>
              </div>
              <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line-hairline)]">
                {folio.postings.length === 0 ? (
                  <p className="px-[var(--space-4)] py-3 text-[var(--text-caption)] text-[var(--ink-tertiary)]">
                    No postings yet.
                  </p>
                ) : (
                  folio.postings.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between border-b border-[var(--line-hairline)] px-[var(--space-4)] py-2 last:border-0"
                    >
                      <div>
                        <div className="text-[var(--font-size-ui)]">{p.description}</div>
                        <div className="font-mono text-[var(--text-micro)] text-[var(--ink-tertiary)]">
                          {p.businessDate} · {p.sourceType}
                        </div>
                      </div>
                      <MoneyText value={p.amount} className="text-[var(--font-size-ui)]" />
                    </div>
                  ))
                )}
                <div className="flex items-center justify-between bg-[var(--bg-sunken)] px-[var(--space-4)] py-2.5">
                  <span className="flex items-center gap-1.5 text-[var(--text-caption)] font-medium text-[var(--ink-secondary)]">
                    <CheckCircle2 className="size-3.5" /> Balance
                  </span>
                  <MoneyText value={folio.balance} className="font-semibold" />
                </div>
              </div>
            </section>
          )}
        </div>
      )}
    </Drawer>
  );
}
