import { z } from './zod';
import { IsoDate, IsoDateTime, MoneySchema, Uuid } from './common';

export const PublicGuestSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});
export type PublicGuestInput = z.infer<typeof PublicGuestSchema>;

export const StartBookingSessionSchema = z
  .object({
    arrivalDate: IsoDate,
    departureDate: IsoDate,
    roomTypeId: Uuid,
    ratePlanId: Uuid,
    adults: z.number().int().positive().default(1),
    children: z.number().int().min(0).default(0),
    guest: PublicGuestSchema,
    source: z.record(z.unknown()).default({ channel: 'booking_engine' }),
  })
  .openapi('StartBookingSession');
export type StartBookingSessionInput = z.infer<typeof StartBookingSessionSchema>;

export const ConfirmBookingSessionSchema = z
  .object({
    pspToken: z.string().optional(),
    idempotencyKey: z.string().optional(),
  })
  .openapi('ConfirmBookingSession');
export type ConfirmBookingSessionInput = z.infer<typeof ConfirmBookingSessionSchema>;

export const BookingSessionSchema = z
  .object({
    id: Uuid,
    status: z.enum(['started', 'confirmed', 'cancelled', 'expired']),
    arrivalDate: IsoDate,
    departureDate: IsoDate,
    roomTypeId: Uuid,
    ratePlanId: Uuid,
    adults: z.number().int(),
    children: z.number().int(),
    quotedTotal: MoneySchema,
    reservationId: Uuid.nullable(),
    expiresAt: IsoDateTime,
  })
  .openapi('BookingSession');
export type BookingSession = z.infer<typeof BookingSessionSchema>;
