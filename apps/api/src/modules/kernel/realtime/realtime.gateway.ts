import { Logger, OnModuleDestroy } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { createAdapter } from '@socket.io/redis-adapter';
import { and, asc, eq, gt, isNull, or } from 'drizzle-orm';
import Redis from 'ioredis';
import type { Server, Socket } from 'socket.io';
import { outboxEvents, type DbTransaction } from '@vela/db';
import { realtimeRoom, type EventEnvelope } from '@vela/events';
import { env } from '../../../config/env';
import { ContextService } from '../context/context.service';
import { runWithContext, type RequestContext } from '../context/request-context';
import { UnitOfWork } from '../db/unit-of-work';

interface RoomPoller {
  ctx: RequestContext;
  propertyId: string;
  room: string;
  sockets: Set<string>;
  cursor: Date;
  timer: NodeJS.Timeout;
  busy: boolean;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function handshakeHeaders(socket: Socket): Record<string, string | string[] | undefined> {
  const headers: Record<string, string | string[] | undefined> = {
    ...(socket.handshake.headers as Record<string, string | string[] | undefined>),
  };
  const token = first(socket.handshake.auth.token) ?? first(socket.handshake.query.token);
  const propertyId =
    first(socket.handshake.auth.propertyId) ?? first(socket.handshake.query.propertyId);

  if (token && !headers.authorization) headers.authorization = `Bearer ${token}`;
  if (propertyId && !headers['x-property-id']) headers['x-property-id'] = propertyId;
  return headers;
}

/**
 * Socket.IO realtime namespace from docs 04/08. Connections are authenticated through the same
 * ContextService contract as REST, join tenant/property/topic rooms, and poll the transactional
 * outbox under RLS until the Redis Streams relay lands.
 */
@WebSocketGateway({
  namespace: '/realtime',
  cors: { origin: true, credentials: true },
})
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy
{
  @WebSocketServer()
  private server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);
  private readonly pollers = new Map<string, RoomPoller>();
  private readonly socketRooms = new Map<string, string>();
  private pubClient: Redis | undefined;
  private subClient: Redis | undefined;

  constructor(
    private readonly contextService: ContextService,
    private readonly uow: UnitOfWork,
  ) {}

  afterInit(server: Server): void {
    void this.configureRedisAdapter(server);
  }

  async handleConnection(socket: Socket): Promise<void> {
    const built = await this.contextService.build(handshakeHeaders(socket));
    const propertyId = built?.propertyIds[0];
    if (!built || built.tenantId === null || !propertyId || !built.permissions.has('reservation.view')) {
      socket.disconnect(true);
      return;
    }
    const ctx = built as RequestContext;

    const room = realtimeRoom(ctx.tenantId, propertyId, 'frontdesk');
    await socket.join(room);
    socket.data.ctx = ctx;
    socket.data.propertyId = propertyId;
    this.socketRooms.set(socket.id, room);

    const poller = this.ensurePoller(ctx, propertyId, room);
    poller.sockets.add(socket.id);

    socket.emit('ready', {
      tenantId: ctx.tenantId,
      propertyId,
      rooms: [room],
    });
  }

  handleDisconnect(socket: Socket): void {
    const room = this.socketRooms.get(socket.id);
    if (!room) return;

    this.socketRooms.delete(socket.id);
    const poller = this.pollers.get(room);
    if (!poller) return;

    poller.sockets.delete(socket.id);
    if (poller.sockets.size === 0) {
      clearInterval(poller.timer);
      this.pollers.delete(room);
    }
  }

  onModuleDestroy(): void {
    for (const poller of this.pollers.values()) {
      clearInterval(poller.timer);
    }
    this.pollers.clear();
    this.socketRooms.clear();
    void this.pubClient?.quit();
    void this.subClient?.quit();
  }

  private async configureRedisAdapter(server: Server): Promise<void> {
    const redisUrl = env().REDIS_URL;
    const options = {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    };
    const pubClient = new Redis(redisUrl, options);
    const subClient = pubClient.duplicate();

    try {
      await Promise.all([pubClient.connect(), subClient.connect()]);
      server.adapter(createAdapter(pubClient, subClient));
      this.pubClient = pubClient;
      this.subClient = subClient;
      this.logger.log('Socket.IO Redis adapter enabled');
    } catch (err) {
      this.logger.warn(
        `Socket.IO Redis adapter unavailable; using in-process rooms: ${(err as Error).message}`,
      );
      pubClient.disconnect();
      subClient.disconnect();
    }
  }

  private ensurePoller(ctx: RequestContext, propertyId: string, room: string): RoomPoller {
    const existing = this.pollers.get(room);
    if (existing) return existing;

    const poller: RoomPoller = {
      ctx,
      propertyId,
      room,
      sockets: new Set<string>(),
      cursor: new Date(Date.now() - 5000),
      timer: setInterval(() => {
        void this.tick(room);
      }, 1000),
      busy: false,
    };
    this.pollers.set(room, poller);
    void this.tick(room);
    return poller;
  }

  private async tick(room: string): Promise<void> {
    const poller = this.pollers.get(room);
    if (!poller || poller.busy) return;

    poller.busy = true;
    try {
      const events = await runWithContext(poller.ctx, () =>
        this.poll(poller.cursor, poller.propertyId),
      );
      if (events.length > 0) {
        const last = new Date(events[events.length - 1]!.occurredAt);
        poller.cursor = new Date(last.getTime() + 1);
        for (const event of events) {
          this.server.to(poller.room).emit('domain-event', event);
        }
      }
    } catch (err) {
      this.logger.warn(`Realtime poll failed for ${room}: ${(err as Error).message}`);
    } finally {
      poller.busy = false;
    }
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
