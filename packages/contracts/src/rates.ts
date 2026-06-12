import { z } from './zod';
import { IsoDate, MoneySchema, Uuid } from './common';

export const RatePlanSchema = z
  .object({
    id: Uuid,
    code: z.string(),
    name: z.string(),
    type: z.string(),
    currency: z.string(),
    isActive: z.boolean(),
  })
  .openapi('RatePlan');
export type RatePlan = z.infer<typeof RatePlanSchema>;

export const RatePriceRowSchema = z
  .object({
    roomTypeId: Uuid,
    stayDate: IsoDate,
    price: MoneySchema,
    singlePrice: MoneySchema.nullable(),
  })
  .openapi('RatePriceRow');
export type RatePriceRow = z.infer<typeof RatePriceRowSchema>;

export const RatePricesQuerySchema = z.object({
  from: IsoDate,
  to: IsoDate,
  roomTypeId: Uuid.optional(),
});

/** Bulk grid upsert (doc modules/01: PUT /rate-plans/{id}/prices). */
export const PriceGridUpdateSchema = z
  .object({
    prices: z
      .array(
        z.object({
          roomTypeId: Uuid,
          stayDate: IsoDate,
          price: MoneySchema,
          singlePrice: MoneySchema.optional(),
        }),
      )
      .min(1)
      .max(1000),
  })
  .openapi('PriceGridUpdate');
export type PriceGridUpdateInput = z.infer<typeof PriceGridUpdateSchema>;
