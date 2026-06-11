/**
 * Event taxonomy (doc 04 §4): `<aggregate>.<past-tense-verb>`, versioned payloads.
 * This is the public contract that webhooks, realtime rooms, and internal projections all consume.
 */
export const EVENT_TYPES = [
  // reservations
  'reservation.created',
  'reservation.modified',
  'reservation.cancelled',
  'reservation.checked_in',
  'reservation.checked_out',
  'reservation.no_show',
  // rooms / housekeeping
  'room.assigned',
  'room.moved',
  'room.status_changed',
  'housekeeping.task_completed',
  // availability / rates
  'availability.changed',
  'rate.price_changed',
  // folio / payments
  'folio.charge_posted',
  'folio.payment_recorded',
  'folio.refunded',
  'folio.closed',
  // pos
  'pos.check_opened',
  'pos.check_closed',
  'pos.check_voided',
  // gl / audit
  'gl.journal_posted',
  'nightaudit.completed',
  // guests / channel
  'guest.profile_merged',
  'channel.reservation_received',
  // groups
  'group.block_created',
  'group.pickup',
  // invoices / hr / platform
  'invoice.issued',
  'invoice.paid',
  'employee.shift_started',
  'permission.changed',
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

const EVENT_TYPE_SET = new Set<string>(EVENT_TYPES);
export function isEventType(value: string): value is EventType {
  return EVENT_TYPE_SET.has(value);
}

export function aggregateOf(type: EventType): string {
  return type.split('.')[0]!;
}
