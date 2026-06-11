import { defineConfig } from 'drizzle-kit';

/**
 * drizzle-kit is used to *introspect/diff* the typed schema during development.
 * The canonical, hand-reviewed migrations live in ./migrations and carry the
 * invariants drizzle-kit can't express (range partitioning, immutability triggers,
 * the balanced-ledger trigger, RLS FORCE policies) — see doc 07 §1 "generated +
 * hand-reviewed SQL" and src/migrate.ts.
 */
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: './migrations/_generated',
  dbCredentials: {
    url: process.env.DATABASE_ADMIN_URL ?? 'postgres://vela_admin:vela_admin@localhost:5432/vela',
  },
  verbose: true,
  strict: true,
});
