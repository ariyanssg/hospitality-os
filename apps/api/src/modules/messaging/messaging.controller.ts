import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ConversationSchema,
  CreateGdprRequestSchema,
  SendMessageSchema,
  UpdateGdprRequestSchema,
  type Conversation,
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
  ): Promise<Message> {
    return this.uow.run(async (tx, helpers) => {
      const id = await this.messaging.send(tx, helpers, requireProperty(ctx), body);
      return this.messaging.messageDto(tx, id);
    });
  }

  @Get('conversations')
  @RequirePermission('guest.note.view')
  inbox(@Ctx() ctx: RequestContext, @Query('status') status?: string): Promise<Conversation[]> {
    return this.uow.read(async (tx) => {
      const rows = await this.messaging.inbox(tx, requireProperty(ctx), status);
      return rows.map((r) => ConversationSchema.parse(r));
    });
  }

  @Post('gdpr/requests')
  @RequirePermission('guest.export')
  createGdpr(
    @Ctx() ctx: RequestContext,
    @Body(new ZodValidationPipe(CreateGdprRequestSchema))
    body: typeof CreateGdprRequestSchema._output,
  ): Promise<GdprRequest> {
    return this.uow.run(async (tx, helpers) => {
      const id = await this.messaging.createGdpr(tx, helpers, requireProperty(ctx), body);
      return this.messaging.gdprDto(tx, id);
    });
  }

  @Patch('gdpr/requests/:id')
  @RequirePermission('guest.export')
  updateGdpr(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateGdprRequestSchema))
    body: typeof UpdateGdprRequestSchema._output,
  ): Promise<GdprRequest> {
    return this.uow.run(async (tx, helpers) => {
      await this.messaging.updateGdpr(tx, helpers, id, body);
      return this.messaging.gdprDto(tx, id);
    });
  }
}
