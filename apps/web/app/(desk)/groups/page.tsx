'use client';
import { useQuery } from '@tanstack/react-query';
import { ContactRound, TimerReset } from 'lucide-react';
import { Badge, Skeleton } from '@vela/ui';
import type { GroupBlockListRow } from '@vela/contracts';
import { useSdk } from '@/lib/sdk';
import { useSession } from '@/lib/store';

const TH =
  'sticky top-0 z-[2] h-10 whitespace-nowrap bg-[var(--bg-raised)] px-[var(--cell-px)] text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--ink-tertiary)] border-b border-[var(--line-hairline)]';
const TD = 'h-[var(--row-h)] whitespace-nowrap px-[var(--cell-px)] align-middle';

function statusTone(status: GroupBlockListRow['status']): 'info' | 'positive' | 'neutral' {
  if (status === 'definite') return 'positive';
  if (status === 'tentative') return 'info';
  return 'neutral';
}

export default function GroupsPage() {
  const sdk = useSdk();
  const propertyId = useSession((s) => s.activePropertyId);

  const { data, isLoading } = useQuery({
    queryKey: ['group-blocks', propertyId],
    queryFn: () => sdk.groupBlocks(),
    enabled: !!propertyId,
  });

  const rows = data ?? [];
  const activeCount = rows.filter((row) => row.status !== 'released').length;

  return (
    <div className="mx-auto max-w-[1040px] space-y-[var(--space-4)]">
      <div className="flex flex-wrap items-end justify-between gap-[var(--space-3)]">
        <div>
          <h1 className="font-display text-[var(--text-title)] font-semibold tracking-tight">
            Groups
          </h1>
          <p className="text-[var(--text-caption)] text-[var(--ink-tertiary)]">
            Blocks, pickup, cutoff dates, and master-billing intent for group stays.
          </p>
        </div>
        <Badge tone={activeCount > 0 ? 'info' : 'neutral'}>{activeCount} active</Badge>
      </div>

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line-hairline)] bg-[var(--bg-surface)]">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={TH}>Block</th>
              <th className={TH}>Dates</th>
              <th className={TH}>Status</th>
              <th className={TH}>Pickup</th>
              <th className={TH}>Cutoff</th>
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
                  No group blocks.
                </td>
              </tr>
            )}
            {rows.map((block) => (
              <tr
                key={block.id}
                className="border-b border-[var(--line-hairline)] transition-colors last:border-0 hover:bg-[var(--bg-sunken)]"
              >
                <td className={TD}>
                  <span className="inline-flex items-center gap-2">
                    <ContactRound className="size-[15px] text-[var(--ink-tertiary)]" />
                    <span>
                      <span className="block font-medium">{block.name}</span>
                      <span className="block font-mono text-[11.5px] text-[var(--ink-tertiary)]">
                        {block.code}
                      </span>
                    </span>
                  </span>
                </td>
                <td className={TD + ' font-mono text-[12px] text-[var(--ink-secondary)]'}>
                  {block.arrivalDate} to {block.departureDate}
                </td>
                <td className={TD}>
                  <Badge tone={statusTone(block.status)}>{block.status}</Badge>
                </td>
                <td className={TD}>
                  <span className="font-mono text-[12.5px]">
                    {block.roomsPickedUp}/{block.roomsBlocked}
                  </span>
                </td>
                <td className={TD}>
                  <span className="inline-flex items-center gap-1.5 text-[12.5px] text-[var(--ink-secondary)]">
                    <TimerReset className="size-[14px] text-[var(--ink-tertiary)]" />
                    {block.cutoffDate ?? '-'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
