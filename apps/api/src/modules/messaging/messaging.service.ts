import { Injectable } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { conversations, gdprRequests, messages, uuidv7, type DbTransaction } from '@vela/db';
import type {
  Conversation,
  CreateGdprRequestInput,
  GdprRequest,
  Message,
  SendMessageInput,
  UpdateGdprRequestInput,
} from '@vela/contracts';
import { getRequestContext, NotFoundError, type UowHelpers } from '../kernel';

@Injectable()
export class MessagingService {
  async send(
    tx: DbTransaction,
    helpers: UowHelpers,
    propertyId: string,
    input: SendMessageInput,
  ): Promise<string> {
    const ctx = getRequestContext();
    let conversationId = input.conversationId ?? null;
    if (!conversationId) {
      conversationId = uuidv7();
      await tx.insert(conversations).values({
        id: conversationId,
        tenantId: ctx.tenantId,
        propertyId,
        guestId: input.guestId ?? null,
        channel: input.channel,
        subject: input.subject ?? null,
        status: 'open',
      });
    }
    const id = uuidv7();
    await tx.insert(messages).values({
      id,
      tenantId: ctx.tenantId,
      propertyId,
      conversationId,
      guestId: input.guestId ?? null,
      channel: input.channel,
      direction: 'outbound',
      templateKey: input.templateKey ?? null,
      subject: input.subject ?? null,
      body: input.body,
      metadata: input.metadata,
    });
    await tx
      .update(conversations)
      .set({ lastMessageAt: new Date(), updatedAt: new Date() })
      .where(eq(conversations.id, conversationId));
    helpers.emit({
      type: 'message.sent',
      aggregateType: 'message',
      aggregateId: id,
      propertyId,
      data: {
        messageId: id,
        conversationId,
        channel: input.channel,
        templateKey: input.templateKey ?? null,
      },
    });
    helpers.audit({ action: 'messages.send', entityType: 'message', entityId: id, propertyId });
    return id;
  }

  async inbox(tx: DbTransaction, propertyId: string, status?: string): Promise<Conversation[]> {
    const ctx = getRequestContext();
    const rows = await tx
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.tenantId, ctx.tenantId),
          eq(conversations.propertyId, propertyId),
          status ? eq(conversations.status, status as 'open' | 'pending' | 'closed') : undefined,
        ),
      )
      .orderBy(asc(conversations.lastMessageAt));
    return rows.map((c) => ({
      id: c.id,
      guestId: c.guestId,
      status: c.status,
      channel: c.channel,
      subject: c.subject,
      assigneeId: c.assigneeId,
      sentiment: c.sentiment,
      lastMessageAt: c.lastMessageAt.toISOString(),
    }));
  }

  async messageDto(tx: DbTransaction, id: string): Promise<Message> {
    const ctx = getRequestContext();
    const [m] = await tx
      .select()
      .from(messages)
      .where(and(eq(messages.tenantId, ctx.tenantId), eq(messages.id, id)))
      .limit(1);
    if (!m) throw new NotFoundError('Message');
    return {
      id: m.id,
      conversationId: m.conversationId,
      guestId: m.guestId,
      channel: m.channel,
      direction: m.direction as 'outbound' | 'inbound',
      templateKey: m.templateKey,
      subject: m.subject,
      body: m.body,
      sentAt: m.sentAt.toISOString(),
    };
  }

  async createGdpr(
    tx: DbTransaction,
    helpers: UowHelpers,
    propertyId: string,
    input: CreateGdprRequestInput,
  ): Promise<string> {
    const ctx = getRequestContext();
    const dueAt = new Date();
    dueAt.setUTCDate(dueAt.getUTCDate() + 30);
    const id = uuidv7();
    await tx.insert(gdprRequests).values({
      id,
      tenantId: ctx.tenantId,
      propertyId,
      guestId: input.guestId ?? null,
      requestType: input.requestType,
      requesterEmail: input.requesterEmail,
      notes: input.notes ?? null,
      dueAt,
    });
    helpers.audit({
      action: 'gdpr.request.create',
      entityType: 'gdpr_request',
      entityId: id,
      propertyId,
    });
    return id;
  }

  async updateGdpr(
    tx: DbTransaction,
    helpers: UowHelpers,
    id: string,
    input: UpdateGdprRequestInput,
  ): Promise<void> {
    const ctx = getRequestContext();
    const [row] = await tx
      .select()
      .from(gdprRequests)
      .where(and(eq(gdprRequests.tenantId, ctx.tenantId), eq(gdprRequests.id, id)))
      .limit(1);
    if (!row) throw new NotFoundError('GDPR request');
    await tx
      .update(gdprRequests)
      .set({
        status: input.status,
        notes: input.notes ?? row.notes,
        completedAt: input.status === 'completed' ? new Date() : row.completedAt,
        updatedAt: new Date(),
      })
      .where(eq(gdprRequests.id, id));
    helpers.audit({
      action: 'gdpr.request.update',
      entityType: 'gdpr_request',
      entityId: id,
      before: { status: row.status },
      after: { status: input.status },
      propertyId: row.propertyId,
    });
  }

  async gdprDto(tx: DbTransaction, id: string): Promise<GdprRequest> {
    const ctx = getRequestContext();
    const [r] = await tx
      .select()
      .from(gdprRequests)
      .where(and(eq(gdprRequests.tenantId, ctx.tenantId), eq(gdprRequests.id, id)))
      .limit(1);
    if (!r) throw new NotFoundError('GDPR request');
    return {
      id: r.id,
      guestId: r.guestId,
      requestType: r.requestType as GdprRequest['requestType'],
      status: r.status,
      requesterEmail: r.requesterEmail,
      notes: r.notes,
      dueAt: r.dueAt.toISOString(),
      completedAt: r.completedAt?.toISOString() ?? null,
    };
  }
}
