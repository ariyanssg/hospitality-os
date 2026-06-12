import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { bookingSessions, uuidv7, type DbTransaction } from '@vela/db';
import type { BookingSession, StartBookingSessionInput } from '@vela/contracts';
import {
  getRequestContext,
  Money,
  NotFoundError,
  StateConflictError,
  ValidationError,
  type UowHelpers,
} from '../kernel';
import { RatesService } from '../rates';
import { ReservationsService } from '../reservations';
import { nightsBetween } from '../reservations/domain/dates';

function expiresInMinutes(minutes: number): Date {
  return new Date(Date.now() + minutes * 60_000);
}

@Injectable()
export class BookingService {
  constructor(
    private readonly rates: RatesService,
    private readonly reservations: ReservationsService,
  ) {}

  async start(
    tx: DbTransaction,
    helpers: UowHelpers,
    propertyId: string,
    input: StartBookingSessionInput,
  ): Promise<string> {
    const ctx = getRequestContext();
    const dates = nightsBetween(input.arrivalDate, input.departureDate);
    if (dates.length === 0) {
      throw new ValidationError('Departure must be after arrival', [
        { field: 'departureDate', code: 'INVALID_RANGE' },
      ]);
    }
    const stay = await this.rates.resolveStay(tx, {
      propertyId,
      ratePlanId: input.ratePlanId,
      roomTypeId: input.roomTypeId,
      dates,
      adults: input.adults,
    });
    const id = uuidv7();
    await tx.insert(bookingSessions).values({
      id,
      tenantId: ctx.tenantId,
      propertyId,
      arrivalDate: input.arrivalDate,
      departureDate: input.departureDate,
      roomTypeId: input.roomTypeId,
      ratePlanId: input.ratePlanId,
      adults: String(input.adults),
      children: String(input.children),
      quotedTotal: stay.total.amount,
      currency: stay.currency,
      guest: input.guest,
      source: input.source,
      expiresAt: expiresInMinutes(20),
    });
    helpers.emit({
      type: 'booking.session_started',
      aggregateType: 'booking_session',
      aggregateId: id,
      propertyId,
      data: { sessionId: id, arrivalDate: input.arrivalDate, departureDate: input.departureDate },
    });
    return id;
  }

  async confirm(
    tx: DbTransaction,
    helpers: UowHelpers,
    id: string,
    propertyId?: string,
    pspToken?: string,
  ): Promise<string> {
    const ctx = getRequestContext();
    const [session] = await tx
      .select()
      .from(bookingSessions)
      .where(
        and(
          eq(bookingSessions.tenantId, ctx.tenantId),
          eq(bookingSessions.id, id),
          propertyId ? eq(bookingSessions.propertyId, propertyId) : undefined,
        ),
      )
      .limit(1);
    if (!session) throw new NotFoundError('Booking session');
    if (session.status === 'confirmed' && session.reservationId) return session.reservationId;
    if (session.status !== 'started')
      throw new StateConflictError(`Booking session is ${session.status}`);
    if (session.expiresAt.getTime() < Date.now()) {
      await tx
        .update(bookingSessions)
        .set({ status: 'expired', updatedAt: new Date() })
        .where(eq(bookingSessions.id, id));
      throw new StateConflictError('Booking session expired');
    }

    const guest = session.guest as StartBookingSessionInput['guest'];
    const reservationId = await this.reservations.createBooking(tx, helpers, {
      guest,
      arrivalDate: session.arrivalDate,
      departureDate: session.departureDate,
      roomTypeId: session.roomTypeId,
      ratePlanId: session.ratePlanId,
      adults: Number(session.adults),
      children: Number(session.children),
      source: { channel: 'booking_engine' },
      guarantee: pspToken ? { type: 'card_token', token: pspToken } : undefined,
    });
    await tx
      .update(bookingSessions)
      .set({ status: 'confirmed', reservationId, confirmedAt: new Date(), updatedAt: new Date() })
      .where(eq(bookingSessions.id, id));
    helpers.emit({
      type: 'booking.session_confirmed',
      aggregateType: 'booking_session',
      aggregateId: id,
      propertyId: session.propertyId,
      data: { sessionId: id, reservationId },
    });
    return reservationId;
  }

  async cancel(
    tx: DbTransaction,
    helpers: UowHelpers,
    id: string,
    propertyId?: string,
  ): Promise<void> {
    const ctx = getRequestContext();
    const [session] = await tx
      .select({
        id: bookingSessions.id,
        propertyId: bookingSessions.propertyId,
        status: bookingSessions.status,
      })
      .from(bookingSessions)
      .where(
        and(
          eq(bookingSessions.tenantId, ctx.tenantId),
          eq(bookingSessions.id, id),
          propertyId ? eq(bookingSessions.propertyId, propertyId) : undefined,
        ),
      )
      .limit(1);
    if (!session) throw new NotFoundError('Booking session');
    if (session.status === 'confirmed')
      throw new StateConflictError('Confirmed sessions must cancel the reservation');
    await tx
      .update(bookingSessions)
      .set({ status: 'cancelled', cancelledAt: new Date(), updatedAt: new Date() })
      .where(eq(bookingSessions.id, id));
    helpers.emit({
      type: 'booking.session_cancelled',
      aggregateType: 'booking_session',
      aggregateId: id,
      propertyId: session.propertyId,
      data: { sessionId: id },
    });
  }

  async dto(tx: DbTransaction, id: string, propertyId?: string): Promise<BookingSession> {
    const ctx = getRequestContext();
    const [s] = await tx
      .select()
      .from(bookingSessions)
      .where(
        and(
          eq(bookingSessions.tenantId, ctx.tenantId),
          eq(bookingSessions.id, id),
          propertyId ? eq(bookingSessions.propertyId, propertyId) : undefined,
        ),
      )
      .limit(1);
    if (!s) throw new NotFoundError('Booking session');
    return {
      id: s.id,
      status: s.status,
      arrivalDate: s.arrivalDate,
      departureDate: s.departureDate,
      roomTypeId: s.roomTypeId,
      ratePlanId: s.ratePlanId,
      adults: Number(s.adults),
      children: Number(s.children),
      quotedTotal: Money.of(s.quotedTotal, s.currency.trim()).toJSON(),
      reservationId: s.reservationId,
      expiresAt: s.expiresAt.toISOString(),
    };
  }
}
