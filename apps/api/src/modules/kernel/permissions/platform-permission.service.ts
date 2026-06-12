import { Injectable } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
import { platformRoleAssignments, platformRolePermissions } from '@vela/db';
import { PLATFORM_PERMISSION_KEYS, expandWildcards } from '@vela/permissions';
import { DbService } from '../db/db.service';

export interface PlatformDecision {
  /** Concrete `platform.*` keys after wildcard expansion and deny application. */
  keys: string[];
  isPlatformAdmin: boolean;
}

const NONE: PlatformDecision = { keys: [], isPlatformAdmin: false };

/**
 * Builds the global (cross-tenant) decision set from the platform RBAC trio. These tables are
 * global — no tenant_id, no RLS — so reads go over the admin connection like the other identity
 * tables during context bootstrap. A user "is a platform admin" iff they hold ≥1 non-deny
 * platform role assignment.
 */
@Injectable()
export class PlatformPermissionService {
  constructor(private readonly db: DbService) {}

  async buildPlatformDecisionSet(userId: string): Promise<PlatformDecision> {
    const assigns = await this.db.admin
      .select({
        roleId: platformRoleAssignments.roleId,
        isDeny: platformRoleAssignments.isDeny,
      })
      .from(platformRoleAssignments)
      .where(eq(platformRoleAssignments.userId, userId));

    const grantRoleIds = [...new Set(assigns.filter((a) => !a.isDeny).map((a) => a.roleId))];
    if (grantRoleIds.length === 0) return NONE;
    const denyRoleIds = [...new Set(assigns.filter((a) => a.isDeny).map((a) => a.roleId))];

    const loadKeys = async (roleIds: string[]): Promise<string[]> => {
      if (roleIds.length === 0) return [];
      const rows = await this.db.admin
        .select({ key: platformRolePermissions.permissionKey })
        .from(platformRolePermissions)
        .where(inArray(platformRolePermissions.roleId, roleIds));
      return rows.map((r) => r.key);
    };

    const [grantKeys, denyKeys] = await Promise.all([loadKeys(grantRoleIds), loadKeys(denyRoleIds)]);
    const denied = new Set(expandWildcards(denyKeys, PLATFORM_PERMISSION_KEYS));
    const keys = expandWildcards(grantKeys, PLATFORM_PERMISSION_KEYS).filter((k) => !denied.has(k));

    return { keys, isPlatformAdmin: keys.length > 0 };
  }
}
