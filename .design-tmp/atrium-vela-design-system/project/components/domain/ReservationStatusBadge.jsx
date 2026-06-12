import React from 'react';
import { Badge } from '../core/Badge.jsx';

/**
 * ReservationStatusBadge — reservation status → consistent label + tone (doc 17 Tier-C). Status
 * colors are sacred; every surface shows the same word for the same state.
 */
const MAP = {
  inquiry: { label: 'Inquiry', tone: 'neutral' },
  tentative: { label: 'Tentative', tone: 'caution' },
  confirmed: { label: 'Confirmed', tone: 'info' },
  checked_in: { label: 'In-house', tone: 'positive' },
  checked_out: { label: 'Departed', tone: 'neutral' },
  cancelled: { label: 'Cancelled', tone: 'critical' },
  no_show: { label: 'No-show', tone: 'critical' },
  released: { label: 'Released', tone: 'neutral' },
};

export function ReservationStatusBadge({ status, ...props }) {
  const s = MAP[status] ?? { label: status, tone: 'neutral' };
  return (
    <Badge tone={s.tone} {...props}>
      {s.label}
    </Badge>
  );
}
