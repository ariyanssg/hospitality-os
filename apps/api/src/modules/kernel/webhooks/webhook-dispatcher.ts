import { createHmac } from 'node:crypto';
import { Logger } from '@nestjs/common';
import postgres from 'postgres';
import type { EventEnvelope } from '@vela/events';
import { env } from '../../../config/env';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const MAX_ATTEMPTS = 8;
const BACKOFF_SECONDS = [60, 300, 900, 1800, 3600, 7200, 14400, 28800];

interface DeliveryRow {
  id: string;
  endpoint_id: string;
  tenant_id: string;
  property_id: string | null;
  url: string;
  secret: string;
  event: EventEnvelope;
  attempt: number;
}

function signature(secret: string, timestamp: number, body: string): string {
  const digest = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  return `t=${timestamp},v1=${digest}`;
}

function retryAt(attempt: number): Date {
  const seconds = BACKOFF_SECONDS[Math.min(attempt - 1, BACKOFF_SECONDS.length - 1)]!;
  return new Date(Date.now() + seconds * 1000);
}

/**
 * Creates pending delivery rows for an outbox event. Called by the outbox relay after publishing to
 * Redis Streams; webhook dispatch is then retried independently from event publishing.
 */
export async function enqueueWebhookDeliveries(
  tx: postgres.TransactionSql,
  eventId: string,
): Promise<void> {
  await tx`
    INSERT INTO webhook_deliveries (
      tenant_id, property_id, endpoint_id, event_id, event_type, attempt, status, next_attempt_at
    )
    SELECT e.tenant_id, e.property_id, wh.id, e.id, e.event_type, 1, 'pending', now()
    FROM outbox_events e
    JOIN webhook_endpoints wh
      ON wh.tenant_id = e.tenant_id
     AND wh.status = 'active'
     AND (wh.property_id IS NULL OR wh.property_id = e.property_id)
     AND e.event_type = ANY (wh.event_types)
    WHERE e.id = ${eventId}
    ON CONFLICT DO NOTHING
  `;
}

export async function runWebhookDispatcher(): Promise<void> {
  const e = env();
  const logger = new Logger('WebhookDispatcher');
  const sql = postgres(e.DATABASE_ADMIN_URL ?? e.DATABASE_URL, { max: 4, prepare: false });

  let stopping = false;
  const stop = () => {
    stopping = true;
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  logger.log('Webhook dispatcher started');
  while (!stopping) {
    try {
      const rows = await claimDueDeliveries(sql);
      if (rows.length === 0) {
        await sleep(1000);
        continue;
      }

      await Promise.all(rows.map((row) => deliver(sql, row, logger)));
    } catch (err) {
      logger.error(err instanceof Error ? err.message : String(err));
      await sleep(2000);
    }
  }

  await sql.end({ timeout: 5 });
  logger.log('Webhook dispatcher stopped');
}

async function claimDueDeliveries(sql: postgres.Sql): Promise<DeliveryRow[]> {
  return sql.begin(async (tx) => {
    const rows = (await tx`
      SELECT d.id, d.endpoint_id, d.tenant_id, d.property_id, wh.url, wh.secret,
             jsonb_build_object(
               'id', e.id,
               'type', e.event_type,
               'version', e.payload_version,
               'tenantId', e.tenant_id,
               'propertyId', e.property_id,
               'aggregateType', e.aggregate_type,
               'aggregateId', e.aggregate_id,
               'occurredAt', e.occurred_at,
               'actorId', e.actor_id,
               'correlationId', e.correlation_id,
               'causationId', e.causation_id,
               'data', e.payload
             ) AS event,
             d.attempt
      FROM webhook_deliveries d
      JOIN webhook_endpoints wh ON wh.id = d.endpoint_id AND wh.status = 'active'
      JOIN outbox_events e ON e.id = d.event_id
      WHERE d.status IN ('pending', 'failed') AND d.next_attempt_at <= now()
      ORDER BY d.created_at
      LIMIT 25
      FOR UPDATE SKIP LOCKED
    `) as unknown as DeliveryRow[];

    if (rows.length > 0) {
      await tx`
        UPDATE webhook_deliveries
        SET status = 'failed',
            error = 'Delivery in progress',
            next_attempt_at = now() + interval '60 seconds'
        WHERE id IN ${tx(rows.map((r) => r.id))}
      `;
    }
    return rows;
  });
}

async function deliver(sql: postgres.Sql, row: DeliveryRow, logger: Logger): Promise<void> {
  const body = JSON.stringify({
    ...row.event,
    apiVersion: '2026-06-01',
  });
  const timestamp = Math.floor(Date.now() / 1000);

  try {
    const response = await fetch(row.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Webhook-Signature': signature(row.secret, timestamp, body),
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });

    if (response.ok) {
      await sql`
        UPDATE webhook_deliveries
        SET status = 'delivered', status_code = ${response.status}, error = NULL,
            delivered_at = now()
        WHERE id = ${row.id}
      `;
      await sql`
        UPDATE webhook_endpoints
        SET failure_count = 0, last_delivered_at = now(), updated_at = now()
        WHERE id = ${row.endpoint_id}
      `;
      return;
    }

    await markFailed(sql, row, response.status, `HTTP ${response.status}`);
  } catch (err) {
    logger.warn(`Webhook delivery ${row.id} failed: ${(err as Error).message}`);
    await markFailed(sql, row, null, (err as Error).message);
  }
}

async function markFailed(
  sql: postgres.Sql,
  row: DeliveryRow,
  statusCode: number | null,
  error: string,
): Promise<void> {
  const nextAttempt = row.attempt + 1;
  const isDead = nextAttempt > MAX_ATTEMPTS;
  await sql`
    UPDATE webhook_deliveries
    SET status = ${isDead ? 'dead' : 'pending'},
        status_code = ${statusCode},
        error = ${error},
        next_attempt_at = ${isDead ? new Date() : retryAt(nextAttempt)},
        attempt = ${isDead ? row.attempt : nextAttempt}
    WHERE id = ${row.id}
  `;
  await sql`
    UPDATE webhook_endpoints
    SET failure_count = failure_count + 1,
        last_failed_at = now(),
        status = CASE WHEN failure_count + 1 >= ${MAX_ATTEMPTS} THEN 'disabled' ELSE status END,
        disabled_at = CASE WHEN failure_count + 1 >= ${MAX_ATTEMPTS} THEN now() ELSE disabled_at END,
        updated_at = now()
    WHERE id = ${row.endpoint_id}
  `;
}
