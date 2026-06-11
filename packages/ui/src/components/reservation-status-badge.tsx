import { Badge } from './badge';

type Tone = 'neutral' | 'positive' | 'caution' | 'critical' | 'info' | 'accent';

const MAP: Record<string, { label: string; tone: Tone }> = {
  inquiry: { label: 'Inquiry', tone: 'neutral' },
  tentative: { label: 'Tentative', tone: 'caution' },
  confirmed: { label: 'Confirmed', tone: 'info' },
  checked_in: { label: 'In-house', tone: 'positive' },
  checked_out: { label: 'Departed', tone: 'neutral' },
  cancelled: { label: 'Cancelled', tone: 'critical' },
  no_show: { label: 'No-show', tone: 'critical' },
  released: { label: 'Released', tone: 'neutral' },
};

/** Reservation status → consistent label + tone (doc 17 Tier-C; status colors are sacred). */
export function ReservationStatusBadge({ status }: { status: string }) {
  const s = MAP[status] ?? { label: status, tone: 'neutral' as const };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}
