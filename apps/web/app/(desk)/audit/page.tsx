'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleAlert, CircleCheck, CirclePlay, MoonStar, Wallet } from 'lucide-react';
import { Badge, Button, MoneyText, Skeleton } from '@vela/ui';
import type { NightAuditResult } from '@vela/contracts';
import { useSdk } from '@/lib/sdk';
import { useCan, useSession, useToast } from '@/lib/store';

type ItemState = 'done' | 'ready' | 'blocked';
const STATE: Record<
  ItemState,
  { tone: 'positive' | 'info' | 'caution'; label: string; icon: typeof CircleCheck }
> = {
  done: { tone: 'positive', label: 'Clear', icon: CircleCheck },
  ready: { tone: 'info', label: 'Ready', icon: CirclePlay },
  blocked: { tone: 'caution', label: 'Action needed', icon: CircleAlert },
};

/**
 * Night audit (front-desk concept) — the 90-second ritual. The checklist derives live from the
 * boards; the run itself rolls the business date in one transaction and the trial balance ties
 * by construction.
 */
export default function NightAuditPage() {
  const sdk = useSdk();
  const qc = useQueryClient();
  const propertyId = useSession((s) => s.activePropertyId);
  const showToast = useToast((s) => s.show);
  const canRun = useCan('nightaudit.run');
  const canOpenCashier = useCan('cashier.open');
  const canCloseCashier = useCan('cashier.close');
  const [result, setResult] = useState<NightAuditResult | null>(null);

  const { data: flash } = useQuery({
    queryKey: ['manager-flash', propertyId],
    queryFn: () => sdk.managerFlash(),
    enabled: !!propertyId,
  });
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
  const { data: cashier, isLoading: cashierLoading } = useQuery({
    queryKey: ['cashier-session', propertyId],
    queryFn: () => sdk.currentCashierSession(),
    enabled: !!propertyId,
  });

  const pendingArrivals = arrivals?.filter((a) => a.status === 'confirmed').length ?? 0;
  const pendingDepartures = departures?.length ?? 0;
  const cashierOpen = cashier?.status === 'open';

  const items: Array<{ id: string; label: string; detail: string; state: ItemState }> = [
    {
      id: 'arrivals',
      label: 'Arrivals resolved',
      detail:
        pendingArrivals === 0
          ? 'Every expected arrival is checked in or handled'
          : `${pendingArrivals} arrival${pendingArrivals > 1 ? 's' : ''} still pending — check in or mark no-show`,
      state: pendingArrivals === 0 ? 'done' : 'blocked',
    },
    {
      id: 'departures',
      label: 'Departures settled',
      detail:
        pendingDepartures === 0
          ? 'All due-outs departed with closed folios'
          : `${pendingDepartures} departure${pendingDepartures > 1 ? 's' : ''} still in-house — express checkout from Departures`,
      state: pendingDepartures === 0 ? 'done' : 'blocked',
    },
    {
      id: 'cashier',
      label: 'Cashier session reconciled',
      detail: cashierOpen
        ? 'Session open — count the drawer and close before the roll'
        : 'No open session — drawer is reconciled',
      state: cashierOpen ? 'blocked' : 'done',
    },
    {
      id: 'roll',
      label: 'Roll the business date',
      detail:
        'Posts room & tax for the night, processes no-shows, writes one balanced journal entry',
      state: 'ready',
    },
  ];

  const openCashier = useMutation({
    mutationFn: () =>
      sdk.openCashierSession({
        openingFloat: { amount: '200.00', currency: flash?.roomRevenue.currency ?? 'USD' },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cashier-session'] });
      showToast({ text: 'Cashier session open — float counted at 200.00' });
    },
    onError: (e: Error) => showToast({ tone: 'critical', text: e.message }),
  });

  const closeCashier = useMutation({
    mutationFn: () =>
      sdk.closeCashierSession(cashier!.id, {
        countedTotal: cashier!.expectedTotal ?? cashier!.openingFloat,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cashier-session'] });
      showToast({ text: 'Cashier session closed — zero variance' });
    },
    onError: (e: Error) => showToast({ tone: 'critical', text: e.message }),
  });

  const run = useMutation({
    mutationFn: () => sdk.runNightAudit({}),
    onSuccess: (r) => {
      setResult(r);
      qc.invalidateQueries();
      showToast({
        text: `Audit complete — business date is now ${r.newBusinessDate}`,
      });
    },
    onError: (e: Error) => showToast({ tone: 'critical', text: e.message }),
  });

  return (
    <div className="mx-auto max-w-[760px] space-y-[var(--space-4)]">
      <div className="flex flex-wrap items-end justify-between gap-[var(--space-3)]">
        <div>
          <h1 className="font-display text-[var(--text-title)] font-semibold tracking-tight">
            Night audit
          </h1>
          <p className="text-[var(--text-caption)] text-[var(--ink-tertiary)]">
            Business date rolls in one transaction — the trial balance ties to the desk by
            construction.
          </p>
        </div>
        <Badge tone="neutral">Business date · {flash?.businessDate ?? '—'}</Badge>
      </div>

      {/* Cashier session card */}
      <section className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--line-hairline)] bg-[var(--bg-surface)] p-4">
        <span
          className={
            'grid size-10 place-items-center rounded-full ' +
            (cashierOpen
              ? 'bg-[var(--status-positive-bg)] text-[var(--status-positive-ink)]'
              : 'bg-[var(--bg-sunken)] text-[var(--ink-tertiary)]')
          }
        >
          <Wallet className="size-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[14px] font-medium">
            Cashier session
            {cashierLoading ? (
              <Skeleton className="h-4 w-16" />
            ) : cashierOpen ? (
              <Badge tone="positive" dot>
                Open
              </Badge>
            ) : (
              <Badge tone="neutral">Closed</Badge>
            )}
          </div>
          <div className="text-[12.5px] text-[var(--ink-tertiary)]">
            {cashierOpen ? (
              <>
                Float <MoneyText value={cashier!.openingFloat} className="text-[12.5px]" /> · opened{' '}
                {new Date(cashier!.openedAt).toLocaleTimeString(undefined, {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </>
            ) : (
              'Open a session to take cash payments at the desk'
            )}
          </div>
        </div>
        {cashierOpen
          ? canCloseCashier && (
              <Button
                variant="secondary"
                onClick={() => closeCashier.mutate()}
                loading={closeCashier.isPending}
              >
                Count & close
              </Button>
            )
          : canOpenCashier && (
              <Button
                variant="secondary"
                onClick={() => openCashier.mutate()}
                loading={openCashier.isPending}
              >
                Open session
              </Button>
            )}
      </section>

      {/* Checklist */}
      <section className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line-hairline)] bg-[var(--bg-surface)]">
        {items.map((it, i) => {
          const s = STATE[it.state];
          const Icon = s.icon;
          return (
            <div
              key={it.id}
              className="flex items-center gap-3 px-4 py-3"
              style={{ borderTop: i ? '1px solid var(--line-hairline)' : 'none' }}
            >
              <Icon className="size-[17px]" style={{ color: `var(--status-${s.tone}-ink)` }} />
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-medium">{it.label}</span>
                <span className="block text-[12px] text-[var(--ink-tertiary)]">{it.detail}</span>
              </span>
              <Badge tone={s.tone}>{s.label}</Badge>
            </div>
          );
        })}
        <div className="flex items-center gap-3 border-t border-[var(--line-hairline)] bg-[var(--bg-raised)] px-4 py-3">
          <span className="flex-1 text-[12px] text-[var(--ink-tertiary)]">
            The audit runs even with exceptions — pending arrivals post as no-shows per policy.
          </span>
          <Button
            onClick={() => run.mutate()}
            loading={run.isPending}
            disabled={!canRun || cashierOpen}
            title={
              !canRun
                ? 'Night audit not permitted for your role'
                : cashierOpen
                  ? 'Close the cashier session first'
                  : undefined
            }
          >
            <MoonStar className="size-3.5" /> Run night audit
          </Button>
        </div>
      </section>

      {/* Result + trial balance */}
      {result && (
        <section className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--status-positive-line)] bg-[var(--bg-surface)]">
          <div className="flex items-center gap-2.5 bg-[var(--status-positive-bg)] px-4 py-3">
            <CircleCheck className="size-[17px] text-[var(--status-positive-ink)]" />
            <span className="flex-1 text-[13.5px] font-medium text-[var(--status-positive-ink)]">
              Rolled {result.previousBusinessDate} → {result.newBusinessDate} · {result.roomsPosted}{' '}
              room nights posted · {result.noShowsProcessed} no-shows
            </span>
            <Badge tone={result.trialBalance.balanced ? 'positive' : 'critical'}>
              {result.trialBalance.balanced ? 'Trial balance ties' : 'OUT OF BALANCE'}
            </Badge>
          </div>
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-[var(--line-hairline)] text-left text-[11px] uppercase tracking-[0.04em] text-[var(--ink-tertiary)]">
                <th className="px-4 py-2 font-semibold">Account</th>
                <th className="px-4 py-2 text-right font-semibold">Debit</th>
                <th className="px-4 py-2 text-right font-semibold">Credit</th>
              </tr>
            </thead>
            <tbody>
              {result.trialBalance.lines.map((l) => (
                <tr
                  key={l.accountCode}
                  className="border-b border-[var(--line-hairline)] last:border-0"
                >
                  <td className="px-4 py-1.5">
                    <span className="font-mono text-[var(--ink-tertiary)]">{l.accountCode}</span>{' '}
                    {l.accountName}
                  </td>
                  <td className="px-4 py-1.5 text-right font-mono tabular-nums">{l.debit}</td>
                  <td className="px-4 py-1.5 text-right font-mono tabular-nums">{l.credit}</td>
                </tr>
              ))}
              <tr className="bg-[var(--bg-sunken)] font-semibold">
                <td className="px-4 py-2">Totals</td>
                <td className="px-4 py-2 text-right font-mono tabular-nums">
                  {result.trialBalance.totalDebit}
                </td>
                <td className="px-4 py-2 text-right font-mono tabular-nums">
                  {result.trialBalance.totalCredit}
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
