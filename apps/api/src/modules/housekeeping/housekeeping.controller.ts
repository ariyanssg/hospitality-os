import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import {
  AssignTicketSchema,
  CompleteTicketSchema,
  CreateHkTaskSchema,
  CreateMaintenanceTicketSchema,
  HkTaskListQuerySchema,
  OutOfOrderSchema,
  RoomStatusUpdateSchema,
  type HkBoardRoom,
  type HkTask,
  type MaintenanceTicket,
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
    throw new ValidationError('A property is required', [{ field: 'X-Property-Id', code: 'REQUIRED' }]);
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
    @Query(new ZodValidationPipe(HkTaskListQuerySchema)) query: typeof HkTaskListQuerySchema._output,
  ): Promise<HkTask[]> {
    const propertyId = requireProperty(ctx);
    return this.uow.read((tx) => this.housekeeping.listTasks(tx, propertyId, query));
  }

  @Post('tasks')
  @HttpCode(201)
  @RequirePermission('housekeeping.task.manage')
  async createTask(
    @Body(new ZodValidationPipe(CreateHkTaskSchema)) body: typeof CreateHkTaskSchema._output,
  ): Promise<HkTask> {
    return this.uow.run(async (tx, helpers) => {
      const id = await this.housekeeping.createTask(tx, helpers, body);
      return this.housekeeping.taskDto(tx, id);
    });
  }

  @Post('tasks/:id/start')
  @RequirePermission('housekeeping.task.complete')
  async start(@Param('id') id: string): Promise<HkTask> {
    return this.uow.run(async (tx, helpers) => {
      await this.housekeeping.taskAction(tx, helpers, id, 'start');
      return this.housekeeping.taskDto(tx, id);
    });
  }

  @Post('tasks/:id/complete')
  @RequirePermission('housekeeping.task.complete')
  async complete(@Param('id') id: string): Promise<HkTask> {
    return this.uow.run(async (tx, helpers) => {
      await this.housekeeping.taskAction(tx, helpers, id, 'complete');
      return this.housekeeping.taskDto(tx, id);
    });
  }

  @Post('tasks/:id/skip')
  @RequirePermission('housekeeping.task.complete')
  async skip(@Param('id') id: string): Promise<HkTask> {
    return this.uow.run(async (tx, helpers) => {
      await this.housekeeping.taskAction(tx, helpers, id, 'skip');
      return this.housekeeping.taskDto(tx, id);
    });
  }
}

@Controller('rooms')
export class RoomStatusController {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly housekeeping: HousekeepingService,
  ) {}

  @Post(':id/status')
  @RequirePermission('room.status.update')
  async updateStatus(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(RoomStatusUpdateSchema)) body: typeof RoomStatusUpdateSchema._output,
  ): Promise<HkBoardRoom> {
    return this.uow.run(async (tx, helpers) => {
      await this.housekeeping.updateRoomStatus(tx, helpers, id, body.hkStatus, body.reason);
      return this.housekeeping.boardRoom(tx, id);
    });
  }

  @Post(':id/out-of-order')
  @HttpCode(201)
  @RequirePermission('availability.manage')
  async outOfOrder(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(OutOfOrderSchema)) body: typeof OutOfOrderSchema._output,
  ): Promise<{ id: string }> {
    return this.uow.run(async (tx, helpers) => {
      const periodId = await this.housekeeping.setOutOfOrder(tx, helpers, id, body);
      return { id: periodId };
    });
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
    @Query('status') status?: string,
  ): Promise<MaintenanceTicket[]> {
    const propertyId = requireProperty(ctx);
    return this.uow.read((tx) => this.housekeeping.listTickets(tx, propertyId, status));
  }

  @Post()
  @HttpCode(201)
  @RequirePermission('maintenance.ticket.manage')
  async create(
    @Ctx() ctx: RequestContext,
    @Body(new ZodValidationPipe(CreateMaintenanceTicketSchema))
    body: typeof CreateMaintenanceTicketSchema._output,
  ): Promise<MaintenanceTicket> {
    const propertyId = requireProperty(ctx);
    return this.uow.run(async (tx, helpers) => {
      const id = await this.housekeeping.createTicket(tx, helpers, propertyId, body);
      return this.housekeeping.ticketDto(tx, id);
    });
  }

  @Post(':id/assign')
  @RequirePermission('maintenance.ticket.manage')
  async assign(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(AssignTicketSchema)) body: typeof AssignTicketSchema._output,
  ): Promise<MaintenanceTicket> {
    return this.uow.run(async (tx, helpers) => {
      await this.housekeeping.ticketAction(tx, helpers, id, 'assign', body);
      return this.housekeeping.ticketDto(tx, id);
    });
  }

  @Post(':id/complete')
  @RequirePermission('maintenance.ticket.manage')
  async complete(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CompleteTicketSchema)) body: typeof CompleteTicketSchema._output,
  ): Promise<MaintenanceTicket> {
    return this.uow.run(async (tx, helpers) => {
      await this.housekeeping.ticketAction(tx, helpers, id, 'complete', body);
      return this.housekeeping.ticketDto(tx, id);
    });
  }

  @Post(':id/close')
  @RequirePermission('maintenance.ticket.close')
  async close(@Param('id') id: string): Promise<MaintenanceTicket> {
    return this.uow.run(async (tx, helpers) => {
      await this.housekeeping.ticketAction(tx, helpers, id, 'close', {});
      return this.housekeeping.ticketDto(tx, id);
    });
  }
}
