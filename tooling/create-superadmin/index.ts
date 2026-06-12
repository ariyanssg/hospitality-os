/**
 * Idempotent superadmin bootstrap — the production path to the FIRST platform admin (there is no
 * UI route to it; every later one is created from /admin). Syncs the platform_superadmin role's
 * permission rows from the TS catalog, then grants it to the given user (created if needed).
 *
 *     pnpm platform:superadmin -- admin@example.com strong-password "Admin Name"
 */
import { randomBytes, scrypt as scryptCb } from 'node:crypto';
import { promisify } from 'node:util';
import { createDbClient, uuidv7 } from '@vela/db';
import { PLATFORM_PERMISSION_KEYS, expandWildcards, getPlatformRole } from '@vela/permissions';

const scrypt = promisify(scryptCb);
const ADMIN_URL =
  process.env.DATABASE_ADMIN_URL ?? 'postgres://vela_admin:vela_admin@localhost:5434/vela';

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString('hex')}`;
}

async function main(): Promise<void> {
  const [email, password, name = 'Platform Admin'] = process.argv.slice(2);
  if (!email || !password) {
    console.error('usage: pnpm platform:superadmin -- <email> <password> [name]');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('password must be at least 8 characters');
    process.exit(1);
  }

  const { sql, close } = createDbClient(ADMIN_URL, { max: 1 });
  try {
    // Sync the role + its permission projection from the TS catalog.
    const tmpl = getPlatformRole('platform_superadmin')!;
    await sql`INSERT INTO platform_roles (id, key, name, description, is_system)
              VALUES (${uuidv7()}, ${tmpl.key}, ${tmpl.name}, ${tmpl.description}, true)
              ON CONFLICT (key) DO NOTHING`;
    const [{ id: roleId }] = await sql<{ id: string }[]>`
      SELECT id FROM platform_roles WHERE key = ${tmpl.key}`;
    for (const key of expandWildcards(tmpl.permissions, PLATFORM_PERMISSION_KEYS)) {
      await sql`INSERT INTO platform_role_permissions (role_id, permission_key)
                VALUES (${roleId}, ${key}) ON CONFLICT DO NOTHING`;
    }

    // Create or reuse the user; set/replace their credential.
    let userId: string;
    const existing = await sql<{ id: string }[]>`SELECT id FROM users WHERE email = ${email}`;
    if (existing.length > 0) {
      userId = existing[0]!.id;
      await sql`UPDATE accounts SET password = ${await hashPassword(password)}, updated_at = now()
                WHERE user_id = ${userId} AND provider_id = 'credential'`;
      console.warn(`• user ${email} exists — password updated`);
    } else {
      userId = uuidv7();
      await sql`INSERT INTO users (id, name, email, email_verified) VALUES (${userId}, ${name}, ${email}, true)`;
      await sql`INSERT INTO accounts (id, user_id, account_id, provider_id, password)
                VALUES (${uuidv7()}, ${userId}, ${userId}, 'credential', ${await hashPassword(password)})`;
      console.warn(`• created user ${email}`);
    }

    await sql`INSERT INTO platform_role_assignments (id, user_id, role_id)
              VALUES (${uuidv7()}, ${userId}, ${roleId})
              ON CONFLICT (user_id, role_id) DO NOTHING`;

    console.warn(`✓ ${email} is a platform superadmin — sign in and open /admin`);
  } finally {
    await close();
  }
}

main().catch((err) => {
  console.error('create-superadmin failed:', err);
  process.exit(1);
});
