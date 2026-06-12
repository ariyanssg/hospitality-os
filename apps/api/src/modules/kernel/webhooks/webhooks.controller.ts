import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import {
  CreateWebhookEndpointSchema,
  type WebhookDelivery,
  type WebhookEndpoint,
  type WebhookSecret,
} from '@vela/contracts';
import { Ctx } from '../context/context.decorator';
import type { RequestContext } from '../context/request-context';
import { UnitOfWork } from '../db/unit-of-work';
import { RequirePermission } from '../permissions/decorators';
import { ZodValidationPipe } from '../http/zod-validation.pipe';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly webhooks: WebhooksService,
  ) {}

  @Get('endpoints')
  @RequirePermission('webhook.manage')
  list(@Ctx() ctx: RequestContext): Promise<WebhookEndpoint[]> {
    return this.uow.read((tx) => this.webhooks.list(tx, ctx));
  }

  @Post('endpoints')
  @RequirePermission('webhook.manage')
  create(
    @Ctx() ctx: RequestContext,
    @Body(new ZodValidationPipe(CreateWebhookEndpointSchema))
    body: typeof CreateWebhookEndpointSchema._output,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<WebhookSecret> {
    return this.uow.runIdempotent(idempotencyKey, body, (tx, helpers) =>
      this.webhooks.create(tx, helpers, ctx, body),
    );
  }

  @Post('endpoints/:id/disable')
  @RequirePermission('webhook.manage')
  disable(
    @Param('id') id: string,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<WebhookEndpoint> {
    return this.uow.runIdempotent(idempotencyKey, { id }, (tx, helpers) =>
      this.webhooks.disable(tx, helpers, id),
    );
  }

  @Post('deliveries/:id/redeliver')
  @RequirePermission('webhook.manage')
  redeliver(
    @Param('id') id: string,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<WebhookDelivery> {
    return this.uow.runIdempotent(idempotencyKey, { id }, (tx) => this.webhooks.redeliver(tx, id));
  }
}
