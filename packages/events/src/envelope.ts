import type { EventType } from './taxonomy';

/**
 * The event envelope carried through the transactional outbox → Redis Streams → consumers
 * (doc 04 §4). Public webhook deliveries use the same shape (doc 08 §8).
 */
export interface EventEnvelope<T = unknown> {
  id: string;
  type: EventType;
  /** Payload schema version (`v` field in doc 04). */
  version: string;
  tenantId: string;
  propertyId: string | null;
  aggregateType: string;
  aggregateId: string;
  occurredAt: string; // ISO-8601 UTC
  actorId: string | null;
  correlationId: string;
  causationId: string | null;
  data: T;
}

/** The shape a module hands to the UnitOfWork to be written to the outbox in-transaction. */
export interface NewEvent<T = unknown> {
  type: EventType;
  aggregateType: string;
  aggregateId: string;
  data: T;
  version?: string;
}
