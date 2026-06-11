import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { ratePlanType, restrictionKind } from './enums';
import { auditColumns, money, pk, propertyId, tenantId } from './_shared';

/* Rates & Pricing module (doc 04 §2). Invariant: every sellable price resolvable in one indexed lookup. */

export const ratePlans = pgTable(
  'rate_plans',
  {
    id: pk(),
    tenantId: tenantId(),
    propertyId: propertyId(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    type: ratePlanType('type').notNull().default('bar'),
    currency: text('currency').notNull().default('USD'),
    /** Derivation, e.g. CORP = BAR − 10% follows BAR automatically (doc modules/01 rates). */
    derivedFromPlanId: uuid('derived_from_plan_id'),
    derivationAdjustmentPct: money('derivation_adjustment_pct'),
    isActive: boolean('is_active').notNull().default(true),
    ...auditColumns(),
  },
  (t) => [uniqueIndex('rate_plans_tenant_property_code').on(t.tenantId, t.propertyId, t.code)],
);

export const ratePrices = pgTable(
  'rate_prices',
  {
    id: pk(),
    tenantId: tenantId(),
    propertyId: propertyId(),
    ratePlanId: uuid('rate_plan_id')
      .notNull()
      .references(() => ratePlans.id),
    roomTypeId: uuid('room_type_id').notNull(),
    stayDate: date('stay_date').notNull(),
    /** Per-occupancy pricing (doc modules/01). price = double-occupancy default. */
    price: money('price').notNull(),
    singlePrice: money('single_price'),
    extraAdultPrice: money('extra_adult_price'),
    extraChildPrice: money('extra_child_price'),
    currency: text('currency').notNull().default('USD'),
    ...auditColumns(),
  },
  (t) => [
    // Booking-engine hot path (doc 07 §3).
    uniqueIndex('rate_prices_lookup').on(
      t.tenantId,
      t.propertyId,
      t.ratePlanId,
      t.roomTypeId,
      t.stayDate,
    ),
  ],
);

export const rateRestrictions = pgTable(
  'rate_restrictions',
  {
    id: pk(),
    tenantId: tenantId(),
    propertyId: propertyId(),
    ratePlanId: uuid('rate_plan_id')
      .notNull()
      .references(() => ratePlans.id),
    roomTypeId: uuid('room_type_id').notNull(),
    stayDate: date('stay_date').notNull(),
    kind: restrictionKind('kind').notNull(),
    /** value: nights for min/max LOS; null for boolean restrictions (CTA/CTD/stop_sell). */
    value: integer('value'),
    metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
    ...auditColumns(),
  },
  (t) => [
    index('rate_restrictions_lookup').on(
      t.tenantId,
      t.propertyId,
      t.ratePlanId,
      t.roomTypeId,
      t.stayDate,
    ),
  ],
);
