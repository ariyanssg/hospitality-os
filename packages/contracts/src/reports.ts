import { z } from './zod';
import { IsoDate, MoneySchema, Uuid } from './common';

/** Manager flash (doc modules/11, Phase-1 reporting): the GM's one-page daily pulse. */
export const ManagerFlashSchema = z
  .object({
    propertyId: Uuid,
    businessDate: IsoDate,
    physicalRooms: z.number().int(),
    occupiedRooms: z.number().int(),
    /** Percentage with 2 decimals, e.g. "84.21". */
    occupancyPct: z.string(),
    arrivalsToday: z.number().int(),
    departuresToday: z.number().int(),
    inHouse: z.number().int(),
    roomRevenue: MoneySchema,
    totalRevenue: MoneySchema,
    adr: MoneySchema.nullable(),
    revpar: MoneySchema.nullable(),
    paymentsByMethod: z.array(z.object({ method: z.string(), total: MoneySchema })),
    revenueByAccount: z.array(
      z.object({ accountCode: z.string(), accountName: z.string(), total: MoneySchema }),
    ),
  })
  .openapi('ManagerFlash');
export type ManagerFlash = z.infer<typeof ManagerFlashSchema>;

export const ManagerFlashQuerySchema = z.object({ businessDate: IsoDate.optional() });
