import { Injectable } from '@nestjs/common';
import { and, asc, eq, gt, inArray, sql } from 'drizzle-orm';
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
  MaintenanceTicket,
  OutOfOrderInput,
  RoomBlock,
} from '@vela/contracts';
import {
  AvailabilityConflictError,
  BusinessDateService,
  getRequestContext,
  NotFoundError,
  StateConflictError,
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

  /** Create a task and emit `housekeeping.task_created`. Used by API + checkout/room-move hooks. */
  async createTask(
    tx: DbTransaction,
    helpers: UowHelpers,
    input: CreateHkTaskInput & { reservationId?: string },
  ): Promise<string> {
    const ctx = getRequestContext();
    const [room] = await tx
      .select({ id: rooms.id, propertyId: rooms.propertyId })
      .from(rooms)
      .where(and(eq(rooms.tenantId, ctx.tenantId), eq(rooms.id, input.roomId)))
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

  async taskDto(tx: DbTransaction, id: string): Promise<HkTask> {
    const ctx = getRequestContext();
    const [row] = await tx
      .select({ task: housekeepingTasks, roomNumber: rooms.number })
      .from(housekeepingTasks)
      .innerJoin(rooms, eq(rooms.id, housekeepingTasks.roomId))
      .where(and(eq(housekeepingTasks.tenantId, ctx.tenantId), eq(housekeepingTasks.id, id)))
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
    query: { status?: 'pending' | 'in_progress' | 'done' | 'skipped'; dueDate?: string },
  ): Promise<HkTask[]> {
    const ctx = getRequestContext();
    const rows = await tx
      .select({ task: housekeepingTasks, roomNumber: rooms.number })
      .from(housekeepingTasks)
      .innerJoin(rooms, eq(rooms.id, housekeepingTasks.roomId))
      .where(
        and(
          eq(housekeepingTasks.tenantId, ctx.tenantId),
          eq(housekeepingTasks.propertyId, propertyId),
          query.status ? eq(housekeepingTasks.status, query.status) : undefined,
          query.dueDate ? eq(housekeepingTasks.dueDate, query.dueDate) : undefined,
        ),
      )
      .orderBy(asc(housekeepingTasks.dueDate), asc(housekeepingTasks.createdAt));
    // Queue rooms (waiting arrival) bubble to the top of the attendant list.
    const weight: Record<string, number> = { queue: 0, high: 1, normal: 2, low: 3 };
    rows.sort((a, b) => (weight[a.task.priority] ?? 2) - (weight[b.task.priority] ?? 2));
    return rows.map((r) => ({
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
    }));
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
  ): Promise<void> {
    const ctx = getRequestContext();
    const [task] = await tx
      .select()
      .from(housekeepingTasks)
      .where(and(eq(housekeepingTasks.tenantId, ctx.tenantId), eq(housekeepingTasks.id, id)))
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
    await this.setRoomStatus(tx, helpers, task.roomId, newHkStatus, `task ${task.taskType} completed`);

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

  async boardRoom(tx: DbTransaction, roomId: string): Promise<HkBoardRoom> {
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
      .where(and(eq(rooms.tenantId, ctx.tenantId), eq(rooms.id, roomId)))
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
    reason?: string,
  ): Promise<void> {
    await this.setRoomStatus(tx, helpers, roomId, hkStatus, reason);
  }

  private async setRoomStatus(
    tx: DbTransaction,
    helpers: UowHelpers,
    roomId: string,
    hkStatus: 'dirty' | 'clean' | 'inspected',
    reason?: string,
  ): Promise<void> {
    const ctx = getRequestContext();
    const [room] = await tx
      .select({ id: rooms.id, propertyId: rooms.propertyId, occupancy: rooms.occupancy })
      .from(rooms)
      .where(and(eq(rooms.tenantId, ctx.tenantId), eq(rooms.id, roomId)))
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
  ): Promise<string> {
    const ctx = getRequestContext();
    if (input.toDate <= input.fromDate) {
      throw new StateConflictError('toDate must be after fromDate');
    }
    const [room] = await tx
      .select({ id: rooms.id, propertyId: rooms.propertyId, roomTypeId: rooms.roomTypeId })
      .from(rooms)
      .where(and(eq(rooms.tenantId, ctx.tenantId), eq(rooms.id, roomId)))
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

  async listRoomBlocks(tx: DbTransaction, propertyId: string): Promise<RoomBlock[]> {
    const ctx = getRequestContext();
    const businessDate = await this.businessDate.current(tx, propertyId);
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
        ),
      )
      .orderBy(asc(outOfOrderPeriods.fromDate), asc(rooms.number));

    return rows.map((r) => ({
      id: r.id,
      roomId: r.roomId,
      roomNumber: r.roomNumber,
      roomTypeCode: r.roomTypeCode,
      fromDate: r.fromDate,
      toDate: r.toDate,
      kind: r.kind as RoomBlock['kind'],
      reason: r.reason,
      createdAt: r.createdAt.toISOString(),
    }));
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
      data: { ticketId: id, roomId: input.roomId ?? null, category: input.category, priority: input.priority },
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

  async ticketDto(tx: DbTransaction, id: string): Promise<MaintenanceTicket> {
    const ctx = getRequestContext();
    const [row] = await tx
      .select({ ticket: maintenanceTickets, roomNumber: rooms.number })
      .from(maintenanceTickets)
      .leftJoin(rooms, eq(rooms.id, maintenanceTickets.roomId))
      .where(and(eq(maintenanceTickets.tenantId, ctx.tenantId), eq(maintenanceTickets.id, id)))
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
    status?: string,
  ): Promise<MaintenanceTicket[]> {
    const ctx = getRequestContext();
    const rows = await tx
      .select({ ticket: maintenanceTickets, roomNumber: rooms.number })
      .from(maintenanceTickets)
      .leftJoin(rooms, eq(rooms.id, maintenanceTickets.roomId))
      .where(
        and(
          eq(maintenanceTickets.tenantId, ctx.tenantId),
          eq(maintenanceTickets.propertyId, propertyId),
          status
            ? eq(
                maintenanceTickets.status,
                status as (typeof maintenanceTickets.status.enumValues)[number],
              )
            : undefined,
        ),
      )
      .orderBy(asc(maintenanceTickets.createdAt));
    return rows.map((r) => ({
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
    }));
  }

  /** Lifecycle: reported → triaged → assigned → in_progress → done → verified (doc modules/02). */
  async ticketAction(
    tx: DbTransaction,
    helpers: UowHelpers,
    id: string,
    action: 'assign' | 'complete' | 'close',
    payload: { assignedTo?: string; resolutionNotes?: string },
  ): Promise<void> {
    const ctx = getRequestContext();
    const [ticket] = await tx
      .select()
      .from(maintenanceTickets)
      .where(and(eq(maintenanceTickets.tenantId, ctx.tenantId), eq(maintenanceTickets.id, id)))
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
