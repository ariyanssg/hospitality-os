'use client';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Wrench } from 'lucide-react';
import { Badge, Skeleton } from '@vela/ui';
import type { MaintenanceTicket } from '@vela/contracts';
import { useSdk } from '@/lib/sdk';
import { useSession } from '@/lib/store';

const TH =
  'sticky top-0 z-[2] h-10 whitespace-nowrap bg-[var(--bg-raised)] px-[var(--cell-px)] text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--ink-tertiary)] border-b border-[var(--line-hairline)]';
const TD = 'h-[var(--row-h)] whitespace-nowrap px-[var(--cell-px)] align-middle';

const VIEWS = ['Open', 'Done', 'All'] as const;
type View = (typeof VIEWS)[number];

function priorityTone(priority: MaintenanceTicket['priority']): 'critical' | 'caution' | 'neutral' {
  if (priority === 'urgent') return 'critical';
  if (priority === 'high') return 'caution';
  return 'neutral';
}

function statusTone(status: MaintenanceTicket['status']): 'positive' | 'info' | 'neutral' {
  if (status === 'verified') return 'positive';
  if (status === 'done') return 'info';
  return 'neutral';
}

export default function MaintenancePage() {
  const sdk = useSdk();
  const propertyId = useSession((s) => s.activePropertyId);
  const [view, setView] = useState<View>('Open');

  const { data, isLoading } = useQuery({
    queryKey: ['maintenance-tickets', propertyId],
    queryFn: () => sdk.maintenanceTickets(),
    enabled: !!propertyId,
  });

  const rows = useMemo(() => {
    const list = data ?? [];
    if (view === 'Open') {
      return list.filter((ticket) => !['done', 'verified', 'cancelled'].includes(ticket.status));
    }
    if (view === 'Done')
      return list.filter((ticket) => ['done', 'verified'].includes(ticket.status));
    return list;
  }, [data, view]);
  const openCount = (data ?? []).filter(
    (ticket) => !['done', 'verified', 'cancelled'].includes(ticket.status),
  ).length;

  return (
    <div className="mx-auto max-w-[980px] space-y-[var(--space-4)]">
      <div className="flex flex-wrap items-end justify-between gap-[var(--space-3)]">
        <div>
          <h1 className="font-display text-[var(--text-title)] font-semibold tracking-tight">
            Maintenance
          </h1>
          <p className="text-[var(--text-caption)] text-[var(--ink-tertiary)]">
            Engineering tickets by room, priority, and current state.
          </p>
        </div>
        <Badge tone={openCount > 0 ? 'caution' : 'positive'}>{openCount} open</Badge>
      </div>

      <div className="flex gap-0.5 rounded-[var(--radius-md)] border border-[var(--line-hairline)] bg-[var(--bg-surface)] p-[3px]">
        {VIEWS.map((item) => (
          <button
            key={item}
            onClick={() => setView(item)}
            className={
              'rounded-[var(--radius-sm)] px-3 py-[5px] text-[12px] transition-colors ' +
              (view === item
                ? 'bg-[var(--interactive-selected)] font-medium text-[var(--ink-accent)]'
                : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]')
            }
          >
            {item}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line-hairline)] bg-[var(--bg-surface)]">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={TH}>Ticket</th>
              <th className={TH}>Room</th>
              <th className={TH}>Priority</th>
              <th className={TH}>Status</th>
              <th className={TH}>Created</th>
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 5 }, (_, index) => (
                <tr key={index} className="border-b border-[var(--line-hairline)] last:border-0">
                  <td className={TD} colSpan={5}>
                    <Skeleton className="h-4 w-full" />
                  </td>
                </tr>
              ))}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td className={TD + ' py-8 text-center text-[var(--ink-tertiary)]'} colSpan={5}>
                  No maintenance tickets in this view.
                </td>
              </tr>
            )}
            {rows.map((ticket) => (
              <tr
                key={ticket.id}
                className="border-b border-[var(--line-hairline)] transition-colors last:border-0 hover:bg-[var(--bg-sunken)]"
              >
                <td className={TD}>
                  <span className="inline-flex items-center gap-2">
                    {ticket.status === 'verified' ? (
                      <CheckCircle2 className="size-[15px] text-[var(--status-positive-ink)]" />
                    ) : ticket.priority === 'urgent' ? (
                      <AlertTriangle className="size-[15px] text-[var(--status-critical-ink)]" />
                    ) : (
                      <Wrench className="size-[15px] text-[var(--ink-tertiary)]" />
                    )}
                    <span>
                      <span className="block font-medium">{ticket.title}</span>
                      <span className="block max-w-[360px] truncate text-[12px] text-[var(--ink-tertiary)]">
                        {ticket.category}
                        {ticket.description ? ` · ${ticket.description}` : ''}
                      </span>
                    </span>
                  </span>
                </td>
                <td className={TD + ' font-mono text-[12.5px]'}>
                  {ticket.roomNumber ?? 'property'}
                </td>
                <td className={TD}>
                  <Badge tone={priorityTone(ticket.priority)}>{ticket.priority}</Badge>
                </td>
                <td className={TD}>
                  <Badge tone={statusTone(ticket.status)}>{ticket.status.replace('_', ' ')}</Badge>
                </td>
                <td className={TD + ' font-mono text-[12px] text-[var(--ink-tertiary)]'}>
                  {new Date(ticket.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
