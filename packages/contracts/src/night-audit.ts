import { z } from './zod';
import { IsoDate } from './common';

export const NightAuditRunSchema = z.object({ businessDate: IsoDate.optional() }).openapi('NightAuditRun');

export const TrialBalanceLineSchema = z.object({
  accountCode: z.string(),
  accountName: z.string(),
  debit: z.string(),
  credit: z.string(),
});

export const TrialBalanceSchema = z
  .object({
    propertyId: z.string().uuid(),
    businessDate: IsoDate,
    currency: z.string(),
    lines: z.array(TrialBalanceLineSchema),
    totalDebit: z.string(),
    totalCredit: z.string(),
    balanced: z.boolean(),
  })
  .openapi('TrialBalance');
export type TrialBalance = z.infer<typeof TrialBalanceSchema>;

export const NightAuditResultSchema = z
  .object({
    propertyId: z.string().uuid(),
    previousBusinessDate: IsoDate,
    newBusinessDate: IsoDate,
    roomsPosted: z.number().int(),
    noShowsProcessed: z.number().int(),
    journalEntryId: z.string().uuid().nullable(),
    trialBalance: TrialBalanceSchema,
  })
  .openapi('NightAuditResult');
export type NightAuditResult = z.infer<typeof NightAuditResultSchema>;
