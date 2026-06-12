import { z } from './zod';
import { IsoDate, IsoDateTime, MoneySchema, Uuid } from './common';

export const PostChargeSchema = z
  .object({
    chargeCode: z.string().min(1),
    description: z.string().optional(),
    amount: MoneySchema,
    quantity: z.number().positive().default(1),
  })
  .openapi('PostCharge');
export type PostChargeInput = z.infer<typeof PostChargeSchema>;

export const RecordPaymentSchema = z
  .object({
    method: z.enum(['card', 'cash', 'bank_transfer', 'ar_transfer', 'voucher']),
    amount: MoneySchema,
    reference: z.string().optional(),
    pspToken: z.string().optional(),
  })
  .openapi('RecordPayment');
export type RecordPaymentInput = z.infer<typeof RecordPaymentSchema>;

export const RefundSchema = z
  .object({ amount: MoneySchema, reason: z.string().min(1) })
  .openapi('Refund');
export type RefundInput = z.infer<typeof RefundSchema>;

export const FolioPostingSchema = z.object({
  id: Uuid,
  businessDate: IsoDate,
  description: z.string(),
  amount: MoneySchema,
  sourceType: z.string(),
  reversesPostingId: Uuid.nullable(),
  postedAt: IsoDateTime,
});
export type FolioPosting = z.infer<typeof FolioPostingSchema>;

export const FolioSchema = z
  .object({
    id: Uuid,
    folioNumber: z.string(),
    status: z.string(),
    type: z.string(),
    currency: z.string(),
    balance: MoneySchema,
    reservationId: Uuid.nullable(),
    postings: z.array(FolioPostingSchema),
  })
  .openapi('Folio');
export type Folio = z.infer<typeof FolioSchema>;

/** Move a posting between folios: reversal on the source + repost on the target (immutable trail). */
export const TransferPostingSchema = z
  .object({ postingId: Uuid, toFolioId: Uuid, reason: z.string().optional() })
  .openapi('TransferPosting');
export type TransferPostingInput = z.infer<typeof TransferPostingSchema>;

export const CreateFolioSchema = z
  .object({
    reservationId: Uuid,
    type: z.enum(['guest', 'master', 'company', 'paymaster']).default('guest'),
  })
  .openapi('CreateFolio');
export type CreateFolioInput = z.infer<typeof CreateFolioSchema>;

// ── Cashier sessions ──
export const OpenCashierSessionSchema = z
  .object({ openingFloat: MoneySchema })
  .openapi('OpenCashierSession');
export type OpenCashierSessionInput = z.infer<typeof OpenCashierSessionSchema>;

export const CloseCashierSessionSchema = z
  .object({ countedTotal: MoneySchema, varianceReason: z.string().optional() })
  .openapi('CloseCashierSession');
export type CloseCashierSessionInput = z.infer<typeof CloseCashierSessionSchema>;

export const CashierSessionSchema = z
  .object({
    id: Uuid,
    status: z.enum(['open', 'closed']),
    openingFloat: MoneySchema,
    expectedTotal: MoneySchema.nullable(),
    countedTotal: MoneySchema.nullable(),
    variance: MoneySchema.nullable(),
    openedAt: IsoDateTime,
    closedAt: IsoDateTime.nullable(),
  })
  .openapi('CashierSession');
export type CashierSession = z.infer<typeof CashierSessionSchema>;

// ── Deposits ──
export const RecordDepositSchema = z
  .object({
    method: z.enum(['card', 'cash', 'bank_transfer', 'voucher']),
    amount: MoneySchema,
    reference: z.string().optional(),
  })
  .openapi('RecordDeposit');
export type RecordDepositInput = z.infer<typeof RecordDepositSchema>;

export const DepositSchema = z
  .object({
    id: Uuid,
    reservationId: Uuid,
    method: z.string(),
    amount: MoneySchema,
    status: z.enum(['held', 'applied', 'refunded']),
    heldAt: IsoDateTime,
    appliedAt: IsoDateTime.nullable(),
  })
  .openapi('Deposit');
export type Deposit = z.infer<typeof DepositSchema>;
