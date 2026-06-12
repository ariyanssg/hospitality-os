import { createHmac, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { and, asc, eq, gt, inArray, or, sql } from 'drizzle-orm';
import {
  availabilityDays,
  housekeepingTasks,
  maintenanceTickets,
  outOfOrderPeriods,
  roomStatusLog,
  roomTypes,
  rooms,
  uuidv7,
  type DbTransaction,
} from '@vela/db';
import type {
  CreateHkTaskInput,
  CreateMaintenanceTicketInput,
  HkBoardRoom,
  HkTask,
  HkTaskListQuery,
  HkTaskPage,
  MaintenanceTicket,
  MaintenanceTicketListQuery,
  MaintenanceTicketPage,
  OutOfOrderInput,
  RoomBlock,
  RoomBlockListQuery,
  RoomBlockPage,
} from '@vela/contracts';
import { env } from '../../config/env';
import {
  AvailabilityConflictError,
  BusinessDateService,
  getRequestContext,
  NotFoundError,
  StateConflictError,
  ValidationError,
  type UowHelpers,
} from '../kernel';

/** Stay nights between two ISO dates (from inclusive, to exclusive). */
function datesBetween(from: string, to: string): string[] {
  const dates: string[] = [];
  let cursor = from;
  while (cursor < to) {
    dates.push(cursor);
    const d = new Date(`${cursor}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    cursor = d.toISOString().slice(0, 10);
  }
  return dates;
}

function isCheckViolation(e: unknown): boolean {
  return (e as { code?: string }).code === '23514';
}

/**
 * Housekeeping & Maintenance (doc modules/02). Room status lives on PMS Core `rooms`; every flip
 * is recorded in room_status_log and emitted as `room.status_changed`.
 */
@Injectable()
export class HousekeepingService {
  constructor(private readonly businessDate: BusinessDateService) {}

  private cursorSecret(): string {
    return env().BETTER_AUTH_SECRET;
  }

  private invalidCursor(): never {
    throw new ValidationError('Invalid cursor', [{ field: 'cursor', code: 'INVALID' }]);
  }

  private encodeTaskCursor(
    priorityWeight: number,
    dueDate: string,
    createdAt: Date,
    id: string,
  ): string {
    const payload = Buffer.from(
      JSON.stringify({ priorityWeight, dueDate, createdAt: createdAt.toISOString(), id }),
    ).toString('base64url');
    const sig = createHmac('sha256', this.cursorSecret()).update(payload).digest('base64url');
    return `${payload}.${sig}`;
  }

  private decodeTaskCursor(cursor: string): {
    priorityWeight: number;
    dueDate: string;
    createdAt: Date;
    id: string;
  } {
    const [payload, sig] = cursor.split('.');
    if (!payload || !sig) this.invalidCursor();
    const expected = createHmac('sha256', this.cursorSecret()).update(payload).digest('base64url');
    if (
      expected.length !== sig.length ||
      !timingSafeEqual(Buffer.from(expected), Buffer.from(sig))
    ) {
      this.invalidCursor();
    }
    let parsed: { priorityWeight?: unknown; dueDate?: unknown; createdAt?: unknown; id?: unknown };
    try {
      parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
        priorityWeight?: unknown;
        dueDate?: unknown;
        createdAt?: unknown;
        id?: unknown;
      };
    } catch {
      this.invalidCursor();
    }
    if (
      typeof parsed.priorityWeight !== 'number' ||
      typeof parsed.dueDate !== 'string' ||
      typeof parsed.createdAt !== 'string' ||
      typeof parsed.id !== 'string'
    ) {
      this.invalidCursor();
    }
    const createdAt = new Date(parsed.createdAt);
    if (Number.isNaN(createdAt.getTime())) this.invalidCursor();
    return {
      priorityWeight: parsed.priorityWeight,
      dueDate: parsed.dueDate,
      createdAt,
      id: parsed.id,
    };
  }

  /** Create a task and emit `housekeeping.task_created`. Used by API + checkout/room-move hooks. */
  async createTask(
    tx: DbTransaction,
    helpers: UowHelpers,
    input: CreateHkTaskInput & { reservationId?: string },
    propertyId?: string,
  ): Promise<string> {
    const ctx = getRequestContext();
    const [room] = await tx
      .select({ id: rooms.id, propertyId: rooms.propertyId })
      .from(rooms)
      .where(
        and(
          eq(rooms.tenantId, ctx.tenantId),
          eq(rooms.id, input.roomId),
          propertyId ? eq(rooms.propertyId, propertyId) : undefined,
        ),
      )
      .limit(1);
    if (!room) throw new NotFoundError('Room');

    const dueDate = input.dueDate ?? (await this.businessDate.current(tx, room.propertyId));
    const id = uuidv7();
    await tx.insert(housekeepingTasks).values({
      id,
      tenantId: ctx.tenantId,
      propertyId: room.propertyId,
      roomId: input.roomId,
      reservationId: input.reservationId ?? null,
      taskType: input.taskType,
      priority: input.priority ?? 'normal',
      dueDate,
      assignedTo: input.assignedTo ?? null,
      notes: input.notes ?? null,
    });

    helpers.emit({
      type: 'housekeeping.task_created',
      aggregateType: 'housekeeping_task',
      aggregateId: id,
      propertyId: room.propertyId,
      data: { taskId: id, roomId: input.roomId, taskType: input.taskType, dueDate },
    });
    helpers.audit({
      action: 'housekeeping.task.create',
      entityType: 'housekeeping_task',
      entityId: id,
      after: { roomId: input.roomId, taskType: input.taskType, dueDate },
      propertyId: room.propertyId,
    });
    return id;
  }

  async taskDto(tx: DbTransaction, id: string, propertyId?: string): Promise<HkTask> {
    const ctx = getRequestContext();
    const [row] = await tx
      .select({ task: housekeepingTasks, roomNumber: rooms.number })
      .from(housekeepingTasks)
      .innerJoin(rooms, eq(rooms.id, housekeepingTasks.roomId))
      .where(
        and(
          eq(housekeepingTasks.tenantId, ctx.tenantId),
          eq(housekeepingTasks.id, id),
          propertyId ? eq(housekeepingTasks.propertyId, propertyId) : undefined,
        ),
      )
      .limit(1);
    if (!row) throw new NotFoundError('Housekeeping task');
    const t = row.task;
    return {
      id: t.id,
      roomId: t.roomId,
      roomNumber: row.roomNumber,
      reservationId: t.reservationId,
      taskType: t.taskType,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate,
      assignedTo: t.assignedTo,
      notes: t.notes,
      startedAt: t.startedAt?.toISOString() ?? null,
      completedAt: t.completedAt?.toISOString() ?? null,
    };
  }

  async listTasks(
    tx: DbTransaction,
    propertyId: string,
    query: HkTaskListQuery,
  ): Promise<HkTaskPage> {
    const ctx = getRequestContext();
    const cursor = query.cursor ? this.decodeTaskCursor(query.cursor) : undefined;
    const priorityWeight = sql<number>`CASE ${housekeepingTasks.priority} WHEN 'queue' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 WHEN 'low' THEN 3 ELSE 2 END`;
    const rows = await tx
      .select({ task: housekeepingTasks, roomNumber: rooms.number, priorityWeight })
      .from(housekeepingTasks)
      .innerJoin(rooms, eq(rooms.id, housekeepingTasks.roomId))
      .where(
        and(
          eq(housekeepingTasks.tenantId, ctx.tenantId),
          eq(housekeepingTasks.propertyId, propertyId),
          query.status ? eq(housekeepingTasks.status, query.status) : undefined,
          query.dueDate ? eq(housekeepingTasks.dueDate, query.dueDate) : undefined,
          cursor
            ? sql`(${priorityWeight}, ${housekeepingTasks.dueDate}, ${housekeepingTasks.createdAt}, ${housekeepingTasks.id}) > (${cursor.priorityWeight}, ${cursor.dueDate}, ${cursor.createdAt}, ${cursor.id})`
            : undefined,
        ),
      )
      .orderBy(
        asc(priorityWeight),
        asc(housekeepingTasks.dueDate),
        asc(housekeepingTasks.createdAt),
        asc(housekeepingTasks.id),
      )
      .limit(query.limit + 1);
    const pageRows = rows.slice(0, query.limit);
    const next = rows.length > query.limit ? pageRows[pageRows.length - 1] : undefined;
    return {
      data: pageRows.map((r) => ({
        id: r.task.id,
        roomId: r.task.roomId,
        roomNumber: r.roomNumber,
        reservationId: r.task.reservationId,
        taskType: r.task.taskType,
        status: r.task.status,
        priority: r.task.priority,
        dueDate: r.task.dueDate,
        assignedTo: r.task.assignedTo,
        notes: r.task.notes,
        startedAt: r.task.startedAt?.toISOString() ?? null,
        completedAt: r.task.completedAt?.toISOString() ?? null,
      })),
      meta: {
        nextCursor: next
          ? this.encodeTaskCursor(
              next.priorityWeight,
              next.task.dueDate,
              next.task.createdAt,
              next.task.id,
            )
          : null,
      },
    };
  }

  /**
   * Task transitions: start (pending → in_progress), complete (→ done; flips the room clean or
   * inspected), skip (→ skipped, green-program opt-outs).
   */
  async taskAction(
    tx: DbTransaction,
    helpers: UowHelpers,
    id: string,
    action: 'start' | 'complete' | 'skip',
    propertyId?: string,
  ): Promise<void> {
    const ctx = getRequestContext();
    const [task] = await tx
      .select()
      .from(housekeepingTasks)
      .where(
        and(
          eq(housekeepingTasks.tenantId, ctx.tenantId),
          eq(housekeepingTasks.id, id),
          propertyId ? eq(housekeepingTasks.propertyId, propertyId) : undefined,
        ),
      )
      .limit(1);
    if (!task) throw new NotFoundError('Housekeeping task');

    if (action === 'start') {
      if (task.status !== 'pending') {
        throw new StateConflictError(`Cannot start a task in status ${task.status}`);
      }
      await tx
        .update(housekeepingTasks)
        .set({ status: 'in_progress', startedAt: new Date(), updatedAt: new Date() })
        .where(eq(housekeepingTasks.id, id));
      return;
    }

    if (task.status !== 'pending' && task.status !== 'in_progress') {
      throw new StateConflictError(`Cannot ${action} a task in status ${task.status}`);
    }

    if (action === 'skip') {
      await tx
        .update(housekeepingTasks)
        .set({ status: 'skipped', updatedAt: new Date() })
        .where(eq(housekeepingTasks.id, id));
      helpers.audit({
        action: 'housekeeping.task.skip',
        entityType: 'housekeeping_task',
        entityId: id,
        propertyId: task.propertyId,
      });
      return;
    }

    await tx
      .update(housekeepingTasks)
      .set({ status: 'done', completedAt: new Date(), updatedAt: new Date() })
      .where(eq(housekeepingTasks.id, id));

    // A completed clean makes the room clean; a completed inspection makes it inspected.
    const newHkStatus = task.taskType === 'inspection' ? 'inspected' : 'clean';
    await this.setRoomStatus(
      tx,
      helpers,
      task.roomId,
      newHkStatus,
      `task ${task.taskType} completed`,
      propertyId,
    );

    helpers.emit({
      type: 'housekeeping.task_completed',
      aggregateType: 'housekeeping_task',
      aggregateId: id,
      propertyId: task.propertyId,
      data: { taskId: id, roomId: task.roomId, taskType: task.taskType },
    });
    helpers.audit({
      action: 'housekeeping.task.complete',
      entityType: 'housekeeping_task',
      entityId: id,
      propertyId: task.propertyId,
    });
  }

  /** Live room-status board: every room with its current state and open task. */
  async board(tx: DbTransaction, propertyId: string): Promise<HkBoardRoom[]> {
    const ctx = getRequestContext();
    const roomRows = await tx
      .select({
        roomId: rooms.id,
        number: rooms.number,
        floor: rooms.floor,
        hkStatus: rooms.hkStatus,
        occupancy: rooms.occupancy,
        roomTypeCode: roomTypes.code,
      })
      .from(rooms)
      .innerJoin(roomTypes, eq(roomTypes.id, rooms.roomTypeId))
      .where(and(eq(rooms.tenantId, ctx.tenantId), eq(rooms.propertyId, propertyId)))
      .orderBy(asc(rooms.number));

    const openTasks = await tx
      .select({
        id: housekeepingTasks.id,
        roomId: housekeepingTasks.roomId,
        taskType: housekeepingTasks.taskType,
        status: housekeepingTasks.status,
        priority: housekeepingTasks.priority,
      })
      .from(housekeepingTasks)
      .where(
        and(
          eq(housekeepingTasks.tenantId, ctx.tenantId),
          eq(housekeepingTasks.propertyId, propertyId),
          inArray(housekeepingTasks.status, ['pending', 'in_progress']),
        ),
      );
    const taskByRoom = new Map(openTasks.map((t) => [t.roomId, t]));

    return roomRows.map((r) => {
      const t = taskByRoom.get(r.roomId);
      return {
        roomId: r.roomId,
        number: r.number,
        floor: r.floor,
        roomTypeCode: r.roomTypeCode,
        hkStatus: r.hkStatus,
        occupancy: r.occupancy,
        openTask: t
          ? { id: t.id, taskType: t.taskType, status: t.status, priority: t.priority }
          : null,
      };
    });
  }

  async boardRoom(tx: DbTransaction, roomId: string, propertyId?: string): Promise<HkBoardRoom> {
    const ctx = getRequestContext();
    const [r] = await tx
      .select({
        roomId: rooms.id,
        propertyId: rooms.propertyId,
        number: rooms.number,
        floor: rooms.floor,
        hkStatus: rooms.hkStatus,
        occupancy: rooms.occupancy,
        roomTypeCode: roomTypes.code,
      })
      .from(rooms)
      .innerJoin(roomTypes, eq(roomTypes.id, rooms.roomTypeId))
      .where(
        and(
          eq(rooms.tenantId, ctx.tenantId),
          eq(rooms.id, roomId),
          propertyId ? eq(rooms.propertyId, propertyId) : undefined,
        ),
      )
      .limit(1);
    if (!r) throw new NotFoundError('Room');
    return {
      roomId: r.roomId,
      number: r.number,
      floor: r.floor,
      roomTypeCode: r.roomTypeCode,
      hkStatus: r.hkStatus,
      occupancy: r.occupancy,
      openTask: null,
    };
  }

  /** Manual room-status flip from the board or attendant app. */
  async updateRoomStatus(
    tx: DbTransaction,
    helpers: UowHelpers,
    roomId: string,
    hkStatus: 'dirty' | 'clean' | 'inspected',
    propertyId?: string,
    reason?: string,
  ): Promise<void> {
    await this.setRoomStatus(tx, helpers, roomId, hkStatus, reason, propertyId);
  }

  private async setRoomStatus(
    tx: DbTransaction,
    helpers: UowHelpers,
    roomId: string,
    hkStatus: 'dirty' | 'clean' | 'inspected',
    reason?: string,
    propertyId?: string,
  ): Promise<void> {
    const ctx = getRequestContext();
    const [room] = await tx
      .select({ id: rooms.id, propertyId: rooms.propertyId, occupancy: rooms.occupancy })
      .from(rooms)
      .where(
        and(
          eq(rooms.tenantId, ctx.tenantId),
          eq(rooms.id, roomId),
          propertyId ? eq(rooms.propertyId, propertyId) : undefined,
        ),
      )
      .limit(1);
    if (!room) throw new NotFoundError('Room');

    await tx
      .update(rooms)
      .set({ hkStatus, statusUpdatedAt: new Date(), updatedAt: new Date() })
      .where(eq(rooms.id, roomId));
    await tx.insert(roomStatusLog).values({
      id: uuidv7(),
      tenantId: ctx.tenantId,
      propertyId: room.propertyId,
      roomId,
      hkStatus,
      occupancy: room.occupancy,
      reason: reason ?? null,
      changedBy: ctx.userId,
    });
    helpers.emit({
      type: 'room.status_changed',
      aggregateType: 'room',
      aggregateId: roomId,
      propertyId: room.propertyId,
      data: { roomId, hkStatus, occupancy: room.occupancy },
    });
    helpers.audit({
      action: 'room.status.update',
      entityType: 'room',
      entityId: roomId,
      after: { hkStatus },
      reason,
      propertyId: room.propertyId,
    });
  }

  /**
   * Place a room out of order: records the period and walks the availability counters up.
   * The CHECK constraint guards it — sold rooms make this a clean 409, not a silent oversell.
   */
  async setOutOfOrder(
    tx: DbTransaction,
    helpers: UowHelpers,
    roomId: string,
    input: OutOfOrderInput,
    propertyId?: string,
  ): Promise<string> {
    const ctx = getRequestContext();
    if (input.toDate <= input.fromDate) {
      throw new StateConflictError('toDate must be after fromDate');
    }
    const [room] = await tx
      .select({ id: rooms.id, propertyId: rooms.propertyId, roomTypeId: rooms.roomTypeId })
      .from(rooms)
      .where(
        and(
          eq(rooms.tenantId, ctx.tenantId),
          eq(rooms.id, roomId),
          propertyId ? eq(rooms.propertyId, propertyId) : undefined,
        ),
      )
      .limit(1);
    if (!room) throw new NotFoundError('Room');

    const id = uuidv7();
    await tx.insert(outOfOrderPeriods).values({
      id,
      tenantId: ctx.tenantId,
      propertyId: room.propertyId,
      roomId,
      fromDate: input.fromDate,
      toDate: input.toDate,
      kind: input.kind,
      reason: input.reason ?? null,
    });

    // out_of_service stays sellable (flagged only); out_of_order removes inventory.
    if (input.kind === 'out_of_order') {
      for (const date of datesBetween(input.fromDate, input.toDate)) {
        try {
          await tx
            .update(availabilityDays)
            .set({ outOfOrder: sql`${availabilityDays.outOfOrder} + 1` })
            .where(
              and(
                eq(availabilityDays.tenantId, ctx.tenantId),
                eq(availabilityDays.propertyId, room.propertyId),
                eq(availabilityDays.roomTypeId, room.roomTypeId),
                eq(availabilityDays.stayDate, date),
              ),
            );
        } catch (e) {
          if (isCheckViolation(e)) {
            throw new AvailabilityConflictError(
              `Cannot take the room out of order on ${date}: inventory is sold`,
              [{ field: 'fromDate', code: 'NO_AVAILABILITY', stayDate: date }],
            );
          }
          throw e;
        }
      }
    }

    helpers.emit({
      type: 'room.out_of_order_set',
      aggregateType: 'room',
      aggregateId: roomId,
      propertyId: room.propertyId,
      data: { roomId, fromDate: input.fromDate, toDate: input.toDate, kind: input.kind },
    });
    helpers.audit({
      action: 'room.out_of_order',
      entityType: 'room',
      entityId: roomId,
      after: { fromDate: input.fromDate, toDate: input.toDate, kind: input.kind },
      reason: input.reason,
      propertyId: room.propertyId,
    });
    return id;
  }

  async listRoomBlocks(
    tx: DbTransaction,
    propertyId: string,
    query: RoomBlockListQuery,
  ): Promise<RoomBlockPage> {
    const ctx = getRequestContext();
    const businessDate = await this.businessDate.current(tx, propertyId);
    const cursor = query.cursor ? this.decodeRoomBlockCursor(query.cursor) : undefined;
    const rows = await tx
      .select({
        id: outOfOrderPeriods.id,
        roomId: outOfOrderPeriods.roomId,
        roomNumber: rooms.number,
        roomTypeCode: roomTypes.code,
        fromDate: outOfOrderPeriods.fromDate,
        toDate: outOfOrderPeriods.toDate,
        kind: outOfOrderPeriods.kind,
        reason: outOfOrderPeriods.reason,
        createdAt: outOfOrderPeriods.createdAt,
      })
      .from(outOfOrderPeriods)
      .innerJoin(rooms, eq(rooms.id, outOfOrderPeriods.roomId))
      .innerJoin(roomTypes, eq(roomTypes.id, rooms.roomTypeId))
      .where(
        and(
          eq(outOfOrderPeriods.tenantId, ctx.tenantId),
          eq(outOfOrderPeriods.propertyId, propertyId),
          gt(outOfOrderPeriods.toDate, businessDate),
          cursor
            ? or(
                gt(outOfOrderPeriods.fromDate, cursor.fromDate),
                and(
                  eq(outOfOrderPeriods.fromDate, cursor.fromDate),
                  gt(rooms.number, cursor.roomNumber),
                ),
                and(
                  eq(outOfOrderPeriods.fromDate, cursor.fromDate),
                  eq(rooms.number, cursor.roomNumber),
                  gt(outOfOrderPeriods.id, cursor.id),
                ),
              )
            : undefined,
        ),
      )
      .orderBy(asc(outOfOrderPeriods.fromDate), asc(rooms.number), asc(outOfOrderPeriods.id))
      .limit(query.limit + 1);

    const pageRows = rows.slice(0, query.limit);
    const next = rows.length > query.limit ? pageRows[pageRows.length - 1] : undefined;
    return {
      data: pageRows.map((r) => ({
        id: r.id,
        roomId: r.roomId,
        roomNumber: r.roomNumber,
        roomTypeCode: r.roomTypeCode,
        fromDate: r.fromDate,
        toDate: r.toDate,
        kind: r.kind as RoomBlock['kind'],
        reason: r.reason,
        createdAt: r.createdAt.toISOString(),
      })),
      meta: {
        nextCursor: next
          ? this.encodeRoomBlockCursor(next.fromDate, next.roomNumber, next.id)
          : null,
      },
    };
  }

  private encodeRoomBlockCursor(fromDate: string, roomNumber: string, id: string): string {
    const payload = Buffer.from(JSON.stringify({ fromDate, roomNumber, id })).toString('base64url');
    const sig = createHmac('sha256', this.cursorSecret()).update(payload).digest('base64url');
    return `${payload}.${sig}`;
  }

  private decodeRoomBlockCursor(cursor: string): {
    fromDate: string;
    roomNumber: string;
    id: string;
  } {
    const [payload, sig] = cursor.split('.');
    if (!payload || !sig) this.invalidCursor();
    const expected = createHmac('sha256', this.cursorSecret()).update(payload).digest('base64url');
    if (
      expected.length !== sig.length ||
      !timingSafeEqual(Buffer.from(expected), Buffer.from(sig))
    ) {
      this.invalidCursor();
    }
    let parsed: { fromDate?: unknown; roomNumber?: unknown; id?: unknown };
    try {
      parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
        fromDate?: unknown;
        roomNumber?: unknown;
        id?: unknown;
      };
    } catch {
      this.invalidCursor();
    }
    if (
      typeof parsed.fromDate !== 'string' ||
      typeof parsed.roomNumber !== 'string' ||
      typeof parsed.id !== 'string'
    ) {
      this.invalidCursor();
    }
    return { fromDate: parsed.fromDate, roomNumber: parsed.roomNumber, id: parsed.id };
  }

  // ── Maintenance ──

  async createTicket(
    tx: DbTransaction,
    helpers: UowHelpers,
    propertyId: string,
    input: CreateMaintenanceTicketInput,
  ): Promise<string> {
    const ctx = getRequestContext();
    const id = uuidv7();
    await tx.insert(maintenanceTickets).values({
      id,
      tenantId: ctx.tenantId,
      propertyId,
      roomId: input.roomId ?? null,
      category: input.category,
      priority: input.priority,
      title: input.title,
      description: input.description ?? null,
      reportedBy: ctx.userId,
    });
    helpers.emit({
      type: 'maintenance.ticket_created',
      aggregateType: 'maintenance_ticket',
      aggregateId: id,
      propertyId,
      data: {
        ticketId: id,
        roomId: input.roomId ?? null,
        category: input.category,
        priority: input.priority,
      },
    });
    helpers.audit({
      action: 'maintenance.ticket.create',
      entityType: 'maintenance_ticket',
      entityId: id,
      after: { category: input.category, title: input.title },
      propertyId,
    });
    return id;
  }

  async ticketDto(tx: DbTransaction, id: string, propertyId?: string): Promise<MaintenanceTicket> {
    const ctx = getRequestContext();
    const [row] = await tx
      .select({ ticket: maintenanceTickets, roomNumber: rooms.number })
      .from(maintenanceTickets)
      .leftJoin(rooms, eq(rooms.id, maintenanceTickets.roomId))
      .where(
        and(
          eq(maintenanceTickets.tenantId, ctx.tenantId),
          eq(maintenanceTickets.id, id),
          propertyId ? eq(maintenanceTickets.propertyId, propertyId) : undefined,
        ),
      )
      .limit(1);
    if (!row) throw new NotFoundError('Maintenance ticket');
    const t = row.ticket;
    return {
      id: t.id,
      roomId: t.roomId,
      roomNumber: row.roomNumber ?? null,
      category: t.category,
      priority: t.priority,
      status: t.status,
      title: t.title,
      description: t.description,
      assignedTo: t.assignedTo,
      createdAt: t.createdAt.toISOString(),
      closedAt: t.closedAt?.toISOString() ?? null,
    };
  }

  async listTickets(
    tx: DbTransaction,
    propertyId: string,
    query: MaintenanceTicketListQuery,
  ): Promise<MaintenanceTicketPage> {
    const ctx = getRequestContext();
    const cursor = query.cursor ? this.decodeTicketCursor(query.cursor) : undefined;
    const rows = await tx
      .select({ ticket: maintenanceTickets, roomNumber: rooms.number })
      .from(maintenanceTickets)
      .leftJoin(rooms, eq(rooms.id, maintenanceTickets.roomId))
      .where(
        and(
          eq(maintenanceTickets.tenantId, ctx.tenantId),
          eq(maintenanceTickets.propertyId, propertyId),
          query.status ? eq(maintenanceTickets.status, query.status) : undefined,
          cursor
            ? sql`(${maintenanceTickets.createdAt}, ${maintenanceTickets.id}) > (${cursor.createdAt}, ${cursor.id})`
            : undefined,
        ),
      )
      .orderBy(asc(maintenanceTickets.createdAt), asc(maintenanceTickets.id))
      .limit(query.limit + 1);
    const pageRows = rows.slice(0, query.limit);
    const next = rows.length > query.limit ? pageRows[pageRows.length - 1] : undefined;
    return {
      data: pageRows.map((r) => ({
        id: r.ticket.id,
        roomId: r.ticket.roomId,
        roomNumber: r.roomNumber ?? null,
        category: r.ticket.category,
        priority: r.ticket.priority,
        status: r.ticket.status,
        title: r.ticket.title,
        description: r.ticket.description,
        assignedTo: r.ticket.assignedTo,
        createdAt: r.ticket.createdAt.toISOString(),
        closedAt: r.ticket.closedAt?.toISOString() ?? null,
      })),
      meta: {
        nextCursor: next ? this.encodeTicketCursor(next.ticket.createdAt, next.ticket.id) : null,
      },
    };
  }

  private encodeTicketCursor(createdAt: Date, id: string): string {
    const payload = Buffer.from(
      JSON.stringify({ createdAt: createdAt.toISOString(), id }),
    ).toString('base64url');
    const sig = createHmac('sha256', this.cursorSecret()).update(payload).digest('base64url');
    return `${payload}.${sig}`;
  }

  private decodeTicketCursor(cursor: string): { createdAt: Date; id: string } {
    const [payload, sig] = cursor.split('.');
    if (!payload || !sig) this.invalidCursor();
    const expected = createHmac('sha256', this.cursorSecret()).update(payload).digest('base64url');
    if (
      expected.length !== sig.length ||
      !timingSafeEqual(Buffer.from(expected), Buffer.from(sig))
    ) {
      this.invalidCursor();
    }
    let parsed: { createdAt?: unknown; id?: unknown };
    try {
      parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
        createdAt?: unknown;
        id?: unknown;
      };
    } catch {
      this.invalidCursor();
    }
    if (typeof parsed.createdAt !== 'string' || typeof parsed.id !== 'string') {
      this.invalidCursor();
    }
    const createdAt = new Date(parsed.createdAt);
    if (Number.isNaN(createdAt.getTime())) this.invalidCursor();
    return { createdAt, id: parsed.id };
  }

  /** Lifecycle: reported → triaged → assigned → in_progress → done → verified (doc modules/02). */
  async ticketAction(
    tx: DbTransaction,
    helpers: UowHelpers,
    id: string,
    action: 'assign' | 'complete' | 'close',
    payload: { assignedTo?: string; resolutionNotes?: string },
    propertyId?: string,
  ): Promise<void> {
    const ctx = getRequestContext();
    const [ticket] = await tx
      .select()
      .from(maintenanceTickets)
      .where(
        and(
          eq(maintenanceTickets.tenantId, ctx.tenantId),
          eq(maintenanceTickets.id, id),
          propertyId ? eq(maintenanceTickets.propertyId, propertyId) : undefined,
        ),
      )
      .limit(1);
    if (!ticket) throw new NotFoundError('Maintenance ticket');
    if (ticket.status === 'verified' || ticket.status === 'cancelled') {
      throw new StateConflictError(`Ticket is already ${ticket.status}`);
    }

    if (action === 'assign') {
      await tx
        .update(maintenanceTickets)
        .set({ status: 'assigned', assignedTo: payload.assignedTo, updatedAt: new Date() })
        .where(eq(maintenanceTickets.id, id));
    } else if (action === 'complete') {
      await tx
        .update(maintenanceTickets)
        .set({
          status: 'done',
          resolutionNotes: payload.resolutionNotes ?? ticket.resolutionNotes,
          updatedAt: new Date(),
        })
        .where(eq(maintenanceTickets.id, id));
    } else {
      if (ticket.status !== 'done') {
        throw new StateConflictError('Only a completed ticket can be closed (verified)');
      }
      await tx
        .update(maintenanceTickets)
        .set({ status: 'verified', closedAt: new Date(), updatedAt: new Date() })
        .where(eq(maintenanceTickets.id, id));
      helpers.emit({
        type: 'maintenance.ticket_closed',
        aggregateType: 'maintenance_ticket',
        aggregateId: id,
        propertyId: ticket.propertyId,
        data: { ticketId: id },
      });
    }

    helpers.audit({
      action: `maintenance.ticket.${action}`,
      entityType: 'maintenance_ticket',
      entityId: id,
      propertyId: ticket.propertyId,
    });
  }
}
