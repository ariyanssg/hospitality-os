import { Body, Controller, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ConversationListQuerySchema,
  ConversationSchema,
  CreateGdprRequestSchema,
  SendMessageSchema,
  UpdateGdprRequestSchema,
  type ConversationPage,
  type GdprRequest,
  type Message,
} from '@vela/contracts';
import {
  Ctx,
  RequirePermission,
  UnitOfWork,
  ValidationError,
  ZodValidationPipe,
  type RequestContext,
} from '../kernel';
import { MessagingService } from './messaging.service';

function requireProperty(ctx: RequestContext): string {
  const propertyId = ctx.propertyIds[0];
  if (!propertyId)
    throw new ValidationError('A property is required', [
      { field: 'X-Property-Id', code: 'REQUIRED' },
    ]);
  return propertyId;
}

@Controller()
export class MessagingController {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly messaging: MessagingService,
  ) {}

  @Post('messages/send')
  @RequirePermission('campaign.manage')
  send(
    @Ctx() ctx: RequestContext,
    @Body(new ZodValidationPipe(SendMessageSchema)) body: typeof SendMessageSchema._output,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<Message> {
    const propertyId = requireProperty(ctx);
    return this.uow.runIdempotent(idempotencyKey, { propertyId, ...body }, async (tx, helpers) => {
      const id = await this.messaging.send(tx, helpers, propertyId, body);
      return this.messaging.messageDto(tx, id, propertyId);
    });
  }

  @Get('conversations')
  @RequirePermission('guest.note.view')
  inbox(
    @Ctx() ctx: RequestContext,
    @Query(new ZodValidationPipe(ConversationListQuerySchema))
    query: typeof ConversationListQuerySchema._output,
  ): Promise<ConversationPage> {
    return this.uow.read(async (tx) => {
      const page = await this.messaging.inbox(tx, requireProperty(ctx), query);
      return { ...page, data: page.data.map((r) => ConversationSchema.parse(r)) };
    });
  }

  @Post('gdpr/requests')
  @RequirePermission('guest.export')
  createGdpr(
    @Ctx() ctx: RequestContext,
    @Body(new ZodValidationPipe(CreateGdprRequestSchema))
    body: typeof CreateGdprRequestSchema._output,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<GdprRequest> {
    const propertyId = requireProperty(ctx);
    return this.uow.runIdempotent(idempotencyKey, { propertyId, ...body }, async (tx, helpers) => {
      const id = await this.messaging.createGdpr(tx, helpers, propertyId, body);
      return this.messaging.gdprDto(tx, id, propertyId);
    });
  }

  @Patch('gdpr/requests/:id')
  @RequirePermission('guest.export')
  updateGdpr(
    @Ctx() ctx: RequestContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateGdprRequestSchema))
    body: typeof UpdateGdprRequestSchema._output,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<GdprRequest> {
    const propertyId = requireProperty(ctx);
    return this.uow.runIdempotent(
      idempotencyKey,
      { propertyId, id, ...body },
      async (tx, helpers) => {
        await this.messaging.updateGdpr(tx, helpers, id, body, propertyId);
        return this.messaging.gdprDto(tx, id, propertyId);
      },
    );
  }
}
