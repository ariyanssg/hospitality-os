import { sql } from 'drizzle-orm';
import {
  check,
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
import { roomOccupancy, roomStatusHousekeeping } from './enums';
import { auditColumns, pk, propertyId, tenantId } from './_shared';
import { floors, roomAmenities } from './settings';

/* Inventory & Availability module tables (doc 04 §2, doc modules/01).
 * Invariant: sold + blocked ≤ physical − out_of_order + overbook_limit per room-type per date,
 * enforced by the availability_days CHECK — the structural overbooking guard. */

export const roomTypes = pgTable(
  'room_types',
  {
    id: pk(),
    tenantId: tenantId(),
    propertyId: propertyId(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    maxOccupancy: integer('max_occupancy').notNull().default(2),
    defaultOccupancy: integer('default_occupancy').notNull().default(2),
    /** Attribute-first for future attribute-based selling (doc modules/01 future). */
    attributes: jsonb('attributes')
      .notNull()
      .default(sql`'{}'::jsonb`),
    sortOrder: integer('sort_order').notNull().default(0),
    ...auditColumns(),
  },
  (t) => [uniqueIndex('room_types_tenant_property_code').on(t.tenantId, t.propertyId, t.code)],
);

export const rooms = pgTable(
  'rooms',
  {
    id: pk(),
    tenantId: tenantId(),
    propertyId: propertyId(),
    roomTypeId: uuid('room_type_id')
      .notNull()
      .references(() => roomTypes.id),
    number: text('number').notNull(),
    floorId: uuid('floor_id').references(() => floors.id),
    floor: text('floor'),
    hkStatus: roomStatusHousekeeping('hk_status').notNull().default('clean'),
    occupancy: roomOccupancy('occupancy').notNull().default('vacant'),
    attributes: jsonb('attributes')
      .notNull()
      .default(sql`'{}'::jsonb`),
    statusUpdatedAt: timestamp('status_updated_at', { withTimezone: true }).notNull().defaultNow(),
    ...auditColumns(),
  },
  (t) => [
    uniqueIndex('rooms_tenant_property_number').on(t.tenantId, t.propertyId, t.number),
    index('rooms_by_type').on(t.tenantId, t.propertyId, t.roomTypeId),
    index('rooms_by_floor').on(t.tenantId, t.propertyId, t.floorId),
  ],
);

export const roomAmenityAssignments = pgTable(
  'room_amenity_assignments',
  {
    id: pk(),
    tenantId: tenantId(),
    propertyId: propertyId(),
    roomId: uuid('room_id')
      .notNull()
      .references(() => rooms.id, { onDelete: 'cascade' }),
    amenityId: uuid('amenity_id')
      .notNull()
      .references(() => roomAmenities.id, { onDelete: 'cascade' }),
  },
  (t) => [
    uniqueIndex('room_amenity_assignments_unique').on(t.roomId, t.amenityId),
    index('room_amenity_assignments_room').on(t.tenantId, t.propertyId, t.roomId),
  ],
);

export const availabilityDays = pgTable(
  'availability_days',
  {
    tenantId: tenantId(),
    propertyId: propertyId(),
    roomTypeId: uuid('room_type_id').notNull(),
    stayDate: date('stay_date').notNull(),
    physical: integer('physical').notNull(),
    outOfOrder: integer('out_of_order').notNull().default(0),
    sold: integer('sold').notNull().default(0),
    blocked: integer('blocked').notNull().default(0), // group holds
    overbookLimit: integer('overbook_limit').notNull().default(0),
  },
  (t) => [
    uniqueIndex('availability_days_pk').on(t.tenantId, t.propertyId, t.roomTypeId, t.stayDate),
    // The last-line overbooking guard (doc 07 §2).
    check(
      'availability_no_overbook',
      sql`${t.sold} + ${t.blocked} <= ${t.physical} - ${t.outOfOrder} + ${t.overbookLimit}`,
    ),
    check('availability_nonneg', sql`${t.sold} >= 0 AND ${t.blocked} >= 0`),
  ],
);

export const outOfOrderPeriods = pgTable(
  'out_of_order_periods',
  {
    id: pk(),
    tenantId: tenantId(),
    propertyId: propertyId(),
    roomId: uuid('room_id')
      .notNull()
      .references(() => rooms.id),
    fromDate: date('from_date').notNull(),
    toDate: date('to_date').notNull(),
    kind: text('kind').notNull().default('out_of_order'), // out_of_order | out_of_service
    reason: text('reason'),
    ...auditColumns(),
  },
  (t) => [index('ooo_room').on(t.tenantId, t.propertyId, t.roomId)],
);
