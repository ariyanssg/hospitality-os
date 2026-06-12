import { Body, Controller, Get, Headers, HttpCode, Param, Post, Query } from '@nestjs/common';
import {
  AvailabilityQuerySchema,
  CancelReservationSchema,
  CheckInSchema,
  CheckOutSchema,
  CreateReservationSchema,
  ModifyReservationSchema,
  NightAuditRunSchema,
  NoShowSchema,
  ReinstateSchema,
  ReservationListQuerySchema,
  RoomMoveSchema,
  RoomRackQuerySchema,
  WalkInSchema,
  type ArrivalRow,
  type DepartureRow,
  type InHouseRow,
  type NightAuditResult,
  type Reservation,
  type ReservationListRow,
  type RoomRackRow,
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

function requireProperty(ctx: RequestContext): string {
  const propertyId = ctx.propertyIds[0];
  if (!propertyId) {
    throw new ValidationError('A property is required', [{ field: 'X-Property-Id', code: 'REQUIRED' }]);
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
    @Body(new ZodValidationPipe(CreateReservationSchema)) body: typeof CreateReservationSchema._output,
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

  @Post(':id/modify')
  @RequirePermission('reservation.edit')
  async modify(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ModifyReservationSchema)) body: typeof ModifyReservationSchema._output,
  ): Promise<Reservation> {
    return this.uow.run(async (tx, helpers) => {
      await this.reservations.modify(tx, helpers, id, body);
      return this.reservations.getDto(tx, id);
    });
  }

  @Post(':id/no-show')
  @RequirePermission('reservation.no_show')
  async noShow(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(NoShowSchema)) body: typeof NoShowSchema._output,
  ): Promise<Reservation> {
    return this.uow.run(async (tx, helpers) => {
      await this.reservations.noShow(tx, helpers, id, body.reason);
      return this.reservations.getDto(tx, id);
    });
  }

  @Post(':id/reinstate')
  @RequirePermission('reservation.reinstate')
  async reinstate(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ReinstateSchema)) body: typeof ReinstateSchema._output,
  ): Promise<Reservation> {
    return this.uow.run(async (tx, helpers) => {
      await this.reservations.reinstate(tx, helpers, id, body.reason);
      return this.reservations.getDto(tx, id);
    });
  }

  @Post(':id/room-moves')
  @RequirePermission('room.move')
  async roomMove(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(RoomMoveSchema)) body: typeof RoomMoveSchema._output,
  ): Promise<Reservation> {
    return this.uow.run(async (tx, helpers) => {
      await this.reservations.roomMove(tx, helpers, id, body);
      return this.reservations.getDto(tx, id);
    });
  }

  @Post(':id/check-in')
  @RequirePermission('reservation.checkin')
  async checkIn(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CheckInSchema)) body: typeof CheckInSchema._output,
  ): Promise<Reservation> {
    return this.uow.run(async (tx, helpers) => {
      await this.reservations.checkIn(tx, helpers, id, body.roomId);
      return this.reservations.getDto(tx, id);
    });
  }

  @Post(':id/check-out')
  @RequirePermission('reservation.checkout')
  async checkOut(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CheckOutSchema)) _body: typeof CheckOutSchema._output,
  ): Promise<Reservation> {
    return this.uow.run(async (tx, helpers) => {
      await this.reservations.checkOut(tx, helpers, id);
      return this.reservations.getDto(tx, id);
    });
  }

  @Post(':id/cancel')
  @RequirePermission('reservation.cancel')
  async cancel(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CancelReservationSchema)) body: typeof CancelReservationSchema._output,
  ): Promise<Reservation> {
    return this.uow.run(async (tx, helpers) => {
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
    @Query(new ZodValidationPipe(AvailabilityQuerySchema)) query: typeof AvailabilityQuerySchema._output,
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
    @Body(new ZodValidationPipe(NightAuditRunSchema)) _body: typeof NightAuditRunSchema._output,
  ): Promise<NightAuditResult> {
    const propertyId = requireProperty(ctx);
    return this.uow.run((tx, helpers) => this.reservations.nightAudit(tx, helpers, propertyId));
  }
}
