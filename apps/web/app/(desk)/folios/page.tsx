'use client';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, X } from 'lucide-react';
import { Avatar, Badge, Button, MoneyText, Skeleton } from '@vela/ui';
import type { InHouseRow } from '@vela/contracts';
import { useSdk } from '@/lib/sdk';
import { useCan, useSession, useToast } from '@/lib/store';

const TH =
  'sticky top-0 z-[2] h-10 whitespace-nowrap bg-[var(--bg-raised)] px-[var(--cell-px)] text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--ink-tertiary)] border-b border-[var(--line-hairline)]';
const TD = 'h-[var(--row-h)] whitespace-nowrap px-[var(--cell-px)] align-middle';

/** Folio ledger drawer — the immutable posting trail plus a collect-payment quick action. */
function FolioDrawer({ guest, onClose }: { guest: InHouseRow | null; onClose: () => void }) {
  const sdk = useSdk();
  const qc = useQueryClient();
  const showToast = useToast((s) => s.show);
  const canCollect = useCan('payment.collect');

  const { data: reservation } = useQuery({
    queryKey: ['reservation', guest?.id],
    queryFn: () => sdk.getReservation(guest!.id),
    enabled: !!guest,
  });
  const { data: folio } = useQuery({
    queryKey: ['folio', reservation?.folioId],
    queryFn: () => sdk.getFolio(reservation!.folioId!),
    enabled: !!reservation?.folioId,
  });

  const due = folio ? Number(folio.balance.amount) : 0;

  const collect = useMutation({
    mutationFn: () =>
      sdk.recordPayment(reservation!.folioId!, {
        method: 'card',
        amount: { amount: due.toFixed(2), currency: folio!.currency },
        reference: 'desk-folio-settle',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['folio', reservation?.folioId] });
      qc.invalidateQueries({ queryKey: ['in-house'] });
      qc.invalidateQueries({ queryKey: ['manager-flash'] });
      showToast({ text: `Payment collected — folio ${folio?.folioNumber ?? ''} settled` });
    },
    onError: (e: Error) => showToast({ tone: 'critical', text: e.message }),
  });

  useEffect(() => {
    if (!guest) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  if (!guest) return null;
  const loading = !reservation || (!!reservation.folioId && !folio);

  return (
    <div
      className="fixed inset-0 z-[var(--z-drawer)] flex justify-end"
      role="dialog"
      aria-modal="true"
    >
      <button
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-[var(--bg-overlay)] animate-[fade_var(--motion-base)]"
      />
      <div className="relative flex h-full w-[480px] max-w-[94vw] flex-col bg-[var(--bg-surface)] shadow-[var(--shadow-e4)] animate-[drawer-in_var(--motion-slow)_var(--ease-standard)]">
        <header className="flex items-center gap-3 border-b border-[var(--line-hairline)] px-6 py-3.5">
          <div className="min-w-0 flex-1">
            <h2 className="m-0 truncate font-display text-[17px] font-semibold">
              Folio — {guest.guestName}
            </h2>
            <span className="font-mono text-[11px] text-[var(--ink-tertiary)]">
              {folio?.folioNumber ?? '…'} · room {guest.roomNumber ?? '—'} · {guest.arrivalDate} →{' '}
              {guest.departureDate}
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 place-items-center rounded-[var(--radius-md)] text-[var(--ink-secondary)] hover:bg-[var(--bg-sunken)]"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : !reservation.folioId ? (
            <p className="text-[13px] text-[var(--ink-tertiary)]">No folio open for this stay.</p>
          ) : (
            <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line-hairline)]">
              {(folio?.postings ?? []).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 border-b border-[var(--line-hairline)] px-3.5 py-2"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[13px]">{p.description}</span>
                    <span className="block font-mono text-[11px] text-[var(--ink-tertiary)]">
                      {p.businessDate} · {p.sourceType}
                      {p.reversesPostingId ? ' · reversal' : ''}
                    </span>
                  </span>
                  <MoneyText value={p.amount} className="text-[var(--font-size-ui)]" />
                </div>
              ))}
              {folio && folio.postings.length === 0 && (
                <div className="px-3.5 py-3 text-[13px] text-[var(--ink-tertiary)]">
                  No postings yet — room & tax post at the night audit.
                </div>
              )}
              <div className="flex items-center justify-between gap-3 bg-[var(--bg-sunken)] px-3.5 py-2 font-semibold">
                <span className="text-[13px]">Balance</span>
                <MoneyText value={folio?.balance ?? guest.balance} />
              </div>
            </div>
          )}
        </div>

        <footer className="flex items-center gap-2.5 border-t border-[var(--line-hairline)] bg-[var(--bg-raised)] px-6 py-3.5">
          <span className="text-[12px] text-[var(--ink-tertiary)]">
            Postings are immutable — corrections are reversal-only.
          </span>
          <span className="flex-1" />
          {canCollect && due > 0 && (
            <Button onClick={() => collect.mutate()} loading={collect.isPending}>
              <CreditCard className="size-3.5" /> Collect balance
            </Button>
          )}
        </footer>
        <style>{`
          @keyframes drawer-in { from { transform: translateX(20px); opacity: .6 } to { transform: none; opacity: 1 } }
          @keyframes fade { from { opacity: 0 } to { opacity: 1 } }
        `}</style>
      </div>
    </div>
  );
}

/** Folios — every running guest ledger in the house, settle from the row. */
export default function FoliosPage() {
  const sdk = useSdk();
  const propertyId = useSession((s) => s.activePropertyId);
  const [open, setOpen] = useState<InHouseRow | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['in-house', propertyId],
    queryFn: () => sdk.inHouse(),
    enabled: !!propertyId,
  });
  const rows = [...(data ?? [])].sort(
    (a, b) => Number(b.balance.amount) - Number(a.balance.amount),
  );

  return (
    <div className="mx-auto max-w-[880px] space-y-[var(--space-4)]">
      <div className="flex flex-wrap items-end justify-between gap-[var(--space-3)]">
        <div>
          <h1 className="font-display text-[var(--text-title)] font-semibold tracking-tight">
            Folios
          </h1>
          <p className="text-[var(--text-caption)] text-[var(--ink-tertiary)]">
            Running guest ledgers — every posting lands here in the same transaction that books it.
          </p>
        </div>
        <Badge tone="neutral">{rows.length} open</Badge>
      </div>

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line-hairline)] bg-[var(--bg-surface)]">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={TH}>Guest</th>
              <th className={TH}>Room</th>
              <th className={TH}>Stay</th>
              <th className={TH} style={{ textAlign: 'right' }}>
                Balance
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 4 }, (_, i) => (
                <tr key={i} className="border-b border-[var(--line-hairline)] last:border-0">
                  <td className={TD} colSpan={4}>
                    <Skeleton className="h-4 w-full" />
                  </td>
                </tr>
              ))}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td className={TD + ' py-8 text-center text-[var(--ink-tertiary)]'} colSpan={4}>
                  No open folios — nobody is in-house.
                </td>
              </tr>
            )}
            {rows.map((g) => (
              <tr
                key={g.id}
                tabIndex={0}
                onClick={() => setOpen(g)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setOpen(g);
                }}
                className="cursor-pointer border-b border-[var(--line-hairline)] transition-colors last:border-0 hover:bg-[var(--bg-sunken)] focus-visible:bg-[var(--bg-sunken)] focus-visible:shadow-[inset_2px_0_0_var(--line-focus)] focus-visible:outline-none"
              >
                <td className={TD}>
                  <span className="inline-flex items-center gap-2">
                    <Avatar name={g.guestName} size="sm" />
                    <span className="font-medium">{g.guestName}</span>
                    <span className="font-mono text-[11px] text-[var(--ink-tertiary)]">
                      {g.confirmationNumber}
                    </span>
                  </span>
                </td>
                <td className={TD + ' font-mono text-[12.5px]'}>{g.roomNumber ?? '—'}</td>
                <td className={TD + ' font-mono text-[12px] text-[var(--ink-tertiary)]'}>
                  {g.arrivalDate} → {g.departureDate}
                </td>
                <td className={TD + ' text-right'}>
                  <MoneyText value={g.balance} className="text-[var(--font-size-ui)]" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <FolioDrawer guest={open} onClose={() => setOpen(null)} />
    </div>
  );
}
