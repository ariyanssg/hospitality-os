import { Body, Controller, Get, Headers, HttpCode, Param, Post, Query } from '@nestjs/common';
import {
  AssignTicketSchema,
  CompleteTicketSchema,
  CreateHkTaskSchema,
  CreateMaintenanceTicketSchema,
  HkTaskListQuerySchema,
  MaintenanceTicketListQuerySchema,
  OutOfOrderSchema,
  RoomBlockListQuerySchema,
  RoomStatusUpdateSchema,
  type HkBoardRoom,
  type HkTask,
  type HkTaskPage,
  type MaintenanceTicket,
  type MaintenanceTicketPage,
  type RoomBlockPage,
} from '@vela/contracts';
import {
  Ctx,
  RequirePermission,
  UnitOfWork,
  ValidationError,
  ZodValidationPipe,
  type RequestContext,
} from '../kernel';
import { HousekeepingService } from './housekeeping.service';

function requireProperty(ctx: RequestContext): string {
  const propertyId = ctx.propertyIds[0];
  if (!propertyId) {
    throw new ValidationError('A property is required', [
      { field: 'X-Property-Id', code: 'REQUIRED' },
    ]);
  }
  return propertyId;
}

@Controller('housekeeping')
export class HousekeepingController {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly housekeeping: HousekeepingService,
  ) {}

  @Get('board')
  @RequirePermission('housekeeping.task.view')
  async board(@Ctx() ctx: RequestContext): Promise<HkBoardRoom[]> {
    const propertyId = requireProperty(ctx);
    return this.uow.read((tx) => this.housekeeping.board(tx, propertyId));
  }

  @Get('tasks')
  @RequirePermission('housekeeping.task.view')
  async tasks(
    @Ctx() ctx: RequestContext,
    @Query(new ZodValidationPipe(HkTaskListQuerySchema))
    query: typeof HkTaskListQuerySchema._output,
  ): Promise<HkTaskPage> {
    const propertyId = requireProperty(ctx);
    return this.uow.read((tx) => this.housekeeping.listTasks(tx, propertyId, query));
  }

  @Post('tasks')
  @HttpCode(201)
  @RequirePermission('housekeeping.task.manage')
  async createTask(
    @Ctx() ctx: RequestContext,
    @Body(new ZodValidationPipe(CreateHkTaskSchema)) body: typeof CreateHkTaskSchema._output,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<HkTask> {
    const propertyId = requireProperty(ctx);
    return this.uow.runIdempotent(idempotencyKey, { propertyId, ...body }, async (tx, helpers) => {
      const id = await this.housekeeping.createTask(tx, helpers, body, propertyId);
      return this.housekeeping.taskDto(tx, id, propertyId);
    });
  }

  @Post('tasks/:id/start')
  @RequirePermission('housekeeping.task.complete')
  async start(
    @Ctx() ctx: RequestContext,
    @Param('id') id: string,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<HkTask> {
    const propertyId = requireProperty(ctx);
    return this.uow.runIdempotent(
      idempotencyKey,
      { propertyId, id, action: 'start' },
      async (tx, helpers) => {
        await this.housekeeping.taskAction(tx, helpers, id, 'start', propertyId);
        return this.housekeeping.taskDto(tx, id, propertyId);
      },
    );
  }

  @Post('tasks/:id/complete')
  @RequirePermission('housekeeping.task.complete')
  async complete(
    @Ctx() ctx: RequestContext,
    @Param('id') id: string,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<HkTask> {
    const propertyId = requireProperty(ctx);
    return this.uow.runIdempotent(
      idempotencyKey,
      { propertyId, id, action: 'complete' },
      async (tx, helpers) => {
        await this.housekeeping.taskAction(tx, helpers, id, 'complete', propertyId);
        return this.housekeeping.taskDto(tx, id, propertyId);
      },
    );
  }

  @Post('tasks/:id/skip')
  @RequirePermission('housekeeping.task.complete')
  async skip(
    @Ctx() ctx: RequestContext,
    @Param('id') id: string,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<HkTask> {
    const propertyId = requireProperty(ctx);
    return this.uow.runIdempotent(
      idempotencyKey,
      { propertyId, id, action: 'skip' },
      async (tx, helpers) => {
        await this.housekeeping.taskAction(tx, helpers, id, 'skip', propertyId);
        return this.housekeeping.taskDto(tx, id, propertyId);
      },
    );
  }
}

@Controller('rooms')
export class RoomStatusController {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly housekeeping: HousekeepingService,
  ) {}

  @Get('out-of-service')
  @RequirePermission('availability.view')
  async outOfService(
    @Ctx() ctx: RequestContext,
    @Query(new ZodValidationPipe(RoomBlockListQuerySchema))
    query: typeof RoomBlockListQuerySchema._output,
  ): Promise<RoomBlockPage> {
    const propertyId = requireProperty(ctx);
    return this.uow.read((tx) => this.housekeeping.listRoomBlocks(tx, propertyId, query));
  }

  @Post(':id/status')
  @RequirePermission('room.status.update')
  async updateStatus(
    @Ctx() ctx: RequestContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(RoomStatusUpdateSchema))
    body: typeof RoomStatusUpdateSchema._output,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<HkBoardRoom> {
    const propertyId = requireProperty(ctx);
    return this.uow.runIdempotent(
      idempotencyKey,
      { propertyId, id, ...body },
      async (tx, helpers) => {
        await this.housekeeping.updateRoomStatus(
          tx,
          helpers,
          id,
          body.hkStatus,
          propertyId,
          body.reason,
        );
        return this.housekeeping.boardRoom(tx, id, propertyId);
      },
    );
  }

  @Post(':id/out-of-order')
  @HttpCode(201)
  @RequirePermission('availability.manage')
  async outOfOrder(
    @Ctx() ctx: RequestContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(OutOfOrderSchema)) body: typeof OutOfOrderSchema._output,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<{ id: string }> {
    const propertyId = requireProperty(ctx);
    return this.uow.runIdempotent(
      idempotencyKey,
      { propertyId, id, ...body },
      async (tx, helpers) => {
        const periodId = await this.housekeeping.setOutOfOrder(tx, helpers, id, body, propertyId);
        return { id: periodId };
      },
    );
  }
}

@Controller('maintenance/tickets')
export class MaintenanceController {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly housekeeping: HousekeepingService,
  ) {}

  @Get()
  @RequirePermission('maintenance.ticket.view')
  async list(
    @Ctx() ctx: RequestContext,
    @Query(new ZodValidationPipe(MaintenanceTicketListQuerySchema))
    query: typeof MaintenanceTicketListQuerySchema._output,
  ): Promise<MaintenanceTicketPage> {
    const propertyId = requireProperty(ctx);
    return this.uow.read((tx) => this.housekeeping.listTickets(tx, propertyId, query));
  }

  @Post()
  @HttpCode(201)
  @RequirePermission('maintenance.ticket.manage')
  async create(
    @Ctx() ctx: RequestContext,
    @Body(new ZodValidationPipe(CreateMaintenanceTicketSchema))
    body: typeof CreateMaintenanceTicketSchema._output,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<MaintenanceTicket> {
    const propertyId = requireProperty(ctx);
    return this.uow.runIdempotent(idempotencyKey, { propertyId, ...body }, async (tx, helpers) => {
      const id = await this.housekeeping.createTicket(tx, helpers, propertyId, body);
      return this.housekeeping.ticketDto(tx, id, propertyId);
    });
  }

  @Post(':id/assign')
  @RequirePermission('maintenance.ticket.manage')
  async assign(
    @Ctx() ctx: RequestContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(AssignTicketSchema)) body: typeof AssignTicketSchema._output,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<MaintenanceTicket> {
    const propertyId = requireProperty(ctx);
    return this.uow.runIdempotent(
      idempotencyKey,
      { propertyId, id, action: 'assign', ...body },
      async (tx, helpers) => {
        await this.housekeeping.ticketAction(tx, helpers, id, 'assign', body, propertyId);
        return this.housekeeping.ticketDto(tx, id, propertyId);
      },
    );
  }

  @Post(':id/complete')
  @RequirePermission('maintenance.ticket.manage')
  async complete(
    @Ctx() ctx: RequestContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CompleteTicketSchema)) body: typeof CompleteTicketSchema._output,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<MaintenanceTicket> {
    const propertyId = requireProperty(ctx);
    return this.uow.runIdempotent(
      idempotencyKey,
      { propertyId, id, action: 'complete', ...body },
      async (tx, helpers) => {
        await this.housekeeping.ticketAction(tx, helpers, id, 'complete', body, propertyId);
        return this.housekeeping.ticketDto(tx, id, propertyId);
      },
    );
  }

  @Post(':id/close')
  @RequirePermission('maintenance.ticket.close')
  async close(
    @Ctx() ctx: RequestContext,
    @Param('id') id: string,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<MaintenanceTicket> {
    const propertyId = requireProperty(ctx);
    return this.uow.runIdempotent(
      idempotencyKey,
      { propertyId, id, action: 'close' },
      async (tx, helpers) => {
        await this.housekeeping.ticketAction(tx, helpers, id, 'close', {}, propertyId);
        return this.housekeeping.ticketDto(tx, id, propertyId);
      },
    );
  }
}
