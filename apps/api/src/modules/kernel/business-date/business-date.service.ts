import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { businessDates, type DbTransaction } from '@vela/db';
import { getRequestContext } from '../context/request-context';
import { StateConflictError } from '../errors/domain-errors';

/**
 * The only sanctioned source of business-date logic (doc 14 §2). The business day rolls at night
 * audit, NOT at midnight — so the "current" date is read from the business_dates ledger, never from
 * the wall clock.
 */
@Injectable()
export class BusinessDateService {
  async current(tx: DbTransaction, propertyId: string): Promise<string> {
    const { tenantId } = getRequestContext();
    const rows = await tx
      .select({ businessDate: businessDates.businessDate, status: businessDates.status })
      .from(businessDates)
      .where(and(eq(businessDates.tenantId, tenantId), eq(businessDates.propertyId, propertyId)))
      .limit(1);
    const row = rows[0];
    if (!row) {
      throw new StateConflictError(`No business date initialized for property ${propertyId}`);
    }
    return row.businessDate;
  }

  async isOpen(tx: DbTransaction, propertyId: string): Promise<boolean> {
    const { tenantId } = getRequestContext();
    const rows = await tx
      .select({ status: businessDates.status })
      .from(businessDates)
      .where(and(eq(businessDates.tenantId, tenantId), eq(businessDates.propertyId, propertyId)))
      .limit(1);
    return rows[0]?.status === 'open';
  }
}
