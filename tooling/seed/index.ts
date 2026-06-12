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

/** In-house guests (checked in yesterday) — the POS room-charge flow searches these live. */
const IN_HOUSE: Array<{ first: string; last: string; roomIdx: number; vip?: boolean }> = [
  { first: 'Priya', last: 'Patel', roomIdx: 4 }, // KING 105
  { first: 'Marisol', last: 'Vega', roomIdx: 7, vip: true }, // DLX 108
  { first: 'Akira', last: 'Nakamura', roomIdx: 13 }, // STD 114
  { first: 'Dayo', last: 'Okafor', roomIdx: 14 }, // STD 115
];

/** Vista dinner-floor geometry (POS terminal floor plan) — x/y stored ×10 (per-mille of the stage). */
const POS_VISTA_TABLES: Array<[string, string, number, number, number]> = [
  // [label, section, seats, x×10, y×10]
  ['1', 'Dining room', 4, 50, 100],
  ['2', 'Dining room', 4, 200, 100],
  ['3', 'Dining room', 6, 370, 110],
  ['4', 'Dining room', 2, 55, 400],
  ['5', 'Dining room', 2, 200, 400],
  ['6', 'Dining room', 6, 370, 380],
  ['7', 'Dining room', 4, 50, 660],
  ['8', 'Dining room', 8, 195, 630],
  ['9', 'Dining room', 4, 370, 650],
  ['10', 'Terrace', 2, 610, 110],
  ['11', 'Terrace', 2, 745, 110],
  ['12', 'Terrace', 4, 610, 330],
  ['14', 'Terrace', 4, 755, 330],
  ['B1', 'Bar rail', 0, 610, 690],
  ['B2', 'Bar rail', 0, 678, 690],
  ['B3', 'Bar rail', 0, 746, 690],
  ['B4', 'Bar rail', 0, 814, 690],
  ['B5', 'Bar rail', 0, 882, 690],
];

const POS_LAGOON_TABLES: Array<[string, string, number]> = [
  ['Cabana 1', 'Cabanas', 4],
  ['Cabana 2', 'Cabanas', 4],
  ['Cabana 3', 'Cabanas', 4],
  ['Cabana 4', 'Cabanas', 4],
  ['Swim-up 1', 'Swim-up', 2],
  ['Swim-up 2', 'Swim-up', 2],
  ['Swim-up 3', 'Swim-up', 2],
  ['Walk-up', 'Walk-up', 1],
];

/** The terminal's server role — POS keys only, instantiated per tenant like the system templates. */
const OUTLET_SERVER_PERMISSIONS = [
  'pos.check.view',
  'pos.check.create',
  'pos.item.add',
  'pos.check.split',
  'pos.check.transfer',
  'pos.check.close',
  'pos.roomcharge.post',
  'pos.cash.manage',
  'pos.shift.close',
  'kds.operate',
  'table.manage',
  'reservation.table.manage',
];

type SeedCheckItem = [name: string, course: string, qty: number, price: string, status: 'fired' | 'ready', firedSecAgo: number];
/** Open checks matching the Vela POS Terminal design — table label → check. */
const POS_VISTA_CHECKS: Array<{
  table: string;
  number: string;
  covers: number;
  openedMinAgo: number;
  items: SeedCheckItem[];
}> = [
  {
    table: '14', number: '1042', covers: 2, openedMinAgo: 38,
    items: [
      ['Hamachi crudo', 'C1·S1', 1, '22.00', 'ready', 1700],
      ['Albariño · glass', 'C1·S1', 1, '11.00', 'ready', 1700],
      ['Albariño · glass', 'C1·S2', 1, '11.00', 'ready', 1700],
      ['Snapper a la talla — Grilled · Arroz verde', 'C2·S2', 1, '36.00', 'fired', 252],
    ],
  },
  {
    table: '8', number: '1038', covers: 7, openedMinAgo: 64,
    items: [
      ['Tuna tostada', 'C1·S1', 2, '19.00', 'ready', 2900],
      ['Crisped octopus', 'C1·S3', 1, '24.00', 'ready', 2900],
      ['Vela paloma', 'C1·S1', 2, '16.00', 'ready', 2900],
      ['Ribeye · 30-day — Medium rare', 'C2·S2', 2, '68.00', 'fired', 465],
      ['Lamb barbacoa', 'C2·S4', 1, '46.00', 'fired', 465],
      ['Prawns a la plancha', 'C2·S5', 1, '38.00', 'fired', 465],
      ['Papas bravas', 'C2·S1', 2, '9.00', 'fired', 465],
      ['Esquites', 'C2·S1', 1, '10.00', 'fired', 465],
    ],
  },
  {
    table: '4', number: '1041', covers: 2, openedMinAgo: 52,
    items: [
      ['Heirloom tomato tartare', 'C1·S1', 1, '16.00', 'ready', 2400],
      ['Mushroom tetela', 'C2·S1', 1, '26.00', 'fired', 662],
      ['Short rib adobo', 'C2·S2', 1, '42.00', 'fired', 662],
    ],
  },
  {
    table: '6', number: '1040', covers: 3, openedMinAgo: 22,
    items: [
      ['Burrata & charred peach', 'C1·S1', 1, '18.00', 'ready', 1100],
      ['Rioja crianza · glass', 'C1·S1', 2, '13.00', 'ready', 1100],
      ['Half chicken al pastor', 'C2·S2', 1, '29.00', 'fired', 360],
    ],
  },
  {
    table: '2', number: '1035', covers: 3, openedMinAgo: 100,
    items: [
      ['Oysters · ½ dozen', 'C1·S1', 1, '24.00', 'ready', 5200],
      ['Snapper a la talla — Roasted · Esquites', 'C2·S1', 1, '38.00', 'ready', 3600],
      ['Short rib adobo', 'C2·S2', 1, '42.00', 'ready', 3600],
      ['Pét-nat · bottle', 'C1·S1', 1, '64.00', 'ready', 5200],
      ['Flan de coco', 'C3·S3', 1, '11.00', 'ready', 900],
    ],
  },
  {
    table: '12', number: '1037', covers: 2, openedMinAgo: 106,
    items: [
      ['Churros & cajeta', 'C3·S1', 1, '12.00', 'fired', 780],
      ['Flan de coco', 'C3·S2', 1, '11.00', 'fired', 780],
      ['Citrus tepache', 'C3·S1', 2, '9.00', 'fired', 780],
    ],
  },
  {
    table: '1', number: '1044', covers: 2, openedMinAgo: 12,
    items: [['Vela paloma', 'C1·S1', 2, '16.00', 'fired', 130]],
  },
  {
    table: '10', number: '1045', covers: 2, openedMinAgo: 6,
    items: [['Pool spritz', 'C1·S1', 2, '15.00', 'fired', 70]],
  },
];

const POS_LAGOON_CHECKS: Array<{
  table: string;
  number: string;
  covers: number;
  openedMinAgo: number;
  items: SeedCheckItem[];
}> = [
  {
    table: 'Cabana 3', number: '2031', covers: 2, openedMinAgo: 42,
    items: [
      ['Baja tacos', 'QS', 2, '14.00', 'fired', 92],
      ['Coco fries', 'QS', 1, '9.00', 'fired', 92],
      ['Pool spritz', 'QS', 2, '15.00', 'ready', 1500],
    ],
  },
  {
    table: 'Swim-up 2', number: '2032', covers: 2, openedMinAgo: 18,
    items: [
      ['Vela paloma', 'QS', 2, '16.00', 'ready', 800],
      ['Citrus tepache', 'QS', 1, '9.00', 'ready', 800],
    ],
  },
  {
    table: 'Walk-up', number: '2033', covers: 1, openedMinAgo: 7,
    items: [
      ['Pool spritz', 'QS', 1, '15.00', 'fired', 240],
      ['Coco fries', 'QS', 1, '9.00', 'fired', 240],
    ],
  },
];

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
    const seededRooms: Array<{ id: string; number: string; rtId: string; rtCode: string; price: string }> = [];
    let roomNumber = 100;
    for (let ti = 0; ti < ROOM_TYPES.length; ti++) {
      const [code, name, maxOcc, price] = ROOM_TYPES[ti]!;
      const rtId = uuidv7();
      roomTypeIds[code] = rtId;
      await sql`INSERT INTO room_types (id, tenant_id, property_id, code, name, max_occupancy, default_occupancy, sort_order)
                VALUES (${rtId}, ${tenantId}, ${propertyId}, ${code}, ${name}, ${maxOcc}, 2, ${ti})`;
      for (let r = 0; r < 6; r++) {
        roomNumber++;
        const roomId = uuidv7();
        seededRooms.push({ id: roomId, number: String(roomNumber), rtId, rtCode: code, price });
        await sql`INSERT INTO rooms (id, tenant_id, property_id, room_type_id, number, floor, hk_status, occupancy)
                  VALUES (${roomId}, ${tenantId}, ${propertyId}, ${rtId}, ${String(roomNumber)}, ${String(Math.floor(roomNumber / 100))}, 'clean', 'vacant')`;
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

    // ── In-house guests (arrived yesterday) — POS room-charge candidates ──
    let folioSeq = 1000 + GUESTS.length;
    for (let i = 0; i < IN_HOUSE.length; i++) {
      const g = IN_HOUSE[i]!;
      const room = seededRooms[g.roomIdx]!;
      const arrival = ymd(addDays(today, -1));
      const departure = ymd(addDays(today, 2));
      const guestId = uuidv7();
      const resId = uuidv7();
      await sql`INSERT INTO guests (id, tenant_id, first_name, last_name, email, vip_tier)
                VALUES (${guestId}, ${tenantId}, ${g.first}, ${g.last}, ${`${g.first.toLowerCase()}.${g.last.toLowerCase()}@example.com`}, ${g.vip ? 'gold' : null})`;
      await sql`INSERT INTO reservations (id, tenant_id, property_id, confirmation_number, status, guest_id, arrival_date, departure_date, room_type_id, rate_plan_id, adults, children, total_amount, currency, source)
                VALUES (${resId}, ${tenantId}, ${propertyId}, ${`BK-${String(1100 + i)}`}, 'checked_in', ${guestId}, ${arrival}, ${departure}, ${room.rtId}, ${ratePlanId}, 2, 0, ${(Number(room.price) * 3).toFixed(4)}, ${CURRENCY}, ${'{"channel":"direct"}'}::jsonb)`;
      for (let n = -1; n < 2; n++) {
        const stay = ymd(addDays(today, n));
        await sql`INSERT INTO reservation_nights (id, tenant_id, property_id, reservation_id, stay_date, room_type_id, rate_plan_id, price, currency)
                  VALUES (${uuidv7()}, ${tenantId}, ${propertyId}, ${resId}, ${stay}, ${room.rtId}, ${ratePlanId}, ${room.price}, ${CURRENCY})`;
        if (n >= 0) {
          await sql`UPDATE availability_days SET sold = sold + 1 WHERE tenant_id=${tenantId} AND property_id=${propertyId} AND room_type_id=${room.rtId} AND stay_date=${stay}`;
        }
      }
      await sql`INSERT INTO reservation_room_stays (id, tenant_id, property_id, reservation_id, room_id, from_date, to_date)
                VALUES (${uuidv7()}, ${tenantId}, ${propertyId}, ${resId}, ${room.id}, ${arrival}, ${departure})`;
      await sql`INSERT INTO reservation_guests (id, tenant_id, reservation_id, guest_id, is_primary)
                VALUES (${uuidv7()}, ${tenantId}, ${resId}, ${guestId}, 'true')`;
      await sql`UPDATE rooms SET occupancy = 'occupied' WHERE id = ${room.id}`;
      await sql`INSERT INTO folios (id, tenant_id, property_id, folio_number, reservation_id, guest_id, type, status, currency, balance)
                VALUES (${uuidv7()}, ${tenantId}, ${propertyId}, ${`F-${folioSeq++}`}, ${resId}, ${guestId}, 'guest', 'open', ${CURRENCY}, ${(Number(room.price)).toFixed(4)})`;
    }

    // ── POS v1: outlets, floor plan, the Outlet Server role, and tonight's open checks ──
    {
      const serverRoleId = uuidv7();
      await sql`INSERT INTO roles (id, tenant_id, key, name, description, is_system)
                VALUES (${serverRoleId}, ${tenantId}, 'outlet_server', 'Outlet Server', 'Runs a POS terminal: checks, items, settlement incl. room charges, KDS, shift close.', false)`;
      for (const perm of OUTLET_SERVER_PERMISSIONS) {
        await sql`INSERT INTO role_permissions (role_id, permission_key) VALUES (${serverRoleId}, ${perm})`;
      }
      await sql`INSERT INTO role_assignments (id, tenant_id, membership_id, role_id, scope, property_id)
                VALUES (${uuidv7()}, ${tenantId}, ${membershipId}, ${serverRoleId}, 'property', ${propertyId})`;

      const outletIds = { vista: uuidv7(), lagoon: uuidv7(), rs: uuidv7() };
      await sql`INSERT INTO pos_outlets (id, tenant_id, property_id, code, name, currency)
                VALUES (${outletIds.vista}, ${tenantId}, ${propertyId}, 'VISTA', 'Vista', ${CURRENCY})`;
      await sql`INSERT INTO pos_outlets (id, tenant_id, property_id, code, name, currency)
                VALUES (${outletIds.lagoon}, ${tenantId}, ${propertyId}, 'LAGOON', 'Lagoon Bar', ${CURRENCY})`;
      await sql`INSERT INTO pos_outlets (id, tenant_id, property_id, code, name, currency)
                VALUES (${outletIds.rs}, ${tenantId}, ${propertyId}, 'RS', 'Room Service', ${CURRENCY})`;

      const tableIds: Record<string, string> = {};
      for (const [label, section, seats, x, y] of POS_VISTA_TABLES) {
        const id = uuidv7();
        tableIds[`vista:${label}`] = id;
        await sql`INSERT INTO pos_tables (id, tenant_id, property_id, outlet_id, label, section, seats, x, y)
                  VALUES (${id}, ${tenantId}, ${propertyId}, ${outletIds.vista}, ${label}, ${section}, ${seats}, ${x}, ${y})`;
      }
      for (const [label, section, seats] of POS_LAGOON_TABLES) {
        const id = uuidv7();
        tableIds[`lagoon:${label}`] = id;
        await sql`INSERT INTO pos_tables (id, tenant_id, property_id, outlet_id, label, section, seats, x, y)
                  VALUES (${id}, ${tenantId}, ${propertyId}, ${outletIds.lagoon}, ${label}, ${section}, ${seats}, 0, 0)`;
      }

      const seedChecks = async (
        outletId: string,
        outletKey: 'vista' | 'lagoon',
        checks: typeof POS_VISTA_CHECKS,
      ) => {
        for (const c of checks) {
          const checkId = uuidv7();
          const openedAt = new Date(Date.now() - c.openedMinAgo * 60_000).toISOString();
          let subtotal = 0;
          let allFired = true;
          for (const [, , qty, price, status] of c.items) {
            subtotal += Number(price) * qty;
            if (status !== 'fired' && status !== 'ready') allFired = false;
          }
          await sql`INSERT INTO pos_checks (id, tenant_id, property_id, outlet_id, table_id, check_number, status, covers, subtotal, total, currency, opened_by, opened_at)
                    VALUES (${checkId}, ${tenantId}, ${propertyId}, ${outletId}, ${tableIds[`${outletKey}:${c.table}`]!}, ${c.number}, ${allFired ? 'fired' : 'open'}, ${c.covers}, ${subtotal.toFixed(4)}, ${subtotal.toFixed(4)}, ${CURRENCY}, ${userId}, ${openedAt})`;
          for (const [name, course, qty, price, status, firedSecAgo] of c.items) {
            const firedAt = new Date(Date.now() - firedSecAgo * 1000).toISOString();
            await sql`INSERT INTO pos_check_items (id, tenant_id, property_id, check_id, name, course, quantity, unit_price, line_total, status, fired_at, ready_at)
                      VALUES (${uuidv7()}, ${tenantId}, ${propertyId}, ${checkId}, ${name}, ${course}, ${qty}, ${price}, ${(Number(price) * qty).toFixed(4)}, ${status}::pos_order_item_status, ${firedAt}, ${status === 'ready' ? firedAt : null})`;
          }
        }
      };
      await seedChecks(outletIds.vista, 'vista', POS_VISTA_CHECKS);
      await seedChecks(outletIds.lagoon, 'lagoon', POS_LAGOON_CHECKS);
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
