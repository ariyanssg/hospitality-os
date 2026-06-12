/**
 * Dev seed for the web app ("The Desk"). Provisions a tenant, property, inventory, rates, chart of
 * accounts, a Front Desk user, and a board's worth of TODAY arrivals (confirmed + a couple in-house)
 * so the arrivals board, pulse bar, and reservation drawer have real data to render.
 *
 *     pnpm seed     # then: pnpm dev  → sign in with the printed credentials
 *
 * Unlike `pnpm demo` (deterministic acceptance gate), this leaves a populated, explorable property.
 */
import { randomBytes, scrypt as scryptCb } from 'node:crypto';
import { promisify } from 'node:util';
import { createDbClient, uuidv7 } from '@vela/db';
import { expandWildcards, getSystemRole } from '@vela/permissions';

const scrypt = promisify(scryptCb);
const ADMIN_URL =
  process.env.DATABASE_ADMIN_URL ?? 'postgres://vela_admin:vela_admin@localhost:5434/vela';
const CURRENCY = 'USD';
const LOGIN_EMAIL = 'frankie@grand-vela.demo';
const GM_EMAIL = 'greta@grand-vela.demo';
const LOGIN_PASSWORD = 'demo-password';

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

const GUESTS: Array<[string, string, number, number]> = [
  ['Dana', 'Rivera', 2, 0],
  ['Ito', 'Nakamura', 1, 0],
  ['Priya', 'Patel', 2, 1],
  ['Marcus', 'Bell', 2, 0],
  ['Sofia', 'Marino', 1, 0],
  ['Liam', 'O’Brien', 2, 2],
  ['Chen', 'Wei', 1, 0],
  ['Amara', 'Okafor', 2, 0],
];

const ROOM_TYPES: Array<[string, string, number, string]> = [
  ['KING', 'King Ocean View', 3, '240.00'],
  ['DLX', 'Deluxe Suite', 4, '420.00'],
  ['STD', 'Standard Queen', 2, '180.00'],
];

async function main(): Promise<void> {
  const t0 = Date.now();
  const { sql, close } = createDbClient(ADMIN_URL, { max: 1 });
  try {
    const tables = await sql<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'schema_migrations'`;
    if (tables.length > 0) {
      await sql.unsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(', ')} RESTART IDENTITY CASCADE`);
    }

    const today = new Date(`${ymd(new Date())}T00:00:00.000Z`);
    const businessDate = ymd(today);

    const tenantId = uuidv7();
    const propertyId = uuidv7();
    const userId = uuidv7();
    const membershipId = uuidv7();

    await sql`INSERT INTO users (id, name, email, email_verified) VALUES (${userId}, 'Frankie Desk', ${LOGIN_EMAIL}, true)`;
    await sql`INSERT INTO accounts (id, user_id, account_id, provider_id, password)
              VALUES (${uuidv7()}, ${userId}, ${userId}, 'credential', ${await hashPassword(LOGIN_PASSWORD)})`;
    await sql`INSERT INTO tenants (id, name, slug) VALUES (${tenantId}, 'Grand Vela Resorts', 'grand-vela')`;
    await sql`INSERT INTO properties (id, tenant_id, name, code, currency, timezone, business_day_rollover)
              VALUES (${propertyId}, ${tenantId}, 'Grand Vela — Ocean Club', 'GVOC', ${CURRENCY}, 'America/Cancun', '03:00')`;
    await sql`INSERT INTO tenant_memberships (id, tenant_id, user_id, status) VALUES (${membershipId}, ${tenantId}, ${userId}, 'active')`;

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

    // A GM with the owner role — for the manager flash, rate management, and elevated overrides.
    const gmUserId = uuidv7();
    const gmMembershipId = uuidv7();
    await sql`INSERT INTO users (id, name, email, email_verified) VALUES (${gmUserId}, 'Greta Manager', ${GM_EMAIL}, true)`;
    await sql`INSERT INTO accounts (id, user_id, account_id, provider_id, password)
              VALUES (${uuidv7()}, ${gmUserId}, ${gmUserId}, 'credential', ${await hashPassword(LOGIN_PASSWORD)})`;
    await sql`INSERT INTO tenant_memberships (id, tenant_id, user_id, status) VALUES (${gmMembershipId}, ${tenantId}, ${gmUserId}, 'active')`;
    {
      const tmpl = getSystemRole('owner')!;
      const roleId = uuidv7();
      await sql`INSERT INTO roles (id, tenant_id, key, name, description, is_system)
                VALUES (${roleId}, ${tenantId}, ${tmpl.key}, ${tmpl.name}, ${tmpl.description}, true)`;
      for (const perm of expandWildcards(tmpl.permissions)) {
        await sql`INSERT INTO role_permissions (role_id, permission_key) VALUES (${roleId}, ${perm})`;
      }
      await sql`INSERT INTO role_assignments (id, tenant_id, membership_id, role_id, scope, property_id)
                VALUES (${uuidv7()}, ${tenantId}, ${gmMembershipId}, ${roleId}, 'tenant', NULL)`;
    }

    const token = `${uuidv7()}.${randomBytes(24).toString('hex')}`;
    await sql`INSERT INTO sessions (id, user_id, token, expires_at, active_tenant_id)
              VALUES (${uuidv7()}, ${userId}, ${token}, ${new Date(Date.now() + 7 * 86_400_000).toISOString()}, ${tenantId})`;
    await sql`INSERT INTO business_dates (tenant_id, property_id, business_date, status) VALUES (${tenantId}, ${propertyId}, ${businessDate}, 'open')`;

    // Chart of accounts.
    const chart: Array<[string, string, string, string]> = [
      ['1000', 'Cash & Bank', 'asset', 'debit'],
      ['1100', 'Guest Ledger', 'asset', 'debit'],
      ['1200', 'City Ledger (AR)', 'asset', 'debit'],
      ['2000', 'Advance Deposits', 'liability', 'credit'],
      ['2100', 'Tax Payable', 'liability', 'credit'],
      ['4000', 'Room Revenue', 'revenue', 'credit'],
      ['4100', 'Food & Beverage Revenue', 'revenue', 'credit'],
      ['4200', 'Miscellaneous Revenue', 'revenue', 'credit'],
    ];
    for (const [code, name, type, normal] of chart) {
      await sql`INSERT INTO gl_accounts (id, tenant_id, property_id, code, name, type, normal_balance)
                VALUES (${uuidv7()}, ${tenantId}, ${propertyId}, ${code}, ${name}, ${type}::gl_account_type, ${normal}::normal_balance)`;
    }
    await sql`INSERT INTO charge_codes (id, tenant_id, property_id, code, name, category, gl_account_code)
              VALUES (${uuidv7()}, ${tenantId}, ${propertyId}, 'ROOM', 'Room Charge', 'room', '4000')`;
    await sql`INSERT INTO charge_codes (id, tenant_id, property_id, code, name, category, gl_account_code)
              VALUES (${uuidv7()}, ${tenantId}, ${propertyId}, 'PAYMENT', 'Payment', 'payment', '1000')`;
    await sql`INSERT INTO charge_codes (id, tenant_id, property_id, code, name, category, gl_account_code)
              VALUES (${uuidv7()}, ${tenantId}, ${propertyId}, 'MINIBAR', 'Minibar', 'fnb', '4100')`;
    await sql`INSERT INTO charge_codes (id, tenant_id, property_id, code, name, category, gl_account_code)
              VALUES (${uuidv7()}, ${tenantId}, ${propertyId}, 'MISC', 'Miscellaneous', 'misc', '4200')`;
    await sql`INSERT INTO tax_rules (id, tenant_id, property_id, code, name, rate_pct, inclusive, applies_to_category, gl_account_code)
              VALUES (${uuidv7()}, ${tenantId}, ${propertyId}, 'VAT', 'Occupancy Tax', '10.0000', false, 'room', '2100')`;

    // Room types + rate plan + availability + prices + rooms.
    const ratePlanId = uuidv7();
    await sql`INSERT INTO rate_plans (id, tenant_id, property_id, code, name, type, currency, is_active)
              VALUES (${ratePlanId}, ${tenantId}, ${propertyId}, 'BAR', 'Best Available Rate', 'bar', ${CURRENCY}, true)`;

    const roomTypeIds: Record<string, string> = {};
    let roomNumber = 100;
    for (let ti = 0; ti < ROOM_TYPES.length; ti++) {
      const [code, name, maxOcc, price] = ROOM_TYPES[ti]!;
      const rtId = uuidv7();
      roomTypeIds[code] = rtId;
      await sql`INSERT INTO room_types (id, tenant_id, property_id, code, name, max_occupancy, default_occupancy, sort_order)
                VALUES (${rtId}, ${tenantId}, ${propertyId}, ${code}, ${name}, ${maxOcc}, 2, ${ti})`;
      for (let r = 0; r < 6; r++) {
        roomNumber++;
        await sql`INSERT INTO rooms (id, tenant_id, property_id, room_type_id, number, floor, hk_status, occupancy)
                  VALUES (${uuidv7()}, ${tenantId}, ${propertyId}, ${rtId}, ${String(roomNumber)}, ${String(Math.floor(roomNumber / 100))}, 'clean', 'vacant')`;
      }
      for (let i = 0; i < 14; i++) {
        const day = ymd(addDays(today, i));
        await sql`INSERT INTO availability_days (tenant_id, property_id, room_type_id, stay_date, physical, sold)
                  VALUES (${tenantId}, ${propertyId}, ${rtId}, ${day}, 6, 0)`;
        await sql`INSERT INTO rate_prices (id, tenant_id, property_id, rate_plan_id, room_type_id, stay_date, price, single_price, currency)
                  VALUES (${uuidv7()}, ${tenantId}, ${propertyId}, ${ratePlanId}, ${rtId}, ${day}, ${price}, ${price}, ${CURRENCY})`;
      }
    }

    // Today's arrivals: confirmed reservations the desk will work.
    let arrivals = 0;
    for (let i = 0; i < GUESTS.length; i++) {
      const [first, last, adults, children] = GUESTS[i]!;
      const rtCode = ROOM_TYPES[i % ROOM_TYPES.length]![0];
      const rtId = roomTypeIds[rtCode]!;
      const nights = 1 + (i % 3);
      const arrival = businessDate;
      const departure = ymd(addDays(today, nights));
      const price = ROOM_TYPES[i % ROOM_TYPES.length]![3];
      const guestId = uuidv7();
      const resId = uuidv7();
      const conf = `BK-${String(1000 + i)}`;

      await sql`INSERT INTO guests (id, tenant_id, first_name, last_name, email)
                VALUES (${guestId}, ${tenantId}, ${first}, ${last}, ${`${first.toLowerCase()}@example.com`})`;
      const source = JSON.stringify({ channel: i % 2 ? 'ota' : 'direct' });
      await sql`INSERT INTO reservations (id, tenant_id, property_id, confirmation_number, status, guest_id, arrival_date, departure_date, room_type_id, rate_plan_id, adults, children, total_amount, currency, source)
                VALUES (${resId}, ${tenantId}, ${propertyId}, ${conf}, 'confirmed', ${guestId}, ${arrival}, ${departure}, ${rtId}, ${ratePlanId}, ${adults}, ${children}, ${(Number(price) * nights).toFixed(4)}, ${CURRENCY}, ${source}::jsonb)`;
      for (let n = 0; n < nights; n++) {
        const stay = ymd(addDays(today, n));
        await sql`INSERT INTO reservation_nights (id, tenant_id, property_id, reservation_id, stay_date, room_type_id, rate_plan_id, price, currency)
                  VALUES (${uuidv7()}, ${tenantId}, ${propertyId}, ${resId}, ${stay}, ${rtId}, ${ratePlanId}, ${price}, ${CURRENCY})`;
        await sql`UPDATE availability_days SET sold = sold + 1 WHERE tenant_id=${tenantId} AND property_id=${propertyId} AND room_type_id=${rtId} AND stay_date=${stay}`;
      }
      await sql`INSERT INTO reservation_room_stays (id, tenant_id, property_id, reservation_id, room_id, from_date, to_date)
                VALUES (${uuidv7()}, ${tenantId}, ${propertyId}, ${resId}, ${null}, ${arrival}, ${departure})`;
      await sql`INSERT INTO reservation_guests (id, tenant_id, reservation_id, guest_id, is_primary)
                VALUES (${uuidv7()}, ${tenantId}, ${resId}, ${guestId}, 'true')`;
      await sql`INSERT INTO folios (id, tenant_id, property_id, folio_number, reservation_id, guest_id, type, status, currency, balance)
                VALUES (${uuidv7()}, ${tenantId}, ${propertyId}, ${`F-${1000 + i}`}, ${resId}, ${guestId}, 'guest', 'open', ${CURRENCY}, '0')`;
      arrivals++;
    }

    console.warn(`\n✓ Seeded "Grand Vela — Ocean Club" with ${arrivals} arrivals in ${Date.now() - t0}ms`);
    console.warn('  Sign in to The Desk with:');
    console.warn(`    front desk: ${LOGIN_EMAIL} / ${LOGIN_PASSWORD}`);
    console.warn(`    GM (owner): ${GM_EMAIL} / ${LOGIN_PASSWORD}`);
    console.warn('  Then: pnpm dev  →  http://localhost:3000\n');
  } finally {
    await close();
  }
}

main().catch((err) => {
  console.error('seed failed:', err);
  process.exit(1);
});
