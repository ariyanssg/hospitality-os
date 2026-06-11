import { sql } from 'drizzle-orm';
import type { Database, DbTransaction } from './client';

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export interface TenantSqlContext {
  tenantId: string;
  /** Properties this request is scoped to; empty = tenant-wide read across permitted properties. */
  propertyIds: string[];
}

function assertUuids(values: string[]): void {
  for (const v of values) {
    if (!UUID_RE.test(v)) throw new Error(`Invalid UUID in tenant context: ${v}`);
  }
}

/**
 * Opens a transaction with transaction-scoped tenancy GUCs, then runs `fn` with the bound tx.
 * Every query inside is automatically tenant+property filtered by RLS. `set_config(..., true)` is
 * the parameter-bindable equivalent of `SET LOCAL` (no SQL injection, PgBouncer-safe).
 *
 * This is the ONLY sanctioned way to touch tenant tables from the request path — handlers cannot
 * specify a different tenant (doc 05 §5).
 */
export async function withTenantTransaction<T>(
  db: Database,
  ctx: TenantSqlContext,
  fn: (tx: DbTransaction) => Promise<T>,
): Promise<T> {
  assertUuids([ctx.tenantId, ...ctx.propertyIds]);
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.tenant_id', ${ctx.tenantId}, true)`);
    await tx.execute(
      sql`select set_config('app.property_ids', ${ctx.propertyIds.join(',')}, true)`,
    );
    return fn(tx);
  });
}

/**
 * Reads the current tenancy GUCs — used by tests/assertions to prove a context is active.
 */
export async function currentTenantContext(
  tx: DbTransaction,
): Promise<{ tenantId: string | null; propertyIds: string | null }> {
  const rows = await tx.execute<{ tenant_id: string | null; property_ids: string | null }>(
    sql`select current_setting('app.tenant_id', true) as tenant_id, current_setting('app.property_ids', true) as property_ids`,
  );
  const row = rows[0] as { tenant_id: string | null; property_ids: string | null } | undefined;
  return { tenantId: row?.tenant_id ?? null, propertyIds: row?.property_ids ?? null };
}
