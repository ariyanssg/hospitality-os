import { z } from './zod';
import { IsoDateTime, Uuid, paginated } from './common';

export const SendMessageSchema = z
  .object({
    guestId: Uuid.optional(),
    conversationId: Uuid.optional(),
    channel: z.enum(['email', 'sms']),
    templateKey: z.string().optional(),
    subject: z.string().optional(),
    body: z.string().min(1),
    metadata: z.record(z.unknown()).default({}),
  })
  .openapi('SendMessage');
export type SendMessageInput = z.infer<typeof SendMessageSchema>;

export const ConversationSchema = z
  .object({
    id: Uuid,
    guestId: Uuid.nullable(),
    status: z.enum(['open', 'pending', 'closed']),
    channel: z.enum(['email', 'sms']),
    subject: z.string().nullable(),
    assigneeId: z.string().nullable(),
    sentiment: z.string().nullable(),
    lastMessageAt: IsoDateTime,
  })
  .openapi('Conversation');
export type Conversation = z.infer<typeof ConversationSchema>;

export const ConversationListQuerySchema = z.object({
  status: z.enum(['open', 'pending', 'closed']).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
export type ConversationListQuery = z.infer<typeof ConversationListQuerySchema>;

export const ConversationPageSchema = paginated(ConversationSchema).openapi('ConversationPage');
export type ConversationPage = z.infer<typeof ConversationPageSchema>;

export const MessageSchema = z
  .object({
    id: Uuid,
    conversationId: Uuid.nullable(),
    guestId: Uuid.nullable(),
    channel: z.enum(['email', 'sms']),
    direction: z.enum(['outbound', 'inbound']),
    templateKey: z.string().nullable(),
    subject: z.string().nullable(),
    body: z.string(),
    sentAt: IsoDateTime,
  })
  .openapi('Message');
export type Message = z.infer<typeof MessageSchema>;

export const GdprRequestSchema = z
  .object({
    id: Uuid,
    guestId: Uuid.nullable(),
    requestType: z.enum(['access', 'erasure', 'rectification', 'export']),
    status: z.enum(['received', 'verifying', 'processing', 'completed', 'rejected']),
    requesterEmail: z.string().email(),
    notes: z.string().nullable(),
    dueAt: IsoDateTime,
    completedAt: IsoDateTime.nullable(),
  })
  .openapi('GdprRequest');
export type GdprRequest = z.infer<typeof GdprRequestSchema>;

export const CreateGdprRequestSchema = z
  .object({
    guestId: Uuid.optional(),
    requestType: z.enum(['access', 'erasure', 'rectification', 'export']),
    requesterEmail: z.string().email(),
    notes: z.string().optional(),
  })
  .openapi('CreateGdprRequest');
export type CreateGdprRequestInput = z.infer<typeof CreateGdprRequestSchema>;

export const UpdateGdprRequestSchema = z
  .object({
    status: z.enum(['received', 'verifying', 'processing', 'completed', 'rejected']),
    notes: z.string().optional(),
  })
  .openapi('UpdateGdprRequest');
export type UpdateGdprRequestInput = z.infer<typeof UpdateGdprRequestSchema>;
