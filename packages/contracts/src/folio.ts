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
