import { Injectable } from '@nestjs/common';
import { and, asc, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { guests, reservations, type DbTransaction } from '@vela/db';
import type { Guest, GuestProfile, UpdateGuestInput } from '@vela/contracts';
import { getRequestContext, NotFoundError, type UowHelpers } from '../kernel';

/** Guest profiles (CRM v0): search, profile with stay history, edit. Merge/dedup is Phase 2. */
@Injectable()
export class GuestsService {
  async search(tx: DbTransaction, q: string, limit: number): Promise<Guest[]> {
    const ctx = getRequestContext();
    const text = q.trim();
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
        ),
      )
      .orderBy(asc(guests.lastName), asc(guests.firstName))
      .limit(limit);
    return rows.map((g) => this.toDto(g));
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
