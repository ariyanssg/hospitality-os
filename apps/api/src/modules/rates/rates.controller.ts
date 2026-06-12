import { Body, Controller, Get, Param, Put, Query } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { ratePlans } from '@vela/db';
import {
  PriceGridUpdateSchema,
  RatePricesQuerySchema,
  type RatePlan,
  type RatePriceRow,
} from '@vela/contracts';
import {
  Ctx,
  RequirePermission,
  UnitOfWork,
  ValidationError,
  ZodValidationPipe,
  type RequestContext,
} from '../kernel';
import { RatesService } from './rates.service';

function requireProperty(ctx: RequestContext): string {
  const propertyId = ctx.propertyIds[0];
  if (!propertyId) {
    throw new ValidationError('A property is required', [{ field: 'X-Property-Id', code: 'REQUIRED' }]);
  }
  return propertyId;
}

@Controller('rate-plans')
export class RatesController {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly rates: RatesService,
  ) {}

  @Get()
  @RequirePermission('rate.view')
  async list(@Ctx() ctx: RequestContext): Promise<RatePlan[]> {
    const propertyId = ctx.propertyIds[0];
    return this.uow.read((tx) =>
      tx
        .select({
          id: ratePlans.id,
          code: ratePlans.code,
          name: ratePlans.name,
          type: ratePlans.type,
          currency: ratePlans.currency,
          isActive: ratePlans.isActive,
        })
        .from(ratePlans)
        .where(
          and(
            eq(ratePlans.tenantId, ctx.tenantId),
            propertyId ? eq(ratePlans.propertyId, propertyId) : undefined,
          ),
        ),
    );
  }

  @Get(':id/prices')
  @RequirePermission('rate.view')
  async prices(
    @Ctx() ctx: RequestContext,
    @Param('id') id: string,
    @Query(new ZodValidationPipe(RatePricesQuerySchema)) query: typeof RatePricesQuerySchema._output,
  ): Promise<RatePriceRow[]> {
    const propertyId = requireProperty(ctx);
    return this.uow.read((tx) =>
      this.rates.priceGrid(tx, propertyId, id, query.from, query.to, query.roomTypeId),
    );
  }

  @Put(':id/prices')
  @RequirePermission('rate.manage')
  async updatePrices(
    @Ctx() ctx: RequestContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(PriceGridUpdateSchema)) body: typeof PriceGridUpdateSchema._output,
  ): Promise<RatePriceRow[]> {
    const propertyId = requireProperty(ctx);
    return this.uow.run(async (tx, helpers) => {
      await this.rates.upsertPrices(tx, helpers, propertyId, id, body);
      const dates = body.prices.map((p) => p.stayDate).sort();
      const lastExclusive = new Date(`${dates[dates.length - 1]}T00:00:00Z`);
      lastExclusive.setUTCDate(lastExclusive.getUTCDate() + 1);
      return this.rates.priceGrid(
        tx,
        propertyId,
        id,
        dates[0]!,
        lastExclusive.toISOString().slice(0, 10),
      );
    });
  }
}
