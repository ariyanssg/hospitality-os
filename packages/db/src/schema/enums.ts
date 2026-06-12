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

export const roomStatusHousekeeping = pgEnum('room_hk_status', ['dirty', 'clean', 'inspected']);

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

export const depositStatus = pgEnum('deposit_status', ['held', 'applied', 'refunded']);

export const hkTaskType = pgEnum('hk_task_type', [
  'departure_clean',
  'stayover',
  'turndown',
  'deep_clean',
  'inspection',
]);

export const hkTaskStatus = pgEnum('hk_task_status', ['pending', 'in_progress', 'done', 'skipped']);

export const maintenanceStatus = pgEnum('maintenance_status', [
  'reported',
  'triaged',
  'assigned',
  'in_progress',
  'done',
  'verified',
  'cancelled',
]);

export const maintenancePriority = pgEnum('maintenance_priority', [
  'low',
  'medium',
  'high',
  'urgent',
]);

export const posCheckStatus = pgEnum('pos_check_status', ['open', 'fired', 'closed', 'voided']);

export const posOrderItemStatus = pgEnum('pos_order_item_status', [
  'new',
  'fired',
  'ready',
  'served',
  'voided',
]);

export const posShiftStatus = pgEnum('pos_shift_status', ['open', 'closed']);

export const offlineOpStatus = pgEnum('offline_op_status', ['queued', 'applied', 'rejected']);

export const bookingSessionStatus = pgEnum('booking_session_status', [
  'started',
  'confirmed',
  'cancelled',
  'expired',
]);

export const messageChannel = pgEnum('message_channel', ['email', 'sms']);

export const conversationStatus = pgEnum('conversation_status', ['open', 'pending', 'closed']);

export const gdprRequestStatus = pgEnum('gdpr_request_status', [
  'received',
  'verifying',
  'processing',
  'completed',
  'rejected',
]);

export const assignmentScope = pgEnum('assignment_scope', ['tenant', 'property', 'department']);

export const permissionRiskTier = pgEnum('permission_risk_tier', [
  'standard',
  'elevated',
  'critical',
]);
