'use client';
import type { ArrivalRow } from '@vela/contracts';
import { FACETS, facetsOf, readinessScore, CHANNEL_LABEL, channelToken } from '@/lib/readiness';

/**
 * Composite readiness chip (front-desk concept) — five facets at a glance.
 * Full (5/5) flips to the positive treatment; the tooltip names each facet.
 */
export function ReadyChip({ arrival }: { arrival: ArrivalRow }) {
  const facets = facetsOf(arrival);
  const score = readinessScore(arrival);
  const full = score === FACETS.length;
  const title = FACETS.map(([k, label]) => (facets[k] ? '✓ ' : '· ') + label).join('\n');
  return (
    <span
      title={title}
      className={
        'inline-flex items-center gap-[5px] rounded-[var(--radius-full)] border px-2 py-[3px] ' +
        (full
          ? 'border-[var(--status-positive-line)] bg-[var(--status-positive-bg)]'
          : 'border-[var(--line-hairline)] bg-[var(--bg-sunken)]')
      }
    >
      {FACETS.map(([k]) => (
        <span
          key={k}
          className={
            'size-[7px] rounded-full ' +
            (facets[k] ? 'bg-[var(--status-positive-ink)]' : 'bg-[var(--ink-disabled)] opacity-45')
          }
        />
      ))}
      <span
        className={
          'ml-0.5 font-mono text-[10px] ' +
          (full ? 'text-[var(--status-positive-ink)]' : 'text-[var(--ink-tertiary)]')
        }
      >
        {score}/{FACETS.length}
      </span>
    </span>
  );
}

/** Booking-channel dot — the domain color triplet, neutral for unknown sources. */
export function ChannelDot({ channel, label = true }: { channel: string | null; label?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-[var(--ink-secondary)]">
      <span className="size-2 rounded-full" style={{ background: channelToken(channel) }} />
      {label && (channel ? (CHANNEL_LABEL[channel] ?? channel) : '—')}
    </span>
  );
}
