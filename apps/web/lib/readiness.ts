import type { ArrivalRow } from '@vela/contracts';

/**
 * Composite arrival readiness (front-desk concept): five facets, exceptions float to the top.
 * Room + inspected + paid derive from live data; reg card and key flip at the desk during check-in.
 */
export const FACETS = [
  ['room', 'Room assigned'],
  ['inspected', 'Room inspected'],
  ['paid', 'Payment settled'],
  ['regcard', 'Reg card done'],
  ['key', 'Key ready'],
] as const;

export type FacetKey = (typeof FACETS)[number][0];

export function facetsOf(a: ArrivalRow): Record<FacetKey, boolean> {
  const checkedIn = a.status === 'checked_in';
  return {
    room: a.roomAssigned,
    inspected: a.roomHkStatus === 'inspected',
    paid: Number(a.balance.amount) <= 0,
    regcard: checkedIn,
    key: checkedIn,
  };
}

export function readinessScore(a: ArrivalRow): number {
  const f = facetsOf(a);
  return FACETS.reduce((n, [k]) => n + (f[k] ? 1 : 0), 0);
}

export const CHANNEL_LABEL: Record<string, string> = {
  direct: 'Direct',
  ota: 'OTA',
  corporate: 'Corp',
  group: 'Group',
  walkin: 'Walk-in',
};

/** Booking channels with a domain token; everything else renders neutral. */
export function channelToken(channel: string | null): string {
  return channel && CHANNEL_LABEL[channel] ? `var(--channel-${channel})` : 'var(--ink-disabled)';
}
