import { Injectable } from '@nestjs/common';
import { and, eq, gt, inArray, lte, sql } from 'drizzle-orm';
import {
  folioPostings,
  glAccounts,
  journalLines,
  payments,
  properties,
  reservations,
  rooms,
  type DbTransaction,
} from '@vela/db';
import type { ManagerFlash } from '@vela/contracts';
import { BusinessDateService, getRequestContext, Money, NotFoundError } from '../kernel';
import { ACCOUNT } from '../gl';

/** Reporting v1 (Phase 1): the manager flash — occupancy, ADR, RevPAR, revenue mix, payments. */
@Injectable()
export class ReportsService {
  constructor(private readonly businessDate: BusinessDateService) {}

  async managerFlash(
    tx: DbTransaction,
    propertyId: string,
    businessDate?: string,
  ): Promise<ManagerFlash> {
    const ctx = getRequestContext();
    const date = businessDate ?? (await this.businessDate.current(tx, propertyId));

    const [property] = await tx
      .select({ currency: properties.currency })
      .from(properties)
      .where(eq(properties.id, propertyId))
      .limit(1);
    if (!property) throw new NotFoundError('Property');
    const currency = property.currency.trim();

    const count = sql<number>`count(*)::int`;

    const physicalRooms =
      (
        await tx
          .select({ n: count })
          .from(rooms)
          .where(and(eq(rooms.tenantId, ctx.tenantId), eq(rooms.propertyId, propertyId)))
      )[0]?.n ?? 0;

    // Rooms occupied on the night of `date`: in-house stays spanning it.
    const occupiedRooms =
      (
        await tx
          .select({ n: count })
          .from(reservations)
          .where(
            and(
              eq(reservations.tenantId, ctx.tenantId),
              eq(reservations.propertyId, propertyId),
              inArray(reservations.status, ['checked_in', 'checked_out']),
              lte(reservations.arrivalDate, date),
              gt(reservations.departureDate, date),
            ),
          )
      )[0]?.n ?? 0;

    const arrivalsToday =
      (
        await tx
          .select({ n: count })
          .from(reservations)
          .where(
            and(
              eq(reservations.tenantId, ctx.tenantId),
              eq(reservations.propertyId, propertyId),
              inArray(reservations.status, ['confirmed', 'checked_in']),
              eq(reservations.arrivalDate, date),
            ),
          )
      )[0]?.n ?? 0;

    const departuresToday =
      (
        await tx
          .select({ n: count })
          .from(reservations)
          .where(
            and(
              eq(reservations.tenantId, ctx.tenantId),
              eq(reservations.propertyId, propertyId),
              inArray(reservations.status, ['checked_in', 'checked_out']),
              eq(reservations.departureDate, date),
            ),
          )
      )[0]?.n ?? 0;

    const inHouse =
      (
        await tx
          .select({ n: count })
          .from(reservations)
          .where(
            and(
              eq(reservations.tenantId, ctx.tenantId),
              eq(reservations.propertyId, propertyId),
              eq(reservations.status, 'checked_in'),
            ),
          )
      )[0]?.n ?? 0;

    // Revenue from the journal (credits − debits on revenue accounts) for the business date.
    const revenueRows = await tx
      .select({
        accountCode: journalLines.accountCode,
        accountName: glAccounts.name,
        total: sql<string>`COALESCE(SUM(${journalLines.credit}), 0) - COALESCE(SUM(${journalLines.debit}), 0)`,
      })
      .from(journalLines)
      .innerJoin(
        glAccounts,
        and(eq(glAccounts.tenantId, ctx.tenantId), eq(glAccounts.code, journalLines.accountCode)),
      )
      .where(
        and(
          eq(journalLines.tenantId, ctx.tenantId),
          eq(journalLines.propertyId, propertyId),
          eq(journalLines.businessDate, date),
          eq(glAccounts.type, 'revenue'),
        ),
      )
      .groupBy(journalLines.accountCode, glAccounts.name)
      .orderBy(journalLines.accountCode);

    let roomRevenue = Money.zero(currency);
    let totalRevenue = Money.zero(currency);
    const revenueByAccount = revenueRows.map((r) => {
      const total = Money.of(r.total, currency);
      totalRevenue = totalRevenue.add(total);
      if (r.accountCode === ACCOUNT.ROOM_REVENUE) roomRevenue = roomRevenue.add(total);
      return { accountCode: r.accountCode, accountName: r.accountName, total: total.toJSON() };
    });

    // Payments collected on the business date (joined via their folio posting).
    const paymentRows = await tx
      .select({
        method: payments.method,
        total: sql<string>`COALESCE(SUM(${payments.amount}), 0)`,
      })
      .from(payments)
      .innerJoin(folioPostings, eq(folioPostings.id, payments.postingId))
      .where(
        and(
          eq(payments.tenantId, ctx.tenantId),
          eq(payments.propertyId, propertyId),
          eq(folioPostings.businessDate, date),
        ),
      )
      .groupBy(payments.method);

    const occupancyPct =
      physicalRooms > 0
        ? ((occupiedRooms / physicalRooms) * 100).toFixed(2)
        : '0.00';

    return {
      propertyId,
      businessDate: date,
      physicalRooms,
      occupiedRooms,
      occupancyPct,
      arrivalsToday,
      departuresToday,
      inHouse,
      roomRevenue: roomRevenue.toJSON(),
      totalRevenue: totalRevenue.toJSON(),
      adr: occupiedRooms > 0 ? roomRevenue.dividedBy(occupiedRooms).toJSON() : null,
      revpar: physicalRooms > 0 ? roomRevenue.dividedBy(physicalRooms).toJSON() : null,
      paymentsByMethod: paymentRows.map((p) => ({
        method: p.method,
        total: Money.of(p.total, currency).toJSON(),
      })),
      revenueByAccount,
    };
  }
}
