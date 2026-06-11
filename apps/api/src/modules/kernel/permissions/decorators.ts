import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'vela:required_permissions';
export const PUBLIC_KEY = 'vela:public';
export const AUTHENTICATED_ONLY_KEY = 'vela:authenticated_only';

/**
 * Declares the permission(s) a route requires. The global PermissionGuard checks them against the
 * caller's decision set. Every mutating route MUST carry this (or @Public/@AuthenticatedOnly) — a
 * route with none fails the permission-guard coverage CI check (doc 06 §6, IMPLEMENTATION §3).
 */
export const RequirePermission = (...permissions: string[]) =>
  SetMetadata(PERMISSION_KEY, permissions);

/** No auth, no tenancy — health checks, the Better Auth handler, public availability. */
export const Public = () => SetMetadata(PUBLIC_KEY, true);

/** Requires a valid session but no specific permission (e.g. GET /me). */
export const AuthenticatedOnly = () => SetMetadata(AUTHENTICATED_ONLY_KEY, true);
