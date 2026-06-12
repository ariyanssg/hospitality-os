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
    return this.uow.runIdempotent(idempotencyKey, body, async (tx, helpers) => {
      const id = await this.booking.start(tx, helpers, requireProperty(ctx), body);
      return BookingSessionSchema.parse(await this.booking.dto(tx, id));
    });
  }

  @Get(':id')
  @RequirePermission('bookingengine.configure')
  get(@Param('id') id: string): Promise<BookingSession> {
    return this.uow.read((tx) => this.booking.dto(tx, id));
  }

  @Post(':id/confirm')
  @RequirePermission('reservation.create')
  confirm(
    @Param('id') id: string,
    @Headers('idempotency-key') idem: string | undefined,
    @Body(new ZodValidationPipe(ConfirmBookingSessionSchema))
    body: typeof ConfirmBookingSessionSchema._output,
  ): Promise<BookingSession> {
    return this.uow.runIdempotent(idem ?? body.idempotencyKey, body, async (tx, helpers) => {
      await this.booking.confirm(tx, helpers, id, body.pspToken);
      return this.booking.dto(tx, id);
    });
  }

  @Post(':id/cancel')
  @RequirePermission('reservation.cancel')
  cancel(
    @Param('id') id: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ): Promise<BookingSession> {
    return this.uow.runIdempotent(idempotencyKey, { id, action: 'cancel' }, async (tx, helpers) => {
      await this.booking.cancel(tx, helpers, id);
      return this.booking.dto(tx, id);
    });
  }
}
