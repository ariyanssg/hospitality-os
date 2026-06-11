import { Injectable } from '@nestjs/common';
import { and, eq, gte, lt, sql } from 'drizzle-orm';
import { availabilityDays, roomTypes, type DbTransaction } from '@vela/db';
import { AvailabilityConflictError, getRequestContext, type UowHelpers } from '../kernel';

export interface StayWindow {
  propertyId: string;
  roomTypeId: string;
  /** Stay nights (arrival inclusive, departure exclusive). */
  dates: string[];
  units?: number;
}

export interface RoomTypeCounts {
  roomTypeId: string;
  roomTypeCode: string;
  roomTypeName: string;
  days: Array<{ stayDate: string; available: number }>;
}

function isCheckViolation(e: unknown): boolean {
  const code = (e as { code?: string }).code;
  return code === '23514'; // check_violation (the overbooking guard)
}

/**
 * Inventory & Availability. The counter UPDATE *is* the overbooking lock (doc 07 §2): two
 * simultaneous bookings of the last room — one commits, one trips the CHECK → a clean 409.
 */
@Injectable()
export class AvailabilityService {
  /** Decrement availability for each stay night atomically. Any failure aborts the whole txn. */
  async reserve(tx: DbTransaction, helpers: UowHelpers, win: StayWindow): Promise<void> {
    const ctx = getRequestContext();
    const units = win.units ?? 1;

    for (const date of win.dates) {
      let updated: { stayDate: string }[];
      try {
        updated = await tx
          .update(availabilityDays)
          .set({ sold: sql`${availabilityDays.sold} + ${units}` })
          .where(
            and(
              eq(availabilityDays.tenantId, ctx.tenantId),
              eq(availabilityDays.propertyId, win.propertyId),
              eq(availabilityDays.roomTypeId, win.roomTypeId),
              eq(availabilityDays.stayDate, date),
            ),
          )
          .returning({ stayDate: availabilityDays.stayDate });
      } catch (e) {
        if (isCheckViolation(e)) {
          throw new AvailabilityConflictError(`No sellable units on ${date}.`, [
            { field: 'roomTypeId', code: 'NO_AVAILABILITY', stayDate: date },
          ]);
        }
        throw e;
      }
      if (updated.length === 0) {
        throw new AvailabilityConflictError(`No inventory configured for ${date}.`, [
          { field: 'roomTypeId', code: 'NO_AVAILABILITY', stayDate: date },
        ]);
      }
    }

    helpers.emit({
      type: 'availability.changed',
      aggregateType: 'availability',
      aggregateId: win.roomTypeId,
      propertyId: win.propertyId,
      data: { roomTypeId: win.roomTypeId, dates: win.dates, delta: units },
    });
  }

  /** Release inventory (cancellation, no-show wash). */
  async release(tx: DbTransaction, helpers: UowHelpers, win: StayWindow): Promise<void> {
    const ctx = getRequestContext();
    const units = win.units ?? 1;
    for (const date of win.dates) {
      await tx
        .update(availabilityDays)
        .set({ sold: sql`GREATEST(${availabilityDays.sold} - ${units}, 0)` })
        .where(
          and(
            eq(availabilityDays.tenantId, ctx.tenantId),
            eq(availabilityDays.propertyId, win.propertyId),
            eq(availabilityDays.roomTypeId, win.roomTypeId),
            eq(availabilityDays.stayDate, date),
          ),
        );
    }
    helpers.emit({
      type: 'availability.changed',
      aggregateType: 'availability',
      aggregateId: win.roomTypeId,
      propertyId: win.propertyId,
      data: { roomTypeId: win.roomTypeId, dates: win.dates, delta: -units },
    });
  }

  /** Availability counts per room type across [from, to) — counts only; pricing is the rates module. */
  async counts(
    tx: DbTransaction,
    propertyId: string,
    from: string,
    to: string,
    roomTypeId?: string,
  ): Promise<RoomTypeCounts[]> {
    const ctx = getRequestContext();

    const types = await tx
      .select({ id: roomTypes.id, code: roomTypes.code, name: roomTypes.name })
      .from(roomTypes)
      .where(
        and(
          eq(roomTypes.tenantId, ctx.tenantId),
          eq(roomTypes.propertyId, propertyId),
          roomTypeId ? eq(roomTypes.id, roomTypeId) : undefined,
        ),
      );

    const rows = await tx
      .select({
        roomTypeId: availabilityDays.roomTypeId,
        stayDate: availabilityDays.stayDate,
        physical: availabilityDays.physical,
        outOfOrder: availabilityDays.outOfOrder,
        sold: availabilityDays.sold,
        blocked: availabilityDays.blocked,
        overbookLimit: availabilityDays.overbookLimit,
      })
      .from(availabilityDays)
      .where(
        and(
          eq(availabilityDays.tenantId, ctx.tenantId),
          eq(availabilityDays.propertyId, propertyId),
          gte(availabilityDays.stayDate, from),
          lt(availabilityDays.stayDate, to),
        ),
      );

    const byType = new Map<string, Array<{ stayDate: string; available: number }>>();
    for (const r of rows) {
      const available = Math.max(
        0,
        r.physical - r.outOfOrder + r.overbookLimit - r.sold - r.blocked,
      );
      const list = byType.get(r.roomTypeId) ?? [];
      list.push({ stayDate: r.stayDate, available });
      byType.set(r.roomTypeId, list);
    }

    return types.map((t) => ({
      roomTypeId: t.id,
      roomTypeCode: t.code,
      roomTypeName: t.name,
      days: (byType.get(t.id) ?? []).sort((a, b) => a.stayDate.localeCompare(b.stayDate)),
    }));
  }
}
