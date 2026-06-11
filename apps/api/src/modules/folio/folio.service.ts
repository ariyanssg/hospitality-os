import { Injectable } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import {
  chargeCodes,
  folioPostings,
  folios,
  payments,
  taxRules,
  uuidv7,
  type DbTransaction,
} from '@vela/db';
import type { Folio } from '@vela/contracts';
import {
  BusinessDateService,
  getRequestContext,
  Money,
  NotFoundError,
  StateConflictError,
  type UowHelpers,
} from '../kernel';
import { ACCOUNT, GlService } from '../gl';

function folioNumberFrom(id: string): string {
  return `F-${id.replace(/-/g, '').slice(-8).toUpperCase()}`;
}

export interface CreateFolioInput {
  propertyId: string;
  reservationId: string | null;
  guestId: string | null;
  currency: string;
}

export interface PostChargeInternal {
  folioId: string;
  chargeCode: string;
  description?: string;
  amount: Money;
  quantity?: number;
  /** Defaults to the property's current business date (from the ledger) when omitted. */
  businessDate?: string;
  sourceType?: 'room' | 'tax' | 'pos_check' | 'adjustment' | 'deposit' | 'package' | 'manual';
  sourceId?: string;
  /** Optional explicit revenue account (else taken from the charge code, else misc revenue). */
  revenueAccount?: string;
  /** Optional tax to post alongside (room+tax at night audit). */
  tax?: { amount: Money; account?: string };
}

export interface RecordPaymentInternal {
  folioId: string;
  method: 'card' | 'cash' | 'bank_transfer' | 'ar_transfer' | 'voucher';
  amount: Money;
  businessDate?: string;
  reference?: string;
  pspToken?: string;
}

/**
 * Folio & Payments. Postings are immutable (the DB trigger enforces it); corrections are reversals.
 * Every charge/payment books balanced GL lines in the SAME transaction via GlService.
 */
@Injectable()
export class FolioService {
  constructor(
    private readonly gl: GlService,
    private readonly businessDate: BusinessDateService,
  ) {}

  async createFolio(tx: DbTransaction, input: CreateFolioInput): Promise<string> {
    const ctx = getRequestContext();
    const id = uuidv7();
    await tx.insert(folios).values({
      id,
      tenantId: ctx.tenantId,
      propertyId: input.propertyId,
      folioNumber: folioNumberFrom(id),
      reservationId: input.reservationId,
      guestId: input.guestId,
      type: 'guest',
      status: 'open',
      currency: input.currency,
      balance: '0',
    });
    return id;
  }

  private async loadOpenFolio(tx: DbTransaction, folioId: string) {
    const ctx = getRequestContext();
    const [folio] = await tx
      .select()
      .from(folios)
      .where(and(eq(folios.id, folioId), eq(folios.tenantId, ctx.tenantId)))
      .limit(1);
    if (!folio) throw new NotFoundError('Folio');
    if (folio.status !== 'open') throw new StateConflictError('Folio is not open');
    return folio;
  }

  async postCharge(
    tx: DbTransaction,
    helpers: UowHelpers,
    input: PostChargeInternal,
  ): Promise<string> {
    const ctx = getRequestContext();
    const folio = await this.loadOpenFolio(tx, input.folioId);
    const currency = folio.currency.trim();

    const [code] = await tx
      .select()
      .from(chargeCodes)
      .where(and(eq(chargeCodes.tenantId, ctx.tenantId), eq(chargeCodes.code, input.chargeCode)))
      .limit(1);
    if (!code) throw new NotFoundError(`Charge code ${input.chargeCode}`);

    const revenueAccount = input.revenueAccount ?? code.glAccountCode ?? ACCOUNT.MISC_REVENUE;
    const businessDate = input.businessDate ?? (await this.businessDate.current(tx, folio.propertyId));
    const postingId = uuidv7();
    const taxAmount = input.tax?.amount ?? Money.zero(currency);
    const grossTotal = input.amount.add(taxAmount);

    await tx.insert(folioPostings).values({
      id: postingId,
      tenantId: ctx.tenantId,
      propertyId: folio.propertyId,
      folioId: folio.id,
      businessDate,
      chargeCodeId: code.id,
      description: input.description ?? code.name,
      amount: input.amount.amount,
      currency,
      baseAmount: input.amount.amount,
      fxRate: '1',
      quantity: String(input.quantity ?? 1),
      sourceType: input.sourceType ?? 'manual',
      sourceId: input.sourceId ?? null,
      postedBy: ctx.userId,
    });

    if (!taxAmount.isZero()) {
      await tx.insert(folioPostings).values({
        id: uuidv7(),
        tenantId: ctx.tenantId,
        propertyId: folio.propertyId,
        folioId: folio.id,
        businessDate,
        chargeCodeId: code.id,
        description: `${input.description ?? code.name} — tax`,
        amount: taxAmount.amount,
        currency,
        baseAmount: taxAmount.amount,
        fxRate: '1',
        quantity: '1',
        sourceType: 'tax',
        sourceId: postingId,
        postedBy: ctx.userId,
      });
    }

    await this.adjustBalance(tx, folio.id, folio.balance, grossTotal, currency);

    const lines = [
      { accountCode: ACCOUNT.GUEST_LEDGER, debit: grossTotal },
      { accountCode: revenueAccount, credit: input.amount },
    ];
    if (!taxAmount.isZero()) {
      lines.push({ accountCode: input.tax?.account ?? ACCOUNT.TAX_PAYABLE, credit: taxAmount });
    }
    await this.gl.postJournal(tx, {
      propertyId: folio.propertyId,
      businessDate,
      source: 'folio_posting',
      sourceId: postingId,
      description: input.description ?? code.name,
      currency,
      lines,
    });

    helpers.emit({
      type: 'folio.charge_posted',
      aggregateType: 'folio',
      aggregateId: folio.id,
      propertyId: folio.propertyId,
      data: { folioId: folio.id, postingId, amount: grossTotal.toJSON() },
    });
    helpers.audit({
      action: 'folio.post_charge',
      entityType: 'folio_posting',
      entityId: postingId,
      after: { folioId: folio.id, amount: grossTotal.amount, chargeCode: input.chargeCode },
      propertyId: folio.propertyId,
    });

    return postingId;
  }

  async recordPayment(
    tx: DbTransaction,
    helpers: UowHelpers,
    input: RecordPaymentInternal,
  ): Promise<string> {
    const ctx = getRequestContext();
    const folio = await this.loadOpenFolio(tx, input.folioId);
    const currency = folio.currency.trim();
    const businessDate = input.businessDate ?? (await this.businessDate.current(tx, folio.propertyId));

    const [code] = await tx
      .select()
      .from(chargeCodes)
      .where(and(eq(chargeCodes.tenantId, ctx.tenantId), eq(chargeCodes.code, 'PAYMENT')))
      .limit(1);
    if (!code) throw new NotFoundError('Charge code PAYMENT');

    const paymentId = uuidv7();
    const postingId = uuidv7();
    const signed = input.amount.negate();

    await tx.insert(folioPostings).values({
      id: postingId,
      tenantId: ctx.tenantId,
      propertyId: folio.propertyId,
      folioId: folio.id,
      businessDate,
      chargeCodeId: code.id,
      description: `Payment (${input.method})`,
      amount: signed.amount,
      currency,
      baseAmount: signed.amount,
      fxRate: '1',
      quantity: '1',
      sourceType: 'payment',
      sourceId: paymentId,
      postedBy: ctx.userId,
    });

    await tx.insert(payments).values({
      id: paymentId,
      tenantId: ctx.tenantId,
      propertyId: folio.propertyId,
      folioId: folio.id,
      method: input.method,
      amount: input.amount.amount,
      currency,
      baseAmount: input.amount.amount,
      fxRate: '1',
      status: 'captured',
      pspToken: input.pspToken ?? null,
      reference: input.reference ?? null,
      postingId,
    });

    await this.adjustBalance(tx, folio.id, folio.balance, signed, currency);

    await this.gl.postJournal(tx, {
      propertyId: folio.propertyId,
      businessDate,
      source: 'payment',
      sourceId: paymentId,
      description: `Payment (${input.method})`,
      currency,
      lines: [
        { accountCode: ACCOUNT.CASH, debit: input.amount },
        { accountCode: ACCOUNT.GUEST_LEDGER, credit: input.amount },
      ],
    });

    helpers.emit({
      type: 'folio.payment_recorded',
      aggregateType: 'folio',
      aggregateId: folio.id,
      propertyId: folio.propertyId,
      data: { folioId: folio.id, paymentId, amount: input.amount.toJSON(), method: input.method },
    });
    helpers.audit({
      action: 'payment.collect',
      entityType: 'payment',
      entityId: paymentId,
      after: { folioId: folio.id, amount: input.amount.amount, method: input.method },
      propertyId: folio.propertyId,
    });

    return paymentId;
  }

  /** Post a night's room charge with its room tax (used by night audit). */
  async postRoomCharge(
    tx: DbTransaction,
    helpers: UowHelpers,
    input: { folioId: string; amount: Money; businessDate?: string; description?: string },
  ): Promise<string> {
    const ctx = getRequestContext();
    const folio = await this.loadOpenFolio(tx, input.folioId);
    const currency = folio.currency.trim();
    const [taxRule] = await tx
      .select({ ratePct: taxRules.ratePct, inclusive: taxRules.inclusive })
      .from(taxRules)
      .where(and(eq(taxRules.tenantId, ctx.tenantId), eq(taxRules.appliesToCategory, 'room')))
      .limit(1);
    const tax = taxRule && !taxRule.inclusive ? input.amount.percentage(taxRule.ratePct) : Money.zero(currency);
    return this.postCharge(tx, helpers, {
      folioId: input.folioId,
      chargeCode: 'ROOM',
      description: input.description ?? 'Room charge',
      amount: input.amount,
      businessDate: input.businessDate,
      sourceType: 'room',
      revenueAccount: ACCOUNT.ROOM_REVENUE,
      tax: tax.isZero() ? undefined : { amount: tax, account: ACCOUNT.TAX_PAYABLE },
    });
  }

  async refundPayment(
    tx: DbTransaction,
    helpers: UowHelpers,
    paymentId: string,
    amount: Money,
    reason: string,
  ): Promise<string> {
    const ctx = getRequestContext();
    const [pmt] = await tx
      .select()
      .from(payments)
      .where(and(eq(payments.id, paymentId), eq(payments.tenantId, ctx.tenantId)))
      .limit(1);
    if (!pmt) throw new NotFoundError('Payment');
    if (pmt.status !== 'captured') {
      throw new StateConflictError('Only a captured payment can be refunded');
    }

    const [folio] = await tx
      .select()
      .from(folios)
      .where(and(eq(folios.id, pmt.folioId), eq(folios.tenantId, ctx.tenantId)))
      .limit(1);
    if (!folio) throw new NotFoundError('Folio');
    const currency = folio.currency.trim();
    const original = Money.of(pmt.amount, currency);
    if (amount.compare(original) > 0) {
      throw new StateConflictError('Refund exceeds original payment amount');
    }

    const businessDate = await this.businessDate.current(tx, folio.propertyId);
    const refundId = uuidv7();
    const postingId = uuidv7();

    const [code] = await tx
      .select()
      .from(chargeCodes)
      .where(and(eq(chargeCodes.tenantId, ctx.tenantId), eq(chargeCodes.code, 'PAYMENT')))
      .limit(1);
    if (!code) throw new NotFoundError('Charge code PAYMENT');

    // Reversal posting (positive — the payment that reduced the balance is being undone).
    await tx.insert(folioPostings).values({
      id: postingId,
      tenantId: ctx.tenantId,
      propertyId: folio.propertyId,
      folioId: folio.id,
      businessDate,
      chargeCodeId: code.id,
      description: `Refund: ${reason}`,
      amount: amount.amount,
      currency,
      baseAmount: amount.amount,
      fxRate: '1',
      quantity: '1',
      sourceType: 'refund',
      sourceId: refundId,
      postedBy: ctx.userId,
    });

    await tx.insert(payments).values({
      id: refundId,
      tenantId: ctx.tenantId,
      propertyId: folio.propertyId,
      folioId: folio.id,
      method: pmt.method,
      amount: amount.negate().amount,
      currency,
      baseAmount: amount.negate().amount,
      fxRate: '1',
      status: 'refunded',
      refundsPaymentId: paymentId,
      postingId,
    });
    await tx.update(payments).set({ status: 'refunded' }).where(eq(payments.id, paymentId));
    await this.adjustBalance(tx, folio.id, folio.balance, amount, currency);

    await this.gl.postJournal(tx, {
      propertyId: folio.propertyId,
      businessDate,
      source: 'payment',
      sourceId: refundId,
      description: `Refund (${pmt.method})`,
      currency,
      lines: [
        { accountCode: ACCOUNT.GUEST_LEDGER, debit: amount },
        { accountCode: ACCOUNT.CASH, credit: amount },
      ],
    });

    helpers.emit({
      type: 'folio.refunded',
      aggregateType: 'folio',
      aggregateId: folio.id,
      propertyId: folio.propertyId,
      data: { folioId: folio.id, refundId, amount: amount.toJSON() },
    });
    helpers.audit({
      action: 'payment.refund',
      entityType: 'payment',
      entityId: refundId,
      reason,
      after: { folioId: folio.id, amount: amount.amount },
      propertyId: folio.propertyId,
    });
    return refundId;
  }

  async getDto(tx: DbTransaction, folioId: string): Promise<Folio> {
    const ctx = getRequestContext();
    const [folio] = await tx
      .select()
      .from(folios)
      .where(and(eq(folios.id, folioId), eq(folios.tenantId, ctx.tenantId)))
      .limit(1);
    if (!folio) throw new NotFoundError('Folio');

    const postings = await tx
      .select()
      .from(folioPostings)
      .where(and(eq(folioPostings.tenantId, ctx.tenantId), eq(folioPostings.folioId, folioId)))
      .orderBy(asc(folioPostings.postedAt));

    const currency = folio.currency.trim();
    return {
      id: folio.id,
      folioNumber: folio.folioNumber,
      status: folio.status,
      type: folio.type,
      currency,
      balance: Money.of(folio.balance, currency).toJSON(),
      reservationId: folio.reservationId,
      postings: postings.map((p) => ({
        id: p.id,
        businessDate: p.businessDate,
        description: p.description,
        amount: Money.of(p.amount, p.currency.trim()).toJSON(),
        sourceType: p.sourceType,
        reversesPostingId: p.reversesPostingId,
        postedAt: p.postedAt.toISOString(),
      })),
    };
  }

  async close(tx: DbTransaction, helpers: UowHelpers, folioId: string): Promise<void> {
    const folio = await this.loadOpenFolio(tx, folioId);
    const currency = folio.currency.trim();
    if (!Money.of(folio.balance, currency).isZero()) {
      throw new StateConflictError('Folio balance must be zero to close (or transfer to AR)');
    }
    await tx
      .update(folios)
      .set({ status: 'closed', closedAt: new Date(), updatedAt: new Date() })
      .where(eq(folios.id, folioId));
    helpers.emit({
      type: 'folio.closed',
      aggregateType: 'folio',
      aggregateId: folioId,
      propertyId: folio.propertyId,
      data: { folioId },
    });
    helpers.audit({
      action: 'folio.close',
      entityType: 'folio',
      entityId: folioId,
      propertyId: folio.propertyId,
    });
  }

  async folioIdForPayment(tx: DbTransaction, paymentId: string): Promise<string> {
    const ctx = getRequestContext();
    const [p] = await tx
      .select({ folioId: payments.folioId })
      .from(payments)
      .where(and(eq(payments.id, paymentId), eq(payments.tenantId, ctx.tenantId)))
      .limit(1);
    if (!p) throw new NotFoundError('Payment');
    return p.folioId;
  }

  /** Open folio id for a reservation (used by check-in, charges, checkout). */
  async openFolioIdForReservation(tx: DbTransaction, reservationId: string): Promise<string | null> {
    const ctx = getRequestContext();
    const [folio] = await tx
      .select({ id: folios.id })
      .from(folios)
      .where(
        and(
          eq(folios.tenantId, ctx.tenantId),
          eq(folios.reservationId, reservationId),
          eq(folios.status, 'open'),
        ),
      )
      .limit(1);
    return folio?.id ?? null;
  }

  private async adjustBalance(
    tx: DbTransaction,
    folioId: string,
    current: string,
    delta: Money,
    currency: string,
  ): Promise<void> {
    const next = Money.of(current, currency).add(delta);
    await tx
      .update(folios)
      .set({ balance: next.amount, updatedAt: new Date() })
      .where(eq(folios.id, folioId));
  }
}
