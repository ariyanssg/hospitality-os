'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge, Kbd, MoneyText, Skeleton } from '@vela/ui';
import type { DepartureRow } from '@vela/contracts';
import { useSdk } from '@/lib/sdk';
import { useSession } from '@/lib/store';
import { CheckoutDrawer } from '@/components/desk/checkout-drawer';

const TH =
  'sticky top-0 z-[2] h-10 whitespace-nowrap bg-[var(--bg-raised)] px-[var(--cell-px)] text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--ink-tertiary)] border-b border-[var(--line-hairline)]';
const TD = 'h-[var(--row-h)] whitespace-nowrap px-[var(--cell-px)] align-middle';

/**
 * Departures board (front-desk concept) — express path: Enter → folio review → settle →
 * emailed invoice. Settled folios read "Express ready"; balances route through collection.
 */
export default function DeparturesPage() {
  const sdk = useSdk();
  const propertyId = useSession((s) => s.activePropertyId);
  const [open, setOpen] = useState<DepartureRow | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['departures', propertyId],
    queryFn: () => sdk.departures(),
    enabled: !!propertyId,
  });
  const rows = [...(data ?? [])].sort(
    (a, b) =>
      Number(b.balance.amount) - Number(a.balance.amount) || a.guestName.localeCompare(b.guestName),
  );

  return (
    <div className="space-y-[var(--space-4)]">
      <div className="flex flex-wrap items-end justify-between gap-[var(--space-3)]">
        <div>
          <h1 className="font-display text-[var(--text-title)] font-semibold tracking-tight">
            Departures
          </h1>
          <p className="text-[var(--text-caption)] text-[var(--ink-tertiary)]">
            Express path: <Kbd>↵</Kbd> → folio review → settle → emailed invoice.
          </p>
        </div>
        <Badge tone="neutral">{rows.length} remaining</Badge>
      </div>

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line-hairline)] bg-[var(--bg-surface)]">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={TH}>Due</th>
              <th className={TH}>Guest</th>
              <th className={TH}>Room</th>
              <th className={TH}>Readiness</th>
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
                  <td className={TD} colSpan={6}>
                    <Skeleton className="h-4 w-full" />
                  </td>
                </tr>
              ))}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td className={TD + ' py-8 text-center text-[var(--ink-tertiary)]'} colSpan={6}>
                  All departures are done — the house is rolled.
                </td>
              </tr>
            )}
            {rows.map((d) => {
              const due = Number(d.balance.amount) > 0;
              return (
                <tr
                  key={d.id}
                  tabIndex={0}
                  onClick={() => setOpen(d)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setOpen(d);
                  }}
                  className="cursor-pointer border-b border-[var(--line-hairline)] transition-colors last:border-0 hover:bg-[var(--bg-sunken)] focus-visible:bg-[var(--bg-sunken)] focus-visible:shadow-[inset_2px_0_0_var(--line-focus)] focus-visible:outline-none"
                >
                  <td className={TD + ' font-mono text-[12px] text-[var(--ink-secondary)]'}>
                    {d.departureDate}
                  </td>
                  <td className={TD}>
                    <span className="inline-flex items-center gap-2">
                      <span className="font-medium">{d.guestName}</span>
                      <span className="font-mono text-[11px] text-[var(--ink-tertiary)]">
                        {d.confirmationNumber}
                      </span>
                    </span>
                  </td>
                  <td className={TD + ' font-mono text-[12.5px]'}>{d.roomNumber ?? '—'}</td>
                  <td className={TD}>
                    {due ? (
                      <Badge tone="caution" dot>
                        Balance due
                      </Badge>
                    ) : (
                      <Badge tone="positive" dot>
                        Express ready
                      </Badge>
                    )}
                  </td>
                  <td className={TD + ' text-right'}>
                    <MoneyText value={d.balance} className="text-[var(--font-size-ui)]" />
                  </td>
                  <td className={TD + ' text-right text-[11.5px] text-[var(--ink-tertiary)]'}>
                    {!due && '↵ express'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <CheckoutDrawer departure={open} onClose={() => setOpen(null)} />
    </div>
  );
}
