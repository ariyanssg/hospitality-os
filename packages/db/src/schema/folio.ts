import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import {
  cashierSessionStatus,
  depositStatus,
  folioStatus,
  folioType,
  paymentMethod,
  paymentStatus,
  postingSourceType,
} from './enums';
import {
  auditColumns,
  createdAt,
  currency,
  fxRate,
  money,
  pk,
  propertyId,
  propertyIdNullable,
  tenantId,
} from './_shared';

/* Folio & Payments module (doc 04 §2). Invariant: folio balance = Σ postings; postings are
 * IMMUTABLE — corrections are reversal rows (enforced by trigger in the SQL migration). */

export const chargeCodes = pgTable(
  'charge_codes',
  {
    id: pk(),
    tenantId: tenantId(),
    propertyId: propertyIdNullable(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    category: text('category').notNull(), // room | fnb | tax | payment | misc | deposit
    /** Revenue/control account this posting books to (links to gl_accounts.code). */
    glAccountCode: text('gl_account_code'),
    isActive: boolean('is_active').notNull().default(true),
    ...auditColumns(),
  },
  (t) => [uniqueIndex('charge_codes_tenant_code').on(t.tenantId, t.code)],
);

export const taxRules = pgTable(
  'tax_rules',
  {
    id: pk(),
    tenantId: tenantId(),
    propertyId: propertyIdNullable(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    ratePct: numeric('rate_pct', { precision: 7, scale: 4 }).notNull(),
    inclusive: boolean('inclusive').notNull().default(false),
    appliesToCategory: text('applies_to_category').notNull().default('room'),
    glAccountCode: text('gl_account_code'),
    effectiveFrom: date('effective_from'),
    effectiveTo: date('effective_to'),
    ...auditColumns(),
  },
  (t) => [uniqueIndex('tax_rules_tenant_code').on(t.tenantId, t.code)],
);

export const folios = pgTable(
  'folios',
  {
    id: pk(),
    tenantId: tenantId(),
    propertyId: propertyId(),
    folioNumber: text('folio_number').notNull(),
    reservationId: uuid('reservation_id'),
    guestId: uuid('guest_id'),
    companyId: uuid('company_id'),
    type: folioType('type').notNull().default('guest'),
    status: folioStatus('status').notNull().default('open'),
    currency: currency().notNull().default('USD'),
    /** Cached running balance, maintained in the posting transaction; truth = Σ postings. */
    balance: money('balance').notNull().default('0'),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    ...auditColumns(),
  },
  (t) => [
    uniqueIndex('folios_tenant_number').on(t.tenantId, t.propertyId, t.folioNumber),
    index('folio_open')
      .on(t.tenantId, t.propertyId, t.status)
      .where(sql`status = 'open'`),
    index('folios_reservation').on(t.tenantId, t.reservationId),
  ],
);

export const folioPostings = pgTable(
  'folio_postings',
  {
    id: pk(),
    tenantId: tenantId(),
    propertyId: propertyId(),
    folioId: uuid('folio_id')
      .notNull()
      .references(() => folios.id),
    businessDate: date('business_date').notNull(),
    chargeCodeId: uuid('charge_code_id').notNull(),
    description: text('description').notNull(),
    /** Signed: charges positive (debit guest ledger), payments/refunds negative. */
    amount: money('amount').notNull(),
    currency: currency().notNull(),
    baseAmount: money('base_amount').notNull(),
    fxRate: fxRate('fx_rate').notNull().default('1'),
    quantity: numeric('quantity', { precision: 10, scale: 3 }).notNull().default('1'),
    sourceType: postingSourceType('source_type').notNull(),
    sourceId: uuid('source_id'),
    /** A correction points at the posting it reverses; the original is never mutated. */
    reversesPostingId: uuid('reverses_posting_id'),
    postedBy: text('posted_by').notNull(),
    postedAt: timestamp('posted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('postings_by_folio').on(t.tenantId, t.folioId, t.businessDate),
    index('postings_by_source').on(t.tenantId, t.sourceType, t.sourceId),
  ],
);

export const postingTaxes = pgTable(
  'posting_taxes',
  {
    id: pk(),
    tenantId: tenantId(),
    propertyId: propertyId(),
    postingId: uuid('posting_id')
      .notNull()
      .references(() => folioPostings.id),
    taxRuleId: uuid('tax_rule_id').notNull(),
    amount: money('amount').notNull(),
    baseAmount: money('base_amount').notNull(),
    currency: currency().notNull(),
  },
  (t) => [index('posting_taxes_posting').on(t.tenantId, t.postingId)],
);

export const payments = pgTable(
  'payments',
  {
    id: pk(),
    tenantId: tenantId(),
    propertyId: propertyId(),
    folioId: uuid('folio_id')
      .notNull()
      .references(() => folios.id),
    method: paymentMethod('method').notNull(),
    amount: money('amount').notNull(),
    currency: currency().notNull(),
    baseAmount: money('base_amount').notNull(),
    fxRate: fxRate('fx_rate').notNull().default('1'),
    status: paymentStatus('status').notNull().default('captured'),
    /** PSP token only — raw PAN never touches our systems (doc 09 PCI posture). */
    pspToken: text('psp_token'),
    reference: text('reference'),
    /** The folio posting this payment settles. */
    postingId: uuid('posting_id'),
    refundsPaymentId: uuid('refunds_payment_id'),
    cashierSessionId: uuid('cashier_session_id'),
    ...auditColumns(),
  },
  (t) => [index('payments_folio').on(t.tenantId, t.folioId)],
);

/** PSP authorization/capture intent. Stores tokens/provider references only, never raw card data. */
export const paymentIntents = pgTable(
  'payment_intents',
  {
    id: pk(),
    tenantId: tenantId(),
    propertyId: propertyId(),
    folioId: uuid('folio_id')
      .notNull()
      .references(() => folios.id),
    method: paymentMethod('method').notNull().default('card'),
    status: text('status').notNull().default('requires_authorization'),
    amount: money('amount').notNull(),
    capturedAmount: money('captured_amount').notNull().default('0'),
    currency: currency().notNull(),
    pspProvider: text('psp_provider').notNull().default('manual'),
    pspToken: text('psp_token').notNull(),
    providerIntentId: text('provider_intent_id'),
    providerAuthorizationId: text('provider_authorization_id'),
    capturedPaymentId: uuid('captured_payment_id'),
    authorizedAt: timestamp('authorized_at', { withTimezone: true }),
    capturedAt: timestamp('captured_at', { withTimezone: true }),
    voidedAt: timestamp('voided_at', { withTimezone: true }),
    failureReason: text('failure_reason'),
    metadata: jsonb('metadata')
      .notNull()
      .default(sql`'{}'::jsonb`),
    ...auditColumns(),
  },
  (t) => [
    index('payment_intents_folio').on(t.tenantId, t.propertyId, t.folioId, t.status),
    index('payment_intents_provider').on(t.tenantId, t.providerIntentId),
  ],
);

/** Pre-arrival deposits sit on the deposit ledger (2000) until check-in applies them to the
 * guest folio — both control accounts tie by construction (doc modules/01 deposits). */
export const deposits = pgTable(
  'deposits',
  {
    id: pk(),
    tenantId: tenantId(),
    propertyId: propertyId(),
    reservationId: uuid('reservation_id').notNull(),
    method: paymentMethod('method').notNull(),
    amount: money('amount').notNull(),
    currency: currency().notNull(),
    status: depositStatus('status').notNull().default('held'),
    reference: text('reference'),
    /** The folio posting created when the deposit is applied at check-in. */
    appliedPostingId: uuid('applied_posting_id'),
    heldAt: timestamp('held_at', { withTimezone: true }).notNull().defaultNow(),
    appliedAt: timestamp('applied_at', { withTimezone: true }),
    ...auditColumns(),
  },
  (t) => [index('deposits_reservation').on(t.tenantId, t.reservationId)],
);

export const cashierSessions = pgTable(
  'cashier_sessions',
  {
    id: pk(),
    tenantId: tenantId(),
    propertyId: propertyId(),
    userId: text('user_id').notNull(),
    status: cashierSessionStatus('status').notNull().default('open'),
    openingFloat: money('opening_float').notNull().default('0'),
    expectedTotal: money('expected_total'),
    countedTotal: money('counted_total'),
    variance: money('variance'),
    openedAt: timestamp('opened_at', { withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    varianceReason: text('variance_reason'),
    createdAt: createdAt(),
  },
  (t) => [index('cashier_sessions_user').on(t.tenantId, t.propertyId, t.userId)],
);
