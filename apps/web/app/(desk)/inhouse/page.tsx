'use client';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ReceiptText, X } from 'lucide-react';
import { Avatar, Badge, Button, Input, MoneyText, Skeleton } from '@vela/ui';
import type { InHouseRow } from '@vela/contracts';
import { useSdk } from '@/lib/sdk';
import { useCan, useSession, useToast } from '@/lib/store';

const TH =
  'sticky top-0 z-[2] h-10 whitespace-nowrap bg-[var(--bg-raised)] px-[var(--cell-px)] text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--ink-tertiary)] border-b border-[var(--line-hairline)]';
const TD = 'h-[var(--row-h)] whitespace-nowrap px-[var(--cell-px)] align-middle';

const CHARGE_CODES = [
  { code: 'MINIBAR', label: 'Minibar' },
  { code: 'MISC', label: 'Miscellaneous' },
] as const;

/** Post-charge dialog — one ACID transaction away from the folio, like a POS check mid-meal. */
function PostChargeDialog({ guest, onClose }: { guest: InHouseRow | null; onClose: () => void }) {
  const sdk = useSdk();
  const qc = useQueryClient();
  const showToast = useToast((s) => s.show);
  const [code, setCode] = useState<string>(CHARGE_CODES[0].code);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    setCode(CHARGE_CODES[0].code);
    setAmount('');
    setDescription('');
  }, [guest?.id]);

  const post = useMutation({
    mutationFn: async () => {
      const reservation = await sdk.getReservation(guest!.id);
      if (!reservation.folioId) throw new Error('No folio open for this stay');
      return sdk.postCharge(reservation.folioId, {
        chargeCode: code,
        description: description || undefined,
        amount: { amount: Number(amount).toFixed(2), currency: guest!.balance.currency },
        quantity: 1,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['in-house'] });
      qc.invalidateQueries({ queryKey: ['manager-flash'] });
      showToast({ text: `Charge posted to room ${guest?.roomNumber ?? ''} — folio updated` });
      onClose();
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
  const valid = Number(amount) > 0;

  return (
    <div
      className="fixed inset-0 z-[var(--z-drawer)] grid place-items-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Post charge to ${guest.guestName}`}
    >
      <button
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-[var(--bg-overlay)] animate-[fade_var(--motion-base)]"
      />
      <div className="relative w-[400px] max-w-[94vw] rounded-[var(--radius-lg)] border border-[var(--line-hairline)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-e4)]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="m-0 font-display text-[16px] font-semibold">Post charge</h2>
            <span className="text-[12px] text-[var(--ink-tertiary)]">
              {guest.guestName} · room {guest.roomNumber ?? '—'}
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 place-items-center rounded-[var(--radius-md)] text-[var(--ink-secondary)] hover:bg-[var(--bg-sunken)]"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex gap-1 rounded-[var(--radius-md)] border border-[var(--line-hairline)] bg-[var(--bg-sunken)] p-1">
            {CHARGE_CODES.map((c) => (
              <button
                key={c.code}
                onClick={() => setCode(c.code)}
                className={
                  'flex-1 rounded-[var(--radius-sm)] px-3 py-1.5 text-[12.5px] transition-colors ' +
                  (code === c.code
                    ? 'bg-[var(--bg-surface)] font-medium text-[var(--ink-primary)] shadow-[var(--shadow-e1)]'
                    : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]')
                }
              >
                {c.label}
              </button>
            ))}
          </div>
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder={`Amount (${guest.balance.currency})`}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && valid) post.mutate();
            }}
          />
          <Input
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && valid) post.mutate();
            }}
          />
          <Button onClick={() => post.mutate()} loading={post.isPending} disabled={!valid}>
            Post to folio
          </Button>
          <p className="m-0 text-[11.5px] text-[var(--ink-tertiary)]">
            Posts in one transaction — guard, audit row, outbox event. Corrections are
            reversal-only.
          </p>
        </div>
        <style>{`@keyframes fade { from { opacity: 0 } to { opacity: 1 } }`}</style>
      </div>
    </div>
  );
}

/** In-house (front-desk concept) — running folios, folio-first. */
export default function InHousePage() {
  const sdk = useSdk();
  const propertyId = useSession((s) => s.activePropertyId);
  const canPost = useCan('folio.post_charge');
  const [charging, setCharging] = useState<InHouseRow | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['in-house', propertyId],
    queryFn: () => sdk.inHouse(),
    enabled: !!propertyId,
  });
  const rows = data ?? [];

  return (
    <div className="mx-auto max-w-[960px] space-y-[var(--space-4)]">
      <div className="flex flex-wrap items-end justify-between gap-[var(--space-3)]">
        <div>
          <h1 className="font-display text-[var(--text-title)] font-semibold tracking-tight">
            In-house
          </h1>
          <p className="text-[var(--text-caption)] text-[var(--ink-tertiary)]">
            Running folios — a restaurant check posts here mid-meal, one ACID transaction away.
          </p>
        </div>
        <Badge tone="neutral">{rows.length} in-house</Badge>
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
              <th className={TH} />
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 4 }, (_, i) => (
                <tr key={i} className="border-b border-[var(--line-hairline)] last:border-0">
                  <td className={TD} colSpan={5}>
                    <Skeleton className="h-4 w-full" />
                  </td>
                </tr>
              ))}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td className={TD + ' py-8 text-center text-[var(--ink-tertiary)]'} colSpan={5}>
                  Nobody in-house — check the arrivals board.
                </td>
              </tr>
            )}
            {rows.map((g) => (
              <tr
                key={g.id}
                className="border-b border-[var(--line-hairline)] transition-colors last:border-0 hover:bg-[var(--bg-sunken)]"
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
                <td className={TD + ' text-right'}>
                  {canPost && (
                    <button
                      onClick={() => setCharging(g)}
                      className="inline-flex items-center gap-1.5 rounded-[var(--radius-full)] border border-[var(--line-hairline)] bg-[var(--bg-surface)] px-2.5 py-1 text-[12px] text-[var(--ink-secondary)] transition-colors hover:bg-[var(--bg-sunken)] hover:text-[var(--ink-primary)]"
                    >
                      <ReceiptText className="size-[13px]" /> Post charge
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PostChargeDialog guest={charging} onClose={() => setCharging(null)} />
    </div>
  );
}
