import { z } from './zod';
import { Uuid } from './common';

const CatalogCode = z
  .string()
  .trim()
  .min(1)
  .max(32)
  .regex(/^[A-Za-z0-9_-]+$/);

export const FloorSchema = z
  .object({
    id: Uuid,
    code: z.string(),
    name: z.string(),
    sortOrder: z.number().int(),
    isActive: z.boolean(),
  })
  .openapi('Floor');
export type Floor = z.infer<typeof FloorSchema>;

export const CreateFloorSchema = z
  .object({
    code: CatalogCode,
    name: z.string().trim().min(1).max(80),
    sortOrder: z.coerce.number().int().default(0),
  })
  .openapi('CreateFloor');
export type CreateFloorInput = z.infer<typeof CreateFloorSchema>;
export const UpdateFloorSchema = CreateFloorSchema.partial().openapi('UpdateFloor');
export type UpdateFloorInput = z.infer<typeof UpdateFloorSchema>;

export const RoomAmenityTagSchema = z
  .object({
    id: Uuid,
    code: z.string(),
    name: z.string(),
    category: z.string().nullable(),
  })
  .openapi('RoomAmenityTag');
export type RoomAmenityTag = z.infer<typeof RoomAmenityTagSchema>;

export const RoomAmenitySchema = RoomAmenityTagSchema.extend({
  isActive: z.boolean(),
}).openapi('RoomAmenity');
export type RoomAmenity = z.infer<typeof RoomAmenitySchema>;

export const CreateRoomAmenitySchema = z
  .object({
    code: CatalogCode,
    name: z.string().trim().min(1).max(80),
    category: z.string().trim().max(40).optional(),
  })
  .openapi('CreateRoomAmenity');
export type CreateRoomAmenityInput = z.infer<typeof CreateRoomAmenitySchema>;
export const UpdateRoomAmenitySchema =
  CreateRoomAmenitySchema.partial().openapi('UpdateRoomAmenity');
export type UpdateRoomAmenityInput = z.infer<typeof UpdateRoomAmenitySchema>;

export const RoomTypeSettingSchema = z
  .object({
    id: Uuid,
    code: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    maxOccupancy: z.number().int(),
    defaultOccupancy: z.number().int(),
    sortOrder: z.number().int(),
    roomCount: z.number().int(),
  })
  .openapi('RoomTypeSetting');
export type RoomTypeSetting = z.infer<typeof RoomTypeSettingSchema>;

export const CreateRoomTypeSettingSchema = z
  .object({
    code: CatalogCode,
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(500).optional(),
    maxOccupancy: z.coerce.number().int().min(1).max(20).default(2),
    defaultOccupancy: z.coerce.number().int().min(1).max(20).default(2),
    sortOrder: z.coerce.number().int().default(0),
  })
  .openapi('CreateRoomTypeSetting');
export type CreateRoomTypeSettingInput = z.infer<typeof CreateRoomTypeSettingSchema>;
export const UpdateRoomTypeSettingSchema =
  CreateRoomTypeSettingSchema.partial().openapi('UpdateRoomTypeSetting');
export type UpdateRoomTypeSettingInput = z.infer<typeof UpdateRoomTypeSettingSchema>;

export const RoomSettingSchema = z
  .object({
    id: Uuid,
    number: z.string(),
    floor: z.string().nullable(),
    floorId: Uuid.nullable(),
    floorCode: z.string().nullable(),
    floorName: z.string().nullable(),
    roomTypeId: Uuid,
    roomTypeCode: z.string(),
    roomTypeName: z.string(),
    hkStatus: z.enum(['dirty', 'clean', 'inspected']),
    occupancy: z.enum(['vacant', 'occupied']),
    amenities: z.array(RoomAmenityTagSchema),
  })
  .openapi('RoomSetting');
export type RoomSetting = z.infer<typeof RoomSettingSchema>;

export const CreateRoomSchema = z
  .object({
    number: z.string().trim().min(1).max(20),
    roomTypeId: Uuid,
    floorId: Uuid.optional(),
    amenityIds: z.array(Uuid).default([]),
  })
  .openapi('CreateRoom');
export type CreateRoomInput = z.infer<typeof CreateRoomSchema>;
export const UpdateRoomSchema = CreateRoomSchema.partial().openapi('UpdateRoom');
export type UpdateRoomInput = z.infer<typeof UpdateRoomSchema>;

export const ChargeTypeSchema = z
  .object({
    id: Uuid,
    code: z.string(),
    name: z.string(),
    category: z.string(),
    glAccountCode: z.string().nullable(),
    isActive: z.boolean(),
  })
  .openapi('ChargeType');
export type ChargeType = z.infer<typeof ChargeTypeSchema>;

export const CreateChargeTypeSchema = z
  .object({
    code: CatalogCode,
    name: z.string().trim().min(1).max(120),
    category: z.string().trim().min(1).max(40).default('misc'),
    glAccountCode: z.string().trim().max(32).optional(),
  })
  .openapi('CreateChargeType');
export type CreateChargeTypeInput = z.infer<typeof CreateChargeTypeSchema>;
export const UpdateChargeTypeSchema = CreateChargeTypeSchema.partial().openapi('UpdateChargeType');
export type UpdateChargeTypeInput = z.infer<typeof UpdateChargeTypeSchema>;

export const PaymentMethodSchema = z
  .object({
    id: Uuid,
    code: z.string(),
    name: z.string(),
    category: z.string(),
    sortOrder: z.number().int(),
    isActive: z.boolean(),
  })
  .openapi('PaymentMethod');
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

export const CreatePaymentMethodSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1)
      .max(32)
      .regex(/^[a-zA-Z0-9_-]+$/),
    name: z.string().trim().min(1).max(120),
    category: z.string().trim().min(1).max(40).default('payment'),
    sortOrder: z.coerce.number().int().default(0),
  })
  .openapi('CreatePaymentMethod');
export type CreatePaymentMethodInput = z.infer<typeof CreatePaymentMethodSchema>;
export const UpdatePaymentMethodSchema =
  CreatePaymentMethodSchema.partial().openapi('UpdatePaymentMethod');
export type UpdatePaymentMethodInput = z.infer<typeof UpdatePaymentMethodSchema>;

export const SettingsDeleteResultSchema = z
  .object({ id: Uuid, removed: z.boolean() })
  .openapi('SettingsDeleteResult');
export type SettingsDeleteResult = z.infer<typeof SettingsDeleteResultSchema>;

export const SettingsCatalogSchema = z
  .object({
    floors: z.array(FloorSchema),
    amenities: z.array(RoomAmenitySchema),
    roomTypes: z.array(RoomTypeSettingSchema),
    rooms: z.array(RoomSettingSchema),
    chargeTypes: z.array(ChargeTypeSchema),
    paymentMethods: z.array(PaymentMethodSchema),
  })
  .openapi('SettingsCatalog');
export type SettingsCatalog = z.infer<typeof SettingsCatalogSchema>;
