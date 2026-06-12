/**
 * Vela Phase-0 demo (Definition of Done, doc 15 / IMPLEMENTATION §"Definition of done").
 *
 * Provisions a tenant + property + room types + rates + chart of accounts from templates
 * (no DDL, sub-second), creates a Front Desk user, boots the API, then drives the PUBLIC API:
 *
 *     book (idempotent)  →  check-in  →  post charge  →  take payment  →  check-out  →  night audit
 *
 * and prints a trial balance that ties to the folio ledger. Exits non-zero if anything fails or the
 * ledger does not balance — this script IS the Phase-0 acceptance gate.
 *
 *     pnpm demo
 */
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes, scrypt as scryptCb } from 'node:crypto';
import { promisify } from 'node:util';
import { createDbClient, uuidv7 } from '@vela/db';
import { expandWildcards, getSystemRole } from '@vela/permissions';
import { createClient, VelaApiError } from '@vela/contracts/sdk';

const scrypt = promisify(scryptCb);
const ROOT = resolve(import.meta.dirname, '..', '..');
const PORT = Number(process.env.DEMO_API_PORT ?? 4099);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const CURRENCY = 'USD';
const NIGHTLY = '200.00';
const ADMIN_URL =
  process.env.DATABASE_ADMIN_URL ?? 'postgres://vela_admin:vela_admin@localhost:5434/vela';

// ── tiny console helpers ───────────────────────────────────────────────────────────────────────
const c = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
};
const log = (msg: string) => console.log(msg);
const step = (n: number, msg: string) => log(`\n${c.cyan(`[${n}]`)} ${c.bold(msg)}`);
function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
  log(`    ${c.green('✓')} ${c.dim(msg)}`);
}

// ── date helpers (real wall clock — this is an ops script, not the business date) ────────────────
const ymd = (d: Date): string => d.toISOString().slice(0, 10);
function addDays(base: Date, n: number): Date {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString('hex')}`;
}

interface Seed {
  tenantId: string;
  propertyId: string;
  roomTypeId: string;
  ratePlanId: string;
  roomId: string;
  userEmail: string;
  token: string;
  arrival: string;
  departure: string;
}

/** Provision everything a tenant needs to transact, directly via the admin connection (bypasses RLS). */
async function seed(): Promise<Seed> {
  const { sql, close } = createDbClient(ADMIN_URL, { max: 1 });
  try {
    // Clean slate so the trial balance is deterministic across re-runs (dev DB only).
    const tables = await sql<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public' AND tablename <> 'schema_migrations'`;
    if (tables.length > 0) {
      const list = tables.map((t) => `"${t.tablename}"`).join(', ');
      await sql.unsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
    }

    const today = new Date(`${ymd(new Date())}T00:00:00.000Z`);
    const arrival = ymd(today);
    const departure = ymd(addDays(today, 2));

    const tenantId = uuidv7();
    const propertyId = uuidv7();
    const userId = uuidv7();
    const membershipId = uuidv7();
    const roomTypeId = uuidv7();
    const roomId = uuidv7();
    const ratePlanId = uuidv7();
    const userEmail = 'frankie@grand-vela.demo';

    // Identity (global tables).
    await sql`INSERT INTO users (id, name, email, email_verified)
              VALUES (${userId}, 'Frankie Desk', ${userEmail}, true)`;
    await sql`INSERT INTO accounts (id, user_id, account_id, provider_id, password)
              VALUES (${uuidv7()}, ${userId}, ${userId}, 'credential', ${await hashPassword('demo-password')})`;

    // Tenant + property.
    await sql`INSERT INTO tenants (id, name, slug) VALUES (${tenantId}, 'Grand Vela Resorts', 'grand-vela')`;
    await sql`INSERT INTO properties (id, tenant_id, name, code, currency, timezone, business_day_rollover)
              VALUES (${propertyId}, ${tenantId}, 'Grand Vela — Ocean Club', 'GVOC', ${CURRENCY}, 'America/Cancun', '03:00')`;
    await sql`INSERT INTO tenant_memberships (id, tenant_id, user_id, status)
              VALUES (${membershipId}, ${tenantId}, ${userId}, 'active')`;

    // Roles: Front Desk Agent (as specified) + Night Auditor (so the same user can close the day).
    for (const key of ['front_desk_agent', 'night_auditor'] as const) {
      const tmpl = getSystemRole(key)!;
      const roleId = uuidv7();
      await sql`INSERT INTO roles (id, tenant_id, key, name, description, is_system)
                VALUES (${roleId}, ${tenantId}, ${tmpl.key}, ${tmpl.name}, ${tmpl.description}, true)`;
      for (const perm of expandWildcards(tmpl.permissions)) {
        await sql`INSERT INTO role_permissions (role_id, permission_key) VALUES (${roleId}, ${perm})`;
      }
      await sql`INSERT INTO role_assignments (id, tenant_id, membership_id, role_id, scope, property_id)
                VALUES (${uuidv7()}, ${tenantId}, ${membershipId}, ${roleId}, 'property', ${propertyId})`;
    }

    // Session for the user, bound to the active tenant (what Better Auth will mint in prod).
    const token = `${uuidv7()}.${randomBytes(24).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 86_400_000).toISOString();
    await sql`INSERT INTO sessions (id, user_id, token, expires_at, active_tenant_id)
              VALUES (${uuidv7()}, ${userId}, ${token}, ${expiresAt}, ${tenantId})`;

    // Business date ledger (the day the night audit will roll).
    await sql`INSERT INTO business_dates (tenant_id, property_id, business_date, status)
              VALUES (${tenantId}, ${propertyId}, ${arrival}, 'open')`;

    // Inventory: one room type, one physical room.
    await sql`INSERT INTO room_types (id, tenant_id, property_id, code, name, max_occupancy, default_occupancy, sort_order)
              VALUES (${roomTypeId}, ${tenantId}, ${propertyId}, 'KING', 'King Ocean View', 3, 2, 1)`;
    await sql`INSERT INTO rooms (id, tenant_id, property_id, room_type_id, number, floor, hk_status, occupancy)
              VALUES (${roomId}, ${tenantId}, ${propertyId}, ${roomTypeId}, '101', '1', 'clean', 'vacant')`;

    // Rate plan + availability + prices for a 7-day window.
    await sql`INSERT INTO rate_plans (id, tenant_id, property_id, code, name, type, currency, is_active)
              VALUES (${ratePlanId}, ${tenantId}, ${propertyId}, 'BAR', 'Best Available Rate', 'bar', ${CURRENCY}, true)`;
    for (let i = 0; i < 7; i++) {
      const day = ymd(addDays(today, i));
      await sql`INSERT INTO availability_days (tenant_id, property_id, room_type_id, stay_date, physical, sold)
                VALUES (${tenantId}, ${propertyId}, ${roomTypeId}, ${day}, 5, 0)`;
      await sql`INSERT INTO rate_prices (id, tenant_id, property_id, rate_plan_id, room_type_id, stay_date, price, single_price, currency)
                VALUES (${uuidv7()}, ${tenantId}, ${propertyId}, ${ratePlanId}, ${roomTypeId}, ${day}, ${NIGHTLY}, '180.00', ${CURRENCY})`;
    }

    // Charge codes (room + payment) and a room tax rule.
    await sql`INSERT INTO charge_codes (id, tenant_id, property_id, code, name, category, gl_account_code)
              VALUES (${uuidv7()}, ${tenantId}, ${propertyId}, 'ROOM', 'Room Charge', 'room', '4000')`;
    await sql`INSERT INTO charge_codes (id, tenant_id, property_id, code, name, category, gl_account_code)
              VALUES (${uuidv7()}, ${tenantId}, ${propertyId}, 'PAYMENT', 'Payment', 'payment', '1000')`;
    await sql`INSERT INTO tax_rules (id, tenant_id, property_id, code, name, rate_pct, inclusive, applies_to_category, gl_account_code)
              VALUES (${uuidv7()}, ${tenantId}, ${propertyId}, 'VAT', 'Occupancy Tax', '10.0000', false, 'room', '2100')`;

    // Payment methods — folio payments validate against this catalog (settings module).
    for (const [code, name, sortOrder] of [
      ['card', 'Card', 10],
      ['cash', 'Cash', 20],
    ] as Array<[string, string, number]>) {
      await sql`INSERT INTO payment_methods (id, tenant_id, property_id, code, name, category, sort_order, is_active)
                VALUES (${uuidv7()}, ${tenantId}, ${propertyId}, ${code}, ${name}, 'payment', ${sortOrder}, true)`;
    }

    // Chart of accounts (Phase-0 control accounts).
    const chart: Array<[string, string, string, string]> = [
      ['1000', 'Cash & Bank', 'asset', 'debit'],
      ['1100', 'Guest Ledger', 'asset', 'debit'],
      ['1200', 'City Ledger (AR)', 'asset', 'debit'],
      ['2000', 'Advance Deposits', 'liability', 'credit'],
      ['2100', 'Tax Payable', 'liability', 'credit'],
      ['4000', 'Room Revenue', 'revenue', 'credit'],
      ['4100', 'Food & Beverage Revenue', 'revenue', 'credit'],
      ['4200', 'Miscellaneous Revenue', 'revenue', 'credit'],
      ['4900', 'Cancellation & No-show Revenue', 'revenue', 'credit'],
    ];
    for (const [code, name, type, normal] of chart) {
      await sql`INSERT INTO gl_accounts (id, tenant_id, property_id, code, name, type, normal_balance)
                VALUES (${uuidv7()}, ${tenantId}, ${propertyId}, ${code}, ${name}, ${type}::gl_account_type, ${normal}::normal_balance)`;
    }

    return { tenantId, propertyId, roomTypeId, ratePlanId, roomId, userEmail, token, arrival, departure };
  } finally {
    await close();
  }
}

function ensureApiBuilt(): void {
  if (existsSync(resolve(ROOT, 'apps/api/dist/main.js'))) return;
  log(c.dim('    · building @vela/api (first run)…'));
  const r = spawnSync('pnpm', ['--filter', '@vela/api', 'build'], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (r.status !== 0) throw new Error('Failed to build @vela/api');
}

async function startApi(): Promise<ChildProcess> {
  const api = spawn(process.execPath, [resolve(ROOT, 'apps/api/dist/main.js')], {
    cwd: ROOT,
    env: { ...process.env, API_PORT: String(PORT), API_HOST: '127.0.0.1' },
    stdio: ['ignore', 'ignore', process.env.DEMO_VERBOSE ? 'inherit' : 'ignore'],
  });
  let booted = false;

  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE_URL}/v1/health`);
      if (res.ok) {
        booted = true;
        break;
      }
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  if (!booted) {
    api.kill('SIGKILL');
    throw new Error('API did not become healthy within 30s');
  }
  return api;
}

function printTrialBalance(tb: {
  lines: Array<{ accountCode: string; accountName: string; debit: string; credit: string }>;
  totalDebit: string;
  totalCredit: string;
  balanced: boolean;
}): void {
  const pad = (s: string, n: number) => s.padEnd(n);
  const padL = (s: string, n: number) => s.padStart(n);
  log(c.dim('    ┌─────────┬──────────────────────────────┬───────────────┬───────────────┐'));
  log(
    c.dim('    │ ') +
      pad('Acct', 7) +
      c.dim(' │ ') +
      pad('Account', 28) +
      c.dim(' │ ') +
      padL('Debit', 13) +
      c.dim(' │ ') +
      padL('Credit', 13) +
      c.dim(' │'),
  );
  log(c.dim('    ├─────────┼──────────────────────────────┼───────────────┼───────────────┤'));
  for (const ln of tb.lines) {
    log(
      c.dim('    │ ') +
        pad(ln.accountCode, 7) +
        c.dim(' │ ') +
        pad(ln.accountName.slice(0, 28), 28) +
        c.dim(' │ ') +
        padL(ln.debit, 13) +
        c.dim(' │ ') +
        padL(ln.credit, 13) +
        c.dim(' │'),
    );
  }
  log(c.dim('    ├─────────┴──────────────────────────────┼───────────────┼───────────────┤'));
  log(
    c.dim('    │ ') +
      pad('TOTAL', 39) +
      c.dim(' │ ') +
      padL(tb.totalDebit, 13) +
      c.dim(' │ ') +
      padL(tb.totalCredit, 13) +
      c.dim(' │'),
  );
  log(c.dim('    └─────────────────────────────────────────┴───────────────┴───────────────┘'));
}

async function main(): Promise<void> {
  const t0 = Date.now();
  log(c.bold('\n▲ Vela — Phase 0 demo\n') + c.dim('  a booking, end to end, through the public API.'));

  step(1, 'Provision tenant, property, inventory, rates, chart of accounts');
  const s = await seed();
  log(`    ${c.green('✓')} ${c.dim(`seeded in ${Date.now() - t0}ms (no DDL)`)}`);

  ensureApiBuilt();
  step(2, 'Boot the API');
  const api = await startApi();

  try {
    const client = createClient({ baseUrl: BASE_URL, token: s.token, propertyId: s.propertyId });

    step(3, 'Session bootstrap (GET /me)');
    if (process.env.DEMO_VERBOSE) {
      const { sql, close } = createDbClient(ADMIN_URL, { max: 1 });
      const rows = await sql`SELECT token, active_tenant_id, expires_at FROM sessions WHERE token = ${s.token}`;
      log(c.dim(`    debug: token=${s.token.slice(0, 12)}… sessions matched=${rows.length} ${JSON.stringify(rows[0] ?? null)}`));
      await close();
    }
    const me = await client.me();
    log(`    ${c.dim(`signed in as ${me.name} <${me.email}> @ ${me.tenantName}`)}`);
    assert(me.properties.length === 1, 'sees exactly one property');
    assert(me.permissions.includes('reservation.create'), 'has reservation.create');
    assert(me.permissions.includes('nightaudit.run'), 'has nightaudit.run');

    step(4, 'Check availability + price (GET /availability)');
    const avail = await client.availability({ from: s.arrival, to: s.departure, adults: 2 });
    const king = avail.find((a) => a.roomTypeCode === 'KING');
    assert(!!king && king.minAvailable === 5, 'KING shows 5 available');
    log(`    ${c.dim(`2-night total: ${king?.totalPrice?.amount} ${king?.totalPrice?.currency}`)}`);

    step(5, 'Take the booking — twice with one Idempotency-Key (POST /reservations)');
    const idemKey = `demo-${uuidv7()}`;
    const input = {
      guest: { firstName: 'Dana', lastName: 'Rivera', email: 'dana@example.com' },
      arrivalDate: s.arrival,
      departureDate: s.departure,
      roomTypeId: s.roomTypeId,
      ratePlanId: s.ratePlanId,
      adults: 2,
      children: 0,
      source: { channel: 'demo' },
    };
    const r1 = await client.createReservation(input, { idempotencyKey: idemKey });
    const r2 = await client.createReservation(input, { idempotencyKey: idemKey });
    log(`    ${c.dim(`confirmation ${r1.confirmationNumber}, total ${r1.total.amount} ${r1.total.currency}`)}`);
    assert(r1.id === r2.id, 'idempotent replay returns the same reservation');
    assert(r1.total.amount === '400.0000', 'two nights @ 200 = 400');
    assert(!!r1.folioId, 'a folio was opened with the reservation');
    const folioId = r1.folioId!;

    step(6, 'Check the guest in, assign room 101 (POST /reservations/:id/check-in)');
    const checkedIn = await client.checkIn(r1.id, { roomId: s.roomId });
    assert(checkedIn.status === 'checked_in', 'reservation is checked_in');

    step(7, 'Post the room charge (POST /folios/:id/postings)');
    const charged = await client.postCharge(folioId, {
      chargeCode: 'ROOM',
      description: 'Room — full stay',
      amount: { amount: '400.00', currency: CURRENCY },
      quantity: 1,
    });
    assert(charged.balance.amount === '400.0000', 'folio balance is 400 after charge');

    step(8, 'Take payment in full (POST /folios/:id/payments)');
    const paid = await client.recordPayment(folioId, {
      method: 'cash',
      amount: { amount: '400.00', currency: CURRENCY },
      reference: 'demo-cash',
    });
    assert(paid.balance.amount === '0.0000', 'folio balance is 0 after payment');

    step(9, 'Check the guest out (POST /reservations/:id/check-out)');
    const checkedOut = await client.checkOut(r1.id, {});
    assert(checkedOut.status === 'checked_out', 'reservation is checked_out');
    const closedFolio = await client.getFolio(folioId);
    assert(closedFolio.status === 'closed', 'folio is closed (zero balance)');

    step(10, 'Run the night audit (POST /night-audit/run)');
    const audit = await client.runNightAudit({});
    log(`    ${c.dim(`business date rolled ${audit.previousBusinessDate} → ${audit.newBusinessDate}`)}`);

    step(11, 'Trial balance — must tie to the folio ledger');
    const tb = audit.trialBalance;
    printTrialBalance(tb);

    const net = (code: string): number => {
      const ln = tb.lines.find((l) => l.accountCode === code);
      return ln ? Number(ln.debit) - Number(ln.credit) : 0;
    };
    assert(tb.balanced, 'trial balance is balanced (Σdebits = Σcredits)');
    assert(tb.totalDebit === tb.totalCredit, `totals match (${tb.totalDebit} = ${tb.totalCredit})`);
    assert(net('1100') === 0, 'Guest Ledger nets to 0 — ties to the closed folio (balance 0)');
    assert(net('1000') === 400, 'Cash nets to 400 — ties to the payment taken');
    assert(net('4000') === -400, 'Room Revenue nets to 400 credit');
    assert(Number(closedFolio.balance.amount) === 0, 'folio ledger balance is 0');

    log(`\n${c.green(c.bold('✔ Phase-0 demo passed'))} ${c.dim(`in ${Date.now() - t0}ms`)}\n`);
  } finally {
    api.kill('SIGTERM');
  }
}

main().catch((err) => {
  if (err instanceof VelaApiError) {
    console.error(c.red(`\n✖ API error ${err.httpStatus} ${err.problem.code}: ${err.problem.title}`));
    console.error(c.dim(JSON.stringify(err.problem, null, 2)));
  } else {
    console.error(c.red(`\n✖ Demo failed: ${(err as Error).message}`));
    console.error(c.dim(String((err as Error).stack)));
  }
  process.exit(1);
});
