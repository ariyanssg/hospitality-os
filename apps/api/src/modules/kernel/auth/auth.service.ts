import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { properties, sessions, tenantMemberships } from '@vela/db';
import { DbService } from '../db/db.service';

export interface ResolvedSession {
  userId: string;
  activeTenantId: string | null;
}

/**
 * Resolves identity + tenancy for a request (doc 04 §6 steps 2–3). Sessions are global (Better Auth
 * populates them); tenant tables are read with explicit tenant filters during context bootstrap.
 */
@Injectable()
export class AuthService {
  constructor(private readonly db: DbService) {}

  async resolveSession(token: string | undefined): Promise<ResolvedSession | null> {
    if (!token) return null;
    const rows = await this.db.admin
      .select({
        userId: sessions.userId,
        activeTenantId: sessions.activeTenantId,
        expiresAt: sessions.expiresAt,
      })
      .from(sessions)
      .where(eq(sessions.token, token))
      .limit(1);
    const s = rows[0];
    if (!s) return null;
    if (new Date(s.expiresAt).getTime() < Date.now()) return null;
    return { userId: s.userId, activeTenantId: s.activeTenantId };
  }

  async resolveTenantId(userId: string, activeTenantId: string | null): Promise<string | null> {
    if (activeTenantId) return activeTenantId;
    const rows = await this.db.admin
      .select({ tenantId: tenantMemberships.tenantId })
      .from(tenantMemberships)
      .where(and(eq(tenantMemberships.userId, userId), eq(tenantMemberships.status, 'active')))
      .limit(1);
    return rows[0]?.tenantId ?? null;
  }

  /** Intersect requested properties (X-Property-Id) with the tenant's properties; [] = tenant-wide. */
  async resolvePropertyIds(tenantId: string, requested: string[]): Promise<string[]> {
    if (requested.length === 0) return [];
    const all = await this.db.admin
      .select({ id: properties.id })
      .from(properties)
      .where(eq(properties.tenantId, tenantId));
    const allowed = new Set(all.map((p) => p.id));
    return requested.filter((id) => allowed.has(id));
  }
}
