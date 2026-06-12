import { boolean, index, integer, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';
import { auditColumns, pk, propertyId, tenantId } from './_shared';

/** Property configuration catalogs owned by the Settings module. */
export const floors = pgTable(
  'floors',
  {
    id: pk(),
    tenantId: tenantId(),
    propertyId: propertyId(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    ...auditColumns(),
  },
  (t) => [
    uniqueIndex('floors_tenant_property_code').on(t.tenantId, t.propertyId, t.code),
    index('floors_property').on(t.tenantId, t.propertyId, t.sortOrder),
  ],
);

export const roomAmenities = pgTable(
  'room_amenities',
  {
    id: pk(),
    tenantId: tenantId(),
    propertyId: propertyId(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    category: text('category'),
    isActive: boolean('is_active').notNull().default(true),
    ...auditColumns(),
  },
  (t) => [
    uniqueIndex('room_amenities_tenant_property_code').on(t.tenantId, t.propertyId, t.code),
    index('room_amenities_property').on(t.tenantId, t.propertyId, t.category),
  ],
);

export const paymentMethods = pgTable(
  'payment_methods',
  {
    id: pk(),
    tenantId: tenantId(),
    propertyId: propertyId(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    category: text('category').notNull().default('payment'),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    ...auditColumns(),
  },
  (t) => [
    uniqueIndex('payment_methods_tenant_property_code').on(t.tenantId, t.propertyId, t.code),
    index('payment_methods_property').on(t.tenantId, t.propertyId, t.sortOrder),
  ],
);
