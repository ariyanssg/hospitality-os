import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { tenants, uuidv7 } from '@vela/db';
import { ALL_PERMISSION_KEYS, PermissionSet } from '@vela/permissions';
import { AuthService } from '../auth/auth.service';
import { DbService } from '../db/db.service';
import { PermissionService } from '../permissions/permission.service';
import { PlatformPermissionService } from '../permissions/platform-permission.service';
import type { AnyRequestContext } from './request-context';

type Headers = Record<string, string | string[] | undefined>;

function header(headers: Headers, name: string): string | undefined {
  const v = headers[name];
  return Array.isArray(v) ? v[0] : v;
}

function extractToken(headers: Headers): string | undefined {
  const auth = header(headers, 'authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7).trim();
  const cookie = header(headers, 'cookie');
  if (cookie) {
    for (const part of cookie.split(';')) {
      const [k, ...rest] = part.trim().split('=');
      if (k === 'vela_session' || k === 'better-auth.session_token') {
        return decodeURIComponent(rest.join('=')).split('.')[0];
      }
    }
  }
  return undefined;
}

function parsePropertyIds(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Builds the immutable RequestContext from request headers. Returns null for anonymous requests
 * (the guard decides whether that is allowed for the route).
 */
@Injectable()
export class ContextService {
  constructor(
    private readonly auth: AuthService,
    private readonly permissions: PermissionService,
    private readonly platformPermissions: PlatformPermissionService,
    private readonly db: DbService,
  ) {}

  async build(headers: Headers): Promise<AnyRequestContext | null> {
    const correlationId = header(headers, 'x-correlation-id') ?? uuidv7();
    const token = extractToken(headers);
    const session = await this.auth.resolveSession(token);
    if (!session) return null;

    const platform = await this.platformPermissions.buildPlatformDecisionSet(session.userId);
    const canSwitch = platform.keys.includes('platform.hotel.switch');

    const tenantId = await this.auth.resolveTenantId(session.userId, session.activeTenantId);
    if (!tenantId) {
      // Platform admins can operate with no active hotel (platform routes only).
      if (!platform.isPlatformAdmin) return null;
      return {
        tenantId: null,
        propertyIds: [],
        userId: session.userId,
        roleIds: [],
        permissions: new PermissionSet(platform.keys),
        correlationId,
        isPlatformAdmin: true,
        platformPermissions: platform.keys,
      };
    }

    // Suspended hotels lock their users out; switch-capable platform admins can still get in.
    const [tenant] = await this.db.admin
      .select({ status: tenants.status })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);
    if (!tenant) return null;
    if (tenant.status !== 'active' && !canSwitch) return null;

    const requested = parsePropertyIds(header(headers, 'x-property-id'));
    const propertyIds = await this.auth.resolvePropertyIds(tenantId, requested);

    if (canSwitch) {
      // A switched-in platform admin gets the full tenant set (user-confirmed "god mode") plus
      // their platform keys — both universes, still subject to audit on every mutation.
      return {
        tenantId,
        propertyIds,
        userId: session.userId,
        roleIds: [],
        permissions: new PermissionSet([...ALL_PERMISSION_KEYS, ...platform.keys]),
        correlationId,
        isPlatformAdmin: true,
        platformPermissions: platform.keys,
      };
    }

    const { permissions, roleIds } = await this.permissions.buildDecisionSet(
      session.userId,
      tenantId,
      propertyIds,
    );

    const merged = platform.isPlatformAdmin
      ? new PermissionSet([...permissions.toArray(), ...platform.keys])
      : permissions;

    return {
      tenantId,
      propertyIds,
      userId: session.userId,
      roleIds,
      permissions: merged,
      correlationId,
      isPlatformAdmin: platform.isPlatformAdmin,
      platformPermissions: platform.keys,
    };
  }
}
