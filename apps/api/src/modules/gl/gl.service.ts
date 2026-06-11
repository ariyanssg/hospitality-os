import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { journalEntries, journalLines, uuidv7, type DbTransaction } from '@vela/db';
import type { TrialBalance } from '@vela/contracts';
import { getRequestContext, Money } from '../kernel';

export interface JournalLineInput {
  accountCode: string;
  debit?: Money;
  credit?: Money;
  costCenterCode?: string;
  memo?: string;
}

export interface PostJournalInput {
  propertyId: string;
  businessDate: string;
  source: 'folio_posting' | 'payment' | 'night_audit' | 'manual';
  sourceId?: string;
  description: string;
  currency: string;
  lines: JournalLineInput[];
}

/**
 * General Ledger. Every financial posting generates BALANCED journal lines in the same transaction;
 * the DB's deferred constraint trigger rejects an unbalanced entry at commit (doc 04 §2).
 */
@Injectable()
export class GlService {
  async postJournal(tx: DbTransaction, input: PostJournalInput): Promise<string> {
    const ctx = getRequestContext();
    const entryId = uuidv7();
    const zero = Money.zero(input.currency);

    await tx.insert(journalEntries).values({
      id: entryId,
      tenantId: ctx.tenantId,
      propertyId: input.propertyId,
      businessDate: input.businessDate,
      source: input.source,
      sourceId: input.sourceId ?? null,
      description: input.description,
      currency: input.currency,
      postedBy: ctx.userId,
    });

    for (const line of input.lines) {
      await tx.insert(journalLines).values({
        id: uuidv7(),
        tenantId: ctx.tenantId,
        propertyId: input.propertyId,
        journalEntryId: entryId,
        businessDate: input.businessDate,
        accountCode: line.accountCode,
        debit: (line.debit ?? zero).amount,
        credit: (line.credit ?? zero).amount,
        currency: input.currency,
        costCenterCode: line.costCenterCode ?? null,
        memo: line.memo ?? null,
      });
    }

    return entryId;
  }

  /**
   * Cumulative trial balance for a property (optionally through a business date). Σdebits = Σcredits
   * by construction — this is the report that "ties to the folio ledger" in the demo.
   */
  async trialBalance(
    tx: DbTransaction,
    propertyId: string,
    currency: string,
    throughBusinessDate?: string,
  ): Promise<TrialBalance> {
    const ctx = getRequestContext();
    const dateFilter = throughBusinessDate
      ? sql`AND jl.business_date <= ${throughBusinessDate}`
      : sql``;

    const rows = (await tx.execute(sql`
      SELECT jl.account_code AS account_code,
             COALESCE(ga.name, jl.account_code) AS account_name,
             SUM(jl.debit) AS debit,
             SUM(jl.credit) AS credit
      FROM journal_lines jl
      LEFT JOIN gl_accounts ga
        ON ga.tenant_id = jl.tenant_id AND ga.code = jl.account_code
      WHERE jl.tenant_id = ${ctx.tenantId} AND jl.property_id = ${propertyId} ${dateFilter}
      GROUP BY jl.account_code, ga.name
      ORDER BY jl.account_code
    `)) as unknown as Array<{
      account_code: string;
      account_name: string;
      debit: string;
      credit: string;
    }>;

    let totalDebit = Money.zero(currency);
    let totalCredit = Money.zero(currency);
    const lines = rows.map((r) => {
      totalDebit = totalDebit.add(Money.of(r.debit ?? '0', currency));
      totalCredit = totalCredit.add(Money.of(r.credit ?? '0', currency));
      return {
        accountCode: r.account_code,
        accountName: r.account_name,
        debit: Money.of(r.debit ?? '0', currency).amount,
        credit: Money.of(r.credit ?? '0', currency).amount,
      };
    });

    return {
      propertyId,
      businessDate: throughBusinessDate ?? new Date().toISOString().slice(0, 10),
      currency,
      lines,
      totalDebit: totalDebit.amount,
      totalCredit: totalCredit.amount,
      balanced: totalDebit.compare(totalCredit) === 0,
    };
  }
}
