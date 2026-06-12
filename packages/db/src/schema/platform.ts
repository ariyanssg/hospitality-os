import { boolean, index, jsonb, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { auditColumns, createdAt, pk } from './_shared';
import { users } from './kernel';

/* ─────────────────────────── Platform administration (global — NOT tenant-scoped) ───────────────────────────
 * Superadmin RBAC lives in its own global trio, separate from the tenant `roles` tables: rows in
 * `roles` with a NULL tenant are RLS-visible to every tenant, and tenant `'*'` wildcards must never
 * expand into platform power. No tenant_id column → no RLS, no TENANT_TABLES entry; reachable only
 * via the admin connection (PlatformUnitOfWork).
 */

export const platformRoles = pgTable('platform_roles', {
  id: pk(),
  key: text('key').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  isSystem: boolean('is_system').notNull().default(false),
  ...auditColumns(),
});

export const platformRolePermissions = pgTable(
  'platform_role_permissions',
  {
    roleId: uuid('role_id')
      .notNull()
      .references(() => platformRoles.id, { onDelete: 'cascade' }),
    /** Concrete `platform.*` key from PLATFORM_CATALOG — wildcards expand at role-save time. */
    permissionKey: text('permission_key').notNull(),
  },
  (t) => [uniqueIndex('platform_role_permissions_pk').on(t.roleId, t.permissionKey)],
);

export const platformRoleAssignments = pgTable(
  'platform_role_assignments',
  {
    id: pk(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id')
      .notNull()
      .references(() => platformRoles.id, { onDelete: 'cascade' }),
    isDeny: boolean('is_deny').notNull().default(false),
    ...auditColumns(),
  },
  (t) => [
    uniqueIndex('platform_role_assignments_user_role').on(t.userId, t.roleId),
    index('platform_role_assignments_user').on(t.userId),
  ],
);

/**
 * Global audit trail for platform actions. `targetTenantId` is an attribute of the action (which
 * hotel it concerned), NOT a row-scoping key — deliberately not named tenant_id so check:rls treats
 * this as a global table.
 */
export const platformAuditLog = pgTable(
  'platform_audit_log',
  {
    id: pk(),
    actorId: text('actor_id'),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    before: jsonb('before'),
    after: jsonb('after'),
    reason: text('reason'),
    ip: text('ip'),
    correlationId: text('correlation_id').notNull(),
    targetTenantId: uuid('target_tenant_id'),
    createdAt: createdAt(),
  },
  (t) => [
    index('platform_audit_entity').on(t.entityType, t.entityId),
    index('platform_audit_created').on(t.createdAt),
    index('platform_audit_tenant').on(t.targetTenantId),
  ],
);
