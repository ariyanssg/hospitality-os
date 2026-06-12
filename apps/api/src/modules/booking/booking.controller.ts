import { Body, Controller, Get, Headers, HttpCode, Param, Post } from '@nestjs/common';
import {
  BookingSessionSchema,
  ConfirmBookingSessionSchema,
  StartBookingSessionSchema,
  type BookingSession,
} from '@vela/contracts';
import {
  Ctx,
  RequirePermission,
  UnitOfWork,
  ValidationError,
  ZodValidationPipe,
  type RequestContext,
} from '../kernel';
import { BookingService } from './booking.service';

function requireProperty(ctx: RequestContext): string {
  const propertyId = ctx.propertyIds[0];
  if (!propertyId)
    throw new ValidationError('A property is required', [
      { field: 'X-Property-Id', code: 'REQUIRED' },
    ]);
  return propertyId;
}

@Controller('public/booking-sessions')
export class BookingController {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly booking: BookingService,
  ) {}

  @Post()
  @HttpCode(201)
  @RequirePermission('bookingengine.configure')
  async start(
    @Ctx() ctx: RequestContext,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body(new ZodValidationPipe(StartBookingSessionSchema))
    body: typeof StartBookingSessionSchema._output,
  ): Promise<BookingSession> {
    const propertyId = requireProperty(ctx);
    return this.uow.runIdempotent(idempotencyKey, { propertyId, ...body }, async (tx, helpers) => {
      const id = await this.booking.start(tx, helpers, propertyId, body);
      return BookingSessionSchema.parse(await this.booking.dto(tx, id, propertyId));
    });
  }

  @Get(':id')
  @RequirePermission('bookingengine.configure')
  get(@Ctx() ctx: RequestContext, @Param('id') id: string): Promise<BookingSession> {
    const propertyId = requireProperty(ctx);
    return this.uow.read((tx) => this.booking.dto(tx, id, propertyId));
  }

  @Post(':id/confirm')
  @RequirePermission('reservation.create')
  confirm(
    @Ctx() ctx: RequestContext,
    @Param('id') id: string,
    @Headers('idempotency-key') idem: string | undefined,
    @Body(new ZodValidationPipe(ConfirmBookingSessionSchema))
    body: typeof ConfirmBookingSessionSchema._output,
  ): Promise<BookingSession> {
    const propertyId = requireProperty(ctx);
    return this.uow.runIdempotent(
      idem ?? body.idempotencyKey,
      { propertyId, id, ...body },
      async (tx, helpers) => {
        await this.booking.confirm(tx, helpers, id, propertyId, body.pspToken);
        return this.booking.dto(tx, id, propertyId);
      },
    );
  }

  @Post(':id/cancel')
  @RequirePermission('reservation.cancel')
  cancel(
    @Ctx() ctx: RequestContext,
    @Param('id') id: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ): Promise<BookingSession> {
    const propertyId = requireProperty(ctx);
    return this.uow.runIdempotent(
      idempotencyKey,
      { propertyId, id, action: 'cancel' },
      async (tx, helpers) => {
        await this.booking.cancel(tx, helpers, id, propertyId);
        return this.booking.dto(tx, id, propertyId);
      },
    );
  }
}
