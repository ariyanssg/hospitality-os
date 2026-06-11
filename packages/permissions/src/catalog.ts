/**
 * The permission catalog — the single source of truth for authorization (doc 06 §2).
 * Naming: `<module>.<resource?>.<action>`. Sensitive variants are SEPARATE permissions
 * (refunding is not paying; deleting is not editing). Risk tiers:
 *   standard  — routine operational actions
 *   elevated  — overrides, voids, corrections, reopen flows
 *   critical  — requires sudo (recent re-auth) + always detailed audit (doc 06 §2)
 */
export type RiskTier = 'standard' | 'elevated' | 'critical';

export interface PermissionDef {
  readonly key: string;
  readonly module: string;
  readonly risk: RiskTier;
  readonly description: string;
}

const def = (key: string, module: string, description: string, risk: RiskTier = 'standard') =>
  ({ key, module, risk, description }) as const;

export const CATALOG = [
  // ── Reservations & Front Desk ──
  def('reservation.view', 'reservations', 'View reservations'),
  def('reservation.create', 'reservations', 'Create reservations'),
  def('reservation.edit', 'reservations', 'Edit reservations'),
  def('reservation.cancel', 'reservations', 'Cancel reservations'),
  def('reservation.override_rate', 'reservations', 'Override the resolved rate', 'elevated'),
  def('reservation.override_availability', 'reservations', 'Sell past availability', 'elevated'),
  def('reservation.checkin', 'reservations', 'Check a guest in'),
  def('reservation.checkout', 'reservations', 'Check a guest out'),
  def('reservation.no_show', 'reservations', 'Mark a reservation no-show', 'elevated'),
  def('reservation.reinstate', 'reservations', 'Reinstate a cancelled reservation', 'elevated'),
  def('reservation.group.manage', 'reservations', 'Manage group reservations'),
  def('reservation.block.manage', 'reservations', 'Manage group blocks'),
  def('room.assign', 'reservations', 'Assign a room'),
  def('room.move', 'reservations', 'Move a guest between rooms'),
  def('room.status.update', 'reservations', 'Update room status'),
  def('room.block', 'reservations', 'Block a room'),
  def('room.upgrade.comp', 'reservations', 'Comp a room upgrade', 'elevated'),
  def('walkin.create', 'reservations', 'Create a walk-in'),

  // ── Folio & Payments ──
  def('folio.view', 'folio', 'View folios'),
  def('folio.create', 'folio', 'Create folios'),
  def('folio.post_charge', 'folio', 'Post a charge to a folio'),
  def('folio.transfer', 'folio', 'Transfer postings between folios'),
  def('folio.split', 'folio', 'Split a folio'),
  def('folio.adjust', 'folio', 'Post a correction/adjustment', 'elevated'),
  def('payment.collect', 'folio', 'Collect a payment'),
  def('payment.refund', 'folio', 'Refund a payment', 'critical'),
  def('payment.void', 'folio', 'Void a payment', 'elevated'),
  def('deposit.manage', 'folio', 'Manage deposits'),
  def('paymaster.manage', 'folio', 'Manage paymaster/house accounts', 'elevated'),
  def('folio.close', 'folio', 'Close a folio'),
  def('folio.reopen', 'folio', 'Reopen a folio', 'elevated'),
  def('invoice.create', 'folio', 'Create an invoice'),
  def('invoice.view', 'folio', 'View invoices'),
  def('invoice.send', 'folio', 'Send an invoice'),
  def('invoice.write_off', 'folio', 'Write off an invoice', 'critical'),
  def('cashier.open', 'folio', 'Open a cashier session'),
  def('cashier.close', 'folio', 'Close a cashier session'),
  def('cashier.reconcile', 'folio', 'Reconcile a cashier session', 'elevated'),

  // ── Rates, Inventory, Distribution ──
  def('rate.view', 'rates', 'View rates'),
  def('rate.manage', 'rates', 'Manage rate plans and prices'),
  def('rate.publish', 'rates', 'Publish rates', 'elevated'),
  def('package.manage', 'rates', 'Manage packages'),
  def('promotion.manage', 'rates', 'Manage promotions'),
  def('availability.view', 'availability', 'View availability'),
  def('availability.manage', 'availability', 'Manage availability'),
  def('overbooking.manage', 'availability', 'Manage overbooking limits', 'elevated'),
  def('channel.view', 'channel', 'View channels'),
  def('channel.manage', 'channel', 'Manage channels'),
  def('channel.mapping.manage', 'channel', 'Manage channel mappings'),
  def('channel.kill_switch', 'channel', 'Activate the channel kill switch', 'critical'),
  def('bookingengine.configure', 'booking-engine', 'Configure the booking engine'),

  // ── Housekeeping & Maintenance ──
  def('housekeeping.task.view', 'housekeeping', 'View housekeeping tasks'),
  def('housekeeping.task.manage', 'housekeeping', 'Manage housekeeping tasks'),
  def('housekeeping.task.complete', 'housekeeping', 'Complete housekeeping tasks'),
  def('housekeeping.schedule.manage', 'housekeeping', 'Manage housekeeping schedules'),
  def('room.inspect', 'housekeeping', 'Inspect a room'),
  def('maintenance.ticket.view', 'maintenance', 'View maintenance tickets'),
  def('maintenance.ticket.manage', 'maintenance', 'Manage maintenance tickets'),
  def('maintenance.ticket.close', 'maintenance', 'Close maintenance tickets'),
  def('asset.manage', 'maintenance', 'Manage assets'),

  // ── POS & Restaurant ──
  def('pos.check.create', 'pos', 'Open a POS check'),
  def('pos.check.view', 'pos', 'View POS checks'),
  def('pos.item.add', 'pos', 'Add items to a check'),
  def('pos.item.void', 'pos', 'Void an item after fire', 'elevated'),
  def('pos.check.discount', 'pos', 'Apply a discount', 'elevated'),
  def('pos.check.transfer', 'pos', 'Transfer a check'),
  def('pos.check.split', 'pos', 'Split a check'),
  def('pos.check.close', 'pos', 'Close a check'),
  def('pos.roomcharge.post', 'pos', 'Post a room charge from POS to a folio'),
  def('pos.refund', 'pos', 'Refund in POS', 'critical'),
  def('pos.cash.manage', 'pos', 'Manage POS cash'),
  def('pos.shift.close', 'pos', 'Close a POS shift'),
  def('menu.manage', 'pos', 'Manage menus'),
  def('kds.operate', 'pos', 'Operate the kitchen display'),
  def('table.manage', 'pos', 'Manage tables'),
  def('reservation.table.manage', 'pos', 'Manage table reservations'),

  // ── Accounting & Finance ──
  def('gl.view', 'accounting', 'View the general ledger'),
  def('gl.journal.post', 'accounting', 'Post a journal entry', 'elevated'),
  def('gl.journal.approve', 'accounting', 'Approve a journal entry', 'elevated'),
  def('gl.close_period', 'accounting', 'Close an accounting period', 'critical'),
  def('gl.account.manage', 'accounting', 'Manage GL accounts'),
  def('costcenter.manage', 'accounting', 'Manage cost centers'),
  def('ar.view', 'accounting', 'View accounts receivable'),
  def('ar.manage', 'accounting', 'Manage accounts receivable'),
  def('ar.creditlimit.manage', 'accounting', 'Manage AR credit limits', 'elevated'),
  def('ap.view', 'accounting', 'View accounts payable'),
  def('ap.manage', 'accounting', 'Manage accounts payable'),
  def('ap.approve', 'accounting', 'Approve accounts payable', 'elevated'),
  def('tax.configure', 'accounting', 'Configure taxes', 'elevated'),
  def('nightaudit.run', 'accounting', 'Run the night audit', 'elevated'),
  def('nightaudit.review', 'accounting', 'Review the night audit'),
  def('report.financial.view', 'accounting', 'View financial reports'),
  def('budget.manage', 'accounting', 'Manage budgets'),

  // ── Guests & CRM ──
  def('guest.view', 'crm', 'View guest profiles'),
  def('guest.create', 'crm', 'Create guest profiles'),
  def('guest.edit', 'crm', 'Edit guest profiles'),
  def('guest.merge', 'crm', 'Merge guest profiles', 'elevated'),
  def('guest.export', 'crm', 'Export guest data (GDPR-sensitive)', 'critical'),
  def('guest.pii.view', 'crm', 'View unmasked guest PII', 'elevated'),
  def('guest.note.view', 'crm', 'View guest notes'),
  def('guest.note.manage', 'crm', 'Manage guest notes'),
  def('guest.blacklist.manage', 'crm', 'Manage guest blacklist', 'elevated'),
  def('loyalty.manage', 'loyalty', 'Manage loyalty'),
  def('loyalty.points.adjust', 'loyalty', 'Adjust loyalty points', 'elevated'),
  def('campaign.manage', 'crm', 'Manage campaigns'),
  def('segment.manage', 'crm', 'Manage segments'),

  // ── HR & Payroll ──
  def('employee.view', 'hr', 'View employees'),
  def('employee.manage', 'hr', 'Manage employees'),
  def('employee.document.view', 'hr', 'View employee documents', 'elevated'),
  def('schedule.view', 'hr', 'View schedules'),
  def('schedule.manage', 'hr', 'Manage schedules'),
  def('timeclock.use', 'hr', 'Use the time clock'),
  def('timeclock.adjust', 'hr', 'Adjust time clock entries', 'elevated'),
  def('leave.request', 'hr', 'Request leave'),
  def('leave.approve', 'hr', 'Approve leave', 'elevated'),
  def('payroll.view', 'payroll', 'View payroll'),
  def('payroll.manage', 'payroll', 'Manage payroll', 'elevated'),
  def('payroll.run', 'payroll', 'Run payroll', 'critical'),
  def('payroll.approve', 'payroll', 'Approve payroll', 'critical'),
  def('compensation.view', 'payroll', 'View compensation', 'elevated'),
  def('compensation.manage', 'payroll', 'Manage compensation', 'critical'),

  // ── Inventory & Procurement ──
  def('stock.view', 'inventory', 'View stock'),
  def('stock.adjust', 'inventory', 'Adjust stock', 'elevated'),
  def('stock.count', 'inventory', 'Count stock'),
  def('stock.transfer', 'inventory', 'Transfer stock'),
  def('purchase.requisition.create', 'procurement', 'Create a purchase requisition'),
  def('purchase.order.create', 'procurement', 'Create a purchase order'),
  def('purchase.order.approve', 'procurement', 'Approve a purchase order', 'elevated'),
  def('supplier.manage', 'procurement', 'Manage suppliers'),
  def('receiving.manage', 'procurement', 'Manage receiving'),
  def('recipe.manage', 'inventory', 'Manage recipes'),

  // ── Platform / Admin / CMS / BI ──
  def('user.invite', 'kernel', 'Invite users'),
  def('user.manage', 'kernel', 'Manage users', 'elevated'),
  def('role.manage', 'kernel', 'Manage roles', 'critical'),
  def('permission.assign', 'kernel', 'Assign permissions', 'critical'),
  def('property.settings.manage', 'kernel', 'Manage property settings', 'elevated'),
  def('tenant.settings.manage', 'kernel', 'Manage tenant settings', 'critical'),
  def('integration.manage', 'kernel', 'Manage integrations', 'elevated'),
  def('webhook.manage', 'kernel', 'Manage webhooks', 'elevated'),
  def('apikey.manage', 'kernel', 'Manage API keys', 'critical'),
  def('auditlog.view', 'kernel', 'View the audit log'),
  def('featureflag.manage', 'kernel', 'Manage feature flags', 'elevated'),
  def('cms.page.edit', 'cms', 'Edit CMS pages'),
  def('cms.page.publish', 'cms', 'Publish CMS pages', 'elevated'),
  def('cms.media.manage', 'cms', 'Manage CMS media'),
  def('cms.blog.manage', 'cms', 'Manage the blog'),
  def('seo.manage', 'cms', 'Manage SEO'),
  def('report.view', 'reporting', 'View reports'),
  def('report.create', 'reporting', 'Create reports'),
  def('report.schedule', 'reporting', 'Schedule reports'),
  def('bi.explore', 'reporting', 'Explore BI data'),
  def('ai.assistant.use', 'ai', 'Use the AI assistant'),
  def('revenue.forecast.view', 'revenue', 'View revenue forecasts'),
  def('revenue.pricing.approve', 'revenue', 'Approve pricing changes', 'elevated'),
  def('revenue.autopilot.manage', 'revenue', 'Manage revenue autopilot', 'critical'),
] as const;

export type PermissionKey = (typeof CATALOG)[number]['key'];

/** All catalog keys, frozen. */
export const ALL_PERMISSION_KEYS: readonly PermissionKey[] = CATALOG.map((p) => p.key);

const BY_KEY = new Map<string, PermissionDef>(CATALOG.map((p) => [p.key, p]));

export function getPermission(key: string): PermissionDef | undefined {
  return BY_KEY.get(key);
}

export function isCritical(key: string): boolean {
  return BY_KEY.get(key)?.risk === 'critical';
}

/** Modules referenced by the catalog — used by the permission-catalog sync CI check. */
export const CATALOG_MODULES = [...new Set(CATALOG.map((p) => p.module))].sort();
