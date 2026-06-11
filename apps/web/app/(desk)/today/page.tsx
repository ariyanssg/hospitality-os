'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BedDouble, CircleAlert, Clock } from 'lucide-react';
import { Badge } from '@vela/ui';
import { useSdk } from '@/lib/sdk';
import { useSession } from '@/lib/store';

/** Today (landing) — "what needs me now" in priority order (doc 18 §3.1). */
export default function TodayPage() {
  const sdk = useSdk();
  const me = useSession((s) => s.me);
  const propertyId = useSession((s) => s.activePropertyId);
  const { data: arrivals } = useQuery({
    queryKey: ['arrivals', propertyId],
    queryFn: () => sdk.arrivals(),
    enabled: !!propertyId,
  });

  const unassigned = arrivals?.filter((a) => !a.roomAssigned) ?? [];

  return (
    <div className="mx-auto max-w-[960px] space-y-[var(--space-6)]">
      <div>
        <h1 className="font-display text-[var(--text-title)] font-semibold tracking-tight">
          Good day, {me?.name?.split(' ')[0]}
        </h1>
        <p className="text-[var(--text-caption)] text-[var(--ink-tertiary)]">
          {arrivals?.length ?? 0} arrivals remaining — work the exceptions first.
        </p>
      </div>

      <section className="rounded-[var(--radius-xl)] border border-[var(--line-hairline)] bg-[var(--bg-surface)] p-[var(--space-5)]">
        <div className="mb-3 flex items-center gap-2">
          <CircleAlert className="size-4 text-[var(--status-caution-ink)]" />
          <h2 className="text-[var(--text-heading)] font-semibold">Needs attention</h2>
          <Badge tone="caution">{unassigned.length}</Badge>
        </div>
        {unassigned.length === 0 ? (
          <p className="text-[var(--text-caption)] text-[var(--ink-tertiary)]">
            All clear — every arrival has a room. Next at 15:40 (Ito, DLX).
          </p>
        ) : (
          <ul className="space-y-1">
            {unassigned.slice(0, 5).map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between rounded-[var(--radius-md)] px-[var(--space-3)] py-2 hover:bg-[var(--bg-sunken)]"
              >
                <span className="flex items-center gap-2">
                  <BedDouble className="size-4 text-[var(--ink-tertiary)]" />
                  <span className="font-medium">{a.guestName}</span>
                  <span className="font-mono text-[var(--text-micro)] text-[var(--ink-tertiary)]">{a.confirmationNumber}</span>
                </span>
                <span className="flex items-center gap-1 text-[var(--text-caption)] text-[var(--status-caution-ink)]">
                  <Clock className="size-3.5" /> Unassigned
                </span>
              </li>
            ))}
          </ul>
        )}
        <Link
          href="/arrivals"
          className="mt-3 inline-flex items-center gap-1 text-[var(--text-caption)] font-medium text-[var(--ink-accent)] hover:underline"
        >
          Open arrivals board <ArrowRight className="size-3.5" />
        </Link>
      </section>
    </div>
  );
}
