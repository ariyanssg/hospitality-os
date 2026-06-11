import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';
import { generateRlsSql } from './rls';

/**
 * Forward-only migration runner (doc 07 §1). Runs as the admin/superuser role.
 * Order: structural SQL files → RLS policies (always re-applied, idempotent, sourced from rls.ts so
 * they can never drift from the table list) → privilege grants for the non-BYPASSRLS app role.
 */
const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, '..', 'migrations');

async function main(): Promise<void> {
  const url =
    process.env.DATABASE_ADMIN_URL ??
    process.env.DATABASE_URL ??
    'postgres://vela_admin:vela_admin@localhost:5432/vela';
  const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });

  try {
    // The application role: NON-superuser, NON-BYPASSRLS (doc 05 §2). Idempotent so migrate works
    // against a bare Postgres (e.g. Testcontainers) as well as the docker-compose stack.
    await sql.unsafe(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'vela_app') THEN
          CREATE ROLE vela_app LOGIN PASSWORD 'vela_app' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
        END IF;
      END $$;
    `);

    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    const files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const already = await sql`SELECT 1 FROM schema_migrations WHERE name = ${file}`;
      if (already.length > 0) {
        console.warn(`· skip ${file} (already applied)`);
        continue;
      }
      const content = readFileSync(join(migrationsDir, file), 'utf8');
      await sql.begin(async (tx) => {
        await tx.unsafe(content);
        await tx`INSERT INTO schema_migrations (name) VALUES (${file})`;
      });
      console.warn(`✓ applied ${file}`);
    }

    // RLS is re-applied every run (idempotent via DROP POLICY IF EXISTS) so the policy set always
    // matches src/rls.ts — the same source tooling/check-rls verifies against.
    await sql.unsafe(generateRlsSql());
    console.warn('✓ applied RLS policies (ENABLE + FORCE) to all tenant tables');

    await sql.unsafe(`
      GRANT USAGE ON SCHEMA public TO vela_app;
      GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO vela_app;
      GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO vela_app;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO vela_app;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO vela_app;
    `);
    console.warn('✓ granted DML to vela_app');
    console.warn('Migration complete.');
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
