'use client';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Ban, ShieldAlert } from 'lucide-react';
import { Badge, Skeleton } from '@vela/ui';
import type { RoomBlock } from '@vela/contracts';
import { useSdk } from '@/lib/sdk';
import { useSession } from '@/lib/store';

const TH =
  'sticky top-0 z-[2] h-10 whitespace-nowrap bg-[var(--bg-raised)] px-[var(--cell-px)] text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--ink-tertiary)] border-b border-[var(--line-hairline)]';
const TD = 'h-[var(--row-h)] whitespace-nowrap px-[var(--cell-px)] align-middle';

const VIEWS = ['All', 'Out of order', 'Out of service'] as const;
type View = (typeof VIEWS)[number];

function kindLabel(kind: RoomBlock['kind']): string {
  return kind === 'out_of_order' ? 'Out of order' : 'Out of service';
}

export default function OutOfServicePage() {
  const sdk = useSdk();
  const propertyId = useSession((s) => s.activePropertyId);
  const [view, setView] = useState<View>('All');

  const { data, isLoading } = useQuery({
    queryKey: ['room-blocks', propertyId],
    queryFn: () => sdk.roomBlocks(),
    enabled: !!propertyId,
  });

  const rows = useMemo(() => {
    const list = data ?? [];
    if (view === 'Out of order') return list.filter((block) => block.kind === 'out_of_order');
    if (view === 'Out of service') return list.filter((block) => block.kind === 'out_of_service');
    return list;
  }, [data, view]);
  const hardBlocks = (data ?? []).filter((block) => block.kind === 'out_of_order').length;

  return (
    <div className="mx-auto max-w-[980px] space-y-[var(--space-4)]">
      <div className="flex flex-wrap items-end justify-between gap-[var(--space-3)]">
        <div>
          <h1 className="font-display text-[var(--text-title)] font-semibold tracking-tight">
            Out of service
          </h1>
          <p className="text-[var(--text-caption)] text-[var(--ink-tertiary)]">
            Active and upcoming room blocks that affect front-desk availability decisions.
          </p>
        </div>
        <Badge tone={hardBlocks > 0 ? 'critical' : 'neutral'}>{hardBlocks} out of order</Badge>
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
              <th className={TH}>Room</th>
              <th className={TH}>Kind</th>
              <th className={TH}>Window</th>
              <th className={TH}>Reason</th>
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 4 }, (_, index) => (
                <tr key={index} className="border-b border-[var(--line-hairline)] last:border-0">
                  <td className={TD} colSpan={4}>
                    <Skeleton className="h-4 w-full" />
                  </td>
                </tr>
              ))}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td className={TD + ' py-8 text-center text-[var(--ink-tertiary)]'} colSpan={4}>
                  No room blocks in this view.
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
                    {block.kind === 'out_of_order' ? (
                      <Ban className="size-[15px] text-[var(--status-critical-ink)]" />
                    ) : (
                      <ShieldAlert className="size-[15px] text-[var(--status-caution-ink)]" />
                    )}
                    <span className="font-mono font-semibold">{block.roomNumber}</span>
                    <span className="text-[12px] text-[var(--ink-tertiary)]">
                      {block.roomTypeCode}
                    </span>
                  </span>
                </td>
                <td className={TD}>
                  <Badge tone={block.kind === 'out_of_order' ? 'critical' : 'caution'}>
                    {kindLabel(block.kind)}
                  </Badge>
                </td>
                <td className={TD + ' font-mono text-[12px] text-[var(--ink-secondary)]'}>
                  {block.fromDate} to {block.toDate}
                </td>
                <td
                  className={
                    TD + ' max-w-[360px] truncate text-[12.5px] text-[var(--ink-secondary)]'
                  }
                >
                  {block.reason ?? '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
