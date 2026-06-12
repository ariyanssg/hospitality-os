import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, inArray } from 'drizzle-orm';
import {
  platformRoleAssignments,
  platformRolePermissions,
  platformRoles,
  properties,
  roleAssignments,
  roles,
  tenantMemberships,
  tenants,
  users,
  uuidv7,
  type DbTransaction,
} from '@vela/db';
import type {
  CreateHotelInput,
  CreateHotelUserInput,
  CreateSuperadminInput,
  Hotel,
  HotelDetail,
  HotelUser,
  PlatformDeleteResult,
  PlatformRole,
  Superadmin,
  UpdateHotelInput,
  UpdatePlatformUserInput,
  UpdateSuperadminInput,
} from '@vela/contracts';
import { PLATFORM_PERMISSION_KEYS, expandWildcards, getPlatformRole } from '@vela/permissions';
import {
  DomainError,
  NotFoundError,
  PasswordAuthService,
  PlatformUnitOfWork,
  getAnyRequestContext,
  type PlatformUowHelpers,
} from '../kernel';
import { ProvisioningService } from './provisioning.service';

/**
 * Cross-tenant superadmin operations. Every method runs on the admin connection through
 * PlatformUnitOfWork (RLS does not apply) — double-gated by the route guard's `platform.*`
 * permission and the UoW's own isPlatformAdmin assertion.
 */
@Injectable()
export class PlatformService {
  constructor(
    private readonly puow: PlatformUnitOfWork,
    private readonly provisioning: ProvisioningService,
    private readonly passwordAuth: PasswordAuthService,
  ) {}

  /* ─────────────────────────── Hotels ─────────────────────────── */

  async listHotels(): Promise<Hotel[]> {
    return this.puow.read(async (tx) => {
      const rows = await tx
        .select({
          id: tenants.id,
          name: tenants.name,
          slug: tenants.slug,
          status: tenants.status,
          createdAt: tenants.createdAt,
        })
        .from(tenants)
        .orderBy(desc(tenants.createdAt));

      const [propCounts, userCounts] = await Promise.all([
        tx
          .select({ tenantId: properties.tenantId, n: count() })
          .from(properties)
          .groupBy(properties.tenantId),
        tx
          .select({ tenantId: tenantMemberships.tenantId, n: count() })
          .from(tenantMemberships)
          .groupBy(tenantMemberships.tenantId),
      ]);
      const propsByTenant = new Map(propCounts.map((r) => [r.tenantId, Number(r.n)]));
      const usersByTenant = new Map(userCounts.map((r) => [r.tenantId, Number(r.n)]));

      return rows.map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        status: t.status as Hotel['status'],
        propertyCount: propsByTenant.get(t.id) ?? 0,
        userCount: usersByTenant.get(t.id) ?? 0,
        createdAt: t.createdAt.toISOString(),
      }));
    });
  }

  async getHotel(tenantId: string): Promise<HotelDetail> {
    return this.puow.read(async (tx) => this.loadHotelDetail(tx, tenantId));
  }

  async createHotel(input: CreateHotelInput): Promise<HotelDetail> {
    return this.puow.run(async (tx, helpers) => {
      const { tenantId, propertyId, adminUserId } = await this.provisioning.createHotel(tx, input);
      helpers.audit({
        action: 'platform.hotel.create',
        entityType: 'tenant',
        entityId: tenantId,
        after: { name: input.name, slug: input.slug, propertyId, adminUserId },
        targetTenantId: tenantId,
      });
      helpers.emit({
        type: 'hotel.created',
        aggregateType: 'tenant',
        aggregateId: tenantId,
        tenantId,
        propertyId,
        data: { name: input.name, slug: input.slug },
      });
      return this.loadHotelDetail(tx, tenantId);
    });
  }

  async updateHotel(tenantId: string, input: UpdateHotelInput): Promise<HotelDetail> {
    return this.puow.run(async (tx, helpers) => {
      const [before] = await tx
        .select({ name: tenants.name, slug: tenants.slug })
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1);
      if (!before) throw new NotFoundError('Hotel');

      if (input.slug && input.slug !== before.slug) {
        const [taken] = await tx
          .select({ id: tenants.id })
          .from(tenants)
          .where(eq(tenants.slug, input.slug))
          .limit(1);
        if (taken) throw new DomainError(409, 'SLUG_TAKEN', 'A hotel with that slug already exists');
      }

      await tx
        .update(tenants)
        .set({
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.slug !== undefined ? { slug: input.slug } : {}),
          updatedAt: new Date(),
        })
        .where(eq(tenants.id, tenantId));

      helpers.audit({
        action: 'platform.hotel.update',
        entityType: 'tenant',
        entityId: tenantId,
        before,
        after: input,
        targetTenantId: tenantId,
      });
      helpers.emit({
        type: 'hotel.updated',
        aggregateType: 'tenant',
        aggregateId: tenantId,
        tenantId,
        data: input,
      });
      return this.loadHotelDetail(tx, tenantId);
    });
  }

  /** Soft delete: hotels are suspended, never hard-deleted (their ledger must survive). */
  async setHotelStatus(tenantId: string, status: 'active' | 'suspended'): Promise<HotelDetail> {
    return this.puow.run(async (tx, helpers) => {
      const [before] = await tx
        .select({ status: tenants.status })
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1);
      if (!before) throw new NotFoundError('Hotel');

      await tx.update(tenants).set({ status, updatedAt: new Date() }).where(eq(tenants.id, tenantId));

      helpers.audit({
        action: status === 'active' ? 'platform.hotel.reactivate' : 'platform.hotel.suspend',
        entityType: 'tenant',
        entityId: tenantId,
        before,
        after: { status },
        targetTenantId: tenantId,
      });
      helpers.emit({
        type: status === 'active' ? 'hotel.reactivated' : 'hotel.suspended',
        aggregateType: 'tenant',
        aggregateId: tenantId,
        tenantId,
        data: { status },
      });
      return this.loadHotelDetail(tx, tenantId);
    });
  }

  /* ─────────────────────────── Hotel users ─────────────────────────── */

  async listHotelUsers(tenantId: string): Promise<HotelUser[]> {
    return this.puow.read(async (tx) => this.loadHotelUsers(tx, tenantId));
  }

  async createHotelUser(tenantId: string, input: CreateHotelUserInput): Promise<HotelUser> {
    return this.puow.run(async (tx, helpers) => {
      const [tenant] = await tx
        .select({ id: tenants.id })
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1);
      if (!tenant) throw new NotFoundError('Hotel');

      const { userId } = await this.provisioning.createHotelUser(tx, {
        tenantId,
        name: input.name,
        email: input.email,
        password: input.password,
        roleKey: input.roleKey,
        propertyId: input.propertyId,
      });

      helpers.audit({
        action: 'platform.user.create',
        entityType: 'user',
        entityId: userId,
        after: { email: input.email, roleKey: input.roleKey },
        targetTenantId: tenantId,
      });
      helpers.emit({
        type: 'hotel.user_created',
        aggregateType: 'user',
        aggregateId: userId,
        tenantId,
        data: { email: input.email, roleKey: input.roleKey },
      });

      const all = await this.loadHotelUsers(tx, tenantId);
      const created = all.find((u) => u.userId === userId);
      if (!created) throw new NotFoundError('User');
      return created;
    });
  }

  async updateUser(userId: string, input: UpdatePlatformUserInput): Promise<{ userId: string }> {
    return this.puow.run(async (tx, helpers) => {
      const [before] = await tx
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      if (!before) throw new NotFoundError('User');

      if (input.name !== undefined) {
        await tx
          .update(users)
          .set({ name: input.name, updatedAt: new Date() })
          .where(eq(users.id, userId));
      }
      if (input.membershipStatus !== undefined) {
        if (!input.tenantId) {
          throw new DomainError(422, 'TENANT_REQUIRED', 'tenantId is required to change membership status');
        }
        await tx
          .update(tenantMemberships)
          .set({ status: input.membershipStatus, updatedAt: new Date() })
          .where(
            and(
              eq(tenantMemberships.userId, userId),
              eq(tenantMemberships.tenantId, input.tenantId),
            ),
          );
      }

      helpers.audit({
        action: 'platform.user.update',
        entityType: 'user',
        entityId: userId,
        before,
        after: input,
        targetTenantId: input.tenantId ?? null,
      });
      if (input.tenantId) {
        helpers.emit({
          type: 'hotel.user_updated',
          aggregateType: 'user',
          aggregateId: userId,
          tenantId: input.tenantId,
          data: { membershipStatus: input.membershipStatus },
        });
      }
      return { userId };
    });
  }

  async resetPassword(userId: string, password: string): Promise<{ userId: string }> {
    return this.puow.run(async (tx, helpers) => {
      const [user] = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      if (!user) throw new NotFoundError('User');

      helpers.audit({
        action: 'platform.user.password.reset',
        entityType: 'user',
        entityId: userId,
      });
      return { userId };
    }).then(async (r) => {
      // The hash swap + session revocation runs on the same admin connection but outside the audit
      // transaction — adminSetPassword manages its own statements and is idempotent on retry.
      await this.passwordAuth.adminSetPassword(userId, password);
      return r;
    });
  }

  /* ─────────────────────────── Superadmins ─────────────────────────── */

  async listPlatformRoles(): Promise<PlatformRole[]> {
    return this.puow.read(async (tx) => {
      const roleRows = await tx.select().from(platformRoles).orderBy(platformRoles.key);
      const perms = await tx.select().from(platformRolePermissions);
      const byRole = new Map<string, string[]>();
      for (const p of perms) {
        const list = byRole.get(p.roleId) ?? [];
        list.push(p.permissionKey);
        byRole.set(p.roleId, list);
      }
      return roleRows.map((r) => ({
        id: r.id,
        key: r.key,
        name: r.name,
        description: r.description,
        permissions: (byRole.get(r.id) ?? []).sort(),
      }));
    });
  }

  async listSuperadmins(): Promise<Superadmin[]> {
    return this.puow.read(async (tx) => {
      const assigns = await tx
        .select({
          userId: platformRoleAssignments.userId,
          createdAt: platformRoleAssignments.createdAt,
          roleKey: platformRoles.key,
          roleName: platformRoles.name,
          isDeny: platformRoleAssignments.isDeny,
        })
        .from(platformRoleAssignments)
        .innerJoin(platformRoles, eq(platformRoles.id, platformRoleAssignments.roleId));

      const userIds = [...new Set(assigns.filter((a) => !a.isDeny).map((a) => a.userId))];
      if (userIds.length === 0) return [];
      const userRows = await tx
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(inArray(users.id, userIds));
      const byId = new Map(userRows.map((u) => [u.id, u]));

      const result = new Map<string, Superadmin>();
      for (const a of assigns) {
        if (a.isDeny) continue;
        const u = byId.get(a.userId);
        if (!u) continue;
        const existing = result.get(a.userId);
        if (existing) {
          existing.roles.push({ key: a.roleKey, name: a.roleName });
        } else {
          result.set(a.userId, {
            userId: a.userId,
            name: u.name,
            email: u.email,
            roles: [{ key: a.roleKey, name: a.roleName }],
            createdAt: a.createdAt.toISOString(),
          });
        }
      }
      return [...result.values()];
    });
  }

  async createSuperadmin(input: CreateSuperadminInput): Promise<Superadmin> {
    return this.puow.run(async (tx, helpers) => {
      const roleIds = await this.resolvePlatformRoleIds(tx, input.roleKeys);

      let userId: string;
      const [existing] = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);
      if (existing) {
        userId = existing.id;
      } else {
        userId = uuidv7();
        await tx
          .insert(users)
          .values({ id: userId, name: input.name, email: input.email, emailVerified: true });
      }

      for (const roleId of roleIds) {
        await tx
          .insert(platformRoleAssignments)
          .values({ id: uuidv7(), userId, roleId })
          .onConflictDoNothing();
      }

      helpers.audit({
        action: 'platform.superadmin.create',
        entityType: 'user',
        entityId: userId,
        after: { email: input.email, roleKeys: input.roleKeys },
      });
      return {
        userId,
        name: input.name,
        email: input.email,
        roles: input.roleKeys.map((key) => ({ key, name: getPlatformRole(key)?.name ?? key })),
        createdAt: new Date().toISOString(),
      };
    }).then(async (r) => {
      // Credential creation reuses the admin password path (hash + upsert outside the audit tx).
      await this.passwordAuth.adminSetPassword(r.userId, input.password);
      return r;
    });
  }

  async updateSuperadmin(userId: string, input: UpdateSuperadminInput): Promise<Superadmin> {
    return this.puow.run(async (tx, helpers) => {
      await this.guardLastSuperadmin(tx, userId, input.roleKeys);
      const roleIds = await this.resolvePlatformRoleIds(tx, input.roleKeys);

      await tx
        .delete(platformRoleAssignments)
        .where(eq(platformRoleAssignments.userId, userId));
      for (const roleId of roleIds) {
        await tx.insert(platformRoleAssignments).values({ id: uuidv7(), userId, roleId });
      }

      helpers.audit({
        action: 'platform.superadmin.update',
        entityType: 'user',
        entityId: userId,
        after: { roleKeys: input.roleKeys },
      });

      const [u] = await tx
        .select({ name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      if (!u) throw new NotFoundError('User');
      return {
        userId,
        name: u.name,
        email: u.email,
        roles: input.roleKeys.map((key) => ({ key, name: getPlatformRole(key)?.name ?? key })),
        createdAt: new Date().toISOString(),
      };
    });
  }

  async removeSuperadmin(userId: string): Promise<PlatformDeleteResult> {
    return this.puow.run(async (tx, helpers) => {
      await this.guardLastSuperadmin(tx, userId, []);
      await tx.delete(platformRoleAssignments).where(eq(platformRoleAssignments.userId, userId));
      helpers.audit({
        action: 'platform.superadmin.remove',
        entityType: 'user',
        entityId: userId,
      });
      return { id: userId, removed: true };
    });
  }

  /* ─────────────────────────── Context switching ─────────────────────────── */

  async switchContext(token: string, tenantId: string | null): Promise<{ tenantId: string | null }> {
    if (tenantId) {
      const exists = await this.puow.read(async (tx) => {
        const [t] = await tx
          .select({ id: tenants.id })
          .from(tenants)
          .where(eq(tenants.id, tenantId))
          .limit(1);
        return !!t;
      });
      if (!exists) throw new NotFoundError('Hotel');
    }
    await this.passwordAuth.setActiveTenant(token, tenantId);
    await this.puow.run(async (_tx, helpers: PlatformUowHelpers) => {
      helpers.audit({
        action: 'platform.hotel.switch',
        entityType: 'session',
        entityId: getAnyRequestContext().userId,
        after: { tenantId },
        targetTenantId: tenantId,
      });
      return undefined;
    });
    return { tenantId };
  }

  /* ─────────────────────────── helpers ─────────────────────────── */

  private async resolvePlatformRoleIds(tx: DbTransaction, roleKeys: string[]): Promise<string[]> {
    const rows = await tx
      .select({ id: platformRoles.id, key: platformRoles.key })
      .from(platformRoles)
      .where(inArray(platformRoles.key, roleKeys));
    const found = new Set(rows.map((r) => r.key));
    const missing = roleKeys.filter((k) => !found.has(k));
    if (missing.length > 0) {
      // Sync from the TS templates: platform roles are catalog-defined, DB rows are projections.
      for (const key of missing) {
        const tmpl = getPlatformRole(key);
        if (!tmpl) throw new NotFoundError('Platform role');
        const roleId = uuidv7();
        await tx
          .insert(platformRoles)
          .values({ id: roleId, key: tmpl.key, name: tmpl.name, description: tmpl.description, isSystem: true })
          .onConflictDoNothing();
        const [row] = await tx
          .select({ id: platformRoles.id })
          .from(platformRoles)
          .where(eq(platformRoles.key, key))
          .limit(1);
        const id = row?.id ?? roleId;
        const keys = expandWildcards(tmpl.permissions, PLATFORM_PERMISSION_KEYS);
        for (const permissionKey of keys) {
          await tx
            .insert(platformRolePermissions)
            .values({ roleId: id, permissionKey })
            .onConflictDoNothing();
        }
        rows.push({ id, key });
      }
    }
    return rows.map((r) => r.id);
  }

  /** A superadmin cannot strip the platform's last superadmin (including themselves). */
  private async guardLastSuperadmin(
    tx: DbTransaction,
    userId: string,
    nextRoleKeys: string[],
  ): Promise<void> {
    if (nextRoleKeys.includes('platform_superadmin')) return;
    const supers = await tx
      .select({ userId: platformRoleAssignments.userId })
      .from(platformRoleAssignments)
      .innerJoin(platformRoles, eq(platformRoles.id, platformRoleAssignments.roleId))
      .where(
        and(eq(platformRoles.key, 'platform_superadmin'), eq(platformRoleAssignments.isDeny, false)),
      );
    const others = new Set(supers.map((s) => s.userId));
    others.delete(userId);
    if (others.size === 0) {
      throw new DomainError(409, 'LAST_SUPERADMIN', 'Cannot remove the last platform superadmin');
    }
  }

  private async loadHotelDetail(tx: DbTransaction, tenantId: string): Promise<HotelDetail> {
    const [t] = await tx
      .select({
        id: tenants.id,
        name: tenants.name,
        slug: tenants.slug,
        status: tenants.status,
        createdAt: tenants.createdAt,
      })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);
    if (!t) throw new NotFoundError('Hotel');

    const props = await tx
      .select({
        id: properties.id,
        name: properties.name,
        code: properties.code,
        currency: properties.currency,
        timezone: properties.timezone,
      })
      .from(properties)
      .where(eq(properties.tenantId, tenantId));

    const hotelUsers = await this.loadHotelUsers(tx, tenantId);

    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      status: t.status as HotelDetail['status'],
      propertyCount: props.length,
      userCount: hotelUsers.length,
      createdAt: t.createdAt.toISOString(),
      properties: props,
      users: hotelUsers,
    };
  }

  private async loadHotelUsers(tx: DbTransaction, tenantId: string): Promise<HotelUser[]> {
    const memberships = await tx
      .select({
        id: tenantMemberships.id,
        userId: tenantMemberships.userId,
        status: tenantMemberships.status,
        createdAt: tenantMemberships.createdAt,
        name: users.name,
        email: users.email,
      })
      .from(tenantMemberships)
      .innerJoin(users, eq(users.id, tenantMemberships.userId))
      .where(eq(tenantMemberships.tenantId, tenantId));
    if (memberships.length === 0) return [];

    const membershipIds = memberships.map((m) => m.id);
    const assigns = await tx
      .select({
        membershipId: roleAssignments.membershipId,
        scope: roleAssignments.scope,
        propertyId: roleAssignments.propertyId,
        key: roles.key,
        name: roles.name,
      })
      .from(roleAssignments)
      .innerJoin(roles, eq(roles.id, roleAssignments.roleId))
      .where(inArray(roleAssignments.membershipId, membershipIds));
    const byMembership = new Map<string, HotelUser['roles']>();
    for (const a of assigns) {
      const list = byMembership.get(a.membershipId) ?? [];
      list.push({ key: a.key, name: a.name, scope: a.scope, propertyId: a.propertyId });
      byMembership.set(a.membershipId, list);
    }

    return memberships.map((m) => ({
      userId: m.userId,
      name: m.name,
      email: m.email,
      membershipStatus: m.status as HotelUser['membershipStatus'],
      roles: byMembership.get(m.id) ?? [],
      createdAt: m.createdAt.toISOString(),
    }));
  }
}
