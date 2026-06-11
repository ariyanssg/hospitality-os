import { z } from './zod';
import { IsoDate, MoneySchema, Uuid } from './common';

export const GuestRefSchema = z.union([
  z.object({ id: Uuid }),
  z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email().optional(),
    phone: z.string().optional(),
  }),
]);
export type GuestRef = z.infer<typeof GuestRefSchema>;

export const CreateReservationSchema = z
  .object({
    guest: GuestRefSchema,
    arrivalDate: IsoDate,
    departureDate: IsoDate,
    roomTypeId: Uuid,
    ratePlanId: Uuid,
    adults: z.number().int().min(1).default(1),
    children: z.number().int().min(0).default(0),
    guarantee: z
      .object({
        type: z.enum(['hold', 'card_token', 'deposit', 'prepaid']),
        token: z.string().optional(),
      })
      .optional(),
    source: z.object({ channel: z.string(), promoCode: z.string().optional() }).optional(),
    notes: z.string().optional(),
  })
  .openapi('CreateReservation');
export type CreateReservationInput = z.infer<typeof CreateReservationSchema>;

export const ReservationNightSchema = z.object({
  stayDate: IsoDate,
  ratePlanId: Uuid,
  price: MoneySchema,
  marketSegment: z.string().nullable().optional(),
});

export const ReservationSchema = z
  .object({
    id: Uuid,
    confirmationNumber: z.string(),
    status: z.string(),
    propertyId: Uuid,
    guestId: Uuid,
    arrivalDate: IsoDate,
    departureDate: IsoDate,
    roomTypeId: Uuid,
    ratePlanId: Uuid,
    adults: z.number().int(),
    children: z.number().int(),
    total: MoneySchema,
    currency: z.string(),
    nights: z.array(ReservationNightSchema),
    folioId: Uuid.nullable(),
  })
  .openapi('Reservation');
export type Reservation = z.infer<typeof ReservationSchema>;

export const CancelReservationSchema = z.object({
  reason: z.string().optional(),
  waiveFee: z.boolean().default(false),
});

export const CheckInSchema = z.object({ roomId: Uuid.optional() });
export const CheckOutSchema = z.object({ sendInvoice: z.boolean().default(false) });
export const RoomMoveSchema = z.object({
  roomId: Uuid,
  effectiveDate: IsoDate,
  reason: z.string().optional(),
});

export const ArrivalRowSchema = z
  .object({
    id: Uuid,
    confirmationNumber: z.string(),
    status: z.string(),
    guestName: z.string(),
    arrivalDate: IsoDate,
    departureDate: IsoDate,
    roomTypeCode: z.string(),
    adults: z.number().int(),
    children: z.number().int(),
    balance: MoneySchema,
    roomAssigned: z.boolean(),
  })
  .openapi('ArrivalRow');
export type ArrivalRow = z.infer<typeof ArrivalRowSchema>;
