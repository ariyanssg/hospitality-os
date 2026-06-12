import { z } from './zod';
import { IsoDate, IsoDateTime, Uuid, paginated } from './common';

/** Housekeeping & Maintenance contracts (doc modules/02). */

export const HkTaskTypeSchema = z.enum([
  'departure_clean',
  'stayover',
  'turndown',
  'deep_clean',
  'inspection',
]);

export const HkTaskSchema = z
  .object({
    id: Uuid,
    roomId: Uuid,
    roomNumber: z.string(),
    reservationId: Uuid.nullable(),
    taskType: HkTaskTypeSchema,
    status: z.enum(['pending', 'in_progress', 'done', 'skipped']),
    priority: z.string(),
    dueDate: IsoDate,
    assignedTo: Uuid.nullable(),
    notes: z.string().nullable(),
    startedAt: IsoDateTime.nullable(),
    completedAt: IsoDateTime.nullable(),
  })
  .openapi('HkTask');
export type HkTask = z.infer<typeof HkTaskSchema>;

export const CreateHkTaskSchema = z
  .object({
    roomId: Uuid,
    taskType: HkTaskTypeSchema,
    dueDate: IsoDate.optional(),
    priority: z.enum(['queue', 'high', 'normal', 'low']).default('normal'),
    notes: z.string().optional(),
    assignedTo: Uuid.optional(),
  })
  .openapi('CreateHkTask');
export type CreateHkTaskInput = z.infer<typeof CreateHkTaskSchema>;

export const HkTaskListQuerySchema = z.object({
  status: z.enum(['pending', 'in_progress', 'done', 'skipped']).optional(),
  dueDate: IsoDate.optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
export type HkTaskListQuery = z.infer<typeof HkTaskListQuerySchema>;

export const HkTaskPageSchema = paginated(HkTaskSchema).openapi('HkTaskPage');
export type HkTaskPage = z.infer<typeof HkTaskPageSchema>;

export const HkBoardRoomSchema = z
  .object({
    roomId: Uuid,
    number: z.string(),
    floor: z.string().nullable(),
    roomTypeCode: z.string(),
    hkStatus: z.enum(['dirty', 'clean', 'inspected']),
    occupancy: z.enum(['vacant', 'occupied']),
    openTask: z
      .object({ id: Uuid, taskType: HkTaskTypeSchema, status: z.string(), priority: z.string() })
      .nullable(),
  })
  .openapi('HkBoardRoom');
export type HkBoardRoom = z.infer<typeof HkBoardRoomSchema>;

export const RoomStatusUpdateSchema = z
  .object({
    hkStatus: z.enum(['dirty', 'clean', 'inspected']),
    reason: z.string().optional(),
  })
  .openapi('RoomStatusUpdate');
export type RoomStatusUpdateInput = z.infer<typeof RoomStatusUpdateSchema>;

export const OutOfOrderSchema = z
  .object({
    fromDate: IsoDate,
    toDate: IsoDate,
    kind: z.enum(['out_of_order', 'out_of_service']).default('out_of_order'),
    reason: z.string().optional(),
  })
  .openapi('OutOfOrder');
export type OutOfOrderInput = z.infer<typeof OutOfOrderSchema>;

export const RoomBlockSchema = z
  .object({
    id: Uuid,
    roomId: Uuid,
    roomNumber: z.string(),
    roomTypeCode: z.string(),
    fromDate: IsoDate,
    toDate: IsoDate,
    kind: z.enum(['out_of_order', 'out_of_service']),
    reason: z.string().nullable(),
    createdAt: IsoDateTime,
  })
  .openapi('RoomBlock');
export type RoomBlock = z.infer<typeof RoomBlockSchema>;

export const RoomBlockListQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
export type RoomBlockListQuery = z.infer<typeof RoomBlockListQuerySchema>;

export const RoomBlockPageSchema = paginated(RoomBlockSchema).openapi('RoomBlockPage');
export type RoomBlockPage = z.infer<typeof RoomBlockPageSchema>;

export const MaintenanceTicketSchema = z
  .object({
    id: Uuid,
    roomId: Uuid.nullable(),
    roomNumber: z.string().nullable(),
    category: z.string(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']),
    status: z.enum([
      'reported',
      'triaged',
      'assigned',
      'in_progress',
      'done',
      'verified',
      'cancelled',
    ]),
    title: z.string(),
    description: z.string().nullable(),
    assignedTo: Uuid.nullable(),
    createdAt: IsoDateTime,
    closedAt: IsoDateTime.nullable(),
  })
  .openapi('MaintenanceTicket');
export type MaintenanceTicket = z.infer<typeof MaintenanceTicketSchema>;

export const MaintenanceTicketListQuerySchema = z.object({
  status: z
    .enum(['reported', 'triaged', 'assigned', 'in_progress', 'done', 'verified', 'cancelled'])
    .optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
export type MaintenanceTicketListQuery = z.infer<typeof MaintenanceTicketListQuerySchema>;

export const MaintenanceTicketPageSchema =
  paginated(MaintenanceTicketSchema).openapi('MaintenanceTicketPage');
export type MaintenanceTicketPage = z.infer<typeof MaintenanceTicketPageSchema>;

export const CreateMaintenanceTicketSchema = z
  .object({
    roomId: Uuid.optional(),
    category: z.string().min(1),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
    title: z.string().min(1),
    description: z.string().optional(),
  })
  .openapi('CreateMaintenanceTicket');
export type CreateMaintenanceTicketInput = z.infer<typeof CreateMaintenanceTicketSchema>;

export const AssignTicketSchema = z.object({ assignedTo: Uuid });
export const CompleteTicketSchema = z.object({ resolutionNotes: z.string().optional() });
