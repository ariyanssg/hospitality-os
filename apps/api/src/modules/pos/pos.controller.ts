import { Body, Controller, Get, Headers, HttpCode, Param, Post } from '@nestjs/common';
import {
  AddPosItemSchema,
  ClosePosCheckSchema,
  ClosePosShiftSchema,
  OpenPosCheckSchema,
  OpenPosShiftSchema,
  QueueOfflineOpSchema,
  type OfflineOp,
  type PosCheck,
  type PosCheckItem,
  type PosOutlet,
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
  tables(@Param('id') id: string): Promise<PosTable[]> {
    return this.uow.read((tx) => this.pos.tables(tx, id));
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
      const id = await this.pos.openCheck(tx, helpers, requireProperty(ctx), body);
      return this.pos.getDto(tx, id);
    });
  }

  @Get('checks/:id')
  @RequirePermission('pos.check.view')
  getCheck(@Param('id') id: string): Promise<PosCheck> {
    return this.uow.read((tx) => this.pos.getDto(tx, id));
  }

  @Post('checks/:id/items')
  @RequirePermission('pos.item.add')
  addItem(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(AddPosItemSchema)) body: typeof AddPosItemSchema._output,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<PosCheck> {
    return this.uow.runIdempotent(idempotencyKey, { id, ...body }, async (tx, helpers) => {
      await this.pos.addItem(tx, helpers, id, body);
      return this.pos.getDto(tx, id);
    });
  }

  @Post('checks/:id/fire')
  @RequirePermission('kds.operate')
  fire(
    @Param('id') id: string,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<PosCheck> {
    return this.uow.runIdempotent(idempotencyKey, { id, action: 'fire' }, async (tx, helpers) => {
      await this.pos.fire(tx, helpers, id);
      return this.pos.getDto(tx, id);
    });
  }

  @Post('checks/:id/close')
  @RequirePermission('pos.check.close')
  close(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ClosePosCheckSchema)) body: typeof ClosePosCheckSchema._output,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<PosCheck> {
    return this.uow.runIdempotent(idempotencyKey, { id, ...body }, async (tx, helpers) => {
      await this.pos.close(tx, helpers, id, body);
      return this.pos.getDto(tx, id);
    });
  }

  @Get('kds')
  @RequirePermission('kds.operate')
  kds(@Ctx() ctx: RequestContext): Promise<PosCheckItem[]> {
    return this.uow.read((tx) => this.pos.kds(tx, requireProperty(ctx)));
  }

  @Post('kds/items/:id/ready')
  @RequirePermission('kds.operate')
  ready(
    @Param('id') id: string,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<PosCheck> {
    return this.uow.runIdempotent(idempotencyKey, { id, action: 'ready' }, async (tx, helpers) => {
      const checkId = await this.pos.markItemReady(tx, helpers, id);
      return this.pos.getDto(tx, checkId);
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
      const id = await this.pos.openShift(tx, helpers, requireProperty(ctx), body.outletId);
      return this.pos.shiftDto(tx, id);
    });
  }

  @Post('shifts/:id/close')
  @RequirePermission('pos.shift.close')
  closeShift(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ClosePosShiftSchema)) body: typeof ClosePosShiftSchema._output,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<PosShift> {
    return this.uow.runIdempotent(idempotencyKey, { id, ...body }, async (tx, helpers) => {
      await this.pos.closeShift(tx, helpers, id, Money.fromJSON(body.countedTotal));
      return this.pos.shiftDto(tx, id);
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
