import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { cashierSessions, payments, properties, uuidv7, type DbTransaction } from '@vela/db';
import type { CashierSession } from '@vela/contracts';
import {
  getRequestContext,
  Money,
  NotFoundError,
  StateConflictError,
  type UowHelpers,
} from '../kernel';

/**
 * Cashier sessions (doc modules/01 end-of-shift close): one open session per user per property;
 * cash payments collected while it is open land in it; close compares expected vs counted.
 */
@Injectable()
export class CashierService {
  async open(
    tx: DbTransaction,
    helpers: UowHelpers,
    propertyId: string,
    openingFloat: Money,
  ): Promise<string> {
    const ctx = getRequestContext();
    const [existing] = await tx
      .select({ id: cashierSessions.id })
      .from(cashierSessions)
      .where(
        and(
          eq(cashierSessions.tenantId, ctx.tenantId),
          eq(cashierSessions.propertyId, propertyId),
          eq(cashierSessions.userId, ctx.userId ?? ''),
          eq(cashierSessions.status, 'open'),
        ),
      )
      .limit(1);
    if (existing) throw new StateConflictError('You already have an open cashier session');

    const id = uuidv7();
    await tx.insert(cashierSessions).values({
      id,
      tenantId: ctx.tenantId,
      propertyId,
      userId: ctx.userId ?? '',
      status: 'open',
      openingFloat: openingFloat.amount,
    });
    helpers.emit({
      type: 'cashier.session_opened',
      aggregateType: 'cashier_session',
      aggregateId: id,
      propertyId,
      data: { sessionId: id, openingFloat: openingFloat.toJSON() },
    });
    helpers.audit({
      action: 'cashier.open',
      entityType: 'cashier_session',
      entityId: id,
      after: { openingFloat: openingFloat.amount },
      propertyId,
    });
    return id;
  }

  async current(tx: DbTransaction, propertyId: string): Promise<CashierSession | null> {
    const ctx = getRequestContext();
    const [session] = await tx
      .select()
      .from(cashierSessions)
      .where(
        and(
          eq(cashierSessions.tenantId, ctx.tenantId),
          eq(cashierSessions.propertyId, propertyId),
          eq(cashierSessions.userId, ctx.userId ?? ''),
          eq(cashierSessions.status, 'open'),
        ),
      )
      .limit(1);
    if (!session) return null;
    return this.toDto(tx, session);
  }

  /** Close: expected = opening float + Σ cash collected in the session; variance = counted − expected. */
  async close(
    tx: DbTransaction,
    helpers: UowHelpers,
    sessionId: string,
    countedTotal: Money,
    propertyId?: string,
    varianceReason?: string,
  ): Promise<void> {
    const ctx = getRequestContext();
    const [session] = await tx
      .select()
      .from(cashierSessions)
      .where(
        and(
          eq(cashierSessions.tenantId, ctx.tenantId),
          eq(cashierSessions.id, sessionId),
          propertyId ? eq(cashierSessions.propertyId, propertyId) : undefined,
        ),
      )
      .limit(1);
    if (!session) throw new NotFoundError('Cashier session');
    if (session.status !== 'open') throw new StateConflictError('Cashier session is not open');

    const currency = countedTotal.currency;
    const cashRows = await tx
      .select({ amount: payments.amount })
      .from(payments)
      .where(
        and(
          eq(payments.tenantId, ctx.tenantId),
          eq(payments.cashierSessionId, sessionId),
          eq(payments.method, 'cash'),
        ),
      );
    let expected = Money.of(session.openingFloat, currency);
    for (const row of cashRows) {
      expected = expected.add(Money.of(row.amount, currency));
    }
    const variance = countedTotal.subtract(expected);
    if (!variance.isZero() && !varianceReason) {
      throw new StateConflictError('A variance reason is required when counted ≠ expected');
    }

    await tx
      .update(cashierSessions)
      .set({
        status: 'closed',
        expectedTotal: expected.amount,
        countedTotal: countedTotal.amount,
        variance: variance.amount,
        varianceReason: varianceReason ?? null,
        closedAt: new Date(),
      })
      .where(eq(cashierSessions.id, sessionId));

    helpers.emit({
      type: 'cashier.session_closed',
      aggregateType: 'cashier_session',
      aggregateId: sessionId,
      propertyId: session.propertyId,
      data: {
        sessionId,
        expected: expected.toJSON(),
        counted: countedTotal.toJSON(),
        variance: variance.toJSON(),
      },
    });
    helpers.audit({
      action: 'cashier.close',
      entityType: 'cashier_session',
      entityId: sessionId,
      after: { expected: expected.amount, counted: countedTotal.amount, variance: variance.amount },
      reason: varianceReason,
      propertyId: session.propertyId,
    });
  }

  async getDto(tx: DbTransaction, sessionId: string, propertyId?: string): Promise<CashierSession> {
    const ctx = getRequestContext();
    const [session] = await tx
      .select()
      .from(cashierSessions)
      .where(
        and(
          eq(cashierSessions.tenantId, ctx.tenantId),
          eq(cashierSessions.id, sessionId),
          propertyId ? eq(cashierSessions.propertyId, propertyId) : undefined,
        ),
      )
      .limit(1);
    if (!session) throw new NotFoundError('Cashier session');
    return this.toDto(tx, session);
  }

  private async toDto(
    tx: DbTransaction,
    session: typeof cashierSessions.$inferSelect,
  ): Promise<CashierSession> {
    const [property] = await tx
      .select({ currency: properties.currency })
      .from(properties)
      .where(eq(properties.id, session.propertyId))
      .limit(1);
    const currency = (property?.currency ?? 'USD').trim();
    const m = (v: string | null) => (v === null ? null : Money.of(v, currency).toJSON());
    return {
      id: session.id,
      status: session.status,
      openingFloat: Money.of(session.openingFloat, currency).toJSON(),
      expectedTotal: m(session.expectedTotal),
      countedTotal: m(session.countedTotal),
      variance: m(session.variance),
      openedAt: session.openedAt.toISOString(),
      closedAt: session.closedAt?.toISOString() ?? null,
    };
  }
}
