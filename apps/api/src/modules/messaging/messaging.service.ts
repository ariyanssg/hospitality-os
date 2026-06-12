import { createHmac, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { and, asc, eq, gt, or } from 'drizzle-orm';
import { conversations, gdprRequests, messages, uuidv7, type DbTransaction } from '@vela/db';
import type {
  ConversationListQuery,
  ConversationPage,
  CreateGdprRequestInput,
  GdprRequest,
  Message,
  SendMessageInput,
  UpdateGdprRequestInput,
} from '@vela/contracts';
import { env } from '../../config/env';
import { getRequestContext, NotFoundError, ValidationError, type UowHelpers } from '../kernel';

@Injectable()
export class MessagingService {
  private cursorSecret(): string {
    return env().BETTER_AUTH_SECRET;
  }

  private invalidCursor(): never {
    throw new ValidationError('Invalid cursor', [{ field: 'cursor', code: 'INVALID' }]);
  }

  private encodeConversationCursor(lastMessageAt: Date, id: string): string {
    const payload = Buffer.from(
      JSON.stringify({ lastMessageAt: lastMessageAt.toISOString(), id }),
    ).toString('base64url');
    const sig = createHmac('sha256', this.cursorSecret()).update(payload).digest('base64url');
    return `${payload}.${sig}`;
  }

  private decodeConversationCursor(cursor: string): { lastMessageAt: Date; id: string } {
    const [payload, sig] = cursor.split('.');
    if (!payload || !sig) this.invalidCursor();
    const expected = createHmac('sha256', this.cursorSecret()).update(payload).digest('base64url');
    if (
      expected.length !== sig.length ||
      !timingSafeEqual(Buffer.from(expected), Buffer.from(sig))
    ) {
      this.invalidCursor();
    }
    let parsed: { lastMessageAt?: unknown; id?: unknown };
    try {
      parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
        lastMessageAt?: unknown;
        id?: unknown;
      };
    } catch {
      this.invalidCursor();
    }
    if (typeof parsed.lastMessageAt !== 'string' || typeof parsed.id !== 'string') {
      this.invalidCursor();
    }
    const lastMessageAt = new Date(parsed.lastMessageAt);
    if (Number.isNaN(lastMessageAt.getTime())) this.invalidCursor();
    return { lastMessageAt, id: parsed.id };
  }

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
    } else {
      const [conversation] = await tx
        .select({ id: conversations.id })
        .from(conversations)
        .where(
          and(
            eq(conversations.tenantId, ctx.tenantId),
            eq(conversations.propertyId, propertyId),
            eq(conversations.id, conversationId),
          ),
        )
        .limit(1);
      if (!conversation) throw new NotFoundError('Conversation');
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

  async inbox(
    tx: DbTransaction,
    propertyId: string,
    query: ConversationListQuery,
  ): Promise<ConversationPage> {
    const ctx = getRequestContext();
    const cursor = query.cursor ? this.decodeConversationCursor(query.cursor) : undefined;
    const rows = await tx
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.tenantId, ctx.tenantId),
          eq(conversations.propertyId, propertyId),
          query.status ? eq(conversations.status, query.status) : undefined,
          cursor
            ? or(
                gt(conversations.lastMessageAt, cursor.lastMessageAt),
                and(
                  eq(conversations.lastMessageAt, cursor.lastMessageAt),
                  gt(conversations.id, cursor.id),
                ),
              )
            : undefined,
        ),
      )
      .orderBy(asc(conversations.lastMessageAt), asc(conversations.id))
      .limit(query.limit + 1);
    const pageRows = rows.slice(0, query.limit);
    const next = rows.length > query.limit ? pageRows[pageRows.length - 1] : undefined;
    return {
      data: pageRows.map((c) => ({
        id: c.id,
        guestId: c.guestId,
        status: c.status,
        channel: c.channel,
        subject: c.subject,
        assigneeId: c.assigneeId,
        sentiment: c.sentiment,
        lastMessageAt: c.lastMessageAt.toISOString(),
      })),
      meta: {
        nextCursor: next ? this.encodeConversationCursor(next.lastMessageAt, next.id) : null,
      },
    };
  }

  async messageDto(tx: DbTransaction, id: string, propertyId?: string): Promise<Message> {
    const ctx = getRequestContext();
    const [m] = await tx
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.tenantId, ctx.tenantId),
          eq(messages.id, id),
          propertyId ? eq(messages.propertyId, propertyId) : undefined,
        ),
      )
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
    propertyId?: string,
  ): Promise<void> {
    const ctx = getRequestContext();
    const [row] = await tx
      .select()
      .from(gdprRequests)
      .where(
        and(
          eq(gdprRequests.tenantId, ctx.tenantId),
          eq(gdprRequests.id, id),
          propertyId ? eq(gdprRequests.propertyId, propertyId) : undefined,
        ),
      )
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

  async gdprDto(tx: DbTransaction, id: string, propertyId?: string): Promise<GdprRequest> {
    const ctx = getRequestContext();
    const [r] = await tx
      .select()
      .from(gdprRequests)
      .where(
        and(
          eq(gdprRequests.tenantId, ctx.tenantId),
          eq(gdprRequests.id, id),
          propertyId ? eq(gdprRequests.propertyId, propertyId) : undefined,
        ),
      )
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
