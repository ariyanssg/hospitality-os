import { index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import {
  offlineOpStatus,
  paymentMethod,
  posCheckStatus,
  posOrderItemStatus,
  posShiftStatus,
} from './enums';
import { auditColumns, createdAt, currency, money, pk, propertyId, tenantId } from './_shared';

/** POS v1: floor/table checks, KDS fire queue, offline operation queue, and shift close. */
export const posOutlets = pgTable(
  'pos_outlets',
  {
    id: pk(),
    tenantId: tenantId(),
    propertyId: propertyId(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    currency: currency().notNull().default('USD'),
    ...auditColumns(),
  },
  (t) => [index('pos_outlets_property').on(t.tenantId, t.propertyId)],
);

export const posTables = pgTable(
  'pos_tables',
  {
    id: pk(),
    tenantId: tenantId(),
    propertyId: propertyId(),
    outletId: uuid('outlet_id')
      .notNull()
      .references(() => posOutlets.id),
    label: text('label').notNull(),
    section: text('section'),
    seats: integer('seats').notNull().default(2),
    x: integer('x').notNull().default(0),
    y: integer('y').notNull().default(0),
    ...auditColumns(),
  },
  (t) => [index('pos_tables_outlet').on(t.tenantId, t.outletId)],
);

export const posChecks = pgTable(
  'pos_checks',
  {
    id: pk(),
    tenantId: tenantId(),
    propertyId: propertyId(),
    outletId: uuid('outlet_id')
      .notNull()
      .references(() => posOutlets.id),
    tableId: uuid('table_id'),
    checkNumber: text('check_number').notNull(),
    status: posCheckStatus('status').notNull().default('open'),
    covers: integer('covers').notNull().default(1),
    subtotal: money('subtotal').notNull().default('0'),
    discountTotal: money('discount_total').notNull().default('0'),
    taxTotal: money('tax_total').notNull().default('0'),
    total: money('total').notNull().default('0'),
    currency: currency().notNull().default('USD'),
    roomFolioId: uuid('room_folio_id'),
    openedBy: text('opened_by'),
    closedBy: text('closed_by'),
    openedAt: timestamp('opened_at', { withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    ...auditColumns(),
  },
  (t) => [
    index('pos_checks_outlet').on(t.tenantId, t.propertyId, t.outletId, t.status),
    index('pos_checks_room_folio').on(t.tenantId, t.roomFolioId),
  ],
);

export const posCheckItems = pgTable(
  'pos_check_items',
  {
    id: pk(),
    tenantId: tenantId(),
    propertyId: propertyId(),
    checkId: uuid('check_id')
      .notNull()
      .references(() => posChecks.id),
    name: text('name').notNull(),
    course: text('course'),
    quantity: integer('quantity').notNull().default(1),
    unitPrice: money('unit_price').notNull(),
    lineTotal: money('line_total').notNull(),
    status: posOrderItemStatus('status').notNull().default('new'),
    voidReason: text('void_reason'),
    firedAt: timestamp('fired_at', { withTimezone: true }),
    readyAt: timestamp('ready_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index('pos_items_check').on(t.tenantId, t.checkId)],
);

export const posPayments = pgTable(
  'pos_payments',
  {
    id: pk(),
    tenantId: tenantId(),
    propertyId: propertyId(),
    checkId: uuid('check_id')
      .notNull()
      .references(() => posChecks.id),
    method: paymentMethod('method').notNull(),
    amount: money('amount').notNull(),
    currency: currency().notNull(),
    reference: text('reference'),
    createdAt: createdAt(),
  },
  (t) => [index('pos_payments_check').on(t.tenantId, t.checkId)],
);

export const posShifts = pgTable(
  'pos_shifts',
  {
    id: pk(),
    tenantId: tenantId(),
    propertyId: propertyId(),
    outletId: uuid('outlet_id')
      .notNull()
      .references(() => posOutlets.id),
    userId: text('user_id').notNull(),
    status: posShiftStatus('status').notNull().default('open'),
    expectedTotal: money('expected_total'),
    countedTotal: money('counted_total'),
    variance: money('variance'),
    openedAt: timestamp('opened_at', { withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index('pos_shifts_user').on(t.tenantId, t.propertyId, t.outletId, t.userId, t.status)],
);

export const offlineOps = pgTable(
  'offline_ops',
  {
    id: pk(),
    tenantId: tenantId(),
    propertyId: propertyId(),
    deviceId: text('device_id').notNull(),
    opKey: text('op_key').notNull(),
    status: offlineOpStatus('status').notNull().default('queued'),
    payload: jsonb('payload').notNull(),
    appliedAt: timestamp('applied_at', { withTimezone: true }),
    rejectionReason: text('rejection_reason'),
    createdAt: createdAt(),
  },
  (t) => [index('offline_ops_device').on(t.tenantId, t.propertyId, t.deviceId, t.status)],
);
