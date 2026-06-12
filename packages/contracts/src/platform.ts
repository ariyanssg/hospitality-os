import { z } from './zod';
import { Uuid } from './common';

/**
 * Platform (superadmin) administration contracts: hotel CRUD, cross-hotel user provisioning,
 * platform-admin management, and hotel context switching. A "hotel" is a tenant plus its default
 * property, provisioned together.
 */

const Slug = z
  .string()
  .trim()
  .min(2)
  .max(48)
  .regex(/^[a-z0-9][a-z0-9-]*$/, 'lowercase letters, digits, and dashes');

const PersonName = z.string().trim().min(1).max(120);
const Password = z.string().min(8).max(128);

/** Role templates a hotel user can be provisioned with (instantiated per hotel at creation). */
export const HotelRoleKeySchema = z
  .enum([
    'owner',
    'front_office_manager',
    'front_desk_agent',
    'night_auditor',
    'reservations_agent',
    'revenue_manager',
    'housekeeping_supervisor',
    'financial_controller',
  ])
  .openapi('HotelRoleKey');
export type HotelRoleKey = z.infer<typeof HotelRoleKeySchema>;

export const HotelStatusSchema = z.enum(['active', 'suspended', 'offboarding']).openapi('HotelStatus');
export type HotelStatus = z.infer<typeof HotelStatusSchema>;

export const HotelSchema = z
  .object({
    id: Uuid,
    name: z.string(),
    slug: z.string(),
    status: HotelStatusSchema,
    propertyCount: z.number().int(),
    userCount: z.number().int(),
    createdAt: z.string(),
  })
  .openapi('Hotel');
export type Hotel = z.infer<typeof HotelSchema>;

export const HotelPropertySchema = z
  .object({
    id: Uuid,
    name: z.string(),
    code: z.string(),
    currency: z.string(),
    timezone: z.string(),
  })
  .openapi('HotelProperty');
export type HotelProperty = z.infer<typeof HotelPropertySchema>;

export const HotelUserRoleSchema = z
  .object({
    key: z.string(),
    name: z.string(),
    scope: z.string(),
    propertyId: Uuid.nullable(),
  })
  .openapi('HotelUserRole');
export type HotelUserRole = z.infer<typeof HotelUserRoleSchema>;

export const HotelUserSchema = z
  .object({
    userId: z.string(),
    name: z.string(),
    email: z.string().email(),
    membershipStatus: z.enum(['active', 'suspended']),
    roles: z.array(HotelUserRoleSchema),
    createdAt: z.string(),
  })
  .openapi('HotelUser');
export type HotelUser = z.infer<typeof HotelUserSchema>;

export const HotelDetailSchema = HotelSchema.extend({
  properties: z.array(HotelPropertySchema),
  users: z.array(HotelUserSchema),
}).openapi('HotelDetail');
export type HotelDetail = z.infer<typeof HotelDetailSchema>;

export const CreateHotelSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    slug: Slug,
    property: z.object({
      name: z.string().trim().min(1).max(120),
      code: z
        .string()
        .trim()
        .min(2)
        .max(12)
        .regex(/^[A-Z0-9]+$/, 'uppercase letters and digits'),
      currency: z.string().trim().length(3).default('USD'),
      timezone: z.string().trim().min(1).default('UTC'),
      businessDayRollover: z
        .string()
        .regex(/^\d{2}:\d{2}$/)
        .default('03:00'),
    }),
    /** Optional initial Hotel Admin (owner role) created with the hotel. */
    admin: z
      .object({
        name: PersonName,
        email: z.string().trim().email(),
        password: Password,
      })
      .optional(),
  })
  .openapi('CreateHotel');
export type CreateHotelInput = z.infer<typeof CreateHotelSchema>;

export const UpdateHotelSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    slug: Slug.optional(),
  })
  .openapi('UpdateHotel');
export type UpdateHotelInput = z.infer<typeof UpdateHotelSchema>;

export const CreateHotelUserSchema = z
  .object({
    name: PersonName,
    email: z.string().trim().email(),
    password: Password,
    roleKey: HotelRoleKeySchema,
    /** Required when the role's default scope is property/department. Defaults to the hotel's first property. */
    propertyId: Uuid.optional(),
  })
  .openapi('CreateHotelUser');
export type CreateHotelUserInput = z.infer<typeof CreateHotelUserSchema>;

export const UpdatePlatformUserSchema = z
  .object({
    name: PersonName.optional(),
    membershipStatus: z.enum(['active', 'suspended']).optional(),
    /** Tenant the membership-status change applies to. */
    tenantId: Uuid.optional(),
  })
  .openapi('UpdatePlatformUser');
export type UpdatePlatformUserInput = z.infer<typeof UpdatePlatformUserSchema>;

export const ResetPasswordSchema = z
  .object({ password: Password })
  .openapi('ResetPassword');
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

export const PlatformRoleSchema = z
  .object({
    id: Uuid,
    key: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    permissions: z.array(z.string()),
  })
  .openapi('PlatformRole');
export type PlatformRole = z.infer<typeof PlatformRoleSchema>;

export const SuperadminSchema = z
  .object({
    userId: z.string(),
    name: z.string(),
    email: z.string().email(),
    roles: z.array(z.object({ key: z.string(), name: z.string() })),
    createdAt: z.string(),
  })
  .openapi('Superadmin');
export type Superadmin = z.infer<typeof SuperadminSchema>;

export const CreateSuperadminSchema = z
  .object({
    name: PersonName,
    email: z.string().trim().email(),
    password: Password,
    /** Platform role keys to grant; defaults to platform_superadmin. */
    roleKeys: z.array(z.string()).min(1).default(['platform_superadmin']),
  })
  .openapi('CreateSuperadmin');
export type CreateSuperadminInput = z.infer<typeof CreateSuperadminSchema>;

export const UpdateSuperadminSchema = z
  .object({
    roleKeys: z.array(z.string()).min(1),
  })
  .openapi('UpdateSuperadmin');
export type UpdateSuperadminInput = z.infer<typeof UpdateSuperadminSchema>;

export const SwitchContextSchema = z
  .object({ tenantId: Uuid.nullable() })
  .openapi('SwitchContext');
export type SwitchContextInput = z.infer<typeof SwitchContextSchema>;

export const SwitchContextResultSchema = z
  .object({ tenantId: Uuid.nullable() })
  .openapi('SwitchContextResult');
export type SwitchContextResult = z.infer<typeof SwitchContextResultSchema>;

export const PlatformDeleteResultSchema = z
  .object({ id: z.string(), removed: z.boolean() })
  .openapi('PlatformDeleteResult');
export type PlatformDeleteResult = z.infer<typeof PlatformDeleteResultSchema>;
