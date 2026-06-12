import { z } from './zod';
import { IsoDate, MoneySchema, Uuid, paginated } from './common';

export const GuestRefSchema = z.union([
  z.object({ id: Uuid }),
  z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email().optional(),
    phone: z.string().optional(),
  }),
]);
export type GuestRef = z.infer<typeof GuestRefSchema>;

export const CreateReservationSchema = z
  .object({
    guest: GuestRefSchema,
    arrivalDate: IsoDate,
    departureDate: IsoDate,
    roomTypeId: Uuid,
    ratePlanId: Uuid,
    adults: z.number().int().min(1).default(1),
    children: z.number().int().min(0).default(0),
    groupBlockId: Uuid.optional(),
    guarantee: z
      .object({
        type: z.enum(['hold', 'card_token', 'deposit', 'prepaid']),
        token: z.string().optional(),
      })
      .optional(),
    source: z.object({ channel: z.string(), promoCode: z.string().optional() }).optional(),
    notes: z.string().optional(),
  })
  .openapi('CreateReservation');
export type CreateReservationInput = z.infer<typeof CreateReservationSchema>;

export const ReservationNightSchema = z.object({
  stayDate: IsoDate,
  ratePlanId: Uuid,
  price: MoneySchema,
  marketSegment: z.string().nullable().optional(),
});

export const RegistrationCardSchema = z
  .object({
    id: Uuid,
    reservationId: Uuid,
    guestId: Uuid.nullable(),
    status: z.enum(['signed', 'voided']),
    termsVersion: z.string(),
    signatureHash: z.string(),
    signerName: z.string(),
    signedAt: z.string(),
    consent: z.object({
      marketing: z.boolean().optional(),
      privacyPolicyAccepted: z.boolean().optional(),
    }),
  })
  .openapi('RegistrationCard');
export type RegistrationCard = z.infer<typeof RegistrationCardSchema>;

export const SignRegistrationCardSchema = z
  .object({
    signerName: z.string().min(1),
    signatureHash: z.string().min(16),
    termsVersion: z.string().min(1),
    consent: z
      .object({
        marketing: z.boolean().optional(),
        privacyPolicyAccepted: z.boolean().optional(),
      })
      .default({}),
    metadata: z
      .object({
        device: z.string().optional(),
        ipAddress: z.string().optional(),
        userAgent: z.string().optional(),
      })
      .default({}),
  })
  .openapi('SignRegistrationCard');
export type SignRegistrationCardInput = z.infer<typeof SignRegistrationCardSchema>;

export const KeyCardSchema = z
  .object({
    id: Uuid,
    reservationId: Uuid,
    roomId: Uuid,
    status: z.enum(['requested', 'encoded', 'failed', 'voided']),
    provider: z.string(),
    keyCount: z.number().int(),
    encodedAt: z.string().nullable(),
    expiresAt: z.string().nullable(),
    encoderRef: z.string().nullable(),
  })
  .openapi('KeyCard');
export type KeyCard = z.infer<typeof KeyCardSchema>;

export const IdDocumentSchema = z
  .object({
    id: Uuid,
    reservationId: Uuid,
    guestId: Uuid,
    documentType: z.enum([
      'passport',
      'national_id',
      'drivers_license',
      'residence_permit',
      'other',
    ]),
    issuingCountry: z.string().nullable(),
    documentHash: z.string(),
    artifactRef: z.string().nullable(),
    expiryDate: IsoDate.nullable(),
    verificationStatus: z.enum(['pending', 'verified', 'rejected']),
    verifiedAt: z.string(),
  })
  .openapi('IdDocument');
export type IdDocument = z.infer<typeof IdDocumentSchema>;

export const VerifyIdDocumentSchema = z
  .object({
    documentType: z.enum([
      'passport',
      'national_id',
      'drivers_license',
      'residence_permit',
      'other',
    ]),
    issuingCountry: z.string().length(2).optional(),
    documentHash: z.string().min(16),
    artifactRef: z.string().optional(),
    expiryDate: IsoDate.optional(),
    verificationStatus: z.enum(['pending', 'verified', 'rejected']).default('verified'),
    metadata: z
      .object({
        scanner: z.string().optional(),
        confidence: z.number().min(0).max(1).optional(),
        mismatchReason: z.string().optional(),
      })
      .default({}),
  })
  .openapi('VerifyIdDocument');
export type VerifyIdDocumentInput = z.infer<typeof VerifyIdDocumentSchema>;

export const IssueKeyCardSchema = z
  .object({
    roomId: Uuid.optional(),
    provider: z.string().min(1).default('manual'),
    keyCount: z.number().int().min(1).max(8).default(1),
    encoderRef: z.string().optional(),
    expiresAt: z.string().datetime().optional(),
    markEncoded: z.boolean().default(false),
  })
  .openapi('IssueKeyCard');
export type IssueKeyCardInput = z.infer<typeof IssueKeyCardSchema>;

export const ReservationSchema = z
  .object({
    id: Uuid,
    confirmationNumber: z.string(),
    status: z.string(),
    propertyId: Uuid,
    guestId: Uuid,
    arrivalDate: IsoDate,
    departureDate: IsoDate,
    roomTypeId: Uuid,
    ratePlanId: Uuid,
    adults: z.number().int(),
    children: z.number().int(),
    total: MoneySchema,
    currency: z.string(),
    nights: z.array(ReservationNightSchema),
    folioId: Uuid.nullable(),
    registrationCard: RegistrationCardSchema.nullable(),
    keyCards: z.array(KeyCardSchema),
    idDocuments: z.array(IdDocumentSchema),
  })
  .openapi('Reservation');
export type Reservation = z.infer<typeof ReservationSchema>;

export const CancelReservationSchema = z.object({
  reason: z.string().optional(),
  waiveFee: z.boolean().default(false),
});

export const CheckInSchema = z.object({
  roomId: Uuid.optional(),
  requireRegistrationCard: z.boolean().default(false),
  registrationCard: SignRegistrationCardSchema.optional(),
  keyCard: IssueKeyCardSchema.optional(),
  idDocument: VerifyIdDocumentSchema.optional(),
});
export type CheckInInput = z.infer<typeof CheckInSchema>;
export const CheckOutSchema = z.object({ sendInvoice: z.boolean().default(false) });
export const QueueRoomSchema = z
  .object({
    roomId: Uuid.optional(),
    notes: z.string().optional(),
  })
  .openapi('QueueRoom');
export type QueueRoomInput = z.infer<typeof QueueRoomSchema>;
export const RoomMoveSchema = z.object({
  roomId: Uuid,
  effectiveDate: IsoDate,
  reason: z.string().optional(),
});
export type RoomMoveInput = z.infer<typeof RoomMoveSchema>;

export const NoShowSchema = z.object({ reason: z.string().optional() });
export const ReinstateSchema = z.object({ reason: z.string().optional() });

/** Date/type/rate changes re-resolve price and re-walk the availability counters atomically. */
export const ModifyReservationSchema = z
  .object({
    arrivalDate: IsoDate.optional(),
    departureDate: IsoDate.optional(),
    roomTypeId: Uuid.optional(),
    ratePlanId: Uuid.optional(),
    adults: z.number().int().min(1).optional(),
    children: z.number().int().min(0).optional(),
    notes: z.string().optional(),
  })
  .openapi('ModifyReservation');
export type ModifyReservationInput = z.infer<typeof ModifyReservationSchema>;

/** Walk-in: book tonight + check in immediately, one screen (doc modules/01). */
export const WalkInSchema = z
  .object({
    guest: GuestRefSchema,
    departureDate: IsoDate,
    roomTypeId: Uuid,
    ratePlanId: Uuid.optional(),
    roomId: Uuid,
    adults: z.number().int().min(1).default(1),
    children: z.number().int().min(0).default(0),
  })
  .openapi('WalkIn');
export type WalkInInput = z.infer<typeof WalkInSchema>;

export const ReservationListQuerySchema = z.object({
  status: z
    .enum([
      'inquiry',
      'tentative',
      'confirmed',
      'checked_in',
      'checked_out',
      'cancelled',
      'no_show',
    ])
    .optional(),
  from: IsoDate.optional(),
  to: IsoDate.optional(),
  q: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
export type ReservationListQuery = z.infer<typeof ReservationListQuerySchema>;

export const ReservationListRowSchema = z
  .object({
    id: Uuid,
    confirmationNumber: z.string(),
    status: z.string(),
    guestName: z.string(),
    arrivalDate: IsoDate,
    departureDate: IsoDate,
    adults: z.number().int(),
    children: z.number().int(),
    total: MoneySchema,
  })
  .openapi('ReservationListRow');
export type ReservationListRow = z.infer<typeof ReservationListRowSchema>;

export const ReservationListPageSchema =
  paginated(ReservationListRowSchema).openapi('ReservationListPage');
export type ReservationListPage = z.infer<typeof ReservationListPageSchema>;

export const DepartureRowSchema = z
  .object({
    id: Uuid,
    confirmationNumber: z.string(),
    guestName: z.string(),
    roomNumber: z.string().nullable(),
    departureDate: IsoDate,
    balance: MoneySchema,
  })
  .openapi('DepartureRow');
export type DepartureRow = z.infer<typeof DepartureRowSchema>;

export const InHouseRowSchema = z
  .object({
    id: Uuid,
    confirmationNumber: z.string(),
    guestName: z.string(),
    roomNumber: z.string().nullable(),
    arrivalDate: IsoDate,
    departureDate: IsoDate,
    balance: MoneySchema,
  })
  .openapi('InHouseRow');
export type InHouseRow = z.infer<typeof InHouseRowSchema>;

export const RoomRackStaySchema = z.object({
  reservationId: Uuid,
  guestName: z.string(),
  status: z.string(),
  fromDate: IsoDate,
  toDate: IsoDate,
});

export const RoomRackRowSchema = z
  .object({
    roomId: Uuid,
    number: z.string(),
    floor: z.string().nullable(),
    roomTypeId: Uuid,
    roomTypeCode: z.string(),
    hkStatus: z.string(),
    occupancy: z.string(),
    stays: z.array(RoomRackStaySchema),
  })
  .openapi('RoomRackRow');
export type RoomRackRow = z.infer<typeof RoomRackRowSchema>;

export const RoomRackQuerySchema = z.object({ from: IsoDate, to: IsoDate });

export const AvailableRoomsQuerySchema = z.object({
  from: IsoDate,
  to: IsoDate,
  roomTypeId: Uuid.optional(),
});

export const AvailableRoomSchema = z
  .object({
    roomId: Uuid,
    number: z.string(),
    floor: z.string().nullable(),
    roomTypeId: Uuid,
    roomTypeCode: z.string(),
    roomTypeName: z.string(),
    hkStatus: z.enum(['dirty', 'clean', 'inspected']),
    occupancy: z.enum(['vacant', 'occupied']),
  })
  .openapi('AvailableRoom');
export type AvailableRoom = z.infer<typeof AvailableRoomSchema>;

export const GroupBlockStatusSchema = z.enum(['tentative', 'definite', 'released']);

export const GroupBlockInventoryInputSchema = z.object({
  roomTypeId: Uuid,
  blocked: z.number().int().min(1),
  rate: MoneySchema.optional(),
});

export const CreateGroupBlockSchema = z
  .object({
    code: z.string().min(1),
    name: z.string().min(1),
    arrivalDate: IsoDate,
    departureDate: IsoDate,
    cutoffDate: IsoDate.optional(),
    contactName: z.string().optional(),
    contactEmail: z.string().email().optional(),
    billingInstructions: z
      .object({
        roomAndTaxToMaster: z.boolean().default(false),
        incidentalsToGuest: z.boolean().default(true),
      })
      .default({}),
    inventory: z.array(GroupBlockInventoryInputSchema).min(1),
    notes: z.string().optional(),
  })
  .openapi('CreateGroupBlock');
export type CreateGroupBlockInput = z.infer<typeof CreateGroupBlockSchema>;

export const PickupGroupBlockSchema = z
  .object({
    guest: GuestRefSchema,
    roomTypeId: Uuid,
    ratePlanId: Uuid,
    arrivalDate: IsoDate.optional(),
    departureDate: IsoDate.optional(),
    adults: z.number().int().min(1).default(1),
    children: z.number().int().min(0).default(0),
    guarantee: z
      .object({
        type: z.enum(['hold', 'card_token', 'deposit', 'prepaid']),
        token: z.string().optional(),
      })
      .optional(),
    notes: z.string().optional(),
  })
  .openapi('PickupGroupBlock');
export type PickupGroupBlockInput = z.infer<typeof PickupGroupBlockSchema>;

export const RoomingListImportRowSchema = PickupGroupBlockSchema.extend({
  externalRef: z.string().optional(),
}).openapi('RoomingListImportRow');
export type RoomingListImportRow = z.infer<typeof RoomingListImportRowSchema>;

export const ImportRoomingListSchema = z
  .object({
    rows: z.array(RoomingListImportRowSchema).min(1).max(500),
  })
  .openapi('ImportRoomingList');
export type ImportRoomingListInput = z.infer<typeof ImportRoomingListSchema>;

export const RoomingListImportResultSchema = z
  .object({
    groupBlockId: Uuid,
    created: z.array(
      z.object({
        rowNumber: z.number().int().min(1),
        externalRef: z.string().nullable(),
        reservation: ReservationSchema,
      }),
    ),
  })
  .openapi('RoomingListImportResult');
export type RoomingListImportResult = z.infer<typeof RoomingListImportResultSchema>;

export const GroupBlockInventoryRowSchema = z.object({
  roomTypeId: Uuid,
  roomTypeCode: z.string(),
  stayDate: IsoDate,
  blocked: z.number().int(),
  pickedUp: z.number().int(),
  rate: MoneySchema.nullable(),
});
export type GroupBlockInventoryRow = z.infer<typeof GroupBlockInventoryRowSchema>;

export const GroupBlockSchema = z
  .object({
    id: Uuid,
    code: z.string(),
    name: z.string(),
    status: GroupBlockStatusSchema,
    arrivalDate: IsoDate,
    departureDate: IsoDate,
    cutoffDate: IsoDate.nullable(),
    contactName: z.string().nullable(),
    contactEmail: z.string().nullable(),
    billingInstructions: z.object({
      roomAndTaxToMaster: z.boolean(),
      incidentalsToGuest: z.boolean(),
    }),
    masterFolioId: Uuid.nullable(),
    notes: z.string().nullable(),
    inventory: z.array(GroupBlockInventoryRowSchema),
  })
  .openapi('GroupBlock');
export type GroupBlock = z.infer<typeof GroupBlockSchema>;

export const GroupBlockListRowSchema = z
  .object({
    id: Uuid,
    code: z.string(),
    name: z.string(),
    status: GroupBlockStatusSchema,
    arrivalDate: IsoDate,
    departureDate: IsoDate,
    cutoffDate: IsoDate.nullable(),
    roomsBlocked: z.number().int(),
    roomsPickedUp: z.number().int(),
  })
  .openapi('GroupBlockListRow');
export type GroupBlockListRow = z.infer<typeof GroupBlockListRowSchema>;

export const GroupBlockListQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
export type GroupBlockListQuery = z.infer<typeof GroupBlockListQuerySchema>;

export const GroupBlockListPageSchema =
  paginated(GroupBlockListRowSchema).openapi('GroupBlockListPage');
export type GroupBlockListPage = z.infer<typeof GroupBlockListPageSchema>;

export const ArrivalRowSchema = z
  .object({
    id: Uuid,
    confirmationNumber: z.string(),
    status: z.string(),
    guestName: z.string(),
    arrivalDate: IsoDate,
    departureDate: IsoDate,
    roomTypeCode: z.string(),
    adults: z.number().int(),
    children: z.number().int(),
    balance: MoneySchema,
    roomAssigned: z.boolean(),
    /** Assigned room facets — drive the composite readiness chip on the arrivals board. */
    roomId: Uuid.nullable(),
    roomNumber: z.string().nullable(),
    roomHkStatus: z.enum(['dirty', 'clean', 'inspected']).nullable(),
    roomQueued: z.boolean(),
    queueTaskId: Uuid.nullable(),
    queueTaskStatus: z.enum(['pending', 'in_progress']).nullable(),
    /** Booking source channel from reservation.source (e.g. direct, ota, corporate, group). */
    channel: z.string().nullable(),
    vipTier: z.string().nullable(),
  })
  .openapi('ArrivalRow');
export type ArrivalRow = z.infer<typeof ArrivalRowSchema>;
