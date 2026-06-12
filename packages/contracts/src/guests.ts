import { z } from './zod';
import { IsoDate, Uuid } from './common';

export const GuestSchema = z
  .object({
    id: Uuid,
    firstName: z.string(),
    lastName: z.string(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    vipTier: z.string().nullable(),
    nationality: z.string().nullable(),
  })
  .openapi('Guest');
export type Guest = z.infer<typeof GuestSchema>;

export const GuestProfileSchema = GuestSchema.extend({
  reservations: z.array(
    z.object({
      id: Uuid,
      confirmationNumber: z.string(),
      status: z.string(),
      arrivalDate: IsoDate,
      departureDate: IsoDate,
    }),
  ),
}).openapi('GuestProfile');
export type GuestProfile = z.infer<typeof GuestProfileSchema>;

export const UpdateGuestSchema = z
  .object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    email: z.string().email().nullable().optional(),
    phone: z.string().nullable().optional(),
    vipTier: z.string().nullable().optional(),
    nationality: z.string().nullable().optional(),
  })
  .openapi('UpdateGuest');
export type UpdateGuestInput = z.infer<typeof UpdateGuestSchema>;

export const GuestSearchQuerySchema = z.object({
  q: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
