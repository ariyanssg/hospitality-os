import { Injectable } from '@nestjs/common';
import { and, asc, eq, gt, lte } from 'drizzle-orm';
import {
  businessDates,
  folios,
  guests,
  properties,
  reservationGuests,
  reservationNights,
  reservationRoomStays,
  reservationStatusLog,
  reservations,
  rooms,
  uuidv7,
  type DbTransaction,
} from '@vela/db';
import type {
  ArrivalRow,
  CreateReservationInput,
  NightAuditResult,
  Reservation,
  RoomTypeAvailability,
} from '@vela/contracts';
import {
  BusinessDateService,
  getRequestContext,
  Money,
  NotFoundError,
  StateConflictError,
  ValidationError,
  type UowHelpers,
} from '../kernel';
import { AvailabilityService } from '../availability';
import { RatesService } from '../rates';
import { FolioService } from '../folio';
import { GlService } from '../gl';
import { addDays, confirmationNumberFrom, nightsBetween } from './domain/dates';

@Injectable()
export class ReservationsService {
  constructor(
    private readonly rates: RatesService,
    private readonly availability: AvailabilityService,
    private readonly folio: FolioService,
    private readonly gl: GlService,
    private readonly businessDate: BusinessDateService,
  ) {}

  private requireProperty(): string {
    const { propertyIds } = getRequestContext();
    const propertyId = propertyIds[0];
    if (!propertyId) {
      throw new ValidationError('A property is required', [
        { field: 'X-Property-Id', code: 'REQUIRED' },
      ]);
    }
    return propertyId;
  }

  /** Booking sequence (doc modules/01): price resolve → counter increment → folio create → event. */
  async createBooking(
    tx: DbTransaction,
    helpers: UowHelpers,
    input: CreateReservationInput,
  ): Promise<string> {
    const ctx = getRequestContext();
    const propertyId = this.requireProperty();
    const dates = nightsBetween(input.arrivalDate, input.departureDate);
    if (dates.length === 0) {
      throw new ValidationError('Departure must be after arrival', [
        { field: 'departureDate', code: 'INVALID_RANGE' },
      ]);
    }

    const guestId = await this.resolveGuest(tx, input.guest);

    // 1) Resolve price (one indexed lookup per night).
    const stay = await this.rates.resolveStay(tx, {
      propertyId,
      ratePlanId: input.ratePlanId,
      roomTypeId: input.roomTypeId,
      dates,
      adults: input.adults,
    });

    // 2) Decrement availability — the counter update IS the lock (clean 409 on conflict).
    await this.availability.reserve(tx, helpers, {
      propertyId,
      roomTypeId: input.roomTypeId,
      dates,
    });

    // 3) Persist reservation header + nights + room-stay + primary guest.
    const id = uuidv7();
    const confirmationNumber = confirmationNumberFrom(id);
    await tx.insert(reservations).values({
      id,
      tenantId: ctx.tenantId,
      propertyId,
      confirmationNumber,
      status: 'confirmed',
      guestId,
      arrivalDate: input.arrivalDate,
      departureDate: input.departureDate,
      roomTypeId: input.roomTypeId,
      ratePlanId: input.ratePlanId,
      adults: input.adults,
      children: input.children,
      totalAmount: stay.total.amount,
      currency: stay.currency,
      source: input.source ?? {},
      guarantee: input.guarantee ?? {},
    });

    for (const night of stay.nights) {
      await tx.insert(reservationNights).values({
        id: uuidv7(),
        tenantId: ctx.tenantId,
        propertyId,
        reservationId: id,
        stayDate: night.stayDate,
        roomTypeId: input.roomTypeId,
        ratePlanId: night.ratePlanId,
        price: night.price.amount,
        currency: stay.currency,
      });
    }

    await tx.insert(reservationRoomStays).values({
      id: uuidv7(),
      tenantId: ctx.tenantId,
      propertyId,
      reservationId: id,
      roomId: null,
      fromDate: input.arrivalDate,
      toDate: input.departureDate,
    });

    await tx.insert(reservationGuests).values({
      id: uuidv7(),
      tenantId: ctx.tenantId,
      reservationId: id,
      guestId,
      isPrimary: 'true',
    });

    await this.logStatus(tx, propertyId, id, null, 'confirmed');

    // 4) Create the folio (deposit schedule would post here).
    await this.folio.createFolio(tx, {
      propertyId,
      reservationId: id,
      guestId,
      currency: stay.currency,
    });

    helpers.emit({
      type: 'reservation.created',
      aggregateType: 'reservation',
      aggregateId: id,
      propertyId,
      data: {
        reservationId: id,
        confirmationNumber,
        arrivalDate: input.arrivalDate,
        departureDate: input.departureDate,
        total: stay.total.toJSON(),
      },
    });
    helpers.audit({
      action: 'reservation.create',
      entityType: 'reservation',
      entityId: id,
      after: { confirmationNumber, total: stay.total.amount },
      propertyId,
    });

    return id;
  }

  async checkIn(
    tx: DbTransaction,
    helpers: UowHelpers,
    id: string,
    roomId?: string,
  ): Promise<void> {
    const res = await this.loadReservation(tx, id);
    if (res.status !== 'confirmed') {
      throw new StateConflictError(`Cannot check in a reservation in status ${res.status}`);
    }
    await tx
      .update(reservations)
      .set({ status: 'checked_in', checkedInAt: new Date(), updatedAt: new Date() })
      .where(eq(reservations.id, id));

    if (roomId) {
      await tx
        .update(reservationRoomStays)
        .set({ roomId })
        .where(eq(reservationRoomStays.reservationId, id));
      await tx
        .update(rooms)
        .set({ occupancy: 'occupied', statusUpdatedAt: new Date() })
        .where(eq(rooms.id, roomId));
      helpers.emit({
        type: 'room.assigned',
        aggregateType: 'room',
        aggregateId: roomId,
        propertyId: res.propertyId,
        data: { roomId, reservationId: id },
      });
    }

    await this.logStatus(tx, res.propertyId, id, res.status, 'checked_in');
    helpers.emit({
      type: 'reservation.checked_in',
      aggregateType: 'reservation',
      aggregateId: id,
      propertyId: res.propertyId,
      data: { reservationId: id, roomId: roomId ?? null },
    });
    helpers.audit({
      action: 'reservation.checkin',
      entityType: 'reservation',
      entityId: id,
      propertyId: res.propertyId,
    });
  }

  async checkOut(tx: DbTransaction, helpers: UowHelpers, id: string): Promise<void> {
    const res = await this.loadReservation(tx, id);
    if (res.status !== 'checked_in') {
      throw new StateConflictError(`Cannot check out a reservation in status ${res.status}`);
    }
    const folioId = await this.folio.openFolioIdForReservation(tx, id);
    if (folioId) {
      await this.folio.close(tx, helpers, folioId); // enforces zero balance
    }
    await tx
      .update(reservations)
      .set({ status: 'checked_out', checkedOutAt: new Date(), updatedAt: new Date() })
      .where(eq(reservations.id, id));

    // Free the room (now dirty, vacant) and sync housekeeping.
    const [stay] = await tx
      .select({ roomId: reservationRoomStays.roomId })
      .from(reservationRoomStays)
      .where(eq(reservationRoomStays.reservationId, id))
      .limit(1);
    if (stay?.roomId) {
      await tx
        .update(rooms)
        .set({ occupancy: 'vacant', hkStatus: 'dirty', statusUpdatedAt: new Date() })
        .where(eq(rooms.id, stay.roomId));
      helpers.emit({
        type: 'room.status_changed',
        aggregateType: 'room',
        aggregateId: stay.roomId,
        propertyId: res.propertyId,
        data: { roomId: stay.roomId, hkStatus: 'dirty', occupancy: 'vacant' },
      });
    }

    await this.logStatus(tx, res.propertyId, id, res.status, 'checked_out');
    helpers.emit({
      type: 'reservation.checked_out',
      aggregateType: 'reservation',
      aggregateId: id,
      propertyId: res.propertyId,
      data: { reservationId: id },
    });
    helpers.audit({
      action: 'reservation.checkout',
      entityType: 'reservation',
      entityId: id,
      propertyId: res.propertyId,
    });
  }

  async cancel(
    tx: DbTransaction,
    helpers: UowHelpers,
    id: string,
    reason: string | undefined,
  ): Promise<void> {
    const res = await this.loadReservation(tx, id);
    if (res.status !== 'confirmed' && res.status !== 'tentative') {
      throw new StateConflictError(`Cannot cancel a reservation in status ${res.status}`);
    }
    const dates = nightsBetween(res.arrivalDate, res.departureDate);
    await this.availability.release(tx, helpers, {
      propertyId: res.propertyId,
      roomTypeId: res.roomTypeId,
      dates,
    });
    await tx
      .update(reservations)
      .set({ status: 'cancelled', cancelledAt: new Date(), updatedAt: new Date() })
      .where(eq(reservations.id, id));
    await this.logStatus(tx, res.propertyId, id, res.status, 'cancelled', reason);
    helpers.emit({
      type: 'reservation.cancelled',
      aggregateType: 'reservation',
      aggregateId: id,
      propertyId: res.propertyId,
      data: { reservationId: id, reason: reason ?? null },
    });
    helpers.audit({
      action: 'reservation.cancel',
      entityType: 'reservation',
      entityId: id,
      reason,
      propertyId: res.propertyId,
    });
  }

  async getDto(tx: DbTransaction, id: string): Promise<Reservation> {
    const res = await this.loadReservation(tx, id);
    const nights = await tx
      .select({
        stayDate: reservationNights.stayDate,
        ratePlanId: reservationNights.ratePlanId,
        price: reservationNights.price,
        currency: reservationNights.currency,
        marketSegment: reservationNights.marketSegment,
      })
      .from(reservationNights)
      .where(eq(reservationNights.reservationId, id))
      .orderBy(asc(reservationNights.stayDate));
    const [folio] = await tx
      .select({ id: folios.id })
      .from(folios)
      .where(eq(folios.reservationId, id))
      .limit(1);

    return {
      id: res.id,
      confirmationNumber: res.confirmationNumber,
      status: res.status,
      propertyId: res.propertyId,
      guestId: res.guestId,
      arrivalDate: res.arrivalDate,
      departureDate: res.departureDate,
      roomTypeId: res.roomTypeId,
      ratePlanId: res.ratePlanId,
      adults: res.adults,
      children: res.children,
      total: Money.of(res.totalAmount, res.currency).toJSON(),
      currency: res.currency,
      nights: nights.map((n) => ({
        stayDate: n.stayDate,
        ratePlanId: n.ratePlanId,
        price: Money.of(n.price, n.currency).toJSON(),
        marketSegment: n.marketSegment,
      })),
      folioId: folio?.id ?? null,
    };
  }

  async arrivals(tx: DbTransaction, propertyId: string): Promise<ArrivalRow[]> {
    const ctx = getRequestContext();
    const businessDate = await this.businessDate.current(tx, propertyId);
    const rows = await tx
      .select({
        id: reservations.id,
        confirmationNumber: reservations.confirmationNumber,
        status: reservations.status,
        arrivalDate: reservations.arrivalDate,
        departureDate: reservations.departureDate,
        adults: reservations.adults,
        children: reservations.children,
        currency: reservations.currency,
        firstName: guests.firstName,
        lastName: guests.lastName,
        roomId: reservationRoomStays.roomId,
        folioBalance: folios.balance,
      })
      .from(reservations)
      .innerJoin(guests, eq(guests.id, reservations.guestId))
      .leftJoin(reservationRoomStays, eq(reservationRoomStays.reservationId, reservations.id))
      .leftJoin(folios, eq(folios.reservationId, reservations.id))
      .where(
        and(
          eq(reservations.tenantId, ctx.tenantId),
          eq(reservations.propertyId, propertyId),
          eq(reservations.arrivalDate, businessDate),
          eq(reservations.status, 'confirmed'),
        ),
      )
      .orderBy(asc(reservations.confirmationNumber));

    // Room-type code lookup is omitted from the join to keep the query flat; resolved separately.
    return rows.map((r) => ({
      id: r.id,
      confirmationNumber: r.confirmationNumber,
      status: r.status,
      guestName: `${r.firstName} ${r.lastName}`,
      arrivalDate: r.arrivalDate,
      departureDate: r.departureDate,
      roomTypeCode: '',
      adults: r.adults,
      children: r.children,
      balance: Money.of(r.folioBalance ?? '0', r.currency).toJSON(),
      roomAssigned: Boolean(r.roomId),
    }));
  }

  async availabilityWithPrices(
    tx: DbTransaction,
    propertyId: string,
    query: { from: string; to: string; roomTypeId?: string; adults: number; ratePlanId?: string },
  ): Promise<RoomTypeAvailability[]> {
    const counts = await this.availability.counts(
      tx,
      propertyId,
      query.from,
      query.to,
      query.roomTypeId,
    );
    const ratePlanId = query.ratePlanId ?? (await this.rates.defaultRatePlanId(tx, propertyId));

    const result: RoomTypeAvailability[] = [];
    for (const rt of counts) {
      const prices = ratePlanId
        ? await this.rates.pricesForRange(tx, propertyId, ratePlanId, rt.roomTypeId, query.from, query.to)
        : new Map<string, Money>();
      let minAvailable = Number.POSITIVE_INFINITY;
      let total: Money | null = null;
      const days = rt.days.map((d) => {
        minAvailable = Math.min(minAvailable, d.available);
        const price = prices.get(d.stayDate) ?? null;
        if (price) {
          total = total ? total.add(price) : price;
        }
        return {
          stayDate: d.stayDate,
          available: d.available,
          price: price ? price.toJSON() : null,
          closed: d.available <= 0,
        };
      });
      result.push({
        roomTypeId: rt.roomTypeId,
        roomTypeCode: rt.roomTypeCode,
        roomTypeName: rt.roomTypeName,
        minAvailable: Number.isFinite(minAvailable) ? minAvailable : 0,
        days,
        totalPrice: total ? (total as Money).toJSON() : null,
      });
    }
    return result;
  }

  /** Night audit walking skeleton (doc modules/01): no-shows, in-house room+tax, roll, trial balance. */
  async nightAudit(
    tx: DbTransaction,
    helpers: UowHelpers,
    propertyId: string,
  ): Promise<NightAuditResult> {
    const ctx = getRequestContext();
    const currentDate = await this.businessDate.current(tx, propertyId);
    const [property] = await tx
      .select({ currency: properties.currency })
      .from(properties)
      .where(eq(properties.id, propertyId))
      .limit(1);
    const currency = property?.currency ?? 'USD';

    // No-shows: confirmed reservations whose arrival date has passed without check-in.
    const noShows = await tx
      .select({ id: reservations.id, roomTypeId: reservations.roomTypeId, arrivalDate: reservations.arrivalDate, departureDate: reservations.departureDate })
      .from(reservations)
      .where(
        and(
          eq(reservations.tenantId, ctx.tenantId),
          eq(reservations.propertyId, propertyId),
          eq(reservations.status, 'confirmed'),
          lte(reservations.arrivalDate, currentDate),
        ),
      );
    for (const ns of noShows) {
      await this.availability.release(tx, helpers, {
        propertyId,
        roomTypeId: ns.roomTypeId,
        dates: nightsBetween(ns.arrivalDate, ns.departureDate),
      });
      await tx
        .update(reservations)
        .set({ status: 'no_show', updatedAt: new Date() })
        .where(eq(reservations.id, ns.id));
      await this.logStatus(tx, propertyId, ns.id, 'confirmed', 'no_show', 'night audit');
      helpers.emit({
        type: 'reservation.no_show',
        aggregateType: 'reservation',
        aggregateId: ns.id,
        propertyId,
        data: { reservationId: ns.id },
      });
    }

    // In-house: post the night's room charge + tax for each checked-in reservation.
    const inHouse = await tx
      .select({ id: reservations.id })
      .from(reservations)
      .where(
        and(
          eq(reservations.tenantId, ctx.tenantId),
          eq(reservations.propertyId, propertyId),
          eq(reservations.status, 'checked_in'),
          lte(reservations.arrivalDate, currentDate),
          gt(reservations.departureDate, currentDate),
        ),
      );
    let roomsPosted = 0;
    for (const res of inHouse) {
      const folioId = await this.folio.openFolioIdForReservation(tx, res.id);
      if (!folioId) continue;
      const [night] = await tx
        .select({ price: reservationNights.price, currency: reservationNights.currency })
        .from(reservationNights)
        .where(and(eq(reservationNights.reservationId, res.id), eq(reservationNights.stayDate, currentDate)))
        .limit(1);
      if (!night) continue;
      await this.folio.postRoomCharge(tx, helpers, {
        folioId,
        amount: Money.of(night.price, night.currency),
        businessDate: currentDate,
        description: `Room — ${currentDate}`,
      });
      roomsPosted += 1;
    }

    const noShowsProcessed = noShows.length;

    // Roll the business date forward.
    const newDate = addDays(currentDate, 1);
    await tx
      .update(businessDates)
      .set({ businessDate: newDate, updatedAt: new Date() })
      .where(and(eq(businessDates.tenantId, ctx.tenantId), eq(businessDates.propertyId, propertyId)));

    const trialBalance = await this.gl.trialBalance(tx, propertyId, currency, currentDate);

    helpers.emit({
      type: 'nightaudit.completed',
      aggregateType: 'property',
      aggregateId: propertyId,
      propertyId,
      data: { previousBusinessDate: currentDate, newBusinessDate: newDate, roomsPosted },
    });
    helpers.audit({
      action: 'nightaudit.run',
      entityType: 'property',
      entityId: propertyId,
      after: { newBusinessDate: newDate, roomsPosted, noShowsProcessed },
      propertyId,
    });

    return {
      propertyId,
      previousBusinessDate: currentDate,
      newBusinessDate: newDate,
      roomsPosted,
      noShowsProcessed,
      journalEntryId: null,
      trialBalance,
    };
  }

  private async resolveGuest(tx: DbTransaction, ref: CreateReservationInput['guest']): Promise<string> {
    const ctx = getRequestContext();
    if ('id' in ref) {
      const [g] = await tx
        .select({ id: guests.id })
        .from(guests)
        .where(and(eq(guests.tenantId, ctx.tenantId), eq(guests.id, ref.id)))
        .limit(1);
      if (!g) throw new NotFoundError('Guest');
      return g.id;
    }
    const id = uuidv7();
    await tx.insert(guests).values({
      id,
      tenantId: ctx.tenantId,
      firstName: ref.firstName,
      lastName: ref.lastName,
      email: ref.email ?? null,
      phone: ref.phone ?? null,
    });
    return id;
  }

  private async loadReservation(tx: DbTransaction, id: string) {
    const ctx = getRequestContext();
    const [res] = await tx
      .select()
      .from(reservations)
      .where(and(eq(reservations.tenantId, ctx.tenantId), eq(reservations.id, id)))
      .limit(1);
    if (!res) throw new NotFoundError('Reservation');
    return res;
  }

  private async logStatus(
    tx: DbTransaction,
    propertyId: string,
    reservationId: string,
    from: string | null,
    to: string,
    reason?: string,
  ): Promise<void> {
    const ctx = getRequestContext();
    await tx.insert(reservationStatusLog).values({
      id: uuidv7(),
      tenantId: ctx.tenantId,
      propertyId,
      reservationId,
      fromStatus: from,
      toStatus: to,
      reason: reason ?? null,
      actorId: ctx.userId,
    });
  }
}
