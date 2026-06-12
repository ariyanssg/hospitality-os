import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { webhookDeliveries, webhookEndpoints, type DbTransaction } from '@vela/db';
import {
  WebhookDeliverySchema,
  WebhookEndpointSchema,
  type CreateWebhookEndpointInput,
  type WebhookDelivery,
  type WebhookEndpoint,
} from '@vela/contracts';
import type { RequestContext } from '../context/request-context';
import type { UowHelpers } from '../db/unit-of-work';
import { NotFoundError, ValidationError } from '../errors/domain-errors';

@Injectable()
export class WebhooksService {
  async list(tx: DbTransaction, ctx: RequestContext): Promise<WebhookEndpoint[]> {
    const rows = await tx
      .select()
      .from(webhookEndpoints)
      .where(eq(webhookEndpoints.tenantId, ctx.tenantId))
      .orderBy(desc(webhookEndpoints.createdAt));
    return rows.map((r) => this.endpointDto(r));
  }

  async create(
    tx: DbTransaction,
    helpers: UowHelpers,
    ctx: RequestContext,
    input: CreateWebhookEndpointInput,
  ): Promise<{ endpoint: WebhookEndpoint; secret: string }> {
    this.assertPropertyScope(ctx, input.propertyId);
    const secret = `whsec_${randomBytes(32).toString('base64url')}`;
    const [row] = await tx
      .insert(webhookEndpoints)
      .values({
        tenantId: ctx.tenantId,
        propertyId: input.propertyId ?? null,
        name: input.name,
        url: input.url,
        secret,
        eventTypes: input.eventTypes,
      })
      .returning();
    helpers.audit({
      action: 'webhook.endpoint_created',
      entityType: 'webhook_endpoint',
      entityId: row!.id,
      after: { name: input.name, url: input.url, eventTypes: input.eventTypes },
      propertyId: input.propertyId ?? null,
    });
    return { endpoint: this.endpointDto(row!), secret };
  }

  async disable(
    tx: DbTransaction,
    helpers: UowHelpers,
    ctx: RequestContext,
    id: string,
  ): Promise<WebhookEndpoint> {
    const [row] = await tx
      .update(webhookEndpoints)
      .set({ status: 'disabled', disabledAt: new Date(), updatedAt: new Date() })
      .where(and(eq(webhookEndpoints.tenantId, ctx.tenantId), eq(webhookEndpoints.id, id)))
      .returning();
    if (!row) throw new NotFoundError('Webhook endpoint');
    helpers.audit({
      action: 'webhook.endpoint_disabled',
      entityType: 'webhook_endpoint',
      entityId: id,
      after: { status: 'disabled' },
      propertyId: row?.propertyId ?? null,
    });
    return this.endpointDto(row!);
  }

  async redeliver(
    tx: DbTransaction,
    ctx: RequestContext,
    deliveryId: string,
  ): Promise<WebhookDelivery> {
    const [existing] = await tx
      .select()
      .from(webhookDeliveries)
      .where(
        and(eq(webhookDeliveries.tenantId, ctx.tenantId), eq(webhookDeliveries.id, deliveryId)),
      )
      .limit(1);
    if (!existing) throw new NotFoundError('Webhook delivery');
    const nextAttempt = (existing?.attempt ?? 0) + 1;
    const [row] = await tx
      .insert(webhookDeliveries)
      .values({
        tenantId: existing!.tenantId,
        propertyId: existing!.propertyId,
        endpointId: existing!.endpointId,
        eventId: existing!.eventId,
        eventType: existing!.eventType,
        attempt: nextAttempt,
        status: 'pending',
        nextAttemptAt: new Date(),
      })
      .onConflictDoNothing()
      .returning();
    return this.deliveryDto(row ?? existing!);
  }

  private endpointDto(row: typeof webhookEndpoints.$inferSelect): WebhookEndpoint {
    return WebhookEndpointSchema.parse({
      id: row.id,
      propertyId: row.propertyId,
      name: row.name,
      url: row.url,
      eventTypes: row.eventTypes,
      status: row.status,
      failureCount: row.failureCount,
      lastDeliveredAt: row.lastDeliveredAt?.toISOString() ?? null,
      lastFailedAt: row.lastFailedAt?.toISOString() ?? null,
      disabledAt: row.disabledAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
  }

  private deliveryDto(row: typeof webhookDeliveries.$inferSelect): WebhookDelivery {
    return WebhookDeliverySchema.parse({
      id: row.id,
      propertyId: row.propertyId,
      endpointId: row.endpointId,
      eventId: row.eventId,
      eventType: row.eventType,
      attempt: row.attempt,
      status: row.status,
      statusCode: row.statusCode,
      error: row.error,
      nextAttemptAt: row.nextAttemptAt.toISOString(),
      deliveredAt: row.deliveredAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    });
  }

  private assertPropertyScope(ctx: RequestContext, propertyId?: string | null): void {
    if (!propertyId || ctx.propertyIds.length === 0 || ctx.propertyIds.includes(propertyId)) return;
    throw new ValidationError('Webhook endpoint property is outside the active property scope', [
      { field: 'propertyId', code: 'OUT_OF_SCOPE' },
    ]);
  }
}
