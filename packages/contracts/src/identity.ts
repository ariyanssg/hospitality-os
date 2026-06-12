import { z } from './zod';
import { Uuid } from './common';

export const PropertyRefSchema = z.object({
  id: Uuid,
  name: z.string(),
  code: z.string(),
  currency: z.string(),
  timezone: z.string(),
});

/**
 * Session bootstrap — identity, tenancy, the flattened permission decision set (doc 06 §6).
 * Tenant fields are null for platform admins signed in with no active hotel.
 */
export const MeSchema = z
  .object({
    userId: z.string(),
    name: z.string(),
    email: z.string().email(),
    tenantId: Uuid.nullable(),
    tenantName: z.string().nullable(),
    properties: z.array(PropertyRefSchema),
    permissions: z.array(z.string()),
    isPlatformAdmin: z.boolean().default(false),
    platformPermissions: z.array(z.string()).default([]),
  })
  .openapi('Me');
export type Me = z.infer<typeof MeSchema>;
