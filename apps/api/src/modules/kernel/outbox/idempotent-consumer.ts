import type Redis from 'ioredis';
import type { EventEnvelope } from '@vela/events';

/**
 * Base class for event consumers (doc 04 §4). Delivery is at-least-once, so consumers must be
 * idempotent: the same event id is processed once. Phase 0 dedups via a Redis set; a durable
 * processed-offsets table replaces it when consumer groups land.
 */
export abstract class IdempotentConsumer {
  constructor(
    protected readonly redis: Redis,
    protected readonly group: string,
  ) {}

  protected abstract handle(envelope: EventEnvelope): Promise<void>;

  async consume(envelope: EventEnvelope): Promise<void> {
    const added = await this.redis.sadd(`consumed:${this.group}`, envelope.id);
    if (added === 0) return; // already processed
    await this.handle(envelope);
  }
}
