import { sql } from 'drizzle-orm';
import {
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { reservationStatus } from './enums';
import { auditColumns, createdAt, money, pk, propertyId, tenantId } from './_shared';

/* CRM guests (minimal Phase-0 slice; full dedup/merge in CRM module). PII encryption: doc 09. */
export const guests = pgTable(
  'guests',
  {
    id: pk(),
    tenantId: tenantId(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    email: text('email'),
    phone: text('phone'),
    vipTier: text('vip_tier'),
    traits: jsonb('traits').notNull().default(sql`'[]'::jsonb`),
    nationality: text('nationality'),
    ...auditColumns(),
  },
  (t) => [
    index('guests_tenant_name').on(t.tenantId, t.lastName, t.firstName),
    index('guests_tenant_email').on(t.tenantId, t.email),
  ],
);

/* Reservations module — header + nights + room-stays split (doc 07 §2). */

export const reservations = pgTable(
  'reservations',
  {
    id: pk(),
    tenantId: tenantId(),
    propertyId: propertyId(),
    /** Human ref, per-property sequenced; never used as a key (doc 08 §1). */
    confirmationNumber: text('confirmation_number').notNull(),
    status: reservationStatus('status').notNull().default('confirmed'),
    guestId: uuid('guest_id')
      .notNull()
      .references(() => guests.id),
    companyId: uuid('company_id'),
    groupBlockId: uuid('group_block_id'),
    arrivalDate: date('arrival_date').notNull(),
    departureDate: date('departure_date').notNull(),
    roomTypeId: uuid('room_type_id').notNull(),
    ratePlanId: uuid('rate_plan_id').notNull(),
    adults: integer('adults').notNull().default(1),
    children: integer('children').notNull().default(0),
    /** Snapshot pricing summary; per-night truth lives in reservation_nights. */
    totalAmount: money('total_amount').notNull().default('0'),
    currency: text('currency').notNull().default('USD'),
    source: jsonb('source').notNull().default(sql`'{}'::jsonb`),
    guarantee: jsonb('guarantee').notNull().default(sql`'{}'::jsonb`),
    /** Tentative-hold TTL — released by night audit / sweeper when passed. */
    holdExpiresAt: timestamp('hold_expires_at', { withTimezone: true }),
    notes: text('notes'),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    checkedInAt: timestamp('checked_in_at', { withTimezone: true }),
    checkedOutAt: timestamp('checked_out_at', { withTimezone: true }),
    ...auditColumns(),
  },
  (t) => [
    uniqueIndex('reservations_confirmation').on(t.tenantId, t.propertyId, t.confirmationNumber),
    // Arrivals board — front desk's bread and butter (doc 07 §3).
    index('res_arrivals')
      .on(t.tenantId, t.propertyId, t.arrivalDate)
      .where(sql`status IN ('confirmed','checked_in')`),
    index('res_departures')
      .on(t.tenantId, t.propertyId, t.departureDate)
      .where(sql`status = 'checked_in'`),
    index('res_guest').on(t.tenantId, t.guestId),
  ],
);

export const reservationNights = pgTable(
  'reservation_nights',
  {
    id: pk(),
    tenantId: tenantId(),
    propertyId: propertyId(),
    reservationId: uuid('reservation_id')
      .notNull()
      .references(() => reservations.id, { onDelete: 'cascade' }),
    stayDate: date('stay_date').notNull(),
    roomTypeId: uuid('room_type_id').notNull(),
    ratePlanId: uuid('rate_plan_id').notNull(),
    price: money('price').notNull(),
    currency: text('currency').notNull().default('USD'),
    marketSegment: text('market_segment'),
    ...auditColumns(),
  },
  (t) => [
    uniqueIndex('reservation_nights_unique').on(t.reservationId, t.stayDate),
    index('reservation_nights_res').on(t.tenantId, t.reservationId),
  ],
);

export const reservationRoomStays = pgTable(
  'reservation_room_stays',
  {
    id: pk(),
    tenantId: tenantId(),
    propertyId: propertyId(),
    reservationId: uuid('reservation_id')
      .notNull()
      .references(() => reservations.id, { onDelete: 'cascade' }),
    roomId: uuid('room_id'),
    fromDate: date('from_date').notNull(),
    toDate: date('to_date').notNull(),
    /** Room moves close the current stay and open a new one — history, not overwrite (doc 07 §2). */
    closedAt: timestamp('closed_at', { withTimezone: true }),
    ...auditColumns(),
  },
  (t) => [index('room_stays_res').on(t.tenantId, t.reservationId)],
);

export const reservationGuests = pgTable(
  'reservation_guests',
  {
    id: pk(),
    tenantId: tenantId(),
    reservationId: uuid('reservation_id')
      .notNull()
      .references(() => reservations.id, { onDelete: 'cascade' }),
    guestId: uuid('guest_id')
      .notNull()
      .references(() => guests.id),
    isPrimary: text('is_primary').notNull().default('true'),
  },
  (t) => [uniqueIndex('reservation_guests_unique').on(t.reservationId, t.guestId)],
);

export const reservationStatusLog = pgTable(
  'reservation_status_log',
  {
    id: pk(),
    tenantId: tenantId(),
    propertyId: propertyId(),
    reservationId: uuid('reservation_id')
      .notNull()
      .references(() => reservations.id, { onDelete: 'cascade' }),
    fromStatus: text('from_status'),
    toStatus: text('to_status').notNull(),
    reason: text('reason'),
    actorId: text('actor_id'),
    createdAt: createdAt(),
  },
  (t) => [index('reservation_status_log_res').on(t.tenantId, t.reservationId)],
);
