import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { and, eq, ne } from 'drizzle-orm';
import { accounts, sessions, users, uuidv7 } from '@vela/db';
import { DomainError } from '../errors/domain-errors';
import { DbService } from '../db/db.service';
import { hashPassword, verifyPassword } from './password.util';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

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

  /** Points an existing session at a different active tenant (platform hotel switching). */
  async setActiveTenant(token: string, tenantId: string | null): Promise<void> {
    await this.db.admin
      .update(sessions)
      .set({ activeTenantId: tenantId, updatedAt: new Date() })
      .where(eq(sessions.token, token));
  }

  /**
   * Administrative password reset (platform.user.password.reset). Replaces the credential hash and
   * revokes every OTHER session of the target user — the old password and stolen tokens both die,
   * while an admin resetting their own password keeps their current session.
   */
  async adminSetPassword(userId: string, newPassword: string, keepToken?: string): Promise<void> {
    const updated = await this.db.admin
      .update(accounts)
      .set({ password: await hashPassword(newPassword), updatedAt: new Date() })
      .where(and(eq(accounts.userId, userId), eq(accounts.providerId, 'credential')))
      .returning({ id: accounts.id });
    if (updated.length === 0) {
      await this.db.admin.insert(accounts).values({
        id: uuidv7(),
        userId,
        accountId: userId,
        providerId: 'credential',
        password: await hashPassword(newPassword),
      });
    }
    await this.db.admin
      .delete(sessions)
      .where(
        keepToken
          ? and(eq(sessions.userId, userId), ne(sessions.token, keepToken))
          : eq(sessions.userId, userId),
      );
  }
}
