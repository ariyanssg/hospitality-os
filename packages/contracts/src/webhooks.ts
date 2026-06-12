import { z } from './zod';
import { EVENT_TYPES } from '@vela/events';

const EventTypeSchema = z.enum(EVENT_TYPES);

export const WebhookEndpointSchema = z
  .object({
    id: z.string().uuid(),
    propertyId: z.string().uuid().nullable(),
    name: z.string(),
    url: z.string().url(),
    eventTypes: z.array(EventTypeSchema),
    status: z.enum(['active', 'disabled']),
    failureCount: z.number().int().nonnegative(),
    lastDeliveredAt: z.string().datetime().nullable(),
    lastFailedAt: z.string().datetime().nullable(),
    disabledAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi('WebhookEndpoint');
export type WebhookEndpoint = z.infer<typeof WebhookEndpointSchema>;

export const CreateWebhookEndpointSchema = z
  .object({
    name: z.string().min(1).max(120),
    url: z
      .string()
      .url()
      .refine((value) => value.startsWith('https://'), {
        message: 'Webhook URLs must use HTTPS',
      }),
    propertyId: z.string().uuid().nullable().optional(),
    eventTypes: z.array(EventTypeSchema).min(1),
  })
  .openapi('CreateWebhookEndpoint');
export type CreateWebhookEndpointInput = z.infer<typeof CreateWebhookEndpointSchema>;

export const WebhookSecretSchema = z
  .object({
    endpoint: WebhookEndpointSchema,
    secret: z.string(),
  })
  .openapi('WebhookSecret');
export type WebhookSecret = z.infer<typeof WebhookSecretSchema>;

export const WebhookDeliverySchema = z
  .object({
    id: z.string().uuid(),
    propertyId: z.string().uuid().nullable(),
    endpointId: z.string().uuid(),
    eventId: z.string().uuid(),
    eventType: EventTypeSchema,
    attempt: z.number().int().positive(),
    status: z.enum(['pending', 'delivered', 'failed', 'dead']),
    statusCode: z.number().int().nullable(),
    error: z.string().nullable(),
    nextAttemptAt: z.string().datetime(),
    deliveredAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
  })
  .openapi('WebhookDelivery');
export type WebhookDelivery = z.infer<typeof WebhookDeliverySchema>;
