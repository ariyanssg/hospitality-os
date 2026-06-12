import type { PermissionDef, RiskTier } from './catalog';

/**
 * The PLATFORM permission catalog — superadmin/global keys (hotel provisioning, cross-tenant user
 * management, context switching). This is a SEPARATE universe from the tenant CATALOG on purpose:
 * tenant wildcards (`'*'` on the Owner/GM role) expand over ALL_PERMISSION_KEYS only, so they can
 * never grant platform power. Platform wildcards expand over PLATFORM_PERMISSION_KEYS only.
 */

const def = (key: string, description: string, risk: RiskTier = 'standard') =>
  ({ key, module: 'platform', risk, description }) as const;

export const PLATFORM_CATALOG = [
  def('platform.hotel.view', 'View hotels (tenants) across the platform'),
  def('platform.hotel.create', 'Provision a new hotel (tenant + default property)', 'critical'),
  def('platform.hotel.update', 'Edit hotel details', 'elevated'),
  def('platform.hotel.suspend', 'Suspend or reactivate a hotel', 'critical'),
  def('platform.hotel.switch', 'Switch context into any hotel with full access', 'elevated'),
  def('platform.user.view', 'View users across all hotels'),
  def('platform.user.create', 'Create users in any hotel', 'elevated'),
  def('platform.user.update', 'Edit users in any hotel', 'elevated'),
  def('platform.user.password.reset', 'Reset any user password', 'critical'),
  def('platform.superadmin.view', 'View platform administrators', 'elevated'),
  def('platform.superadmin.manage', 'Create/modify/remove platform administrators', 'critical'),
  def('platform.role.manage', 'Manage platform roles and their permissions', 'critical'),
  def('platform.audit.view', 'View the platform audit log', 'elevated'),
] as const satisfies readonly PermissionDef[];

export const PLATFORM_PERMISSION_KEYS: readonly string[] = PLATFORM_CATALOG.map((p) => p.key);

const BY_KEY = new Map<string, PermissionDef>(PLATFORM_CATALOG.map((p) => [p.key, p]));
export function getPlatformPermission(key: string): PermissionDef | undefined {
  return BY_KEY.get(key);
}
