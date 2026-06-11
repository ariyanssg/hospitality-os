import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  PostChargeSchema,
  RecordPaymentSchema,
  RefundSchema,
  type Folio,
} from '@vela/contracts';
import { Money, RequirePermission, UnitOfWork, ZodValidationPipe } from '../kernel';
import { FolioService } from './folio.service';

@Controller('folios')
export class FolioController {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly folio: FolioService,
  ) {}

  @Get(':id')
  @RequirePermission('folio.view')
  async get(@Param('id') id: string): Promise<Folio> {
    return this.uow.run((tx) => this.folio.getDto(tx, id));
  }

  @Post(':id/postings')
  @RequirePermission('folio.post_charge')
  async postCharge(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(PostChargeSchema)) body: typeof PostChargeSchema._output,
  ): Promise<Folio> {
    return this.uow.run(async (tx, helpers) => {
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
  ): Promise<Folio> {
    return this.uow.run(async (tx, helpers) => {
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

  @Post(':id/close')
  @RequirePermission('folio.close')
  async close(@Param('id') id: string): Promise<Folio> {
    return this.uow.run(async (tx, helpers) => {
      await this.folio.close(tx, helpers, id);
      return this.folio.getDto(tx, id);
    });
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
  ): Promise<Folio> {
    return this.uow.run(async (tx, helpers) => {
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
}
