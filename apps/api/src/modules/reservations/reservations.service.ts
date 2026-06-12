import { Injectable } from '@nestjs/common';
import { and, asc, eq, gt, gte, ilike, inArray, isNull, lt, lte, or, sql } from 'drizzle-orm';
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
  roomTypes,
  rooms,
  uuidv7,
  type DbTransaction,
} from '@vela/db';
import type {
  ArrivalRow,
  CreateReservationInput,
  DepartureRow,
  InHouseRow,
  ModifyReservationInput,
  NightAuditResult,
  Reservation,
  ReservationListQuery,
  ReservationListRow,
  RoomRackRow,
  RoomTypeAvailability,
  WalkInInput,
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
import { HousekeepingService } from '../housekeeping';
import { addDays, confirmationNumberFrom, nightsBetween } from './domain/dates';

@Injectable()
export class ReservationsService {
  constructor(
    private readonly rates: RatesService,
    private readonly availability: AvailabilityService,
    private readonly folio: FolioService,
    private readonly gl: GlService,
    private readonly businessDate: BusinessDateService,
    private readonly housekeeping: HousekeepingService,
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
      const ctx = getRequestContext();
      const [room] = await tx
        .select({ id: rooms.id, occupancy: rooms.occupancy, roomTypeId: rooms.roomTypeId })
        .from(rooms)
        .where(
          and(
            eq(rooms.tenantId, ctx.tenantId),
            eq(rooms.propertyId, res.propertyId),
            eq(rooms.id, roomId),
          ),
        )
        .limit(1);
      if (!room) throw new NotFoundError('Room');
      if (room.occupancy !== 'vacant') {
        throw new StateConflictError('Room is occupied');
      }
      await tx
        .update(reservationRoomStays)
        .set({ roomId })
        .where(and(eq(reservationRoomStays.reservationId, id), isNull(reservationRoomStays.closedAt)));
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

    // Pre-arrival deposits move from the deposit ledger onto the (now active) folio.
    await this.folio.applyHeldDeposits(tx, helpers, id);

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

    // Free the room (now dirty, vacant) and hand it to housekeeping as a departure clean.
    const [stay] = await tx
      .select({ roomId: reservationRoomStays.roomId })
      .from(reservationRoomStays)
      .where(and(eq(reservationRoomStays.reservationId, id), isNull(reservationRoomStays.closedAt)))
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
      await this.housekeeping.createTask(tx, helpers, {
        roomId: stay.roomId,
        taskType: 'departure_clean',
        priority: 'high',
        reservationId: id,
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

  /** Manual no-show (front desk), distinct from the night-audit sweep. */
  async noShow(
    tx: DbTransaction,
    helpers: UowHelpers,
    id: string,
    reason: string | undefined,
  ): Promise<void> {
    const res = await this.loadReservation(tx, id);
    if (res.status !== 'confirmed') {
      throw new StateConflictError(`Cannot mark a ${res.status} reservation as no-show`);
    }
    await this.availability.release(tx, helpers, {
      propertyId: res.propertyId,
      roomTypeId: res.roomTypeId,
      dates: nightsBetween(res.arrivalDate, res.departureDate),
    });
    await tx
      .update(reservations)
      .set({ status: 'no_show', updatedAt: new Date() })
      .where(eq(reservations.id, id));
    await this.logStatus(tx, res.propertyId, id, res.status, 'no_show', reason);
    helpers.emit({
      type: 'reservation.no_show',
      aggregateType: 'reservation',
      aggregateId: id,
      propertyId: res.propertyId,
      data: { reservationId: id, reason: reason ?? null },
    });
    helpers.audit({
      action: 'reservation.no_show',
      entityType: 'reservation',
      entityId: id,
      reason,
      propertyId: res.propertyId,
    });
  }

  /** Reinstate a cancelled/no-show reservation — re-walks the availability counters (may 409). */
  async reinstate(
    tx: DbTransaction,
    helpers: UowHelpers,
    id: string,
    reason: string | undefined,
  ): Promise<void> {
    const res = await this.loadReservation(tx, id);
    if (res.status !== 'cancelled' && res.status !== 'no_show') {
      throw new StateConflictError(`Cannot reinstate a reservation in status ${res.status}`);
    }
    await this.availability.reserve(tx, helpers, {
      propertyId: res.propertyId,
      roomTypeId: res.roomTypeId,
      dates: nightsBetween(res.arrivalDate, res.departureDate),
    });
    await tx
      .update(reservations)
      .set({ status: 'confirmed', cancelledAt: null, updatedAt: new Date() })
      .where(eq(reservations.id, id));
    await this.logStatus(tx, res.propertyId, id, res.status, 'confirmed', reason);
    helpers.emit({
      type: 'reservation.reinstated',
      aggregateType: 'reservation',
      aggregateId: id,
      propertyId: res.propertyId,
      data: { reservationId: id },
    });
    helpers.audit({
      action: 'reservation.reinstate',
      entityType: 'reservation',
      entityId: id,
      reason,
      propertyId: res.propertyId,
    });
  }

  /**
   * Modify dates/room type/rate plan/occupancy. Inventory-affecting changes release the old
   * stay window and re-walk the counters for the new one — same overbooking guard as booking.
   */
  async modify(
    tx: DbTransaction,
    helpers: UowHelpers,
    id: string,
    input: ModifyReservationInput,
  ): Promise<void> {
    const ctx = getRequestContext();
    const res = await this.loadReservation(tx, id);
    if (res.status !== 'confirmed' && res.status !== 'tentative') {
      throw new StateConflictError(`Cannot modify a reservation in status ${res.status}`);
    }

    const arrivalDate = input.arrivalDate ?? res.arrivalDate;
    const departureDate = input.departureDate ?? res.departureDate;
    const roomTypeId = input.roomTypeId ?? res.roomTypeId;
    const ratePlanId = input.ratePlanId ?? res.ratePlanId;
    const adults = input.adults ?? res.adults;
    const children = input.children ?? res.children;

    const inventoryChanged =
      arrivalDate !== res.arrivalDate ||
      departureDate !== res.departureDate ||
      roomTypeId !== res.roomTypeId ||
      ratePlanId !== res.ratePlanId ||
      adults !== res.adults;

    const before = {
      arrivalDate: res.arrivalDate,
      departureDate: res.departureDate,
      roomTypeId: res.roomTypeId,
      ratePlanId: res.ratePlanId,
      adults: res.adults,
      children: res.children,
    };

    if (inventoryChanged) {
      const dates = nightsBetween(arrivalDate, departureDate);
      if (dates.length === 0) {
        throw new ValidationError('Departure must be after arrival', [
          { field: 'departureDate', code: 'INVALID_RANGE' },
        ]);
      }

      // Release the old window first so a same-room-type date shift can reuse its own inventory.
      await this.availability.release(tx, helpers, {
        propertyId: res.propertyId,
        roomTypeId: res.roomTypeId,
        dates: nightsBetween(res.arrivalDate, res.departureDate),
      });
      const stay = await this.rates.resolveStay(tx, {
        propertyId: res.propertyId,
        ratePlanId,
        roomTypeId,
        dates,
        adults,
      });
      await this.availability.reserve(tx, helpers, {
        propertyId: res.propertyId,
        roomTypeId,
        dates,
      });

      await tx.delete(reservationNights).where(eq(reservationNights.reservationId, id));
      for (const night of stay.nights) {
        await tx.insert(reservationNights).values({
          id: uuidv7(),
          tenantId: ctx.tenantId,
          propertyId: res.propertyId,
          reservationId: id,
          stayDate: night.stayDate,
          roomTypeId,
          ratePlanId: night.ratePlanId,
          price: night.price.amount,
          currency: stay.currency,
        });
      }
      await tx
        .update(reservationRoomStays)
        .set({ fromDate: arrivalDate, toDate: departureDate })
        .where(and(eq(reservationRoomStays.reservationId, id), isNull(reservationRoomStays.closedAt)));
      await tx
        .update(reservations)
        .set({
          arrivalDate,
          departureDate,
          roomTypeId,
          ratePlanId,
          adults,
          children,
          totalAmount: stay.total.amount,
          currency: stay.currency,
          notes: input.notes ?? res.notes,
          updatedAt: new Date(),
        })
        .where(eq(reservations.id, id));
    } else {
      await tx
        .update(reservations)
        .set({ adults, children, notes: input.notes ?? res.notes, updatedAt: new Date() })
        .where(eq(reservations.id, id));
    }

    helpers.emit({
      type: 'reservation.modified',
      aggregateType: 'reservation',
      aggregateId: id,
      propertyId: res.propertyId,
      data: { reservationId: id, arrivalDate, departureDate, roomTypeId, ratePlanId },
    });
    helpers.audit({
      action: 'reservation.edit',
      entityType: 'reservation',
      entityId: id,
      before,
      after: { arrivalDate, departureDate, roomTypeId, ratePlanId, adults, children },
      propertyId: res.propertyId,
    });
  }

  /**
   * Room move (doc modules/01): closes the current room_stay at the effective date and opens a
   * new one — history, not overwrite. The vacated room goes dirty + gets a housekeeping task.
   */
  async roomMove(
    tx: DbTransaction,
    helpers: UowHelpers,
    id: string,
    input: { roomId: string; effectiveDate: string; reason?: string },
  ): Promise<void> {
    const ctx = getRequestContext();
    const res = await this.loadReservation(tx, id);
    if (res.status !== 'checked_in') {
      throw new StateConflictError(`Cannot move a reservation in status ${res.status}`);
    }

    const [target] = await tx
      .select({ id: rooms.id, occupancy: rooms.occupancy, hkStatus: rooms.hkStatus })
      .from(rooms)
      .where(
        and(
          eq(rooms.tenantId, ctx.tenantId),
          eq(rooms.propertyId, res.propertyId),
          eq(rooms.id, input.roomId),
        ),
      )
      .limit(1);
    if (!target) throw new NotFoundError('Room');
    if (target.occupancy !== 'vacant') throw new StateConflictError('Target room is occupied');

    const [currentStay] = await tx
      .select()
      .from(reservationRoomStays)
      .where(and(eq(reservationRoomStays.reservationId, id), isNull(reservationRoomStays.closedAt)))
      .limit(1);
    if (!currentStay) throw new StateConflictError('Reservation has no open room stay');
    const fromRoomId = currentStay.roomId;
    if (fromRoomId === input.roomId) {
      throw new StateConflictError('Reservation is already in that room');
    }

    // Close the current stay segment and open the new one.
    await tx
      .update(reservationRoomStays)
      .set({ toDate: input.effectiveDate, closedAt: new Date() })
      .where(eq(reservationRoomStays.id, currentStay.id));
    await tx.insert(reservationRoomStays).values({
      id: uuidv7(),
      tenantId: ctx.tenantId,
      propertyId: res.propertyId,
      reservationId: id,
      roomId: input.roomId,
      fromDate: input.effectiveDate,
      toDate: res.departureDate,
    });

    await tx
      .update(rooms)
      .set({ occupancy: 'occupied', statusUpdatedAt: new Date() })
      .where(eq(rooms.id, input.roomId));

    if (fromRoomId) {
      await tx
        .update(rooms)
        .set({ occupancy: 'vacant', hkStatus: 'dirty', statusUpdatedAt: new Date() })
        .where(eq(rooms.id, fromRoomId));
      await this.housekeeping.createTask(tx, helpers, {
        roomId: fromRoomId,
        taskType: 'departure_clean',
        priority: 'high',
        reservationId: id,
        notes: `Room move: ${input.reason ?? 'no reason given'}`,
      });
    }

    helpers.emit({
      type: 'room.moved',
      aggregateType: 'reservation',
      aggregateId: id,
      propertyId: res.propertyId,
      data: {
        reservationId: id,
        fromRoomId,
        toRoomId: input.roomId,
        effectiveDate: input.effectiveDate,
      },
    });
    helpers.audit({
      action: 'room.move',
      entityType: 'reservation',
      entityId: id,
      before: { roomId: fromRoomId },
      after: { roomId: input.roomId, effectiveDate: input.effectiveDate },
      reason: input.reason,
      propertyId: res.propertyId,
    });
  }

  /** Walk-in (doc modules/01): book tonight at the desk and check in immediately. */
  async walkIn(tx: DbTransaction, helpers: UowHelpers, input: WalkInInput): Promise<string> {
    const propertyId = this.requireProperty();
    const businessDate = await this.businessDate.current(tx, propertyId);
    const ratePlanId = input.ratePlanId ?? (await this.rates.defaultRatePlanId(tx, propertyId));
    if (!ratePlanId) {
      throw new ValidationError('No active rate plan for this property', [
        { field: 'ratePlanId', code: 'REQUIRED' },
      ]);
    }
    const id = await this.createBooking(tx, helpers, {
      guest: input.guest,
      arrivalDate: businessDate,
      departureDate: input.departureDate,
      roomTypeId: input.roomTypeId,
      ratePlanId,
      adults: input.adults,
      children: input.children,
      source: { channel: 'walk_in' },
    });
    await this.checkIn(tx, helpers, id, input.roomId);
    return id;
  }

  async list(
    tx: DbTransaction,
    propertyId: string,
    query: ReservationListQuery,
  ): Promise<ReservationListRow[]> {
    const ctx = getRequestContext();
    const text = query.q?.trim();
    const rows = await tx
      .select({
        id: reservations.id,
        confirmationNumber: reservations.confirmationNumber,
        status: reservations.status,
        arrivalDate: reservations.arrivalDate,
        departureDate: reservations.departureDate,
        adults: reservations.adults,
        children: reservations.children,
        totalAmount: reservations.totalAmount,
        currency: reservations.currency,
        firstName: guests.firstName,
        lastName: guests.lastName,
      })
      .from(reservations)
      .innerJoin(guests, eq(guests.id, reservations.guestId))
      .where(
        and(
          eq(reservations.tenantId, ctx.tenantId),
          eq(reservations.propertyId, propertyId),
          query.status ? eq(reservations.status, query.status) : undefined,
          query.from ? gte(reservations.arrivalDate, query.from) : undefined,
          query.to ? lte(reservations.arrivalDate, query.to) : undefined,
          text
            ? or(
                ilike(reservations.confirmationNumber, `%${text}%`),
                ilike(guests.lastName, `%${text}%`),
                ilike(guests.firstName, `%${text}%`),
                sql`(${guests.firstName} || ' ' || ${guests.lastName}) ILIKE ${`%${text}%`}`,
              )
            : undefined,
        ),
      )
      .orderBy(asc(reservations.arrivalDate), asc(reservations.confirmationNumber))
      .limit(query.limit);

    return rows.map((r) => ({
      id: r.id,
      confirmationNumber: r.confirmationNumber,
      status: r.status,
      guestName: `${r.firstName} ${r.lastName}`,
      arrivalDate: r.arrivalDate,
      departureDate: r.departureDate,
      adults: r.adults,
      children: r.children,
      total: Money.of(r.totalAmount, r.currency).toJSON(),
    }));
  }

  async departures(tx: DbTransaction, propertyId: string): Promise<DepartureRow[]> {
    const ctx = getRequestContext();
    const businessDate = await this.businessDate.current(tx, propertyId);
    const rows = await tx
      .select({
        id: reservations.id,
        confirmationNumber: reservations.confirmationNumber,
        departureDate: reservations.departureDate,
        currency: reservations.currency,
        firstName: guests.firstName,
        lastName: guests.lastName,
        roomNumber: rooms.number,
        folioBalance: folios.balance,
      })
      .from(reservations)
      .innerJoin(guests, eq(guests.id, reservations.guestId))
      .leftJoin(
        reservationRoomStays,
        and(
          eq(reservationRoomStays.reservationId, reservations.id),
          isNull(reservationRoomStays.closedAt),
        ),
      )
      .leftJoin(rooms, eq(rooms.id, reservationRoomStays.roomId))
      .leftJoin(
        folios,
        and(eq(folios.reservationId, reservations.id), eq(folios.status, 'open')),
      )
      .where(
        and(
          eq(reservations.tenantId, ctx.tenantId),
          eq(reservations.propertyId, propertyId),
          eq(reservations.status, 'checked_in'),
          eq(reservations.departureDate, businessDate),
        ),
      )
      .orderBy(asc(rooms.number));
    return rows.map((r) => ({
      id: r.id,
      confirmationNumber: r.confirmationNumber,
      guestName: `${r.firstName} ${r.lastName}`,
      roomNumber: r.roomNumber ?? null,
      departureDate: r.departureDate,
      balance: Money.of(r.folioBalance ?? '0', r.currency).toJSON(),
    }));
  }

  async inHouse(tx: DbTransaction, propertyId: string): Promise<InHouseRow[]> {
    const ctx = getRequestContext();
    const rows = await tx
      .select({
        id: reservations.id,
        confirmationNumber: reservations.confirmationNumber,
        arrivalDate: reservations.arrivalDate,
        departureDate: reservations.departureDate,
        currency: reservations.currency,
        firstName: guests.firstName,
        lastName: guests.lastName,
        roomNumber: rooms.number,
        folioBalance: folios.balance,
      })
      .from(reservations)
      .innerJoin(guests, eq(guests.id, reservations.guestId))
      .leftJoin(
        reservationRoomStays,
        and(
          eq(reservationRoomStays.reservationId, reservations.id),
          isNull(reservationRoomStays.closedAt),
        ),
      )
      .leftJoin(rooms, eq(rooms.id, reservationRoomStays.roomId))
      .leftJoin(
        folios,
        and(eq(folios.reservationId, reservations.id), eq(folios.status, 'open')),
      )
      .where(
        and(
          eq(reservations.tenantId, ctx.tenantId),
          eq(reservations.propertyId, propertyId),
          eq(reservations.status, 'checked_in'),
        ),
      )
      .orderBy(asc(rooms.number));
    return rows.map((r) => ({
      id: r.id,
      confirmationNumber: r.confirmationNumber,
      guestName: `${r.firstName} ${r.lastName}`,
      roomNumber: r.roomNumber ?? null,
      arrivalDate: r.arrivalDate,
      departureDate: r.departureDate,
      balance: Money.of(r.folioBalance ?? '0', r.currency).toJSON(),
    }));
  }

  /** Room rack: every room × the [from, to) window with its overlapping stay segments. */
  async roomRack(
    tx: DbTransaction,
    propertyId: string,
    from: string,
    to: string,
  ): Promise<RoomRackRow[]> {
    const ctx = getRequestContext();
    const roomRows = await tx
      .select({
        roomId: rooms.id,
        number: rooms.number,
        floor: rooms.floor,
        hkStatus: rooms.hkStatus,
        occupancy: rooms.occupancy,
        roomTypeCode: roomTypes.code,
      })
      .from(rooms)
      .innerJoin(roomTypes, eq(roomTypes.id, rooms.roomTypeId))
      .where(and(eq(rooms.tenantId, ctx.tenantId), eq(rooms.propertyId, propertyId)))
      .orderBy(asc(rooms.number));

    const stays = await tx
      .select({
        roomId: reservationRoomStays.roomId,
        reservationId: reservationRoomStays.reservationId,
        fromDate: reservationRoomStays.fromDate,
        toDate: reservationRoomStays.toDate,
        status: reservations.status,
        firstName: guests.firstName,
        lastName: guests.lastName,
      })
      .from(reservationRoomStays)
      .innerJoin(reservations, eq(reservations.id, reservationRoomStays.reservationId))
      .innerJoin(guests, eq(guests.id, reservations.guestId))
      .where(
        and(
          eq(reservationRoomStays.tenantId, ctx.tenantId),
          eq(reservationRoomStays.propertyId, propertyId),
          inArray(reservations.status, ['confirmed', 'checked_in']),
          lt(reservationRoomStays.fromDate, to),
          gt(reservationRoomStays.toDate, from),
        ),
      );

    const byRoom = new Map<string, RoomRackRow['stays']>();
    for (const s of stays) {
      if (!s.roomId) continue;
      const list = byRoom.get(s.roomId) ?? [];
      list.push({
        reservationId: s.reservationId,
        guestName: `${s.firstName} ${s.lastName}`,
        status: s.status,
        fromDate: s.fromDate,
        toDate: s.toDate,
      });
      byRoom.set(s.roomId, list);
    }

    return roomRows.map((r) => ({
      roomId: r.roomId,
      number: r.number,
      floor: r.floor,
      roomTypeCode: r.roomTypeCode,
      hkStatus: r.hkStatus,
      occupancy: r.occupancy,
      stays: (byRoom.get(r.roomId) ?? []).sort((a, b) => a.fromDate.localeCompare(b.fromDate)),
    }));
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
        source: reservations.source,
        firstName: guests.firstName,
        lastName: guests.lastName,
        vipTier: guests.vipTier,
        roomTypeCode: roomTypes.code,
        roomId: reservationRoomStays.roomId,
        roomNumber: rooms.number,
        roomHkStatus: rooms.hkStatus,
        folioBalance: folios.balance,
      })
      .from(reservations)
      .innerJoin(guests, eq(guests.id, reservations.guestId))
      .innerJoin(roomTypes, eq(roomTypes.id, reservations.roomTypeId))
      .leftJoin(
        reservationRoomStays,
        and(
          eq(reservationRoomStays.reservationId, reservations.id),
          isNull(reservationRoomStays.closedAt),
        ),
      )
      .leftJoin(rooms, eq(rooms.id, reservationRoomStays.roomId))
      .leftJoin(folios, eq(folios.reservationId, reservations.id))
      .where(
        and(
          eq(reservations.tenantId, ctx.tenantId),
          eq(reservations.propertyId, propertyId),
          eq(reservations.arrivalDate, businessDate),
          // Checked-in arrivals stay on the board at 5/5 readiness; only confirmed ones still need work.
          inArray(reservations.status, ['confirmed', 'checked_in']),
        ),
      )
      .orderBy(asc(reservations.confirmationNumber));

    return rows.map((r) => ({
      id: r.id,
      confirmationNumber: r.confirmationNumber,
      status: r.status,
      guestName: `${r.firstName} ${r.lastName}`,
      arrivalDate: r.arrivalDate,
      departureDate: r.departureDate,
      roomTypeCode: r.roomTypeCode,
      adults: r.adults,
      children: r.children,
      balance: Money.of(r.folioBalance ?? '0', r.currency).toJSON(),
      roomAssigned: Boolean(r.roomId),
      roomId: r.roomId ?? null,
      roomNumber: r.roomNumber ?? null,
      roomHkStatus: (r.roomHkStatus ?? null) as ArrivalRow['roomHkStatus'],
      channel: (r.source as { channel?: string } | null)?.channel ?? null,
      vipTier: r.vipTier ?? null,
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
