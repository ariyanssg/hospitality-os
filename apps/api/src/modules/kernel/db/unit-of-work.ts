import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import {
  auditLog,
  idempotencyKeys,
  outboxEvents,
  uuidv7,
  withTenantTransaction,
  type DbTransaction,
} from '@vela/db';
import type { NewEvent } from '@vela/events';
import { DbService } from './db.service';
import { getRequestContext } from '../context/request-context';
import { IdempotencyConflictError } from '../errors/domain-errors';

export interface AuditEntry {
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
  propertyId?: string | null;
}

export interface UowHelpers {
  /** Stage a domain event — written to the transactional outbox before commit (doc 04 §4). */
  emit(event: NewEvent & { propertyId?: string | null }): void;
  /** Stage an audit row — written in the same transaction as the mutation (doc 07 §5). */
  audit(entry: AuditEntry): void;
}

/**
 * The kernel UnitOfWork. Opens a tenancy-scoped transaction and guarantees that the business
 * change, its audit row, and its outbox event commit together — atomically inseparable. This is the
 * mechanical enforcement of the rule "every mutation: permission guard + audit row + outbox event in
 * one transaction".
 */
@Injectable()
export class UnitOfWork {
  constructor(private readonly db: DbService) {}

  /**
   * Read-only tenancy-scoped query. Opens a transaction so the RLS GUCs are set (a bare query on the
   * app connection has no tenant context and returns zero rows — fail closed). No outbox/audit.
   */
  async read<T>(work: (tx: DbTransaction) => Promise<T>): Promise<T> {
    const ctx = getRequestContext();
    return withTenantTransaction(
      this.db.app,
      { tenantId: ctx.tenantId, propertyIds: ctx.propertyIds },
      (tx) => work(tx),
    );
  }

  /**
   * Idempotent mutation (doc 08 §4). With no key, behaves like `run`. With a key: replays the stored
   * response on a repeat, rejects the same key with a different body (422), and stores the result in
   * the same transaction as the mutation.
   */
  async runIdempotent<T>(
    key: string | undefined,
    requestBody: unknown,
    work: (tx: DbTransaction, helpers: UowHelpers) => Promise<T>,
  ): Promise<T> {
    if (!key) return this.run(work);
    const requestHash = createHash('sha256')
      .update(JSON.stringify(requestBody ?? null))
      .digest('hex');

    return this.run(async (tx, helpers) => {
      const ctx = getRequestContext();
      const [existing] = await tx
        .select({ requestHash: idempotencyKeys.requestHash, response: idempotencyKeys.response })
        .from(idempotencyKeys)
        .where(and(eq(idempotencyKeys.tenantId, ctx.tenantId), eq(idempotencyKeys.key, key)))
        .limit(1);
      if (existing) {
        if (existing.requestHash !== requestHash) throw new IdempotencyConflictError();
        return existing.response as T;
      }
      const result = await work(tx, helpers);
      await tx.insert(idempotencyKeys).values({
        tenantId: ctx.tenantId,
        key,
        requestHash,
        response: result as unknown,
        statusCode: 201,
      });
      return result;
    });
  }

  async run<T>(work: (tx: DbTransaction, helpers: UowHelpers) => Promise<T>): Promise<T> {
    const ctx = getRequestContext();
    return withTenantTransaction(
      this.db.app,
      { tenantId: ctx.tenantId, propertyIds: ctx.propertyIds },
      async (tx) => {
        const events: Array<NewEvent & { propertyId?: string | null }> = [];
        const audits: AuditEntry[] = [];
        const helpers: UowHelpers = {
          emit: (e) => events.push(e),
          audit: (a) => audits.push(a),
        };

        const result = await work(tx, helpers);

        const fallbackProperty = ctx.propertyIds[0] ?? null;

        for (const e of events) {
          await tx.insert(outboxEvents).values({
            id: uuidv7(),
            tenantId: ctx.tenantId,
            propertyId: e.propertyId ?? fallbackProperty,
            aggregateType: e.aggregateType,
            aggregateId: e.aggregateId,
            eventType: e.type,
            payloadVersion: e.version ?? '1',
            payload: e.data,
            actorId: ctx.userId,
            correlationId: ctx.correlationId,
            causationId: null,
          });
        }

        for (const a of audits) {
          await tx.insert(auditLog).values({
            id: uuidv7(),
            tenantId: ctx.tenantId,
            propertyId: a.propertyId ?? fallbackProperty,
            actorId: ctx.userId,
            action: a.action,
            entityType: a.entityType,
            entityId: a.entityId,
            before: a.before ?? null,
            after: a.after ?? null,
            reason: a.reason ?? null,
            ip: null,
            correlationId: ctx.correlationId,
          });
        }

        return result;
      },
    );
  }
}
