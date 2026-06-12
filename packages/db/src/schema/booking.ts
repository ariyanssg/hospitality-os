import { date, index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { bookingSessionStatus } from './enums';
import { auditColumns, currency, money, pk, propertyId, tenantId } from './_shared';

/** Public booking engine v1: availability/rates shopping session and confirm/cancel bridge. */
export const bookingSessions = pgTable(
  'booking_sessions',
  {
    id: pk(),
    tenantId: tenantId(),
    propertyId: propertyId(),
    status: bookingSessionStatus('status').notNull().default('started'),
    arrivalDate: date('arrival_date').notNull(),
    departureDate: date('departure_date').notNull(),
    roomTypeId: uuid('room_type_id').notNull(),
    ratePlanId: uuid('rate_plan_id').notNull(),
    adults: text('adults').notNull().default('1'),
    children: text('children').notNull().default('0'),
    quotedTotal: money('quoted_total').notNull(),
    currency: currency().notNull(),
    guest: jsonb('guest').notNull(),
    source: jsonb('source').notNull(),
    reservationId: uuid('reservation_id'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    ...auditColumns(),
  },
  (t) => [index('booking_sessions_property').on(t.tenantId, t.propertyId, t.status, t.expiresAt)],
);
