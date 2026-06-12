import { Body, Controller, Get, Headers, HttpCode, Param, Post } from '@nestjs/common';
import {
  AuthorizePaymentSchema,
  CapturePaymentIntentSchema,
  CloseCashierSessionSchema,
  CreateFolioSchema,
  OpenCashierSessionSchema,
  PostChargeSchema,
  RecordDepositSchema,
  RecordPaymentSchema,
  RefundSchema,
  TransferPostingSchema,
  type CashierSession,
  type Deposit,
  type Folio,
  type PaymentIntent,
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
import { FolioService } from './folio.service';
import { CashierService } from './cashier.service';

function requireProperty(ctx: RequestContext): string {
  const propertyId = ctx.propertyIds[0];
  if (!propertyId) {
    throw new ValidationError('A property is required', [
      { field: 'X-Property-Id', code: 'REQUIRED' },
    ]);
  }
  return propertyId;
}

@Controller('folios')
export class FolioController {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly folio: FolioService,
  ) {}

  @Get(':id')
  @RequirePermission('folio.view')
  async get(@Param('id') id: string): Promise<Folio> {
    return this.uow.read((tx) => this.folio.getDto(tx, id));
  }

  @Post()
  @HttpCode(201)
  @RequirePermission('folio.create')
  async create(
    @Body(new ZodValidationPipe(CreateFolioSchema)) body: typeof CreateFolioSchema._output,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<Folio> {
    return this.uow.runIdempotent(idempotencyKey, body, async (tx, helpers) => {
      const id = await this.folio.createFolioForReservation(
        tx,
        helpers,
        body.reservationId,
        body.type,
      );
      return this.folio.getDto(tx, id);
    });
  }

  @Post(':id/transfers')
  @RequirePermission('folio.transfer')
  async transfer(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(TransferPostingSchema)) body: typeof TransferPostingSchema._output,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<Folio> {
    return this.uow.runIdempotent(idempotencyKey, { id, ...body }, async (tx, helpers) => {
      await this.folio.transferPosting(
        tx,
        helpers,
        id,
        body.postingId,
        body.toFolioId,
        body.reason,
      );
      return this.folio.getDto(tx, id);
    });
  }

  @Post(':id/postings')
  @RequirePermission('folio.post_charge')
  async postCharge(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(PostChargeSchema)) body: typeof PostChargeSchema._output,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<Folio> {
    return this.uow.runIdempotent(idempotencyKey, { id, ...body }, async (tx, helpers) => {
      await this.folio.postCharge(tx, helpers, {
        folioId: id,
        chargeCode: body.chargeCode,
        description: body.description,
        amount: Money.fromJSON(body.amount),
        quantity: body.quantity,
      });
      return this.folio.getDto(tx, id);
    });
  }

  @Post(':id/payments')
  @RequirePermission('payment.collect')
  async pay(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(RecordPaymentSchema)) body: typeof RecordPaymentSchema._output,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<Folio> {
    return this.uow.runIdempotent(idempotencyKey, { id, ...body }, async (tx, helpers) => {
      await this.folio.recordPayment(tx, helpers, {
        folioId: id,
        method: body.method,
        amount: Money.fromJSON(body.amount),
        reference: body.reference,
        pspToken: body.pspToken,
      });
      return this.folio.getDto(tx, id);
    });
  }

  @Post(':id/payment-intents')
  @HttpCode(201)
  @RequirePermission('payment.collect')
  async authorizePayment(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(AuthorizePaymentSchema))
    body: typeof AuthorizePaymentSchema._output,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<PaymentIntent> {
    return this.uow.runIdempotent(idempotencyKey, { id, ...body }, async (tx, helpers) => {
      const paymentIntentId = await this.folio.authorizePayment(tx, helpers, id, body);
      return this.folio.paymentIntentDto(tx, paymentIntentId);
    });
  }

  @Post(':id/close')
  @RequirePermission('folio.close')
  async close(
    @Param('id') id: string,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<Folio> {
    return this.uow.runIdempotent(
      idempotencyKey,
      { id, action: 'folio.close' },
      async (tx, helpers) => {
        await this.folio.close(tx, helpers, id);
        return this.folio.getDto(tx, id);
      },
    );
  }
}

@Controller('cashier-sessions')
export class CashierController {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly cashier: CashierService,
  ) {}

  @Post()
  @HttpCode(201)
  @RequirePermission('cashier.open')
  async open(
    @Ctx() ctx: RequestContext,
    @Body(new ZodValidationPipe(OpenCashierSessionSchema))
    body: typeof OpenCashierSessionSchema._output,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<CashierSession> {
    const propertyId = requireProperty(ctx);
    return this.uow.runIdempotent(idempotencyKey, { propertyId, ...body }, async (tx, helpers) => {
      const id = await this.cashier.open(
        tx,
        helpers,
        propertyId,
        Money.fromJSON(body.openingFloat),
      );
      return this.cashier.getDto(tx, id);
    });
  }

  @Get('current')
  @RequirePermission('cashier.open')
  async current(@Ctx() ctx: RequestContext): Promise<CashierSession | null> {
    const propertyId = requireProperty(ctx);
    return this.uow.read((tx) => this.cashier.current(tx, propertyId));
  }

  @Post(':id/close')
  @RequirePermission('cashier.close')
  async close(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CloseCashierSessionSchema))
    body: typeof CloseCashierSessionSchema._output,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<CashierSession> {
    return this.uow.runIdempotent(idempotencyKey, { id, ...body }, async (tx, helpers) => {
      await this.cashier.close(
        tx,
        helpers,
        id,
        Money.fromJSON(body.countedTotal),
        body.varianceReason,
      );
      return this.cashier.getDto(tx, id);
    });
  }
}

@Controller('reservations/:reservationId/deposits')
export class DepositsController {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly folio: FolioService,
  ) {}

  @Post()
  @HttpCode(201)
  @RequirePermission('deposit.manage')
  async record(
    @Param('reservationId') reservationId: string,
    @Body(new ZodValidationPipe(RecordDepositSchema)) body: typeof RecordDepositSchema._output,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<Deposit> {
    return this.uow.runIdempotent(
      idempotencyKey,
      { reservationId, ...body },
      async (tx, helpers) => {
        const id = await this.folio.recordDeposit(tx, helpers, reservationId, {
          method: body.method,
          amount: Money.fromJSON(body.amount),
          reference: body.reference,
        });
        return this.folio.depositDto(tx, id);
      },
    );
  }

  @Get()
  @RequirePermission('folio.view')
  async list(@Param('reservationId') reservationId: string): Promise<Deposit[]> {
    return this.uow.read((tx) => this.folio.listDeposits(tx, reservationId));
  }
}

@Controller('payments')
export class PaymentController {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly folio: FolioService,
  ) {}

  @Post(':id/refunds')
  @RequirePermission('payment.refund')
  async refund(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(RefundSchema)) body: typeof RefundSchema._output,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<Folio> {
    return this.uow.runIdempotent(idempotencyKey, { id, ...body }, async (tx, helpers) => {
      const refundId = await this.folio.refundPayment(
        tx,
        helpers,
        id,
        Money.fromJSON(body.amount),
        body.reason,
      );
      // Return the affected folio.
      const folioId = await this.folio.folioIdForPayment(tx, refundId);
      return this.folio.getDto(tx, folioId);
    });
  }

  @Post('intents/:id/capture')
  @RequirePermission('payment.collect')
  async captureIntent(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CapturePaymentIntentSchema))
    body: typeof CapturePaymentIntentSchema._output,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<Folio> {
    return this.uow.runIdempotent(idempotencyKey, { id, ...body }, async (tx, helpers) => {
      const paymentId = await this.folio.capturePaymentIntent(tx, helpers, id, body);
      const folioId = await this.folio.folioIdForPayment(tx, paymentId);
      return this.folio.getDto(tx, folioId);
    });
  }
}
