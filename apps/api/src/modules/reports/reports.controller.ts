import { Controller, Get, Query } from '@nestjs/common';
import { ManagerFlashQuerySchema, type ManagerFlash } from '@vela/contracts';
import {
  Ctx,
  RequirePermission,
  UnitOfWork,
  ValidationError,
  ZodValidationPipe,
  type RequestContext,
} from '../kernel';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly reports: ReportsService,
  ) {}

  @Get('manager-flash')
  @RequirePermission('report.view')
  async managerFlash(
    @Ctx() ctx: RequestContext,
    @Query(new ZodValidationPipe(ManagerFlashQuerySchema)) query: typeof ManagerFlashQuerySchema._output,
  ): Promise<ManagerFlash> {
    const propertyId = ctx.propertyIds[0];
    if (!propertyId) {
      throw new ValidationError('A property is required', [{ field: 'X-Property-Id', code: 'REQUIRED' }]);
    }
    return this.uow.read((tx) => this.reports.managerFlash(tx, propertyId, query.businessDate));
  }
}
