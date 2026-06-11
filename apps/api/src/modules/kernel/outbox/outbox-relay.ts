import { Logger } from '@nestjs/common';
import Redis from 'ioredis';
import postgres from 'postgres';
import { streamKey, type EventEnvelope } from '@vela/events';
import { env } from '../../../config/env';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface OutboxRow {
  id: string;
  tenant_id: string;
  property_id: string | null;
  aggregate_type: string;
  aggregate_id: string;
  event_type: string;
  payload_version: string;
  payload: unknown;
  actor_id: string | null;
  correlation_id: string;
  causation_id: string | null;
  occurred_at: Date;
}

/**
 * Transactional-outbox relay (doc 04 §4). Polls unpublished rows (FOR UPDATE SKIP LOCKED so multiple
 * relay pods don't collide), publishes each to its tenant's Redis Stream, and marks it published —
 * all in one transaction. At-least-once delivery; consumers are idempotent.
 */
export async function runOutboxRelay(): Promise<void> {
  const e = env();
  const logger = new Logger('OutboxRelay');
  const sql = postgres(e.DATABASE_ADMIN_URL ?? e.DATABASE_URL, { max: 2, prepare: false });
  const redis = new Redis(e.REDIS_URL, { maxRetriesPerRequest: null });

  let stopping = false;
  const stop = () => {
    stopping = true;
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  logger.log('Outbox relay started');
  while (!stopping) {
    let published = 0;
    try {
      published = await sql.begin(async (tx) => {
        const rows = (await tx`
          SELECT id, tenant_id, property_id, aggregate_type, aggregate_id, event_type,
                 payload_version, payload, actor_id, correlation_id, causation_id, occurred_at
          FROM outbox_events
          WHERE published_at IS NULL
          ORDER BY occurred_at
          LIMIT 100
          FOR UPDATE SKIP LOCKED
        `) as unknown as OutboxRow[];

        for (const r of rows) {
          const envelope: EventEnvelope = {
            id: r.id,
            type: r.event_type as EventEnvelope['type'],
            version: r.payload_version,
            tenantId: r.tenant_id,
            propertyId: r.property_id,
            aggregateType: r.aggregate_type,
            aggregateId: r.aggregate_id,
            occurredAt: r.occurred_at.toISOString(),
            actorId: r.actor_id,
            correlationId: r.correlation_id,
            causationId: r.causation_id,
            data: r.payload,
          };
          await redis.xadd(
            streamKey(r.tenant_id),
            '*',
            'type',
            r.event_type,
            'data',
            JSON.stringify(envelope),
          );
          await tx`UPDATE outbox_events SET published_at = now() WHERE id = ${r.id}`;
        }
        return rows.length;
      });
    } catch (err) {
      logger.error(err instanceof Error ? err.message : String(err));
      await sleep(2000);
      continue;
    }
    if (published === 0) await sleep(1000);
  }

  await redis.quit();
  await sql.end({ timeout: 5 });
  logger.log('Outbox relay stopped');
}
