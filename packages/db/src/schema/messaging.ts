import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { conversationStatus, gdprRequestStatus, messageChannel } from './enums';
import { auditColumns, createdAt, pk, propertyId, tenantId } from './_shared';

/** Guest messaging v1: event-triggered transactional messages and a shared conversation inbox. */
export const conversations = pgTable(
  'conversations',
  {
    id: pk(),
    tenantId: tenantId(),
    propertyId: propertyId(),
    guestId: uuid('guest_id'),
    status: conversationStatus('status').notNull().default('open'),
    channel: messageChannel('channel').notNull(),
    subject: text('subject'),
    assigneeId: text('assignee_id'),
    sentiment: text('sentiment'),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }).notNull().defaultNow(),
    ...auditColumns(),
  },
  (t) => [index('conversations_inbox').on(t.tenantId, t.propertyId, t.status, t.lastMessageAt)],
);

export const messages = pgTable(
  'messages',
  {
    id: pk(),
    tenantId: tenantId(),
    propertyId: propertyId(),
    conversationId: uuid('conversation_id').references(() => conversations.id),
    guestId: uuid('guest_id'),
    channel: messageChannel('channel').notNull(),
    direction: text('direction').notNull(),
    templateKey: text('template_key'),
    subject: text('subject'),
    body: text('body').notNull(),
    providerMessageId: text('provider_message_id'),
    metadata: jsonb('metadata').notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (t) => [index('messages_conversation').on(t.tenantId, t.conversationId, t.sentAt)],
);

/** Compliance baseline: GDPR request tracking with audited status transitions. */
export const gdprRequests = pgTable(
  'gdpr_requests',
  {
    id: pk(),
    tenantId: tenantId(),
    propertyId: propertyId(),
    guestId: uuid('guest_id'),
    requestType: text('request_type').notNull(),
    status: gdprRequestStatus('status').notNull().default('received'),
    requesterEmail: text('requester_email').notNull(),
    notes: text('notes'),
    dueAt: timestamp('due_at', { withTimezone: true }).notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    ...auditColumns(),
  },
  (t) => [index('gdpr_requests_queue').on(t.tenantId, t.propertyId, t.status, t.dueAt)],
);
