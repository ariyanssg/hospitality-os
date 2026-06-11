import { z } from './zod';

/** Money is always a string amount + ISO-4217 currency — no float drift in any client (doc 08 §1). */
export const MoneySchema = z
  .object({
    amount: z.string().regex(/^-?\d+(\.\d{1,4})?$/, 'amount must be a decimal string'),
    currency: z.string().length(3),
  })
  .openapi('Money', { example: { amount: '142.5000', currency: 'USD' } });
export type Money = z.infer<typeof MoneySchema>;

/** RFC 9457 problem+json with a stable machine `code` and `correlationId` (doc 08 §2). */
export const ProblemSchema = z
  .object({
    type: z.string(),
    title: z.string(),
    status: z.number().int(),
    code: z.string(),
    detail: z.string().optional(),
    errors: z
      .array(
        z.object({
          field: z.string().optional(),
          code: z.string(),
          stayDate: z.string().optional(),
        }),
      )
      .optional(),
    correlationId: z.string(),
  })
  .openapi('Problem');
export type Problem = z.infer<typeof ProblemSchema>;

/** Cursor pagination only — offset is forbidden (doc 08 §3). */
export const PageMetaSchema = z
  .object({ nextCursor: z.string().nullable() })
  .openapi('PageMeta');

export function paginated<T extends z.ZodTypeAny>(item: T) {
  return z.object({ data: z.array(item), meta: PageMetaSchema });
}

export const IsoDate = z.string().date().openapi({ example: '2026-07-14' });
export const IsoDateTime = z.string().datetime({ offset: true });
export const Uuid = z.string().uuid();
