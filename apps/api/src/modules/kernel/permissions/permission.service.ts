import { Injectable } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { roleAssignments, rolePermissions, tenantMemberships, withTenantTransaction } from '@vela/db';
import { PermissionSet } from '@vela/permissions';
import { DbService } from '../db/db.service';

interface DecisionSet {
  permissions: PermissionSet;
  roleIds: string[];
}

interface AssignmentRow {
  roleId: string;
  scope: 'tenant' | 'property' | 'department';
  propertyId: string | null;
  isDeny: boolean;
}

/**
 * Builds the flattened permission decision set for {user, tenant} scoped to the active properties
 * (doc 06 §1, §6). Evaluation downstream is an O(1) set lookup. Reads go through RLS via a
 * tenant-scoped transaction; assignments are also filtered by tenant explicitly (defense in depth).
 *
 * TODO(phase-1): cache the decision set in Redis (`perm:{tenant}:{user}`, TTL 15m) with targeted
 * bust on `permission.changed` (doc 06 §6). Phase 0 computes per request.
 */
@Injectable()
export class PermissionService {
  constructor(private readonly db: DbService) {}

  async buildDecisionSet(
    userId: string,
    tenantId: string,
    propertyIds: string[],
  ): Promise<DecisionSet> {
    return withTenantTransaction(this.db.app, { tenantId, propertyIds: [] }, async (tx) => {
      const memberships = await tx
        .select({ id: tenantMemberships.id, status: tenantMemberships.status })
        .from(tenantMemberships)
        .where(and(eq(tenantMemberships.tenantId, tenantId), eq(tenantMemberships.userId, userId)));

      const active = memberships.filter((m) => m.status === 'active');
      if (active.length === 0) {
        return { permissions: new PermissionSet([]), roleIds: [] };
      }

      const membershipIds = active.map((m) => m.id);
      const assigns = (await tx
        .select({
          roleId: roleAssignments.roleId,
          scope: roleAssignments.scope,
          propertyId: roleAssignments.propertyId,
          isDeny: roleAssignments.isDeny,
        })
        .from(roleAssignments)
        .where(inArray(roleAssignments.membershipId, membershipIds))) as AssignmentRow[];

      const covers = (a: AssignmentRow): boolean => {
        if (a.scope === 'tenant') return true;
        if (propertyIds.length === 0) return true; // tenant-wide context unions everything
        if (!a.propertyId) return false;
        return propertyIds.includes(a.propertyId);
      };

      const grantRoleIds = [...new Set(assigns.filter((a) => !a.isDeny && covers(a)).map((a) => a.roleId))];
      const denyRoleIds = [...new Set(assigns.filter((a) => a.isDeny).map((a) => a.roleId))];

      const loadKeys = async (roleIds: string[]): Promise<string[]> => {
        if (roleIds.length === 0) return [];
        const rows = await tx
          .select({ key: rolePermissions.permissionKey })
          .from(rolePermissions)
          .where(inArray(rolePermissions.roleId, roleIds));
        return rows.map((r) => r.key);
      };

      const [grantKeys, denyKeys] = await Promise.all([loadKeys(grantRoleIds), loadKeys(denyRoleIds)]);

      return {
        permissions: PermissionSet.from(grantKeys, denyKeys),
        roleIds: [...new Set(assigns.map((a) => a.roleId))],
      };
    });
  }
}
