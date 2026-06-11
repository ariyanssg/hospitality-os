import { z } from './zod';
import { Uuid } from './common';

export const PropertyRefSchema = z.object({
  id: Uuid,
  name: z.string(),
  code: z.string(),
  currency: z.string(),
  timezone: z.string(),
});

/** Session bootstrap — identity, tenancy, the flattened permission decision set (doc 06 §6). */
export const MeSchema = z
  .object({
    userId: z.string(),
    name: z.string(),
    email: z.string().email(),
    tenantId: Uuid,
    tenantName: z.string(),
    properties: z.array(PropertyRefSchema),
    permissions: z.array(z.string()),
  })
  .openapi('Me');
export type Me = z.infer<typeof MeSchema>;
