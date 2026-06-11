import {
  date,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { glAccountType, journalEntrySource, normalBalance } from './enums';
import { auditColumns, currency, money, pk, propertyId, propertyIdNullable, tenantId } from './_shared';

/* General Ledger module (doc 04 §2). Invariant: every financial posting generates BALANCED
 * journal lines (Σ debits = Σ credits) in the same transaction — enforced by trigger (SQL migration). */

export const glAccounts = pgTable(
  'gl_accounts',
  {
    id: pk(),
    tenantId: tenantId(),
    /** null property = consolidated/tenant-level chart (doc 05 §1). */
    propertyId: propertyIdNullable(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    type: glAccountType('type').notNull(),
    normalBalance: normalBalance('normal_balance').notNull(),
    /** Control accounts (guest ledger, AR/city ledger, deposit ledger) flagged for reconciliation. */
    isControl: text('is_control'),
    parentCode: text('parent_code'),
    ...auditColumns(),
  },
  (t) => [uniqueIndex('gl_accounts_tenant_code').on(t.tenantId, t.code)],
);

export const costCenters = pgTable(
  'cost_centers',
  {
    id: pk(),
    tenantId: tenantId(),
    propertyId: propertyIdNullable(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    ...auditColumns(),
  },
  (t) => [uniqueIndex('cost_centers_tenant_code').on(t.tenantId, t.code)],
);

export const journalEntries = pgTable(
  'journal_entries',
  {
    id: pk(),
    tenantId: tenantId(),
    propertyId: propertyId(),
    businessDate: date('business_date').notNull(),
    source: journalEntrySource('source').notNull(),
    sourceId: uuid('source_id'),
    description: text('description').notNull(),
    currency: currency().notNull().default('USD'),
    postedAt: timestamp('posted_at', { withTimezone: true }).notNull().defaultNow(),
    postedBy: text('posted_by'),
  },
  (t) => [
    index('journal_entries_business_date').on(t.tenantId, t.propertyId, t.businessDate),
    index('journal_entries_source').on(t.tenantId, t.source, t.sourceId),
  ],
);

export const journalLines = pgTable(
  'journal_lines',
  {
    id: pk(),
    tenantId: tenantId(),
    propertyId: propertyId(),
    journalEntryId: uuid('journal_entry_id')
      .notNull()
      .references(() => journalEntries.id),
    businessDate: date('business_date').notNull(),
    accountCode: text('account_code').notNull(),
    costCenterCode: text('cost_center_code'),
    /** Exactly one of debit/credit is non-zero. Immutable — never UPDATE/DELETE. */
    debit: money('debit').notNull().default('0'),
    credit: money('credit').notNull().default('0'),
    currency: currency().notNull().default('USD'),
    memo: text('memo'),
  },
  (t) => [
    index('journal_lines_entry').on(t.journalEntryId),
    index('journal_lines_account').on(t.tenantId, t.propertyId, t.accountCode, t.businessDate),
  ],
);
