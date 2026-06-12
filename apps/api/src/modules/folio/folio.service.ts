import { Injectable } from '@nestjs/common';
import { and, asc, eq, inArray } from 'drizzle-orm';
import {
  cashierSessions,
  chargeCodes,
  deposits,
  folioPostings,
  folios,
  paymentMethods,
  paymentIntents,
  payments,
  reservations,
  taxRules,
  uuidv7,
  type DbTransaction,
} from '@vela/db';
import type {
  AuthorizePaymentInput,
  CapturePaymentIntentInput,
  Deposit,
  Folio,
  PaymentIntent,
} from '@vela/contracts';
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
  type?: 'guest' | 'master' | 'company' | 'paymaster';
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
  method: string;
  amount: Money;
  businessDate?: string;
  reference?: string;
  pspToken?: string;
}

export interface OpenFolioSummary {
  id: string;
  reservationId: string;
  balance: string;
  currency: string;
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
      type: input.type ?? 'guest',
      status: 'open',
      currency: input.currency,
      balance: '0',
    });
    return id;
  }

  private async loadOpenFolio(tx: DbTransaction, folioId: string, propertyId?: string) {
    const ctx = getRequestContext();
    const [folio] = await tx
      .select()
      .from(folios)
      .where(
        and(
          eq(folios.id, folioId),
          eq(folios.tenantId, ctx.tenantId),
          propertyId ? eq(folios.propertyId, propertyId) : undefined,
        ),
      )
      .limit(1);
    if (!folio) throw new NotFoundError('Folio');
    if (folio.status !== 'open') throw new StateConflictError('Folio is not open');
    return folio;
  }

  /** Cross-module read API: validate that a folio can receive same-transaction postings. */
  async assertOpenFolio(tx: DbTransaction, folioId: string, propertyId?: string): Promise<void> {
    await this.loadOpenFolio(tx, folioId, propertyId);
  }

  private async assertPaymentMethodActive(
    tx: DbTransaction,
    propertyId: string,
    method: string,
  ): Promise<void> {
    const ctx = getRequestContext();
    const [row] = await tx
      .select({ id: paymentMethods.id })
      .from(paymentMethods)
      .where(
        and(
          eq(paymentMethods.tenantId, ctx.tenantId),
          eq(paymentMethods.propertyId, propertyId),
          eq(paymentMethods.code, method),
          eq(paymentMethods.isActive, true),
        ),
      )
      .limit(1);
    if (!row) throw new NotFoundError(`Payment method ${method}`);
  }

  async postCharge(
    tx: DbTransaction,
    helpers: UowHelpers,
    input: PostChargeInternal,
    propertyId?: string,
  ): Promise<string> {
    const ctx = getRequestContext();
    const folio = await this.loadOpenFolio(tx, input.folioId, propertyId);
    const currency = folio.currency.trim();

    const [code] = await tx
      .select()
      .from(chargeCodes)
      .where(
        and(
          eq(chargeCodes.tenantId, ctx.tenantId),
          eq(chargeCodes.code, input.chargeCode),
          eq(chargeCodes.isActive, true),
        ),
      )
      .limit(1);
    if (!code) throw new NotFoundError(`Charge code ${input.chargeCode}`);

    const revenueAccount = input.revenueAccount ?? code.glAccountCode ?? ACCOUNT.MISC_REVENUE;
    const businessDate =
      input.businessDate ?? (await this.businessDate.current(tx, folio.propertyId));
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
    propertyId?: string,
  ): Promise<string> {
    const ctx = getRequestContext();
    const folio = await this.loadOpenFolio(tx, input.folioId, propertyId);
    const currency = folio.currency.trim();
    const businessDate =
      input.businessDate ?? (await this.businessDate.current(tx, folio.propertyId));
    await this.assertPaymentMethodActive(tx, folio.propertyId, input.method);

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

    // Cash-handling accountability: the payment lands in the collector's open cashier session.
    const [session] = await tx
      .select({ id: cashierSessions.id })
      .from(cashierSessions)
      .where(
        and(
          eq(cashierSessions.tenantId, ctx.tenantId),
          eq(cashierSessions.propertyId, folio.propertyId),
          eq(cashierSessions.userId, ctx.userId ?? ''),
          eq(cashierSessions.status, 'open'),
        ),
      )
      .limit(1);

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
      cashierSessionId: session?.id ?? null,
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

  async authorizePayment(
    tx: DbTransaction,
    helpers: UowHelpers,
    folioId: string,
    input: AuthorizePaymentInput,
    propertyId?: string,
  ): Promise<string> {
    const ctx = getRequestContext();
    const folio = await this.loadOpenFolio(tx, folioId, propertyId);
    const amount = Money.fromJSON(input.amount);
    if (!amount.isPositive()) {
      throw new StateConflictError('Authorization amount must be positive');
    }
    if (amount.currency !== folio.currency.trim()) {
      throw new StateConflictError('Authorization currency must match folio currency');
    }

    const id = uuidv7();
    await tx.insert(paymentIntents).values({
      id,
      tenantId: ctx.tenantId,
      propertyId: folio.propertyId,
      folioId: folio.id,
      method: 'card',
      status: 'authorized',
      amount: amount.amount,
      capturedAmount: '0',
      currency: amount.currency,
      pspProvider: input.pspProvider,
      pspToken: input.pspToken,
      providerIntentId: input.providerIntentId ?? null,
      providerAuthorizationId: input.providerAuthorizationId ?? null,
      authorizedAt: new Date(),
      metadata: input.metadata,
    });

    helpers.emit({
      type: 'payment.authorized',
      aggregateType: 'payment_intent',
      aggregateId: id,
      propertyId: folio.propertyId,
      data: {
        paymentIntentId: id,
        folioId: folio.id,
        amount: amount.toJSON(),
        pspProvider: input.pspProvider,
      },
    });
    helpers.audit({
      action: 'payment.authorize',
      entityType: 'payment_intent',
      entityId: id,
      after: {
        folioId: folio.id,
        amount: amount.amount,
        pspProvider: input.pspProvider,
        providerIntentId: input.providerIntentId ?? null,
      },
      propertyId: folio.propertyId,
    });

    return id;
  }

  async capturePaymentIntent(
    tx: DbTransaction,
    helpers: UowHelpers,
    paymentIntentId: string,
    input: CapturePaymentIntentInput,
    propertyId?: string,
  ): Promise<string> {
    const ctx = getRequestContext();
    const [intent] = await tx
      .select()
      .from(paymentIntents)
      .where(
        and(
          eq(paymentIntents.id, paymentIntentId),
          eq(paymentIntents.tenantId, ctx.tenantId),
          propertyId ? eq(paymentIntents.propertyId, propertyId) : undefined,
        ),
      )
      .limit(1);
    if (!intent) throw new NotFoundError('Payment intent');
    if (intent.status !== 'authorized') {
      throw new StateConflictError(`Cannot capture a payment intent in status ${intent.status}`);
    }

    const authorized = Money.of(intent.amount, intent.currency.trim());
    const amount = input.amount ? Money.fromJSON(input.amount) : authorized;
    if (!amount.isPositive()) {
      throw new StateConflictError('Capture amount must be positive');
    }
    if (amount.currency !== authorized.currency) {
      throw new StateConflictError('Capture currency must match authorization currency');
    }
    if (amount.compare(authorized) > 0) {
      throw new StateConflictError('Capture amount exceeds authorized amount');
    }

    const paymentId = await this.recordPayment(
      tx,
      helpers,
      {
        folioId: intent.folioId,
        method: 'card',
        amount,
        reference: input.reference ?? intent.providerIntentId ?? undefined,
        pspToken: intent.pspToken,
      },
      propertyId,
    );

    await tx
      .update(paymentIntents)
      .set({
        status: 'captured',
        capturedAmount: amount.amount,
        capturedPaymentId: paymentId,
        capturedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(paymentIntents.id, paymentIntentId));

    helpers.audit({
      action: 'payment.capture',
      entityType: 'payment_intent',
      entityId: paymentIntentId,
      after: { paymentId, amount: amount.amount },
      propertyId: intent.propertyId,
    });

    return paymentId;
  }

  async paymentIntentDto(
    tx: DbTransaction,
    id: string,
    propertyId?: string,
  ): Promise<PaymentIntent> {
    const ctx = getRequestContext();
    const [intent] = await tx
      .select()
      .from(paymentIntents)
      .where(
        and(
          eq(paymentIntents.id, id),
          eq(paymentIntents.tenantId, ctx.tenantId),
          propertyId ? eq(paymentIntents.propertyId, propertyId) : undefined,
        ),
      )
      .limit(1);
    if (!intent) throw new NotFoundError('Payment intent');
    const currency = intent.currency.trim();
    return {
      id: intent.id,
      folioId: intent.folioId,
      method: intent.method,
      status: intent.status as PaymentIntent['status'],
      amount: Money.of(intent.amount, currency).toJSON(),
      capturedAmount: Money.of(intent.capturedAmount, currency).toJSON(),
      pspProvider: intent.pspProvider,
      providerIntentId: intent.providerIntentId,
      providerAuthorizationId: intent.providerAuthorizationId,
      capturedPaymentId: intent.capturedPaymentId,
      authorizedAt: intent.authorizedAt?.toISOString() ?? null,
      capturedAt: intent.capturedAt?.toISOString() ?? null,
      voidedAt: intent.voidedAt?.toISOString() ?? null,
      failureReason: intent.failureReason,
    };
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
    const tax =
      taxRule && !taxRule.inclusive
        ? input.amount.percentage(taxRule.ratePct)
        : Money.zero(currency);
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
    propertyId?: string,
  ): Promise<string> {
    const ctx = getRequestContext();
    const [pmt] = await tx
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.id, paymentId),
          eq(payments.tenantId, ctx.tenantId),
          propertyId ? eq(payments.propertyId, propertyId) : undefined,
        ),
      )
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

  async getDto(tx: DbTransaction, folioId: string, propertyId?: string): Promise<Folio> {
    const ctx = getRequestContext();
    const [folio] = await tx
      .select()
      .from(folios)
      .where(
        and(
          eq(folios.id, folioId),
          eq(folios.tenantId, ctx.tenantId),
          propertyId ? eq(folios.propertyId, propertyId) : undefined,
        ),
      )
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

  async close(
    tx: DbTransaction,
    helpers: UowHelpers,
    folioId: string,
    propertyId?: string,
  ): Promise<void> {
    const folio = await this.loadOpenFolio(tx, folioId, propertyId);
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

  /** Additional folio for a reservation (splits / company routing / paymaster windows). */
  async createFolioForReservation(
    tx: DbTransaction,
    helpers: UowHelpers,
    reservationId: string,
    type: 'guest' | 'master' | 'company' | 'paymaster',
    propertyId?: string,
  ): Promise<string> {
    const ctx = getRequestContext();
    const [res] = await tx
      .select({
        id: reservations.id,
        propertyId: reservations.propertyId,
        guestId: reservations.guestId,
        currency: reservations.currency,
      })
      .from(reservations)
      .where(
        and(
          eq(reservations.tenantId, ctx.tenantId),
          eq(reservations.id, reservationId),
          propertyId ? eq(reservations.propertyId, propertyId) : undefined,
        ),
      )
      .limit(1);
    if (!res) throw new NotFoundError('Reservation');

    const id = uuidv7();
    await tx.insert(folios).values({
      id,
      tenantId: ctx.tenantId,
      propertyId: res.propertyId,
      folioNumber: folioNumberFrom(id),
      reservationId,
      guestId: res.guestId,
      type,
      status: 'open',
      currency: res.currency,
      balance: '0',
    });
    helpers.audit({
      action: 'folio.create',
      entityType: 'folio',
      entityId: id,
      after: { reservationId, type },
      propertyId: res.propertyId,
    });
    return id;
  }

  /**
   * Transfer a posting between folios: reversal row on the source + repost on the target — the
   * original is never mutated (doc modules/01 folio routing). Both folios sit on the guest ledger,
   * so no GL movement is needed; balances move in the same transaction.
   */
  async transferPosting(
    tx: DbTransaction,
    helpers: UowHelpers,
    sourceFolioId: string,
    postingId: string,
    toFolioId: string,
    reason?: string,
    propertyId?: string,
  ): Promise<void> {
    const ctx = getRequestContext();
    if (sourceFolioId === toFolioId) {
      throw new StateConflictError('Source and target folios are the same');
    }
    const source = await this.loadOpenFolio(tx, sourceFolioId, propertyId);
    const target = await this.loadOpenFolio(tx, toFolioId, propertyId);
    if (source.currency.trim() !== target.currency.trim()) {
      throw new StateConflictError('Folios have different currencies');
    }

    const [posting] = await tx
      .select()
      .from(folioPostings)
      .where(
        and(
          eq(folioPostings.tenantId, ctx.tenantId),
          eq(folioPostings.id, postingId),
          eq(folioPostings.folioId, sourceFolioId),
        ),
      )
      .limit(1);
    if (!posting) throw new NotFoundError('Posting');
    if (posting.sourceType === 'payment' || posting.sourceType === 'refund') {
      throw new StateConflictError('Payments cannot be transferred between folios');
    }

    const currency = source.currency.trim();
    const amount = Money.of(posting.amount, currency);

    // Reversal on the source.
    await tx.insert(folioPostings).values({
      id: uuidv7(),
      tenantId: ctx.tenantId,
      propertyId: source.propertyId,
      folioId: source.id,
      businessDate: posting.businessDate,
      chargeCodeId: posting.chargeCodeId,
      description: `Transfer out → ${target.folioNumber}`,
      amount: amount.negate().amount,
      currency,
      baseAmount: amount.negate().amount,
      fxRate: '1',
      quantity: posting.quantity,
      sourceType: 'adjustment',
      sourceId: posting.id,
      reversesPostingId: posting.id,
      postedBy: ctx.userId,
    });

    // Repost on the target.
    const repostId = uuidv7();
    await tx.insert(folioPostings).values({
      id: repostId,
      tenantId: ctx.tenantId,
      propertyId: target.propertyId,
      folioId: target.id,
      businessDate: posting.businessDate,
      chargeCodeId: posting.chargeCodeId,
      description: `${posting.description} (from ${source.folioNumber})`,
      amount: amount.amount,
      currency,
      baseAmount: amount.amount,
      fxRate: '1',
      quantity: posting.quantity,
      sourceType: posting.sourceType,
      sourceId: posting.id,
      postedBy: ctx.userId,
    });

    await this.adjustBalance(tx, source.id, source.balance, amount.negate(), currency);
    await this.adjustBalance(tx, target.id, target.balance, amount, currency);

    helpers.emit({
      type: 'folio.transferred',
      aggregateType: 'folio',
      aggregateId: source.id,
      propertyId: source.propertyId,
      data: {
        fromFolioId: source.id,
        toFolioId: target.id,
        postingId,
        repostId,
        amount: amount.toJSON(),
      },
    });
    helpers.audit({
      action: 'folio.transfer',
      entityType: 'folio_posting',
      entityId: postingId,
      after: { fromFolioId: source.id, toFolioId: target.id, amount: amount.amount },
      reason,
      propertyId: source.propertyId,
    });
  }

  // ── Deposits (doc modules/01): held on the deposit ledger, auto-applied at check-in ──

  async recordDeposit(
    tx: DbTransaction,
    helpers: UowHelpers,
    reservationId: string,
    input: {
      method: string;
      amount: Money;
      reference?: string;
    },
    propertyId?: string,
  ): Promise<string> {
    const ctx = getRequestContext();
    const [res] = await tx
      .select({
        id: reservations.id,
        propertyId: reservations.propertyId,
        status: reservations.status,
        currency: reservations.currency,
      })
      .from(reservations)
      .where(
        and(
          eq(reservations.tenantId, ctx.tenantId),
          eq(reservations.id, reservationId),
          propertyId ? eq(reservations.propertyId, propertyId) : undefined,
        ),
      )
      .limit(1);
    if (!res) throw new NotFoundError('Reservation');
    if (res.status !== 'confirmed' && res.status !== 'tentative') {
      throw new StateConflictError(`Cannot take a deposit on a ${res.status} reservation`);
    }
    if (!input.amount.isPositive()) {
      throw new StateConflictError('Deposit amount must be positive');
    }
    await this.assertPaymentMethodActive(tx, res.propertyId, input.method);

    const id = uuidv7();
    await tx.insert(deposits).values({
      id,
      tenantId: ctx.tenantId,
      propertyId: res.propertyId,
      reservationId,
      method: input.method,
      amount: input.amount.amount,
      currency: res.currency,
      status: 'held',
      reference: input.reference ?? null,
    });

    const businessDate = await this.businessDate.current(tx, res.propertyId);
    await this.gl.postJournal(tx, {
      propertyId: res.propertyId,
      businessDate,
      source: 'payment',
      sourceId: id,
      description: `Deposit (${input.method})`,
      currency: res.currency.trim(),
      lines: [
        { accountCode: ACCOUNT.CASH, debit: input.amount },
        { accountCode: ACCOUNT.DEPOSIT_LEDGER, credit: input.amount },
      ],
    });

    helpers.emit({
      type: 'deposit.recorded',
      aggregateType: 'deposit',
      aggregateId: id,
      propertyId: res.propertyId,
      data: { depositId: id, reservationId, amount: input.amount.toJSON(), method: input.method },
    });
    helpers.audit({
      action: 'deposit.record',
      entityType: 'deposit',
      entityId: id,
      after: { reservationId, amount: input.amount.amount, method: input.method },
      propertyId: res.propertyId,
    });
    return id;
  }

  /** Apply every held deposit to the reservation's open folio (called by check-in). */
  async applyHeldDeposits(
    tx: DbTransaction,
    helpers: UowHelpers,
    reservationId: string,
  ): Promise<void> {
    const ctx = getRequestContext();
    const held = await tx
      .select()
      .from(deposits)
      .where(
        and(
          eq(deposits.tenantId, ctx.tenantId),
          eq(deposits.reservationId, reservationId),
          eq(deposits.status, 'held'),
        ),
      );
    if (held.length === 0) return;

    const folioId = await this.openFolioIdForReservation(tx, reservationId);
    if (!folioId)
      throw new StateConflictError('Reservation has no open folio to apply deposits to');

    for (const dep of held) {
      const folio = await this.loadOpenFolio(tx, folioId);
      const currency = folio.currency.trim();
      const amount = Money.of(dep.amount, currency);
      const businessDate = await this.businessDate.current(tx, folio.propertyId);

      const [code] = await tx
        .select()
        .from(chargeCodes)
        .where(and(eq(chargeCodes.tenantId, ctx.tenantId), eq(chargeCodes.code, 'PAYMENT')))
        .limit(1);
      if (!code) throw new NotFoundError('Charge code PAYMENT');

      const postingId = uuidv7();
      await tx.insert(folioPostings).values({
        id: postingId,
        tenantId: ctx.tenantId,
        propertyId: folio.propertyId,
        folioId: folio.id,
        businessDate,
        chargeCodeId: code.id,
        description: 'Deposit applied',
        amount: amount.negate().amount,
        currency,
        baseAmount: amount.negate().amount,
        fxRate: '1',
        quantity: '1',
        sourceType: 'deposit',
        sourceId: dep.id,
        postedBy: ctx.userId,
      });
      await this.adjustBalance(tx, folio.id, folio.balance, amount.negate(), currency);

      // Move the liability: deposit ledger → guest ledger.
      await this.gl.postJournal(tx, {
        propertyId: folio.propertyId,
        businessDate,
        source: 'payment',
        sourceId: postingId,
        description: 'Deposit applied at check-in',
        currency,
        lines: [
          { accountCode: ACCOUNT.DEPOSIT_LEDGER, debit: amount },
          { accountCode: ACCOUNT.GUEST_LEDGER, credit: amount },
        ],
      });

      await tx
        .update(deposits)
        .set({
          status: 'applied',
          appliedPostingId: postingId,
          appliedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(deposits.id, dep.id));

      helpers.emit({
        type: 'deposit.applied',
        aggregateType: 'deposit',
        aggregateId: dep.id,
        propertyId: folio.propertyId,
        data: { depositId: dep.id, reservationId, folioId: folio.id, amount: amount.toJSON() },
      });
    }
  }

  async listDeposits(
    tx: DbTransaction,
    reservationId: string,
    propertyId?: string,
  ): Promise<Deposit[]> {
    const ctx = getRequestContext();
    const rows = await tx
      .select()
      .from(deposits)
      .where(
        and(
          eq(deposits.tenantId, ctx.tenantId),
          eq(deposits.reservationId, reservationId),
          propertyId ? eq(deposits.propertyId, propertyId) : undefined,
        ),
      )
      .orderBy(asc(deposits.heldAt));
    return rows.map((d) => ({
      id: d.id,
      reservationId: d.reservationId,
      method: d.method,
      amount: Money.of(d.amount, d.currency.trim()).toJSON(),
      status: d.status,
      heldAt: d.heldAt.toISOString(),
      appliedAt: d.appliedAt?.toISOString() ?? null,
    }));
  }

  async depositDto(tx: DbTransaction, depositId: string, propertyId?: string): Promise<Deposit> {
    const ctx = getRequestContext();
    const [d] = await tx
      .select()
      .from(deposits)
      .where(
        and(
          eq(deposits.tenantId, ctx.tenantId),
          eq(deposits.id, depositId),
          propertyId ? eq(deposits.propertyId, propertyId) : undefined,
        ),
      )
      .limit(1);
    if (!d) throw new NotFoundError('Deposit');
    return {
      id: d.id,
      reservationId: d.reservationId,
      method: d.method,
      amount: Money.of(d.amount, d.currency.trim()).toJSON(),
      status: d.status,
      heldAt: d.heldAt.toISOString(),
      appliedAt: d.appliedAt?.toISOString() ?? null,
    };
  }

  async folioIdForPayment(
    tx: DbTransaction,
    paymentId: string,
    propertyId?: string,
  ): Promise<string> {
    const ctx = getRequestContext();
    const [p] = await tx
      .select({ folioId: payments.folioId })
      .from(payments)
      .where(
        and(
          eq(payments.id, paymentId),
          eq(payments.tenantId, ctx.tenantId),
          propertyId ? eq(payments.propertyId, propertyId) : undefined,
        ),
      )
      .limit(1);
    if (!p) throw new NotFoundError('Payment');
    return p.folioId;
  }

  /** Open folio id for a reservation (used by check-in, charges, checkout). */
  async openFolioIdForReservation(
    tx: DbTransaction,
    reservationId: string,
  ): Promise<string | null> {
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

  /** Cross-module read API for front-desk boards that need running folio balances. */
  async openFolioSummariesForReservations(
    tx: DbTransaction,
    reservationIds: string[],
  ): Promise<Map<string, OpenFolioSummary>> {
    if (reservationIds.length === 0) return new Map();
    const ctx = getRequestContext();
    const rows = await tx
      .select({
        id: folios.id,
        reservationId: folios.reservationId,
        balance: folios.balance,
        currency: folios.currency,
      })
      .from(folios)
      .where(
        and(
          eq(folios.tenantId, ctx.tenantId),
          eq(folios.status, 'open'),
          inArray(folios.reservationId, reservationIds),
        ),
      );
    const summaries = new Map<string, OpenFolioSummary>();
    for (const row of rows) {
      if (!row.reservationId) continue;
      summaries.set(row.reservationId, {
        id: row.id,
        reservationId: row.reservationId,
        balance: row.balance,
        currency: row.currency.trim(),
      });
    }
    return summaries;
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
