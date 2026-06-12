import { Body, Controller, Get, Headers, HttpCode, Param, Post, Query } from '@nestjs/common';
import {
  AvailableRoomsQuerySchema,
  AvailabilityQuerySchema,
  CancelReservationSchema,
  CheckInSchema,
  CheckOutSchema,
  CreateGroupBlockSchema,
  CreateReservationSchema,
  type GroupBlock,
  type GroupBlockListRow,
  ImportRoomingListSchema,
  IssueKeyCardSchema,
  ModifyReservationSchema,
  NightAuditRunSchema,
  NoShowSchema,
  PickupGroupBlockSchema,
  QueueRoomSchema,
  ReinstateSchema,
  ReservationListQuerySchema,
  RoomMoveSchema,
  RoomRackQuerySchema,
  SignRegistrationCardSchema,
  VerifyIdDocumentSchema,
  WalkInSchema,
  type ArrivalRow,
  type AvailableRoom,
  type DepartureRow,
  type InHouseRow,
  type NightAuditResult,
  type Reservation,
  type ReservationListRow,
  type RoomRackRow,
  type RoomingListImportResult,
  type RoomTypeAvailability,
} from '@vela/contracts';
import {
  Ctx,
  RequirePermission,
  UnitOfWork,
  ValidationError,
  ZodValidationPipe,
  type RequestContext,
} from '../kernel';
import { ReservationsService } from './reservations.service';
import { GroupBlocksService } from './group-blocks.service';

function requireProperty(ctx: RequestContext): string {
  const propertyId = ctx.propertyIds[0];
  if (!propertyId) {
    throw new ValidationError('A property is required', [
      { field: 'X-Property-Id', code: 'REQUIRED' },
    ]);
  }
  return propertyId;
}

@Controller('reservations')
export class ReservationsController {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly reservations: ReservationsService,
  ) {}

  @Post()
  @HttpCode(201)
  @RequirePermission('reservation.create')
  async create(
    @Body(new ZodValidationPipe(CreateReservationSchema))
    body: typeof CreateReservationSchema._output,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<Reservation> {
    return this.uow.runIdempotent(idempotencyKey, body, async (tx, helpers) => {
      const id = await this.reservations.createBooking(tx, helpers, body);
      return this.reservations.getDto(tx, id);
    });
  }

  @Get()
  @RequirePermission('reservation.view')
  async list(
    @Ctx() ctx: RequestContext,
    @Query(new ZodValidationPipe(ReservationListQuerySchema))
    query: typeof ReservationListQuerySchema._output,
  ): Promise<ReservationListRow[]> {
    const propertyId = requireProperty(ctx);
    return this.uow.read((tx) => this.reservations.list(tx, propertyId, query));
  }

  @Get(':id')
  @RequirePermission('reservation.view')
  async get(@Param('id') id: string): Promise<Reservation> {
    return this.uow.read((tx) => this.reservations.getDto(tx, id));
  }

  @Post(':id/registration-card')
  @HttpCode(201)
  @RequirePermission('reservation.checkin')
  async signRegistrationCard(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(SignRegistrationCardSchema))
    body: typeof SignRegistrationCardSchema._output,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<Reservation> {
    return this.uow.runIdempotent(idempotencyKey, { id, ...body }, async (tx, helpers) => {
      await this.reservations.signRegistrationCard(tx, helpers, id, body);
      return this.reservations.getDto(tx, id);
    });
  }

  @Post(':id/key-cards')
  @HttpCode(201)
  @RequirePermission('reservation.checkin')
  async issueKeyCard(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(IssueKeyCardSchema))
    body: typeof IssueKeyCardSchema._output,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<Reservation> {
    return this.uow.runIdempotent(idempotencyKey, { id, ...body }, async (tx, helpers) => {
      await this.reservations.issueKeyCard(tx, helpers, id, body);
      return this.reservations.getDto(tx, id);
    });
  }

  @Post(':id/id-documents')
  @HttpCode(201)
  @RequirePermission('reservation.checkin')
  async verifyIdDocument(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(VerifyIdDocumentSchema))
    body: typeof VerifyIdDocumentSchema._output,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<Reservation> {
    return this.uow.runIdempotent(idempotencyKey, { id, ...body }, async (tx, helpers) => {
      await this.reservations.verifyIdDocument(tx, helpers, id, body);
      return this.reservations.getDto(tx, id);
    });
  }

  @Post(':id/modify')
  @RequirePermission('reservation.edit')
  async modify(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ModifyReservationSchema))
    body: typeof ModifyReservationSchema._output,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<Reservation> {
    return this.uow.runIdempotent(idempotencyKey, { id, ...body }, async (tx, helpers) => {
      await this.reservations.modify(tx, helpers, id, body);
      return this.reservations.getDto(tx, id);
    });
  }

  @Post(':id/no-show')
  @RequirePermission('reservation.no_show')
  async noShow(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(NoShowSchema)) body: typeof NoShowSchema._output,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<Reservation> {
    return this.uow.runIdempotent(idempotencyKey, { id, ...body }, async (tx, helpers) => {
      await this.reservations.noShow(tx, helpers, id, body.reason);
      return this.reservations.getDto(tx, id);
    });
  }

  @Post(':id/reinstate')
  @RequirePermission('reservation.reinstate')
  async reinstate(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ReinstateSchema)) body: typeof ReinstateSchema._output,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<Reservation> {
    return this.uow.runIdempotent(idempotencyKey, { id, ...body }, async (tx, helpers) => {
      await this.reservations.reinstate(tx, helpers, id, body.reason);
      return this.reservations.getDto(tx, id);
    });
  }

  @Post(':id/room-moves')
  @RequirePermission('room.move')
  async roomMove(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(RoomMoveSchema)) body: typeof RoomMoveSchema._output,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<Reservation> {
    return this.uow.runIdempotent(idempotencyKey, { id, ...body }, async (tx, helpers) => {
      await this.reservations.roomMove(tx, helpers, id, body);
      return this.reservations.getDto(tx, id);
    });
  }

  @Post(':id/check-in')
  @RequirePermission('reservation.checkin')
  async checkIn(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CheckInSchema)) body: typeof CheckInSchema._output,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<Reservation> {
    return this.uow.runIdempotent(idempotencyKey, { id, ...body }, async (tx, helpers) => {
      await this.reservations.checkIn(tx, helpers, id, body);
      return this.reservations.getDto(tx, id);
    });
  }

  @Post(':id/queue-room')
  @RequirePermission('reservation.checkin')
  async queueRoom(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(QueueRoomSchema)) body: typeof QueueRoomSchema._output,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<Reservation> {
    return this.uow.runIdempotent(idempotencyKey, { id, ...body }, async (tx, helpers) => {
      await this.reservations.queueRoom(tx, helpers, id, body);
      return this.reservations.getDto(tx, id);
    });
  }

  @Post(':id/check-out')
  @RequirePermission('reservation.checkout')
  async checkOut(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CheckOutSchema)) body: typeof CheckOutSchema._output,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<Reservation> {
    return this.uow.runIdempotent(idempotencyKey, { id, ...body }, async (tx, helpers) => {
      await this.reservations.checkOut(tx, helpers, id);
      return this.reservations.getDto(tx, id);
    });
  }

  @Post(':id/cancel')
  @RequirePermission('reservation.cancel')
  async cancel(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CancelReservationSchema))
    body: typeof CancelReservationSchema._output,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<Reservation> {
    return this.uow.runIdempotent(idempotencyKey, { id, ...body }, async (tx, helpers) => {
      await this.reservations.cancel(tx, helpers, id, body.reason);
      return this.reservations.getDto(tx, id);
    });
  }
}

@Controller('availability')
export class AvailabilityController {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly reservations: ReservationsService,
  ) {}

  @Get()
  @RequirePermission('availability.view')
  async availability(
    @Ctx() ctx: RequestContext,
    @Query(new ZodValidationPipe(AvailabilityQuerySchema))
    query: typeof AvailabilityQuerySchema._output,
  ): Promise<RoomTypeAvailability[]> {
    const propertyId = requireProperty(ctx);
    return this.uow.read((tx) =>
      this.reservations.availabilityWithPrices(tx, propertyId, {
        from: query.from,
        to: query.to,
        roomTypeId: query.roomTypeId,
        adults: query.adults,
        ratePlanId: query.ratePlanId,
      }),
    );
  }
}

@Controller('front-desk')
export class FrontDeskController {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly reservations: ReservationsService,
  ) {}

  @Get('arrivals')
  @RequirePermission('reservation.view')
  async arrivals(@Ctx() ctx: RequestContext): Promise<ArrivalRow[]> {
    const propertyId = requireProperty(ctx);
    return this.uow.read((tx) => this.reservations.arrivals(tx, propertyId));
  }

  @Get('departures')
  @RequirePermission('reservation.view')
  async departures(@Ctx() ctx: RequestContext): Promise<DepartureRow[]> {
    const propertyId = requireProperty(ctx);
    return this.uow.read((tx) => this.reservations.departures(tx, propertyId));
  }

  @Get('in-house')
  @RequirePermission('reservation.view')
  async inHouse(@Ctx() ctx: RequestContext): Promise<InHouseRow[]> {
    const propertyId = requireProperty(ctx);
    return this.uow.read((tx) => this.reservations.inHouse(tx, propertyId));
  }

  @Get('room-rack')
  @RequirePermission('reservation.view')
  async roomRack(
    @Ctx() ctx: RequestContext,
    @Query(new ZodValidationPipe(RoomRackQuerySchema)) query: typeof RoomRackQuerySchema._output,
  ): Promise<RoomRackRow[]> {
    const propertyId = requireProperty(ctx);
    return this.uow.read((tx) => this.reservations.roomRack(tx, propertyId, query.from, query.to));
  }

  @Get('available-rooms')
  @RequirePermission('availability.view')
  async availableRooms(
    @Ctx() ctx: RequestContext,
    @Query(new ZodValidationPipe(AvailableRoomsQuerySchema))
    query: typeof AvailableRoomsQuerySchema._output,
  ): Promise<AvailableRoom[]> {
    const propertyId = requireProperty(ctx);
    return this.uow.read((tx) =>
      this.reservations.availableRooms(tx, propertyId, query.from, query.to, query.roomTypeId),
    );
  }
}

@Controller('walk-ins')
export class WalkInController {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly reservations: ReservationsService,
  ) {}

  @Post()
  @HttpCode(201)
  @RequirePermission('walkin.create')
  async create(
    @Body(new ZodValidationPipe(WalkInSchema)) body: typeof WalkInSchema._output,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<Reservation> {
    return this.uow.runIdempotent(idempotencyKey, body, async (tx, helpers) => {
      const id = await this.reservations.walkIn(tx, helpers, body);
      return this.reservations.getDto(tx, id);
    });
  }
}

@Controller('group-blocks')
export class GroupBlocksController {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly groupBlocks: GroupBlocksService,
    private readonly reservations: ReservationsService,
  ) {}

  @Get()
  @RequirePermission('reservation.view')
  async list(@Ctx() ctx: RequestContext): Promise<GroupBlockListRow[]> {
    const propertyId = requireProperty(ctx);
    return this.uow.read((tx) => this.groupBlocks.list(tx, propertyId));
  }

  @Get(':id')
  @RequirePermission('reservation.view')
  async get(@Param('id') id: string): Promise<GroupBlock> {
    return this.uow.read((tx) => this.groupBlocks.getDto(tx, id));
  }

  @Post()
  @HttpCode(201)
  @RequirePermission('reservation.block.manage')
  async create(
    @Ctx() ctx: RequestContext,
    @Body(new ZodValidationPipe(CreateGroupBlockSchema))
    body: typeof CreateGroupBlockSchema._output,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<GroupBlock> {
    const propertyId = requireProperty(ctx);
    return this.uow.runIdempotent(idempotencyKey, { propertyId, ...body }, async (tx, helpers) => {
      const id = await this.groupBlocks.create(tx, helpers, propertyId, body);
      return this.groupBlocks.getDto(tx, id);
    });
  }

  @Post(':id/pickup')
  @HttpCode(201)
  @RequirePermission('reservation.block.manage')
  async pickup(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(PickupGroupBlockSchema))
    body: typeof PickupGroupBlockSchema._output,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<Reservation> {
    return this.uow.runIdempotent(idempotencyKey, { id, ...body }, async (tx, helpers) => {
      const reservationId = await this.groupBlocks.pickup(tx, helpers, id, body);
      return this.reservations.getDto(tx, reservationId);
    });
  }

  @Post(':id/rooming-list')
  @HttpCode(201)
  @RequirePermission('reservation.block.manage')
  async importRoomingList(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ImportRoomingListSchema))
    body: typeof ImportRoomingListSchema._output,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<RoomingListImportResult> {
    return this.uow.runIdempotent(idempotencyKey, { id, ...body }, async (tx, helpers) => {
      const created = await this.groupBlocks.importRoomingList(tx, helpers, id, body);
      const reservations = await Promise.all(
        created.map(async (row) => ({
          rowNumber: row.rowNumber,
          externalRef: row.externalRef,
          reservation: await this.reservations.getDto(tx, row.reservationId),
        })),
      );
      return { groupBlockId: id, created: reservations };
    });
  }
}

@Controller('night-audit')
export class NightAuditController {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly reservations: ReservationsService,
  ) {}

  @Post('run')
  @RequirePermission('nightaudit.run')
  async run(
    @Ctx() ctx: RequestContext,
    @Body(new ZodValidationPipe(NightAuditRunSchema)) body: typeof NightAuditRunSchema._output,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<NightAuditResult> {
    const propertyId = requireProperty(ctx);
    return this.uow.runIdempotent(idempotencyKey, { propertyId, ...body }, (tx, helpers) =>
      this.reservations.nightAudit(tx, helpers, propertyId),
    );
  }
}
