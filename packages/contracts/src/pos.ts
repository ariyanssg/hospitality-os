import { z } from './zod';
import { IsoDateTime, MoneySchema, Uuid, paginated } from './common';

export const PosOutletSchema = z
  .object({
    id: Uuid,
    code: z.string(),
    name: z.string(),
    currency: z.string().length(3),
  })
  .openapi('PosOutlet');
export type PosOutlet = z.infer<typeof PosOutletSchema>;

export const PosTableSchema = z
  .object({
    id: Uuid,
    outletId: Uuid,
    label: z.string(),
    section: z.string().nullable(),
    seats: z.number().int(),
    x: z.number().int(),
    y: z.number().int(),
  })
  .openapi('PosTable');
export type PosTable = z.infer<typeof PosTableSchema>;

export const OpenPosCheckSchema = z
  .object({
    outletId: Uuid,
    tableId: Uuid.optional(),
    covers: z.number().int().positive().default(1),
  })
  .openapi('OpenPosCheck');
export type OpenPosCheckInput = z.infer<typeof OpenPosCheckSchema>;

export const AddPosItemSchema = z
  .object({
    name: z.string().min(1),
    course: z.string().optional(),
    quantity: z.number().int().positive().default(1),
    unitPrice: MoneySchema,
  })
  .openapi('AddPosItem');
export type AddPosItemInput = z.infer<typeof AddPosItemSchema>;

export const PosPaymentSchema = z
  .object({
    method: z.enum(['card', 'cash', 'bank_transfer', 'ar_transfer', 'voucher']),
    amount: MoneySchema,
    reference: z.string().optional(),
  })
  .openapi('PosPayment');
export type PosPaymentInput = z.infer<typeof PosPaymentSchema>;

export const ClosePosCheckSchema = z
  .object({
    payments: z.array(PosPaymentSchema).default([]),
    roomFolioId: Uuid.optional(),
  })
  .openapi('ClosePosCheck');
export type ClosePosCheckInput = z.infer<typeof ClosePosCheckSchema>;

export const PosRoomChargeSearchQuerySchema = z.object({
  q: z.string().trim().min(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
export type PosRoomChargeSearchQuery = z.infer<typeof PosRoomChargeSearchQuerySchema>;

export const PosRoomChargeCandidateSchema = z
  .object({
    reservationId: Uuid,
    folioId: Uuid,
    folioNumber: z.string(),
    guestName: z.string(),
    roomNumber: z.string().nullable(),
    balance: MoneySchema,
    currency: z.string().length(3),
    chargeAllowed: z.boolean(),
    verificationHint: z.string(),
  })
  .openapi('PosRoomChargeCandidate');
export type PosRoomChargeCandidate = z.infer<typeof PosRoomChargeCandidateSchema>;

export const PosCheckItemSchema = z
  .object({
    id: Uuid,
    name: z.string(),
    course: z.string().nullable(),
    quantity: z.number().int(),
    unitPrice: MoneySchema,
    lineTotal: MoneySchema,
    status: z.enum(['new', 'fired', 'ready', 'served', 'voided']),
    firedAt: IsoDateTime.nullable(),
    readyAt: IsoDateTime.nullable(),
  })
  .openapi('PosCheckItem');
export type PosCheckItem = z.infer<typeof PosCheckItemSchema>;

export const PosCheckSchema = z
  .object({
    id: Uuid,
    outletId: Uuid,
    tableId: Uuid.nullable(),
    checkNumber: z.string(),
    status: z.enum(['open', 'fired', 'closed', 'voided']),
    covers: z.number().int(),
    subtotal: MoneySchema,
    discountTotal: MoneySchema,
    taxTotal: MoneySchema,
    total: MoneySchema,
    roomFolioId: Uuid.nullable(),
    openedAt: IsoDateTime,
    items: z.array(PosCheckItemSchema),
  })
  .openapi('PosCheck');
export type PosCheck = z.infer<typeof PosCheckSchema>;

export const PosCheckListQuerySchema = z.object({
  outletId: Uuid.optional(),
  status: z.enum(['open', 'fired', 'closed', 'voided']).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
export type PosCheckListQuery = z.infer<typeof PosCheckListQuerySchema>;

export const PosCheckPageSchema = paginated(PosCheckSchema).openapi('PosCheckPage');
export type PosCheckPage = z.infer<typeof PosCheckPageSchema>;

/** KDS queue entry — a fired/ready item with enough check context to group tickets. */
export const PosKdsItemSchema = PosCheckItemSchema.extend({
  checkId: Uuid,
  checkNumber: z.string(),
  tableId: Uuid.nullable(),
  outletId: Uuid,
}).openapi('PosKdsItem');
export type PosKdsItem = z.infer<typeof PosKdsItemSchema>;

export const PosShiftSchema = z
  .object({
    id: Uuid,
    outletId: Uuid,
    status: z.enum(['open', 'closed']),
    expectedTotal: MoneySchema.nullable(),
    countedTotal: MoneySchema.nullable(),
    variance: MoneySchema.nullable(),
    openedAt: IsoDateTime,
    closedAt: IsoDateTime.nullable(),
  })
  .openapi('PosShift');
export type PosShift = z.infer<typeof PosShiftSchema>;

export const OpenPosShiftSchema = z.object({ outletId: Uuid }).openapi('OpenPosShift');
export type OpenPosShiftInput = z.infer<typeof OpenPosShiftSchema>;

export const ClosePosShiftSchema = z.object({ countedTotal: MoneySchema }).openapi('ClosePosShift');
export type ClosePosShiftInput = z.infer<typeof ClosePosShiftSchema>;

export const OfflineOpSchema = z
  .object({
    id: Uuid,
    deviceId: z.string(),
    opKey: z.string(),
    status: z.enum(['queued', 'applied', 'rejected']),
    rejectionReason: z.string().nullable(),
  })
  .openapi('OfflineOp');
export type OfflineOp = z.infer<typeof OfflineOpSchema>;

export const QueueOfflineOpSchema = z
  .object({
    deviceId: z.string().min(1),
    opKey: z.string().min(1),
    payload: z.record(z.unknown()),
  })
  .openapi('QueueOfflineOp');
export type QueueOfflineOpInput = z.infer<typeof QueueOfflineOpSchema>;
