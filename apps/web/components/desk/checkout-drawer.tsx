'use client';
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Check, CreditCard, Lock, Mail, Sparkles, X } from 'lucide-react';
import { Badge, Button, Kbd, MoneyText, Skeleton } from '@vela/ui';
import type { DepartureRow } from '@vela/contracts';
import { useSdk } from '@/lib/sdk';
import { useCan, useSession, useToast } from '@/lib/store';

const SELECT_CLASS =
  'flex h-9 rounded-[var(--radius-md)] border border-[var(--line-strong)] bg-[var(--bg-surface)] px-2 text-[12.5px] text-[var(--ink-primary)] focus-visible:border-[var(--line-focus)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--line-focus)]';

/**
 * Express checkout (front-desk concept): folio review → settle → done in one drawer.
 * A due balance collects a card payment first; both legs commit as real audited transactions
 * and the room flips to dirty on the housekeeping board.
 */
export function CheckoutDrawer({
  departure,
  onClose,
}: {
  departure: DepartureRow | null;
  onClose: () => void;
}) {
  const sdk = useSdk();
  const qc = useQueryClient();
  const showToast = useToast((s) => s.show);
  const canCheckOut = useCan('reservation.checkout');
  const propertyId = useSession((s) => s.activePropertyId);

  const [done, setDone] = useState(false);
  const [method, setMethod] = useState('card');
  const primaryActionRef = useRef<HTMLButtonElement>(null);
  useEffect(() => setDone(false), [departure?.id]);
  useEffect(() => {
    if (!departure) return;
    primaryActionRef.current?.focus();
  }, [departure, done]);

  const { data: reservation } = useQuery({
    queryKey: ['reservation', departure?.id],
    queryFn: () => sdk.getReservation(departure!.id),
    enabled: !!departure,
  });
  const { data: folio } = useQuery({
    queryKey: ['folio', reservation?.folioId],
    queryFn: () => sdk.getFolio(reservation!.folioId!),
    enabled: !!reservation?.folioId,
  });
  const { data: settings } = useQuery({
    queryKey: ['settings-catalog', propertyId],
    queryFn: () => sdk.settingsCatalog(),
    enabled: !!departure && !!propertyId,
    refetchOnMount: 'always',
    staleTime: 0,
  });

  const due = folio ? Number(folio.balance.amount) : Number(departure?.balance.amount ?? 0);
  const paymentMethods =
    settings?.paymentMethods.filter((paymentMethod) => paymentMethod.isActive) ?? [];

  useEffect(() => {
    if (paymentMethods.length > 0 && !paymentMethods.some((item) => item.code === method)) {
      setMethod(paymentMethods[0]!.code);
    }
  }, [method, paymentMethods]);

  const checkout = useMutation({
    mutationFn: async () => {
      if (due > 0 && reservation?.folioId) {
        await sdk.recordPayment(reservation.folioId, {
          method,
          amount: { amount: due.toFixed(2), currency: folio?.currency ?? 'USD' },
          reference: 'desk-express-checkout',
        });
      }
      return sdk.checkOut(departure!.id, { sendInvoice: true });
    },
    onSuccess: () => {
      setDone(true);
      qc.invalidateQueries({ queryKey: ['departures'] });
      qc.invalidateQueries({ queryKey: ['in-house'] });
      qc.invalidateQueries({ queryKey: ['hk-board'] });
      qc.invalidateQueries({ queryKey: ['manager-flash'] });
      qc.invalidateQueries({ queryKey: ['folio', reservation?.folioId] });
      showToast({ text: `${departure?.guestName ?? 'Guest'} departed — folio closed` });
    },
    onError: (e: Error) => showToast({ tone: 'critical', text: e.message }),
  });

  useEffect(() => {
    if (!departure) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  if (!departure) return null;
  const loading = !reservation || (!!reservation.folioId && !folio);

  return (
    <div
      className="fixed inset-0 z-[var(--z-drawer)] flex justify-end"
      role="dialog"
      aria-modal="true"
      data-testid="golden-checkout-drawer"
      data-flow="desk-checkout"
      data-flow-step={done ? 'done' : 'review'}
    >
      <button
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-[var(--bg-overlay)] animate-[fade_var(--motion-base)]"
      />
      <div className="relative flex h-full w-[500px] max-w-[94vw] flex-col bg-[var(--bg-surface)] shadow-[var(--shadow-e4)] animate-[drawer-in_var(--motion-slow)_var(--ease-standard)]">
        <header className="flex items-center gap-3 border-b border-[var(--line-hairline)] px-6 py-3.5">
          <div className="min-w-0 flex-1">
            <h2 className="m-0 truncate font-display text-[17px] font-semibold">
              Check out — {departure.guestName}
            </h2>
            <span className="font-mono text-[11px] text-[var(--ink-tertiary)]">
              {departure.confirmationNumber}
              {departure.roomNumber ? ` · room ${departure.roomNumber}` : ''} · due{' '}
              {departure.departureDate}
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
          {done ? (
            <div
              className="flex flex-col items-center gap-4 px-3 py-9 text-center"
              data-testid="golden-checkout-success"
            >
              <span className="grid size-16 place-items-center rounded-full bg-[var(--status-positive-bg)] text-[var(--status-positive-ink)] animate-[pop_.45s_var(--ease-standard)]">
                <Check className="size-[30px]" />
              </span>
              <h3 className="m-0 font-display text-xl font-semibold">Departed — folio closed</h3>
              <div className="flex flex-col gap-1.5 text-[13px] text-[var(--ink-secondary)]">
                <span className="inline-flex items-center gap-2">
                  <Mail className="size-3.5 text-[var(--status-positive-ink)]" /> Invoice emailed to
                  the guest
                </span>
                <span className="inline-flex items-center gap-2">
                  <Sparkles className="size-3.5 text-[var(--status-positive-ink)]" /> Room{' '}
                  {departure.roomNumber ?? ''} queued for housekeeping
                </span>
                <span className="inline-flex items-center gap-2">
                  <Lock className="size-3.5 text-[var(--status-positive-ink)]" /> Postings immutable
                  — reversal-only corrections
                </span>
              </div>
              <style>{`@keyframes pop { 0% { transform: scale(.6); opacity: 0 } 70% { transform: scale(1.08) } 100% { transform: scale(1); opacity: 1 } }`}</style>
            </div>
          ) : loading ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <section>
                <h3 className="mb-2.5 text-[var(--text-micro)] font-semibold uppercase tracking-wide text-[var(--ink-tertiary)]">
                  Folio review{folio ? ` — ${folio.folioNumber}` : ''}
                </h3>
                <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line-hairline)]">
                  {(folio?.postings ?? []).map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-3 border-b border-[var(--line-hairline)] px-3.5 py-2"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[13px]">{p.description}</span>
                        <span className="block font-mono text-[11px] text-[var(--ink-tertiary)]">
                          {p.businessDate}
                          {p.reversesPostingId ? ' · reversal' : ''}
                        </span>
                      </span>
                      <MoneyText value={p.amount} className="text-[var(--font-size-ui)]" />
                    </div>
                  ))}
                  {folio && folio.postings.length === 0 && (
                    <div className="px-3.5 py-3 text-[13px] text-[var(--ink-tertiary)]">
                      No postings on this folio.
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-3 bg-[var(--bg-sunken)] px-3.5 py-2 font-semibold">
                    <span className="text-[13px]">Balance</span>
                    <MoneyText value={folio?.balance ?? departure.balance} />
                  </div>
                </div>
              </section>

              <section>
                <h3 className="mb-2.5 text-[var(--text-micro)] font-semibold uppercase tracking-wide text-[var(--ink-tertiary)]">
                  Settlement
                </h3>
                <span className="flex w-full items-center gap-2 rounded-[var(--radius-md)] border border-[var(--line-hairline)] bg-[var(--bg-sunken)] px-3 py-2 text-[13px] text-[var(--ink-secondary)]">
                  <CreditCard className="size-[15px]" />
                  {due > 0 ? 'Balance collects before the folio closes' : 'Settled in full'}
                  <span className="flex-1" />
                  {due > 0 && (
                    <select
                      value={method}
                      onChange={(event) => setMethod(event.target.value)}
                      className={SELECT_CLASS}
                    >
                      {(paymentMethods.length
                        ? paymentMethods
                        : [{ code: 'card', name: 'Card' }]
                      ).map((paymentMethod) => (
                        <option key={paymentMethod.code} value={paymentMethod.code}>
                          {paymentMethod.name}
                        </option>
                      ))}
                    </select>
                  )}
                  {due <= 0 && (
                    <Badge tone="positive" dot>
                      Express ready
                    </Badge>
                  )}
                </span>
              </section>
            </div>
          )}
        </div>

        <footer className="flex items-center gap-2.5 border-t border-[var(--line-hairline)] bg-[var(--bg-raised)] px-6 py-3.5">
          <span className="text-[12px] text-[var(--ink-tertiary)]">
            <Kbd>esc</Kbd> closes — nothing is lost
          </span>
          <span className="flex-1" />
          {done ? (
            <Button ref={primaryActionRef} onClick={onClose} data-testid="golden-checkout-done">
              Done
            </Button>
          ) : (
            <Button
              ref={primaryActionRef}
              onClick={() => checkout.mutate()}
              loading={checkout.isPending}
              disabled={!canCheckOut || loading}
              title={canCheckOut ? undefined : 'Check-out not permitted for your role'}
              data-testid="golden-checkout-primary"
            >
              {due > 0 ? 'Collect & check out' : 'Check out'}
              <ArrowRight className="size-3.5" />
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
