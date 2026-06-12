import { Controller, MessageEvent, Sse } from '@nestjs/common';
import { and, asc, eq, gt, isNull, or } from 'drizzle-orm';
import { concatMap, from, interval, mergeMap, startWith } from 'rxjs';
import { outboxEvents, type DbTransaction } from '@vela/db';
import type { EventEnvelope } from '@vela/events';
import { Ctx } from '../context/context.decorator';
import { runWithContext, type RequestContext } from '../context/request-context';
import { UnitOfWork } from '../db/unit-of-work';
import { ValidationError } from '../errors/domain-errors';
import { RequirePermission } from '../permissions/decorators';

/**
 * Interim realtime transport for the Desk. Docs 04/08 call for Socket.IO rooms backed by Redis;
 * this SSE bridge uses the same transactional outbox events and tenant/property scoping, so the
 * client cache can move from polling to event-driven invalidation while the Socket.IO adapter lands.
 */
@Controller('realtime')
export class RealtimeController {
  constructor(private readonly uow: UnitOfWork) {}

  @Sse('events')
  @RequirePermission('reservation.view')
  events(@Ctx() ctx: RequestContext) {
    const propertyId = ctx.propertyIds[0];
    if (!propertyId) {
      throw new ValidationError('A property is required', [
        { field: 'X-Property-Id', code: 'REQUIRED' },
      ]);
    }

    let cursor = new Date(Date.now() - 5000);
    return interval(1000).pipe(
      startWith(0),
      concatMap(() => from(runWithContext(ctx, () => this.poll(cursor, propertyId)))),
      mergeMap((events) => {
        if (events.length > 0) {
          const last = new Date(events[events.length - 1]!.occurredAt);
          cursor = new Date(last.getTime() + 1);
        }
        return from(
          events.map(
            (event): MessageEvent => ({
              id: event.id,
              type: 'domain-event',
              data: event,
            }),
          ),
        );
      }),
    );
  }

  private async poll(cursor: Date, propertyId: string): Promise<EventEnvelope[]> {
    return this.uow.read(async (tx: DbTransaction) => {
      const rows = await tx
        .select()
        .from(outboxEvents)
        .where(
          and(
            gt(outboxEvents.occurredAt, cursor),
            or(eq(outboxEvents.propertyId, propertyId), isNull(outboxEvents.propertyId)),
          ),
        )
        .orderBy(asc(outboxEvents.occurredAt))
        .limit(100);
      return rows.map((r) => ({
        id: r.id,
        type: r.eventType as EventEnvelope['type'],
        version: r.payloadVersion,
        tenantId: r.tenantId,
        propertyId: r.propertyId,
        aggregateType: r.aggregateType,
        aggregateId: r.aggregateId,
        occurredAt: r.occurredAt.toISOString(),
        actorId: r.actorId,
        correlationId: r.correlationId,
        causationId: r.causationId,
        data: r.payload,
      }));
    });
  }
}
