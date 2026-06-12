import { date, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import {
  hkTaskStatus,
  hkTaskType,
  maintenancePriority,
  maintenanceStatus,
  roomOccupancy,
  roomStatusHousekeeping,
} from './enums';
import { auditColumns, createdAt, pk, propertyId, tenantId } from './_shared';
import { rooms } from './availability';

/* Housekeeping & Maintenance module (doc modules/02). Room status itself lives on PMS Core
 * `rooms`; this module mutates it through the rooms API and records every flip in
 * room_status_log (audit requirement: "audit all status flips"). */

export const housekeepingTasks = pgTable(
  'housekeeping_tasks',
  {
    id: pk(),
    tenantId: tenantId(),
    propertyId: propertyId(),
    roomId: uuid('room_id')
      .notNull()
      .references(() => rooms.id),
    /** Reservation that triggered the task (departure clean, queue-room priority). */
    reservationId: uuid('reservation_id'),
    taskType: hkTaskType('task_type').notNull(),
    status: hkTaskStatus('status').notNull().default('pending'),
    /** Lower sorts first; queue rooms (waiting arrival) get bumped to 0. */
    priority: text('priority').notNull().default('normal'), // queue | high | normal | low
    dueDate: date('due_date').notNull(),
    assignedTo: uuid('assigned_to'),
    notes: text('notes'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    ...auditColumns(),
  },
  (t) => [
    index('hk_tasks_board').on(t.tenantId, t.propertyId, t.dueDate, t.status),
    index('hk_tasks_room').on(t.tenantId, t.roomId),
  ],
);

export const maintenanceTickets = pgTable(
  'maintenance_tickets',
  {
    id: pk(),
    tenantId: tenantId(),
    propertyId: propertyId(),
    roomId: uuid('room_id'),
    category: text('category').notNull(), // plumbing | hvac | electrical | ffe | other
    priority: maintenancePriority('priority').notNull().default('medium'),
    status: maintenanceStatus('status').notNull().default('reported'),
    title: text('title').notNull(),
    description: text('description'),
    reportedBy: uuid('reported_by'),
    assignedTo: uuid('assigned_to'),
    resolutionNotes: text('resolution_notes'),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    ...auditColumns(),
  },
  (t) => [
    index('maintenance_open').on(t.tenantId, t.propertyId, t.status),
    index('maintenance_room').on(t.tenantId, t.roomId),
  ],
);

export const roomStatusLog = pgTable(
  'room_status_log',
  {
    id: pk(),
    tenantId: tenantId(),
    propertyId: propertyId(),
    roomId: uuid('room_id')
      .notNull()
      .references(() => rooms.id),
    hkStatus: roomStatusHousekeeping('hk_status').notNull(),
    occupancy: roomOccupancy('occupancy').notNull(),
    reason: text('reason'),
    changedBy: uuid('changed_by'),
    createdAt: createdAt(),
  },
  (t) => [index('room_status_log_room').on(t.tenantId, t.roomId, t.createdAt)],
);
