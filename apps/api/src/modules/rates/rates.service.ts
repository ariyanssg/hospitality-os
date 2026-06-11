import { Injectable } from '@nestjs/common';
import { and, asc, eq, gte, inArray, lt } from 'drizzle-orm';
import { ratePlans, ratePrices, type DbTransaction } from '@vela/db';
import { getRequestContext, Money, NotFoundError, StateConflictError } from '../kernel';

export interface ResolveStayInput {
  propertyId: string;
  ratePlanId: string;
  roomTypeId: string;
  /** Stay nights (arrival inclusive, departure exclusive). */
  dates: string[];
  adults: number;
}

export interface ResolvedNight {
  stayDate: string;
  ratePlanId: string;
  price: Money;
}

export interface ResolvedStay {
  currency: string;
  nights: ResolvedNight[];
  total: Money;
}

/** Rates & Pricing. Every sellable price resolves in one indexed lookup (doc 04 §2). */
@Injectable()
export class RatesService {
  async resolveStay(tx: DbTransaction, input: ResolveStayInput): Promise<ResolvedStay> {
    const ctx = getRequestContext();
    const [plan] = await tx
      .select({ currency: ratePlans.currency })
      .from(ratePlans)
      .where(
        and(
          eq(ratePlans.tenantId, ctx.tenantId),
          eq(ratePlans.id, input.ratePlanId),
          eq(ratePlans.propertyId, input.propertyId),
        ),
      )
      .limit(1);
    if (!plan) throw new NotFoundError('Rate plan');
    const currency = plan.currency;

    const rows = await tx
      .select({
        stayDate: ratePrices.stayDate,
        price: ratePrices.price,
        singlePrice: ratePrices.singlePrice,
      })
      .from(ratePrices)
      .where(
        and(
          eq(ratePrices.tenantId, ctx.tenantId),
          eq(ratePrices.propertyId, input.propertyId),
          eq(ratePrices.ratePlanId, input.ratePlanId),
          eq(ratePrices.roomTypeId, input.roomTypeId),
          inArray(ratePrices.stayDate, input.dates),
        ),
      );
    const byDate = new Map(rows.map((r) => [r.stayDate, r]));

    let total = Money.zero(currency);
    const nights: ResolvedNight[] = [];
    for (const date of input.dates) {
      const row = byDate.get(date);
      if (!row) throw new StateConflictError(`No published price for ${date}`);
      const chosen = input.adults <= 1 && row.singlePrice ? row.singlePrice : row.price;
      const price = Money.of(chosen, currency);
      total = total.add(price);
      nights.push({ stayDate: date, ratePlanId: input.ratePlanId, price });
    }
    return { currency, nights, total };
  }

  async pricesForRange(
    tx: DbTransaction,
    propertyId: string,
    ratePlanId: string,
    roomTypeId: string,
    from: string,
    to: string,
  ): Promise<Map<string, Money>> {
    const ctx = getRequestContext();
    const [plan] = await tx
      .select({ currency: ratePlans.currency })
      .from(ratePlans)
      .where(and(eq(ratePlans.tenantId, ctx.tenantId), eq(ratePlans.id, ratePlanId)))
      .limit(1);
    const currency = plan?.currency ?? 'USD';
    const rows = await tx
      .select({ stayDate: ratePrices.stayDate, price: ratePrices.price })
      .from(ratePrices)
      .where(
        and(
          eq(ratePrices.tenantId, ctx.tenantId),
          eq(ratePrices.propertyId, propertyId),
          eq(ratePrices.ratePlanId, ratePlanId),
          eq(ratePrices.roomTypeId, roomTypeId),
          gte(ratePrices.stayDate, from),
          lt(ratePrices.stayDate, to),
        ),
      );
    return new Map(rows.map((r) => [r.stayDate, Money.of(r.price, currency)]));
  }

  async defaultRatePlanId(tx: DbTransaction, propertyId: string): Promise<string | null> {
    const ctx = getRequestContext();
    const [plan] = await tx
      .select({ id: ratePlans.id })
      .from(ratePlans)
      .where(
        and(
          eq(ratePlans.tenantId, ctx.tenantId),
          eq(ratePlans.propertyId, propertyId),
          eq(ratePlans.isActive, true),
        ),
      )
      .orderBy(asc(ratePlans.code))
      .limit(1);
    return plan?.id ?? null;
  }
}
