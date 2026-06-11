import { z } from './zod';
import { IsoDate, MoneySchema, Uuid } from './common';

export const AvailabilityQuerySchema = z
  .object({
    from: IsoDate,
    to: IsoDate,
    roomTypeId: Uuid.optional(),
    ratePlanId: Uuid.optional(),
    adults: z.coerce.number().int().min(1).default(2),
    children: z.coerce.number().int().min(0).default(0),
    promoCode: z.string().optional(),
  })
  .openapi('AvailabilityQuery');
export type AvailabilityQuery = z.infer<typeof AvailabilityQuerySchema>;

export const RoomTypeAvailabilitySchema = z
  .object({
    roomTypeId: Uuid,
    roomTypeCode: z.string(),
    roomTypeName: z.string(),
    minAvailable: z.number().int(),
    days: z.array(
      z.object({
        stayDate: IsoDate,
        available: z.number().int(),
        price: MoneySchema.nullable(),
        closed: z.boolean(),
      }),
    ),
    totalPrice: MoneySchema.nullable(),
  })
  .openapi('RoomTypeAvailability');
export type RoomTypeAvailability = z.infer<typeof RoomTypeAvailabilitySchema>;
