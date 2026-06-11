import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { sql } from 'drizzle-orm';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import postgres, { type Sql } from 'postgres';
import { createDbClient, generateRlsSql, uuidv7, withTenantTransaction, type DbClient } from '../src/index';

/**
 * Integration tests for the database invariants that the whole financial/tenancy model rests on
 * (doc 05 RLS, doc 07 immutability + balanced ledger + availability counter). Runs the real
 * migrations against a throwaway Postgres (Testcontainers) and exercises them as the non-BYPASSRLS
 * app role — the same posture as production. Requires Docker.
 */
const migrationsDir = join(import.meta.dirname, '..', 'migrations');

let container: StartedPostgreSqlContainer;
let admin: Sql; // superuser — seeds across tenants (bypasses RLS)
let appClient: DbClient; // vela_app — NON-superuser, NON-BYPASSRLS (RLS applies)

const TENANT_A = uuidv7();
const TENANT_B = uuidv7();
const PROP_A = uuidv7();
const PROP_B = uuidv7();

async function migrate(adminUrl: string): Promise<void> {
  const s = postgres(adminUrl, { max: 1, prepare: false, onnotice: () => {} });
  try {
    await s.unsafe(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'vela_app') THEN
        CREATE ROLE vela_app LOGIN PASSWORD 'vela_app' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
      END IF; END $$;`);
    for (const file of readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()) {
      await s.unsafe(readFileSync(join(migrationsDir, file), 'utf8'));
    }
    await s.unsafe(generateRlsSql());
    await s.unsafe(`
      GRANT USAGE ON SCHEMA public TO vela_app;
      GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO vela_app;
      GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO vela_app;`);
  } finally {
    await s.end({ timeout: 5 });
  }
}

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine').start();
  const adminUrl = container.getConnectionUri();
  await migrate(adminUrl);
  admin = postgres(adminUrl, { max: 2, prepare: false, onnotice: () => {} });

  const appUrl = `postgres://vela_app:vela_app@${container.getHost()}:${container.getMappedPort(5432)}/${container.getDatabase()}`;
  appClient = createDbClient(appUrl, { max: 2 });

  // Seed two tenants/properties + one room type each (as superuser → bypasses RLS).
  for (const [t, p, code] of [
    [TENANT_A, PROP_A, 'A-KING'],
    [TENANT_B, PROP_B, 'B-KING'],
  ] as const) {
    await admin`INSERT INTO tenants (id, name, slug) VALUES (${t}, ${'T-' + code}, ${'slug-' + code})`;
    await admin`INSERT INTO properties (id, tenant_id, name, code) VALUES (${p}, ${t}, ${'P-' + code}, ${code})`;
    await admin`INSERT INTO room_types (id, tenant_id, property_id, code, name) VALUES (${uuidv7()}, ${t}, ${p}, ${code}, ${code})`;
  }
}, 180_000);

afterAll(async () => {
  await appClient?.close();
  await admin?.end({ timeout: 5 });
  await container?.stop();
});

describe('RLS tenant isolation (doc 05)', () => {
  it('the app role sees ONLY the active tenant — tenant B cannot see tenant A', async () => {
    const a = await withTenantTransaction(appClient.db, { tenantId: TENANT_A, propertyIds: [] }, (tx) =>
      tx.execute<{ code: string }>(sql`SELECT code FROM room_types`),
    );
    expect(a.map((r) => r.code).sort()).toEqual(['A-KING']);

    const b = await withTenantTransaction(appClient.db, { tenantId: TENANT_B, propertyIds: [] }, (tx) =>
      tx.execute<{ code: string }>(sql`SELECT code FROM room_types`),
    );
    expect(b.map((r) => r.code).sort()).toEqual(['B-KING']);
  });

  it('fails closed: with NO tenant context the app role sees zero rows', async () => {
    const rows = await appClient.db.execute<{ code: string }>(sql`SELECT code FROM room_types`);
    expect(rows.length).toBe(0);
  });

  it('cannot INSERT a row for a different tenant than the active context (WITH CHECK)', async () => {
    await expect(
      withTenantTransaction(appClient.db, { tenantId: TENANT_A, propertyIds: [] }, (tx) =>
        tx.execute(
          sql`INSERT INTO room_types (id, tenant_id, property_id, code, name)
              VALUES (${uuidv7()}, ${TENANT_B}, ${PROP_B}, 'SNEAK', 'sneak')`,
        ),
      ),
    ).rejects.toThrow();
  });
});

describe('Balanced-ledger invariant (doc 04 §2 / doc 07)', () => {
  async function postEntry(lines: Array<{ debit: string; credit: string }>): Promise<void> {
    const entryId = uuidv7();
    await admin.begin(async (tx) => {
      await tx`INSERT INTO journal_entries (id, tenant_id, property_id, business_date, source, description)
               VALUES (${entryId}, ${TENANT_A}, ${PROP_A}, CURRENT_DATE, 'manual', 'test')`;
      for (const l of lines) {
        await tx`INSERT INTO journal_lines (id, tenant_id, property_id, journal_entry_id, business_date, account_code, debit, credit)
                 VALUES (${uuidv7()}, ${TENANT_A}, ${PROP_A}, ${entryId}, CURRENT_DATE, '1000', ${l.debit}, ${l.credit})`;
      }
    });
  }

  it('accepts a balanced entry', async () => {
    await expect(postEntry([{ debit: '100.0000', credit: '0' }, { debit: '0', credit: '100.0000' }])).resolves.toBeUndefined();
  });

  it('rejects an unbalanced entry at commit', async () => {
    await expect(postEntry([{ debit: '100.0000', credit: '0' }, { debit: '0', credit: '40.0000' }])).rejects.toThrow();
  });

  it('property: Σdebits = Σcredits always commits; any imbalance always aborts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.integer({ min: 0, max: 1_000_000 }),
        async (debitMinor, creditMinor) => {
          const debit = (debitMinor / 10000).toFixed(4);
          const credit = (creditMinor / 10000).toFixed(4);
          const balanced = debitMinor === creditMinor;
          const run = postEntry([
            { debit, credit: '0' },
            { debit: '0', credit: balanced ? debit : credit },
          ]);
          if (balanced) await expect(run).resolves.toBeUndefined();
          else await expect(run).rejects.toThrow();
        },
      ),
      { numRuns: 20 },
    );
  });
});

describe('Append-only financial rows (doc 07)', () => {
  it('rejects UPDATE on journal_lines (corrections must be reversals)', async () => {
    const entryId = uuidv7();
    await admin.begin(async (tx) => {
      await tx`INSERT INTO journal_entries (id, tenant_id, property_id, business_date, source, description)
               VALUES (${entryId}, ${TENANT_A}, ${PROP_A}, CURRENT_DATE, 'manual', 'imm')`;
      await tx`INSERT INTO journal_lines (id, tenant_id, property_id, journal_entry_id, business_date, account_code, debit, credit)
               VALUES (${uuidv7()}, ${TENANT_A}, ${PROP_A}, ${entryId}, CURRENT_DATE, '1000', '5.0000', '0')`;
      await tx`INSERT INTO journal_lines (id, tenant_id, property_id, journal_entry_id, business_date, account_code, debit, credit)
               VALUES (${uuidv7()}, ${TENANT_A}, ${PROP_A}, ${entryId}, CURRENT_DATE, '4000', '0', '5.0000')`;
    });
    await expect(admin`UPDATE journal_lines SET memo = 'tampered' WHERE journal_entry_id = ${entryId}`).rejects.toThrow(/append-only/i);
  });
});

describe('Availability counter invariant (doc 07 §2)', () => {
  it('rejects overbooking past physical + overbook limit (CHECK)', async () => {
    const rtId = uuidv7();
    await admin`INSERT INTO room_types (id, tenant_id, property_id, code, name) VALUES (${rtId}, ${TENANT_A}, ${PROP_A}, 'AVAIL', 'avail')`;
    // physical 1, overbook 0 → sold may not exceed 1.
    await admin`INSERT INTO availability_days (tenant_id, property_id, room_type_id, stay_date, physical, sold)
                VALUES (${TENANT_A}, ${PROP_A}, ${rtId}, CURRENT_DATE, 1, 1)`;
    await expect(
      admin`UPDATE availability_days SET sold = 2 WHERE tenant_id = ${TENANT_A} AND room_type_id = ${rtId}`,
    ).rejects.toThrow();
  });

  it('property: sold never exceeds sellable units', async () => {
    const rtId = uuidv7();
    await admin`INSERT INTO room_types (id, tenant_id, property_id, code, name) VALUES (${rtId}, ${TENANT_A}, ${PROP_A}, 'AVAIL2', 'avail2')`;
    await admin`INSERT INTO availability_days (tenant_id, property_id, room_type_id, stay_date, physical, overbook_limit, sold)
                VALUES (${TENANT_A}, ${PROP_A}, ${rtId}, CURRENT_DATE, 5, 2, 0)`;
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 0, max: 12 }), async (sold) => {
        const run = admin`UPDATE availability_days SET sold = ${sold} WHERE tenant_id = ${TENANT_A} AND room_type_id = ${rtId}`;
        if (sold <= 7) await expect(run).resolves.toBeDefined();
        else await expect(run).rejects.toThrow();
      }),
      { numRuns: 15 },
    );
  });
});
