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
}

/**
 * A per-request mutable holder. The store is a holder object — NOT the context directly — so the
 * Fastify `onRequest` hook can bind it SYNCHRONOUSLY (before any `await`) and then populate it after
 * the async identity lookup. Binding before the first await is what makes `enterWith` actually
 * propagate to the route handler under Fastify (a bare post-await `enterWith` is silently lost).
 */
interface ContextHolder {
  current?: RequestContext;
}

const storage = new AsyncLocalStorage<ContextHolder>();

/** Bind an empty holder to the current async context. Call this FIRST in the request hook. */
export function beginContextScope(): void {
  storage.enterWith({});
}

/** Populate the active holder once identity/tenancy is resolved. */
export function setRequestContext(ctx: RequestContext): void {
  const holder = storage.getStore();
  if (holder) holder.current = ctx;
}

/** Run `fn` with a fully-formed context (used by tests and the relay worker). */
export function runWithContext<T>(ctx: RequestContext, fn: () => T): T {
  return storage.run({ current: ctx }, fn);
}

/** Compatibility shim: bind a holder already carrying the context. */
export function enterContext(ctx: RequestContext): void {
  storage.enterWith({ current: ctx });
}

export function getRequestContext(): RequestContext {
  const ctx = storage.getStore()?.current;
  if (!ctx) {
    throw new Error('No request context established — tenancy is not active (fail closed).');
  }
  return ctx;
}

export function maybeRequestContext(): RequestContext | undefined {
  return storage.getStore()?.current;
}
