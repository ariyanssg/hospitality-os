import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { ContextService, beginContextScope, setRequestContext } from './modules/kernel';
import { env } from './config/env';

/**
 * Builds the Nest (Fastify) app. Tenancy is established in a Fastify `onRequest` hook that resolves
 * the RequestContext and binds it to the request's async context via AsyncLocalStorage — so guards,
 * services, and repositories all see the same frozen context (doc 04 §6, doc 05 §5).
 */
export async function createApp(): Promise<NestFastifyApplication> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ trustProxy: true }),
    { bufferLogs: false },
  );

  app.setGlobalPrefix('v1');
  app.enableCors({ origin: true, credentials: true });

  const fastify = app.getHttpAdapter().getInstance();
  const contextService = app.get(ContextService);

  fastify.addHook('onRequest', async (req) => {
    // Bind the ALS holder synchronously (before any await) so it propagates to the handler, then
    // populate it once identity is resolved.
    beginContextScope();
    const headers = { ...(req.headers as Record<string, string | string[] | undefined>) };
    const query = req.query as { token?: string; propertyId?: string } | undefined;
    if (req.url.startsWith('/v1/realtime/') && query?.token && !headers.authorization) {
      headers.authorization = `Bearer ${query.token}`;
    }
    if (req.url.startsWith('/v1/realtime/') && query?.propertyId && !headers['x-property-id']) {
      headers['x-property-id'] = query.propertyId;
    }
    const ctx = await contextService.build(headers);
    if (ctx) setRequestContext(ctx);
  });

  return app;
}

async function bootstrap(): Promise<void> {
  const e = env();
  const app = await createApp();
  await app.listen({ port: e.API_PORT, host: e.API_HOST });
  new Logger('Bootstrap').log(`Vela API listening on http://${e.API_HOST}:${e.API_PORT}/v1`);
}

// Only auto-start when run directly (the demo imports createApp instead).
if (require.main === module) {
  bootstrap().catch((err) => {
    new Logger('Bootstrap').error(err);
    process.exit(1);
  });
}
