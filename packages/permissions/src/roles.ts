import type { AssignmentScope } from './index';

/**
 * System role templates (doc 06 §3) — instantiated per tenant as customizable copies.
 * Permission lists use wildcard patterns; they expand to concrete keys at role-save time.
 * Sensitive omissions are deliberate (a Front Desk Agent has `payment.collect` but NOT
 * `payment.refund` or the override permissions).
 */
export interface RoleTemplate {
  key: string;
  name: string;
  description: string;
  defaultScope: AssignmentScope;
  permissions: string[];
}

export const SYSTEM_ROLES: readonly RoleTemplate[] = [
  {
    key: 'owner',
    name: 'Owner / GM',
    description: 'Full visibility and elevated operations across the property or tenant.',
    defaultScope: 'tenant',
    permissions: ['*'],
  },
  {
    key: 'front_office_manager',
    name: 'Front Office Manager',
    description: 'Runs the front desk: reservations, rooms, folios, payments incl. refunds.',
    defaultScope: 'property',
    permissions: [
      'reservation.*',
      'room.*',
      'walkin.create',
      'folio.*',
      'payment.collect',
      'payment.refund',
      'payment.void',
      'deposit.manage',
      'invoice.*',
      'cashier.*',
      'availability.view',
      'rate.view',
      'guest.view',
      'guest.create',
      'guest.edit',
      'guest.note.manage',
      'guest.note.view',
      'housekeeping.task.view',
      'nightaudit.review',
      'report.view',
      'auditlog.view',
    ],
  },
  {
    key: 'front_desk_agent',
    name: 'Front Desk Agent',
    description: 'Reservation CRUD, check-in/out, collect payment. No refunds or overrides.',
    defaultScope: 'property',
    permissions: [
      'reservation.view',
      'reservation.create',
      'reservation.edit',
      'reservation.cancel',
      'reservation.checkin',
      'reservation.checkout',
      'room.assign',
      'room.move',
      'room.status.update',
      'walkin.create',
      'folio.view',
      'folio.create',
      'folio.post_charge',
      'folio.close',
      'payment.collect',
      'deposit.manage',
      'invoice.view',
      'invoice.create',
      'cashier.open',
      'cashier.close',
      'availability.view',
      'rate.view',
      'guest.view',
      'guest.create',
      'guest.edit',
    ],
  },
  {
    key: 'night_auditor',
    name: 'Night Auditor',
    description: 'Front desk agent set plus the night audit, corrections, and GL view.',
    defaultScope: 'property',
    permissions: [
      'reservation.view',
      'reservation.checkin',
      'reservation.checkout',
      'reservation.no_show',
      'folio.view',
      'folio.post_charge',
      'folio.adjust',
      'payment.collect',
      'cashier.reconcile',
      'nightaudit.run',
      'nightaudit.review',
      'gl.view',
      'report.financial.view',
      'auditlog.view',
    ],
  },
  {
    key: 'reservations_agent',
    name: 'Reservations Agent',
    description: 'Reservation CRUD across properties; no folio operations.',
    defaultScope: 'tenant',
    permissions: [
      'reservation.view',
      'reservation.create',
      'reservation.edit',
      'reservation.cancel',
      'availability.view',
      'rate.view',
      'guest.view',
      'guest.create',
      'guest.edit',
    ],
  },
  {
    key: 'revenue_manager',
    name: 'Revenue Manager',
    description: 'Rates, availability, channels, and forecasts.',
    defaultScope: 'tenant',
    permissions: [
      'rate.*',
      'package.manage',
      'promotion.manage',
      'availability.*',
      'overbooking.manage',
      'channel.*',
      'revenue.forecast.view',
      'revenue.pricing.approve',
      'report.view',
    ],
  },
  {
    key: 'housekeeping_supervisor',
    name: 'Housekeeping Supervisor',
    description: 'Manage housekeeping tasks and room status.',
    defaultScope: 'department',
    permissions: [
      'housekeeping.task.view',
      'housekeeping.task.manage',
      'housekeeping.task.complete',
      'housekeeping.schedule.manage',
      'room.inspect',
      'room.status.update',
      'maintenance.ticket.view',
      'maintenance.ticket.manage',
    ],
  },
  {
    key: 'financial_controller',
    name: 'Financial Controller',
    description: 'General ledger, AR/AP, financial reporting, and night-audit review.',
    defaultScope: 'tenant',
    permissions: [
      'gl.*',
      'costcenter.manage',
      'ar.*',
      'ap.*',
      'tax.configure',
      'nightaudit.review',
      'gl.close_period',
      'report.financial.view',
      'budget.manage',
      'auditlog.view',
    ],
  },
] as const;

const BY_KEY = new Map(SYSTEM_ROLES.map((r) => [r.key, r]));
export function getSystemRole(key: string): RoleTemplate | undefined {
  return BY_KEY.get(key);
}
