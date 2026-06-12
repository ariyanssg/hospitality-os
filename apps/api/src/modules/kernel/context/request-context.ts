import { AsyncLocalStorage } from 'node:async_hooks';
import type { PermissionSet } from '@vela/permissions';

/**
 * The single source of tenancy for the whole request (doc 05 §5). Constructed once in middleware,
 * frozen, and carried via AsyncLocalStorage — no parameter drilling, no chance of forgetting scope.
 */
export interface RequestContext {
  tenantId: string;
  propertyIds: string[];
  userId: string;
  roleIds: string[];
  permissions: PermissionSet;
  correlationId: string;
  /** True when the user holds a platform (superadmin) role assignment. */
  isPlatformAdmin: boolean;
  /** Concrete `platform.*` keys — separate from the tenant decision set for /me and the admin UI. */
  platformPermissions: readonly string[];
}

/**
 * A request context that may lack a tenant: platform admins signed in without an active hotel
 * (`sessions.active_tenant_id` is null) get platform routes only. Tenant code never sees this shape —
 * `getRequestContext()` throws on a null tenant, so every tenant path stays fail-closed.
 */
export type AnyRequestContext = Omit<RequestContext, 'tenantId'> & { tenantId: string | null };

/**
 * A per-request mutable holder. The store is a holder object — NOT the context directly — so the
 * Fastify `onRequest` hook can bind it SYNCHRONOUSLY (before any `await`) and then populate it after
 * the async identity lookup. Binding before the first await is what makes `enterWith` actually
 * propagate to the route handler under Fastify (a bare post-await `enterWith` is silently lost).
 */
interface ContextHolder {
  current?: AnyRequestContext;
}

const storage = new AsyncLocalStorage<ContextHolder>();

/** Bind an empty holder to the current async context. Call this FIRST in the request hook. */
export function beginContextScope(): void {
  storage.enterWith({});
}

/** Populate the active holder once identity/tenancy is resolved. */
export function setRequestContext(ctx: AnyRequestContext): void {
  const holder = storage.getStore();
  if (holder) holder.current = ctx;
}

/** Run `fn` with a fully-formed context (used by tests and the relay worker). */
export function runWithContext<T>(ctx: AnyRequestContext, fn: () => T): T {
  return storage.run({ current: ctx }, fn);
}

/** Compatibility shim: bind a holder already carrying the context. */
export function enterContext(ctx: AnyRequestContext): void {
  storage.enterWith({ current: ctx });
}

/**
 * The tenant-scoped context. Throws when the request has no context OR no active tenant (a
 * platform-only superadmin session) — tenant code fails closed either way.
 */
export function getRequestContext(): RequestContext {
  const ctx = storage.getStore()?.current;
  if (!ctx) {
    throw new Error('No request context established — tenancy is not active (fail closed).');
  }
  if (ctx.tenantId === null) {
    throw new Error('No active tenant on this session — tenancy is not active (fail closed).');
  }
  return ctx as RequestContext;
}

/** The context regardless of tenancy — for platform routes, /me, and the guard. */
export function getAnyRequestContext(): AnyRequestContext {
  const ctx = storage.getStore()?.current;
  if (!ctx) {
    throw new Error('No request context established (fail closed).');
  }
  return ctx;
}

export function maybeRequestContext(): AnyRequestContext | undefined {
  return storage.getStore()?.current;
}
