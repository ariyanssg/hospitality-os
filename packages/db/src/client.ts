import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres, { type Sql } from 'postgres';
import * as schema from './schema';

export type Schema = typeof schema;
export type Database = PostgresJsDatabase<Schema>;
/** A transaction handle — the only thing repositories ever receive (tenancy is bound to the txn). */
export type DbTransaction = Parameters<Parameters<Database['transaction']>[0]>[0];

export interface DbClient {
  db: Database;
  sql: Sql;
  close: () => Promise<void>;
}

/**
 * Creates a Drizzle client over postgres-js.
 *
 * `prepare: false` keeps us compatible with PgBouncer transaction-pooling, which is the mode that
 * makes transaction-scoped `SET LOCAL` tenancy safe (doc 05 §2, doc 07 §6).
 */
export function createDbClient(
  url = process.env.DATABASE_URL,
  opts: { max?: number } = {},
): DbClient {
  if (!url) throw new Error('DATABASE_URL is not set');
  const sql = postgres(url, { max: opts.max ?? 10, prepare: false });
  const db = drizzle(sql, { schema });
  return { db, sql, close: () => sql.end({ timeout: 5 }) };
}
