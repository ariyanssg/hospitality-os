import { sql } from 'drizzle-orm';
import { char, numeric, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * Column helpers enforcing the conventions in doc 07 §1 across every table:
 * uuidv7 PKs, leading tenant/property scoping, numeric(14,4) money, timestamptz audit columns.
 */

export const pk = () => uuid('id').primaryKey().default(sql`gen_random_uuid()`);

export const tenantId = () => uuid('tenant_id').notNull();
export const propertyId = () => uuid('property_id').notNull();
/** null property_id = corporate/tenant-wide scope (doc 05 §1). */
export const propertyIdNullable = () => uuid('property_id');

/** Money is stored as a fixed-precision decimal and surfaced as a string — never a float. */
export const money = (name: string) => numeric(name, { precision: 14, scale: 4 });
export const fxRate = (name: string) => numeric(name, { precision: 12, scale: 6 });
export const currency = (name = 'currency') => char(name, { length: 3 });

export const createdAt = () =>
  timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
export const updatedAt = () =>
  timestamp('updated_at', { withTimezone: true }).notNull().defaultNow();
export const createdBy = () => uuid('created_by');
export const updatedBy = () => uuid('updated_by');

/** Mutable-table audit columns (doc 07 §1). Financial/immutable tables omit these. */
export const auditColumns = () => ({
  createdAt: createdAt(),
  createdBy: createdBy(),
  updatedAt: updatedAt(),
  updatedBy: updatedBy(),
});
