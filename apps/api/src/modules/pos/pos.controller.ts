import { Body, Controller, Get, Headers, HttpCode, Param, Post, Query } from '@nestjs/common';
import {
  AddPosItemSchema,
  ClosePosCheckSchema,
  ClosePosShiftSchema,
  OpenPosCheckSchema,
  OpenPosShiftSchema,
  PosCheckListQuerySchema,
  PosRoomChargeSearchQuerySchema,
  QueueOfflineOpSchema,
  type OfflineOp,
  type PosCheck,
  type PosCheckPage,
  type PosKdsItem,
  type PosOutlet,
  type PosRoomChargeCandidate,
  type PosShift,
  type PosTable,
} from '@vela/contracts';
import {
  Ctx,
  Money,
  RequirePermission,
  UnitOfWork,
  ValidationError,
  ZodValidationPipe,
  type RequestContext,
} from '../kernel';
import { PosService } from './pos.service';

function requireProperty(ctx: RequestContext): string {
  const propertyId = ctx.propertyIds[0];
  if (!propertyId)
    throw new ValidationError('A property is required', [
      { field: 'X-Property-Id', code: 'REQUIRED' },
    ]);
  return propertyId;
}

@Controller('pos')
export class PosController {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly pos: PosService,
  ) {}

  @Get('outlets')
  @RequirePermission('pos.check.view')
  outlets(@Ctx() ctx: RequestContext): Promise<PosOutlet[]> {
    return this.uow.read((tx) => this.pos.outlets(tx, requireProperty(ctx)));
  }

  @Get('outlets/:id/tables')
  @RequirePermission('table.manage')
  tables(@Ctx() ctx: RequestContext, @Param('id') id: string): Promise<PosTable[]> {
    return this.uow.read((tx) => this.pos.tables(tx, requireProperty(ctx), id));
  }

  @Get('room-charge/search')
  @RequirePermission('pos.roomcharge.post')
  roomChargeSearch(
    @Ctx() ctx: RequestContext,
    @Query(new ZodValidationPipe(PosRoomChargeSearchQuerySchema))
    query: typeof PosRoomChargeSearchQuerySchema._output,
  ): Promise<PosRoomChargeCandidate[]> {
    return this.uow.read((tx) => this.pos.roomChargeSearch(tx, requireProperty(ctx), query));
  }

  @Post('checks')
  @HttpCode(201)
  @RequirePermission('pos.check.create')
  openCheck(
    @Ctx() ctx: RequestContext,
    @Body(new ZodValidationPipe(OpenPosCheckSchema)) body: typeof OpenPosCheckSchema._output,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<PosCheck> {
    return this.uow.runIdempotent(idempotencyKey, body, async (tx, helpers) => {
      const propertyId = requireProperty(ctx);
      const id = await this.pos.openCheck(tx, helpers, propertyId, body);
      return this.pos.getDto(tx, propertyId, id);
    });
  }

  @Get('checks')
  @RequirePermission('pos.check.view')
  listChecks(
    @Ctx() ctx: RequestContext,
    @Query(new ZodValidationPipe(PosCheckListQuerySchema))
    query: typeof PosCheckListQuerySchema._output,
  ): Promise<PosCheckPage> {
    return this.uow.read((tx) => this.pos.listChecks(tx, requireProperty(ctx), query));
  }

  @Get('checks/:id')
  @RequirePermission('pos.check.view')
  getCheck(@Ctx() ctx: RequestContext, @Param('id') id: string): Promise<PosCheck> {
    return this.uow.read((tx) => this.pos.getDto(tx, requireProperty(ctx), id));
  }

  @Post('checks/:id/items')
  @RequirePermission('pos.item.add')
  addItem(
    @Ctx() ctx: RequestContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(AddPosItemSchema)) body: typeof AddPosItemSchema._output,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<PosCheck> {
    return this.uow.runIdempotent(idempotencyKey, { id, ...body }, async (tx, helpers) => {
      const propertyId = requireProperty(ctx);
      await this.pos.addItem(tx, helpers, propertyId, id, body);
      return this.pos.getDto(tx, propertyId, id);
    });
  }

  @Post('checks/:id/fire')
  @RequirePermission('kds.operate')
  fire(
    @Ctx() ctx: RequestContext,
    @Param('id') id: string,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<PosCheck> {
    return this.uow.runIdempotent(idempotencyKey, { id, action: 'fire' }, async (tx, helpers) => {
      const propertyId = requireProperty(ctx);
      await this.pos.fire(tx, helpers, propertyId, id);
      return this.pos.getDto(tx, propertyId, id);
    });
  }

  @Post('checks/:id/close')
  @RequirePermission('pos.check.close')
  close(
    @Ctx() ctx: RequestContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ClosePosCheckSchema)) body: typeof ClosePosCheckSchema._output,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<PosCheck> {
    return this.uow.runIdempotent(idempotencyKey, { id, ...body }, async (tx, helpers) => {
      const propertyId = requireProperty(ctx);
      await this.pos.close(tx, helpers, propertyId, id, body);
      return this.pos.getDto(tx, propertyId, id);
    });
  }

  @Get('kds')
  @RequirePermission('kds.operate')
  kds(@Ctx() ctx: RequestContext): Promise<PosKdsItem[]> {
    return this.uow.read((tx) => this.pos.kds(tx, requireProperty(ctx)));
  }

  @Post('kds/items/:id/ready')
  @RequirePermission('kds.operate')
  ready(
    @Ctx() ctx: RequestContext,
    @Param('id') id: string,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<PosCheck> {
    return this.uow.runIdempotent(idempotencyKey, { id, action: 'ready' }, async (tx, helpers) => {
      const propertyId = requireProperty(ctx);
      const checkId = await this.pos.markItemReady(tx, helpers, propertyId, id);
      return this.pos.getDto(tx, propertyId, checkId);
    });
  }

  @Post('shifts')
  @HttpCode(201)
  @RequirePermission('pos.cash.manage')
  openShift(
    @Ctx() ctx: RequestContext,
    @Body(new ZodValidationPipe(OpenPosShiftSchema)) body: typeof OpenPosShiftSchema._output,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<PosShift> {
    return this.uow.runIdempotent(idempotencyKey, body, async (tx, helpers) => {
      const propertyId = requireProperty(ctx);
      const id = await this.pos.openShift(tx, helpers, propertyId, body.outletId);
      return this.pos.shiftDto(tx, propertyId, id);
    });
  }

  @Post('shifts/:id/close')
  @RequirePermission('pos.shift.close')
  closeShift(
    @Ctx() ctx: RequestContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ClosePosShiftSchema)) body: typeof ClosePosShiftSchema._output,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<PosShift> {
    return this.uow.runIdempotent(idempotencyKey, { id, ...body }, async (tx, helpers) => {
      const propertyId = requireProperty(ctx);
      await this.pos.closeShift(tx, helpers, propertyId, id, Money.fromJSON(body.countedTotal));
      return this.pos.shiftDto(tx, propertyId, id);
    });
  }

  @Post('offline-ops')
  @HttpCode(202)
  @RequirePermission('pos.check.create')
  queueOffline(
    @Ctx() ctx: RequestContext,
    @Body(new ZodValidationPipe(QueueOfflineOpSchema)) body: typeof QueueOfflineOpSchema._output,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<OfflineOp> {
    return this.uow.runIdempotent(idempotencyKey ?? body.opKey, body, (tx, helpers) =>
      this.pos.queueOfflineOp(tx, helpers, requireProperty(ctx), body),
    );
  }
}
