/**
 * RLS coverage gate (doc 05 §2, IMPLEMENTATION §3).
 *
 * Independently introspects the live database: EVERY table carrying a `tenant_id` column must have
 * row-level security ENABLED *and* FORCED, plus a `tenant_isolation` policy. This is the check the
 * generator in `packages/db/src/rls.ts` must satisfy — they are deliberately two different code
 * paths so a table added to the schema but forgotten in the policy list fails CI loudly.
 *
 * Runs against DATABASE_ADMIN_URL (needs catalog visibility). Migrate first.
 *
 *     pnpm check:rls
 */
import postgres from 'postgres';
import { TENANT_TABLES } from '../../packages/db/src/rls';

const ADMIN_URL =
  process.env.DATABASE_ADMIN_URL ??
  process.env.DATABASE_URL ??
  'postgres://vela_admin:vela_admin@localhost:5434/vela';

interface Row {
  table_name: string;
  rls_enabled: boolean;
  rls_forced: boolean;
  has_tenant_isolation: boolean;
  has_property_scope: boolean;
}

async function main(): Promise<void> {
  const sql = postgres(ADMIN_URL, { max: 1, prepare: false, onnotice: () => {} });
  const failures: string[] = [];
  try {
    // Every base table in `public` that has a tenant_id column.
    const tenantTables = await sql<{ table_name: string }[]>`
      SELECT c.relname AS table_name
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_attribute a ON a.attrelid = c.oid
      WHERE n.nspname = 'public'
        AND c.relkind = 'r'
        AND a.attname = 'tenant_id'
        AND a.attnum > 0
        AND NOT a.attisdropped
      ORDER BY c.relname`;

    if (tenantTables.length === 0) {
      throw new Error('No tenant tables found — did you run `pnpm db:migrate` against this database?');
    }

    const status = await sql<Row[]>`
      SELECT c.relname AS table_name,
             c.relrowsecurity AS rls_enabled,
             c.relforcerowsecurity AS rls_forced,
             bool_or(p.polname = 'tenant_isolation') AS has_tenant_isolation,
             bool_or(p.polname = 'property_scope') AS has_property_scope
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      LEFT JOIN pg_policy p ON p.polrelid = c.oid
      WHERE n.nspname = 'public' AND c.relkind = 'r'
      GROUP BY c.relname, c.relrowsecurity, c.relforcerowsecurity`;

    const byName = new Map(status.map((r) => [r.table_name, r]));
    const declared = new Set(TENANT_TABLES.map((t) => t.name));

    for (const { table_name } of tenantTables) {
      const r = byName.get(table_name);
      if (!r) {
        failures.push(`${table_name}: no catalog row (unexpected)`);
        continue;
      }
      if (!r.rls_enabled) failures.push(`${table_name}: RLS not ENABLED`);
      if (!r.rls_forced) failures.push(`${table_name}: RLS not FORCED (owner/superuser would bypass)`);
      if (!r.has_tenant_isolation) failures.push(`${table_name}: missing 'tenant_isolation' policy`);
      if (!declared.has(table_name)) {
        failures.push(`${table_name}: has tenant_id but is absent from TENANT_TABLES in packages/db/src/rls.ts`);
      }
    }

    // Reverse direction: a declared table that doesn't exist (typo / dropped) is also a failure.
    for (const t of TENANT_TABLES) {
      if (!byName.has(t.name)) failures.push(`${t.name}: declared in TENANT_TABLES but not present in the database`);
      if (t.property) {
        const r = byName.get(t.name);
        if (r && !r.has_property_scope) failures.push(`${t.name}: declared property-scoped but missing 'property_scope' policy`);
      }
    }

    const checked = tenantTables.length;
    if (failures.length > 0) {
      console.error(`✖ RLS coverage FAILED — ${failures.length} issue(s) across ${checked} tenant tables:`);
      for (const f of failures) console.error(`  · ${f}`);
      process.exit(1);
    }
    console.warn(`✓ RLS coverage OK — ${checked} tenant tables all ENABLE+FORCE with tenant_isolation policies.`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error('check-rls failed:', err);
  process.exit(1);
});
