import { pgEnum } from 'drizzle-orm/pg-core';

/** Closed domain sets as Postgres enums (doc 07 §1). Tenant-extensible sets use lookup tables. */

export const reservationStatus = pgEnum('reservation_status', [
  'inquiry',
  'tentative',
  'confirmed',
  'checked_in',
  'checked_out',
  'cancelled',
  'no_show',
  'released',
]);

export const folioStatus = pgEnum('folio_status', ['open', 'closed', 'transferred']);

export const folioType = pgEnum('folio_type', ['guest', 'master', 'company', 'paymaster']);

export const postingSourceType = pgEnum('posting_source_type', [
  'room',
  'tax',
  'pos_check',
  'payment',
  'refund',
  'adjustment',
  'deposit',
  'package',
  'manual',
]);

export const paymentMethod = pgEnum('payment_method', [
  'card',
  'cash',
  'bank_transfer',
  'ar_transfer',
  'voucher',
  'deposit',
]);

export const paymentStatus = pgEnum('payment_status', [
  'pending',
  'captured',
  'failed',
  'voided',
  'refunded',
]);

export const roomStatusHousekeeping = pgEnum('room_hk_status', [
  'dirty',
  'clean',
  'inspected',
]);

export const roomOccupancy = pgEnum('room_occupancy', ['vacant', 'occupied']);

export const ratePlanType = pgEnum('rate_plan_type', [
  'bar',
  'corporate',
  'package',
  'member',
  'wholesale',
  'promotional',
]);

export const restrictionKind = pgEnum('restriction_kind', [
  'min_los',
  'max_los',
  'cta',
  'ctd',
  'stop_sell',
]);

export const journalEntrySource = pgEnum('journal_entry_source', [
  'folio_posting',
  'payment',
  'night_audit',
  'manual',
]);

export const glAccountType = pgEnum('gl_account_type', [
  'asset',
  'liability',
  'equity',
  'revenue',
  'expense',
]);

export const normalBalance = pgEnum('normal_balance', ['debit', 'credit']);

export const businessDateStatus = pgEnum('business_date_status', ['open', 'closed']);

export const cashierSessionStatus = pgEnum('cashier_session_status', ['open', 'closed']);

export const assignmentScope = pgEnum('assignment_scope', ['tenant', 'property', 'department']);

export const permissionRiskTier = pgEnum('permission_risk_tier', [
  'standard',
  'elevated',
  'critical',
]);
