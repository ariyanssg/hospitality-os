import { Injectable } from '@nestjs/common';
import { outboxEvents, platformAuditLog, uuidv7, type DbTransaction } from '@vela/db';
import type { NewEvent } from '@vela/events';
import { DbService } from './db.service';
import { getAnyRequestContext } from '../context/request-context';
import { PermissionDeniedError } from '../errors/domain-errors';

export interface PlatformAuditEntry {
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
  /** The hotel the action concerned, when there is one. */
  targetTenantId?: string | null;
}

export interface PlatformUowHelpers {
  /**
   * Stage a domain event for a concrete hotel — written to that tenant's outbox so the relay and
   * realtime invalidation work unchanged. tenantId is REQUIRED: pure-platform happenings (e.g. a
   * superadmin was created) have no tenant consumer and take an audit row only, not an event.
   */
  emit(event: NewEvent & { tenantId: string; propertyId?: string | null }): void;
  /** Stage a platform audit row — global table, committed with the mutation. */
  audit(entry: PlatformAuditEntry): void;
}

/**
 * The cross-tenant UnitOfWork for platform (superadmin) operations. Runs on the ADMIN connection —
 * RLS does not apply — so it is double-gated: the route guard requires a `platform.*` permission,
 * and this class additionally refuses any context that is not a platform admin (defense in depth).
 * Only the platform module may use it for tenant-scoped tables.
 */
@Injectable()
export class PlatformUnitOfWork {
  constructor(private readonly db: DbService) {}

  private assertPlatformAdmin(): void {
    const ctx = getAnyRequestContext();
    if (!ctx.isPlatformAdmin) {
      throw new PermissionDeniedError('platform.context.required');
    }
  }

  async read<T>(work: (tx: DbTransaction) => Promise<T>): Promise<T> {
    this.assertPlatformAdmin();
    return this.db.admin.transaction((tx) => work(tx));
  }

  async run<T>(work: (tx: DbTransaction, helpers: PlatformUowHelpers) => Promise<T>): Promise<T> {
    this.assertPlatformAdmin();
    const ctx = getAnyRequestContext();

    return this.db.admin.transaction(async (tx) => {
      const events: Array<NewEvent & { tenantId: string; propertyId?: string | null }> = [];
      const audits: PlatformAuditEntry[] = [];
      const helpers: PlatformUowHelpers = {
        emit: (e) => events.push(e),
        audit: (a) => audits.push(a),
      };

      const result = await work(tx, helpers);

      for (const e of events) {
        await tx.insert(outboxEvents).values({
          id: uuidv7(),
          tenantId: e.tenantId,
          propertyId: e.propertyId ?? null,
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
        await tx.insert(platformAuditLog).values({
          id: uuidv7(),
          actorId: ctx.userId,
          action: a.action,
          entityType: a.entityType,
          entityId: a.entityId,
          before: a.before ?? null,
          after: a.after ?? null,
          reason: a.reason ?? null,
          ip: null,
          correlationId: ctx.correlationId,
          targetTenantId: a.targetTenantId ?? null,
        });
      }

      return result;
    });
  }
}
