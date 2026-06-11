import { Injectable } from '@nestjs/common';
import { uuidv7 } from '@vela/db';
import { AuthService } from '../auth/auth.service';
import { PermissionService } from '../permissions/permission.service';
import type { RequestContext } from './request-context';

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
  ) {}

  async build(headers: Headers): Promise<RequestContext | null> {
    const correlationId = header(headers, 'x-correlation-id') ?? uuidv7();
    const token = extractToken(headers);
    const session = await this.auth.resolveSession(token);
    if (!session) return null;

    const tenantId = await this.auth.resolveTenantId(session.userId, session.activeTenantId);
    if (!tenantId) return null;

    const requested = parsePropertyIds(header(headers, 'x-property-id'));
    const propertyIds = await this.auth.resolvePropertyIds(tenantId, requested);
    const { permissions, roleIds } = await this.permissions.buildDecisionSet(
      session.userId,
      tenantId,
      propertyIds,
    );

    return {
      tenantId,
      propertyIds,
      userId: session.userId,
      roleIds,
      permissions,
      correlationId,
    };
  }
}
