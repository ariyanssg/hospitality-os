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
export type RoomMoveInput = z.infer<typeof RoomMoveSchema>;

export const NoShowSchema = z.object({ reason: z.string().optional() });
export const ReinstateSchema = z.object({ reason: z.string().optional() });

/** Date/type/rate changes re-resolve price and re-walk the availability counters atomically. */
export const ModifyReservationSchema = z
  .object({
    arrivalDate: IsoDate.optional(),
    departureDate: IsoDate.optional(),
    roomTypeId: Uuid.optional(),
    ratePlanId: Uuid.optional(),
    adults: z.number().int().min(1).optional(),
    children: z.number().int().min(0).optional(),
    notes: z.string().optional(),
  })
  .openapi('ModifyReservation');
export type ModifyReservationInput = z.infer<typeof ModifyReservationSchema>;

/** Walk-in: book tonight + check in immediately, one screen (doc modules/01). */
export const WalkInSchema = z
  .object({
    guest: GuestRefSchema,
    departureDate: IsoDate,
    roomTypeId: Uuid,
    ratePlanId: Uuid.optional(),
    roomId: Uuid,
    adults: z.number().int().min(1).default(1),
    children: z.number().int().min(0).default(0),
  })
  .openapi('WalkIn');
export type WalkInInput = z.infer<typeof WalkInSchema>;

export const ReservationListQuerySchema = z.object({
  status: z
    .enum(['inquiry', 'tentative', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'])
    .optional(),
  from: IsoDate.optional(),
  to: IsoDate.optional(),
  q: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
export type ReservationListQuery = z.infer<typeof ReservationListQuerySchema>;

export const ReservationListRowSchema = z
  .object({
    id: Uuid,
    confirmationNumber: z.string(),
    status: z.string(),
    guestName: z.string(),
    arrivalDate: IsoDate,
    departureDate: IsoDate,
    adults: z.number().int(),
    children: z.number().int(),
    total: MoneySchema,
  })
  .openapi('ReservationListRow');
export type ReservationListRow = z.infer<typeof ReservationListRowSchema>;

export const DepartureRowSchema = z
  .object({
    id: Uuid,
    confirmationNumber: z.string(),
    guestName: z.string(),
    roomNumber: z.string().nullable(),
    departureDate: IsoDate,
    balance: MoneySchema,
  })
  .openapi('DepartureRow');
export type DepartureRow = z.infer<typeof DepartureRowSchema>;

export const InHouseRowSchema = z
  .object({
    id: Uuid,
    confirmationNumber: z.string(),
    guestName: z.string(),
    roomNumber: z.string().nullable(),
    arrivalDate: IsoDate,
    departureDate: IsoDate,
    balance: MoneySchema,
  })
  .openapi('InHouseRow');
export type InHouseRow = z.infer<typeof InHouseRowSchema>;

export const RoomRackStaySchema = z.object({
  reservationId: Uuid,
  guestName: z.string(),
  status: z.string(),
  fromDate: IsoDate,
  toDate: IsoDate,
});

export const RoomRackRowSchema = z
  .object({
    roomId: Uuid,
    number: z.string(),
    floor: z.string().nullable(),
    roomTypeCode: z.string(),
    hkStatus: z.string(),
    occupancy: z.string(),
    stays: z.array(RoomRackStaySchema),
  })
  .openapi('RoomRackRow');
export type RoomRackRow = z.infer<typeof RoomRackRowSchema>;

export const RoomRackQuerySchema = z.object({ from: IsoDate, to: IsoDate });

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
    /** Assigned room facets — drive the composite readiness chip on the arrivals board. */
    roomId: Uuid.nullable(),
    roomNumber: z.string().nullable(),
    roomHkStatus: z.enum(['dirty', 'clean', 'inspected']).nullable(),
    /** Booking source channel from reservation.source (e.g. direct, ota, corporate, group). */
    channel: z.string().nullable(),
    vipTier: z.string().nullable(),
  })
  .openapi('ArrivalRow');
export type ArrivalRow = z.infer<typeof ArrivalRowSchema>;
