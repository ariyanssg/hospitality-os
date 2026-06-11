import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { accounts, sessions, users, uuidv7 } from '@vela/db';
import { DomainError } from '../errors/domain-errors';
import { DbService } from '../db/db.service';

const scrypt = promisify(scryptCb);
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString('hex')}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(hash, 'hex');
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

/**
 * Phase-0 email/password auth against the Better-Auth-compatible identity tables (users/accounts/
 * sessions). Better Auth is the production drop-in for these same tables (see ADR 0002); the schema
 * is already shaped for it, so swapping the implementation does not touch the data model.
 */
@Injectable()
export class PasswordAuthService {
  constructor(private readonly db: DbService) {}

  async signUp(input: { email: string; password: string; name: string }): Promise<{ userId: string; token: string }> {
    const existing = await this.db.admin
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);
    if (existing.length > 0) {
      throw new DomainError(409, 'EMAIL_TAKEN', 'An account with that email already exists');
    }
    const userId = uuidv7();
    await this.db.admin.insert(users).values({
      id: userId,
      name: input.name,
      email: input.email,
      emailVerified: true,
    });
    await this.db.admin.insert(accounts).values({
      id: uuidv7(),
      userId,
      accountId: userId,
      providerId: 'credential',
      password: await hashPassword(input.password),
    });
    const token = await this.createSession(userId);
    return { userId, token };
  }

  async signIn(input: { email: string; password: string }): Promise<{ userId: string; token: string }> {
    const [user] = await this.db.admin
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);
    if (!user) throw new DomainError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');

    const [account] = await this.db.admin
      .select({ password: accounts.password })
      .from(accounts)
      .where(eq(accounts.userId, user.id))
      .limit(1);
    if (!account?.password || !(await verifyPassword(input.password, account.password))) {
      throw new DomainError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }
    const token = await this.createSession(user.id);
    return { userId: user.id, token };
  }

  /** Creates a session and binds the user's active tenant (first active membership). */
  async createSession(userId: string, activeTenantId?: string): Promise<string> {
    const token = `${uuidv7()}.${randomBytes(24).toString('hex')}`;
    await this.db.admin.insert(sessions).values({
      id: uuidv7(),
      userId,
      token,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      activeTenantId: activeTenantId ?? null,
    });
    return token;
  }
}
