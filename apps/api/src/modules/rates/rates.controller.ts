import { Controller, Get } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { ratePlans } from '@vela/db';
import { Ctx, RequirePermission, UnitOfWork, type RequestContext } from '../kernel';

interface RatePlanDto {
  id: string;
  code: string;
  name: string;
  type: string;
  currency: string;
}

@Controller('rate-plans')
export class RatesController {
  constructor(private readonly uow: UnitOfWork) {}

  @Get()
  @RequirePermission('rate.view')
  async list(@Ctx() ctx: RequestContext): Promise<RatePlanDto[]> {
    const propertyId = ctx.propertyIds[0];
    return this.uow.read((tx) =>
      tx
        .select({
          id: ratePlans.id,
          code: ratePlans.code,
          name: ratePlans.name,
          type: ratePlans.type,
          currency: ratePlans.currency,
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
}
