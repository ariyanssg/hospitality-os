import { Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { and, asc, desc, eq, gt, ilike, or, sql } from 'drizzle-orm';
import { guests, reservations, type DbTransaction } from '@vela/db';
import type {
  Guest,
  GuestProfile,
  GuestSearchPage,
  GuestSearchQuery,
  UpdateGuestInput,
} from '@vela/contracts';
import { env } from '../../config/env';
import { getRequestContext, NotFoundError, ValidationError, type UowHelpers } from '../kernel';

/** Guest profiles (CRM v0): search, profile with stay history, edit. Merge/dedup is Phase 2. */
@Injectable()
export class GuestsService {
  private cursorSecret(): string {
    return env().BETTER_AUTH_SECRET;
  }

  private invalidCursor(): never {
    throw new ValidationError('Invalid cursor', [{ field: 'cursor', code: 'INVALID' }]);
  }

  private encodeGuestCursor(lastName: string, firstName: string, id: string): string {
    const payload = Buffer.from(JSON.stringify({ lastName, firstName, id })).toString('base64url');
    const sig = createHmac('sha256', this.cursorSecret()).update(payload).digest('base64url');
    return `${payload}.${sig}`;
  }

  private decodeGuestCursor(cursor: string): { lastName: string; firstName: string; id: string } {
    const [payload, sig] = cursor.split('.');
    if (!payload || !sig) this.invalidCursor();
    const expected = createHmac('sha256', this.cursorSecret()).update(payload).digest('base64url');
    if (
      expected.length !== sig.length ||
      !timingSafeEqual(Buffer.from(expected), Buffer.from(sig))
    ) {
      this.invalidCursor();
    }
    let parsed: { lastName?: unknown; firstName?: unknown; id?: unknown };
    try {
      parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
        lastName?: unknown;
        firstName?: unknown;
        id?: unknown;
      };
    } catch {
      this.invalidCursor();
    }
    if (
      typeof parsed.lastName !== 'string' ||
      typeof parsed.firstName !== 'string' ||
      typeof parsed.id !== 'string'
    ) {
      this.invalidCursor();
    }
    return { lastName: parsed.lastName, firstName: parsed.firstName, id: parsed.id };
  }

  async search(tx: DbTransaction, query: GuestSearchQuery): Promise<GuestSearchPage> {
    const ctx = getRequestContext();
    const text = query.q;
    const cursor = query.cursor ? this.decodeGuestCursor(query.cursor) : undefined;
    const rows = await tx
      .select()
      .from(guests)
      .where(
        and(
          eq(guests.tenantId, ctx.tenantId),
          or(
            ilike(guests.firstName, `%${text}%`),
            ilike(guests.lastName, `%${text}%`),
            ilike(guests.email, `%${text}%`),
            sql`(${guests.firstName} || ' ' || ${guests.lastName}) ILIKE ${`%${text}%`}`,
          ),
          cursor
            ? or(
                gt(guests.lastName, cursor.lastName),
                and(eq(guests.lastName, cursor.lastName), gt(guests.firstName, cursor.firstName)),
                and(
                  eq(guests.lastName, cursor.lastName),
                  eq(guests.firstName, cursor.firstName),
                  gt(guests.id, cursor.id),
                ),
              )
            : undefined,
        ),
      )
      .orderBy(asc(guests.lastName), asc(guests.firstName), asc(guests.id))
      .limit(query.limit + 1);
    const pageRows = rows.slice(0, query.limit);
    const next = rows.length > query.limit ? pageRows[pageRows.length - 1] : undefined;
    return {
      data: pageRows.map((g) => this.toDto(g)),
      meta: {
        nextCursor: next ? this.encodeGuestCursor(next.lastName, next.firstName, next.id) : null,
      },
    };
  }

  async profile(tx: DbTransaction, id: string): Promise<GuestProfile> {
    const ctx = getRequestContext();
    const [guest] = await tx
      .select()
      .from(guests)
      .where(and(eq(guests.tenantId, ctx.tenantId), eq(guests.id, id)))
      .limit(1);
    if (!guest) throw new NotFoundError('Guest');

    const stays = await tx
      .select({
        id: reservations.id,
        confirmationNumber: reservations.confirmationNumber,
        status: reservations.status,
        arrivalDate: reservations.arrivalDate,
        departureDate: reservations.departureDate,
      })
      .from(reservations)
      .where(and(eq(reservations.tenantId, ctx.tenantId), eq(reservations.guestId, id)))
      .orderBy(desc(reservations.arrivalDate))
      .limit(50);

    return { ...this.toDto(guest), reservations: stays };
  }

  async update(
    tx: DbTransaction,
    helpers: UowHelpers,
    id: string,
    input: UpdateGuestInput,
  ): Promise<void> {
    const ctx = getRequestContext();
    const [guest] = await tx
      .select()
      .from(guests)
      .where(and(eq(guests.tenantId, ctx.tenantId), eq(guests.id, id)))
      .limit(1);
    if (!guest) throw new NotFoundError('Guest');

    await tx
      .update(guests)
      .set({
        firstName: input.firstName ?? guest.firstName,
        lastName: input.lastName ?? guest.lastName,
        email: input.email !== undefined ? input.email : guest.email,
        phone: input.phone !== undefined ? input.phone : guest.phone,
        vipTier: input.vipTier !== undefined ? input.vipTier : guest.vipTier,
        nationality: input.nationality !== undefined ? input.nationality : guest.nationality,
        updatedAt: new Date(),
      })
      .where(eq(guests.id, id));

    helpers.audit({
      action: 'guest.edit',
      entityType: 'guest',
      entityId: id,
      before: {
        firstName: guest.firstName,
        lastName: guest.lastName,
        email: guest.email,
        phone: guest.phone,
      },
      after: input,
    });
  }

  private toDto(g: typeof guests.$inferSelect): Guest {
    return {
      id: g.id,
      firstName: g.firstName,
      lastName: g.lastName,
      email: g.email,
      phone: g.phone,
      vipTier: g.vipTier,
      nationality: g.nationality,
    };
  }
}
