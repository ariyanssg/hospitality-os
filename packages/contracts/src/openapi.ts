import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { z } from './zod';
import { MoneySchema, PageMetaSchema, ProblemSchema } from './common';
import {
  ArrivalRowSchema,
  AvailableRoomSchema,
  AvailableRoomsQuerySchema,
  CancelReservationSchema,
  CheckInSchema,
  CheckOutSchema,
  CreateGroupBlockSchema,
  CreateReservationSchema,
  DepartureRowSchema,
  GroupBlockListPageSchema,
  GroupBlockListQuerySchema,
  GroupBlockListRowSchema,
  GroupBlockSchema,
  ImportRoomingListSchema,
  InHouseRowSchema,
  IdDocumentSchema,
  IssueKeyCardSchema,
  KeyCardSchema,
  ModifyReservationSchema,
  NoShowSchema,
  PickupGroupBlockSchema,
  QueueRoomSchema,
  ReinstateSchema,
  RegistrationCardSchema,
  ReservationListQuerySchema,
  ReservationListPageSchema,
  ReservationListRowSchema,
  ReservationSchema,
  RoomingListImportResultSchema,
  RoomMoveSchema,
  RoomRackQuerySchema,
  RoomRackRowSchema,
  SignRegistrationCardSchema,
  VerifyIdDocumentSchema,
  WalkInSchema,
} from './reservations';
import {
  AuthorizePaymentSchema,
  CashierSessionSchema,
  CapturePaymentIntentSchema,
  CloseCashierSessionSchema,
  CreateFolioSchema,
  DepositSchema,
  FolioSchema,
  OpenCashierSessionSchema,
  PaymentIntentSchema,
  PostChargeSchema,
  RecordDepositSchema,
  RecordPaymentSchema,
  RefundSchema,
  TransferPostingSchema,
} from './folio';
import { AvailabilityQuerySchema, RoomTypeAvailabilitySchema } from './availability';
import { MeSchema } from './identity';
import { NightAuditResultSchema, NightAuditRunSchema, TrialBalanceSchema } from './night-audit';
import {
  CreateHkTaskSchema,
  CreateMaintenanceTicketSchema,
  HkBoardRoomSchema,
  HkTaskPageSchema,
  HkTaskListQuerySchema,
  HkTaskSchema,
  MaintenanceTicketSchema,
  MaintenanceTicketListQuerySchema,
  MaintenanceTicketPageSchema,
  OutOfOrderSchema,
  RoomBlockListQuerySchema,
  RoomBlockPageSchema,
  RoomBlockSchema,
  RoomStatusUpdateSchema,
} from './housekeeping';
import {
  PriceGridUpdateSchema,
  RatePlanSchema,
  RatePriceRowSchema,
  RatePricesQuerySchema,
} from './rates';
import { ManagerFlashQuerySchema, ManagerFlashSchema } from './reports';
import {
  GuestProfileSchema,
  GuestSearchPageSchema,
  GuestSchema,
  GuestSearchQuerySchema,
  UpdateGuestSchema,
} from './guests';
import {
  ChargeTypeSchema,
  CreateChargeTypeSchema,
  CreateFloorSchema,
  CreatePaymentMethodSchema,
  CreateRoomAmenitySchema,
  CreateRoomSchema,
  CreateRoomTypeSettingSchema,
  FloorSchema,
  PaymentMethodSchema,
  RoomAmenitySchema,
  RoomAmenityTagSchema,
  RoomSettingSchema,
  RoomTypeSettingSchema,
  SettingsDeleteResultSchema,
  SettingsCatalogSchema,
  UpdateChargeTypeSchema,
  UpdateFloorSchema,
  UpdatePaymentMethodSchema,
  UpdateRoomAmenitySchema,
  UpdateRoomSchema,
  UpdateRoomTypeSettingSchema,
} from './settings';
import {
  AddPosItemSchema,
  ClosePosCheckSchema,
  ClosePosShiftSchema,
  OfflineOpSchema,
  OpenPosCheckSchema,
  OpenPosShiftSchema,
  PosCheckPageSchema,
  PosCheckItemSchema,
  PosCheckListQuerySchema,
  PosCheckSchema,
  PosKdsItemSchema,
  PosOutletSchema,
  PosRoomChargeCandidateSchema,
  PosRoomChargeSearchQuerySchema,
  PosShiftSchema,
  PosTableSchema,
  QueueOfflineOpSchema,
} from './pos';
import {
  BookingSessionSchema,
  ConfirmBookingSessionSchema,
  StartBookingSessionSchema,
} from './booking';
import {
  ConversationListQuerySchema,
  ConversationPageSchema,
  ConversationSchema,
  CreateGdprRequestSchema,
  GdprRequestSchema,
  MessageSchema,
  SendMessageSchema,
  UpdateGdprRequestSchema,
} from './messaging';
import {
  CreateWebhookEndpointSchema,
  WebhookDeliverySchema,
  WebhookEndpointSchema,
  WebhookSecretSchema,
} from './webhooks';
import {
  CreateHotelSchema,
  CreateHotelUserSchema,
  CreateSuperadminSchema,
  HotelDetailSchema,
  HotelSchema,
  HotelUserSchema,
  PlatformDeleteResultSchema,
  PlatformRoleSchema,
  ResetPasswordSchema,
  SuperadminSchema,
  SwitchContextResultSchema,
  SwitchContextSchema,
  UpdateHotelSchema,
  UpdatePlatformUserSchema,
  UpdateSuperadminSchema,
} from './platform';

/**
 * Code-first OpenAPI (doc 08 §7). The same Zod schemas validate the API boundary and generate this
 * document; `tooling/check-openapi` diffs it in CI to gate undocumented breaking changes.
 */
export function buildOpenApiDocument(): Record<string, unknown> {
  const r = new OpenAPIRegistry();

  // Reusable components — registered under stable names that match each schema's `.openapi(...)` id.
  const components: Record<string, z.ZodTypeAny> = {
    Money: MoneySchema,
    Problem: ProblemSchema,
    PageMeta: PageMetaSchema,
    Me: MeSchema,
    CreateReservation: CreateReservationSchema,
    Reservation: ReservationSchema,
    RegistrationCard: RegistrationCardSchema,
    SignRegistrationCard: SignRegistrationCardSchema,
    KeyCard: KeyCardSchema,
    IssueKeyCard: IssueKeyCardSchema,
    IdDocument: IdDocumentSchema,
    VerifyIdDocument: VerifyIdDocumentSchema,
    ArrivalRow: ArrivalRowSchema,
    Folio: FolioSchema,
    PostCharge: PostChargeSchema,
    RecordPayment: RecordPaymentSchema,
    PaymentIntent: PaymentIntentSchema,
    AuthorizePayment: AuthorizePaymentSchema,
    CapturePaymentIntent: CapturePaymentIntentSchema,
    Refund: RefundSchema,
    RoomTypeAvailability: RoomTypeAvailabilitySchema,
    TrialBalance: TrialBalanceSchema,
    NightAuditResult: NightAuditResultSchema,
    ModifyReservation: ModifyReservationSchema,
    WalkIn: WalkInSchema,
    ReservationListRow: ReservationListRowSchema,
    ReservationListPage: ReservationListPageSchema,
    DepartureRow: DepartureRowSchema,
    InHouseRow: InHouseRowSchema,
    RoomRackRow: RoomRackRowSchema,
    AvailableRoom: AvailableRoomSchema,
    CreateGroupBlock: CreateGroupBlockSchema,
    PickupGroupBlock: PickupGroupBlockSchema,
    QueueRoom: QueueRoomSchema,
    ImportRoomingList: ImportRoomingListSchema,
    RoomingListImportResult: RoomingListImportResultSchema,
    GroupBlock: GroupBlockSchema,
    GroupBlockListRow: GroupBlockListRowSchema,
    GroupBlockListPage: GroupBlockListPageSchema,
    TransferPosting: TransferPostingSchema,
    CreateFolio: CreateFolioSchema,
    OpenCashierSession: OpenCashierSessionSchema,
    CloseCashierSession: CloseCashierSessionSchema,
    CashierSession: CashierSessionSchema,
    RecordDeposit: RecordDepositSchema,
    Deposit: DepositSchema,
    HkTask: HkTaskSchema,
    HkTaskPage: HkTaskPageSchema,
    CreateHkTask: CreateHkTaskSchema,
    HkBoardRoom: HkBoardRoomSchema,
    RoomStatusUpdate: RoomStatusUpdateSchema,
    OutOfOrder: OutOfOrderSchema,
    RoomBlock: RoomBlockSchema,
    RoomBlockPage: RoomBlockPageSchema,
    MaintenanceTicket: MaintenanceTicketSchema,
    MaintenanceTicketPage: MaintenanceTicketPageSchema,
    CreateMaintenanceTicket: CreateMaintenanceTicketSchema,
    RatePlan: RatePlanSchema,
    RatePriceRow: RatePriceRowSchema,
    PriceGridUpdate: PriceGridUpdateSchema,
    ManagerFlash: ManagerFlashSchema,
    Guest: GuestSchema,
    GuestSearchPage: GuestSearchPageSchema,
    GuestProfile: GuestProfileSchema,
    UpdateGuest: UpdateGuestSchema,
    Floor: FloorSchema,
    CreateFloor: CreateFloorSchema,
    UpdateFloor: UpdateFloorSchema,
    RoomAmenityTag: RoomAmenityTagSchema,
    RoomAmenity: RoomAmenitySchema,
    CreateRoomAmenity: CreateRoomAmenitySchema,
    UpdateRoomAmenity: UpdateRoomAmenitySchema,
    RoomTypeSetting: RoomTypeSettingSchema,
    CreateRoomTypeSetting: CreateRoomTypeSettingSchema,
    UpdateRoomTypeSetting: UpdateRoomTypeSettingSchema,
    RoomSetting: RoomSettingSchema,
    CreateRoom: CreateRoomSchema,
    UpdateRoom: UpdateRoomSchema,
    ChargeType: ChargeTypeSchema,
    CreateChargeType: CreateChargeTypeSchema,
    UpdateChargeType: UpdateChargeTypeSchema,
    PaymentMethod: PaymentMethodSchema,
    CreatePaymentMethod: CreatePaymentMethodSchema,
    UpdatePaymentMethod: UpdatePaymentMethodSchema,
    SettingsDeleteResult: SettingsDeleteResultSchema,
    SettingsCatalog: SettingsCatalogSchema,
    PosOutlet: PosOutletSchema,
    PosTable: PosTableSchema,
    PosCheck: PosCheckSchema,
    PosCheckPage: PosCheckPageSchema,
    PosCheckItem: PosCheckItemSchema,
    PosKdsItem: PosKdsItemSchema,
    PosRoomChargeCandidate: PosRoomChargeCandidateSchema,
    OpenPosCheck: OpenPosCheckSchema,
    AddPosItem: AddPosItemSchema,
    ClosePosCheck: ClosePosCheckSchema,
    OpenPosShift: OpenPosShiftSchema,
    ClosePosShift: ClosePosShiftSchema,
    PosShift: PosShiftSchema,
    QueueOfflineOp: QueueOfflineOpSchema,
    OfflineOp: OfflineOpSchema,
    StartBookingSession: StartBookingSessionSchema,
    ConfirmBookingSession: ConfirmBookingSessionSchema,
    BookingSession: BookingSessionSchema,
    SendMessage: SendMessageSchema,
    Message: MessageSchema,
    Conversation: ConversationSchema,
    ConversationPage: ConversationPageSchema,
    CreateGdprRequest: CreateGdprRequestSchema,
    UpdateGdprRequest: UpdateGdprRequestSchema,
    GdprRequest: GdprRequestSchema,
    WebhookEndpoint: WebhookEndpointSchema,
    CreateWebhookEndpoint: CreateWebhookEndpointSchema,
    WebhookSecret: WebhookSecretSchema,
    WebhookDelivery: WebhookDeliverySchema,
    Hotel: HotelSchema,
    HotelDetail: HotelDetailSchema,
    CreateHotel: CreateHotelSchema,
    UpdateHotel: UpdateHotelSchema,
    HotelUser: HotelUserSchema,
    CreateHotelUser: CreateHotelUserSchema,
    UpdatePlatformUser: UpdatePlatformUserSchema,
    ResetPassword: ResetPasswordSchema,
    PlatformRole: PlatformRoleSchema,
    Superadmin: SuperadminSchema,
    CreateSuperadmin: CreateSuperadminSchema,
    UpdateSuperadmin: UpdateSuperadminSchema,
    SwitchContext: SwitchContextSchema,
    SwitchContextResult: SwitchContextResultSchema,
    PlatformDeleteResult: PlatformDeleteResultSchema,
  };
  for (const [name, schema] of Object.entries(components)) r.register(name, schema);

  const propertyHeader = z
    .string()
    .uuid()
    .openapi({ param: { name: 'X-Property-Id', in: 'header' } });
  const idemHeader = z
    .string()
    .optional()
    .openapi({ param: { name: 'Idempotency-Key', in: 'header' } });
  const json = (schema: z.ZodTypeAny) => ({ content: { 'application/json': { schema } } });
  const problem = (description: string) => ({
    description,
    content: { 'application/problem+json': { schema: ProblemSchema } },
  });

  r.registerPath({
    method: 'get',
    path: '/me',
    summary: 'Session bootstrap: identity, properties, permission decision set',
    responses: { 200: { description: 'Current user', ...json(MeSchema) } },
  });

  r.registerPath({
    method: 'get',
    path: '/availability',
    summary: 'Availability + best price per room type over a date range',
    request: {
      query: AvailabilityQuerySchema,
      headers: z.object({ 'X-Property-Id': propertyHeader }),
    },
    responses: {
      200: { description: 'Availability', ...json(z.array(RoomTypeAvailabilitySchema)) },
    },
  });

  r.registerPath({
    method: 'post',
    path: '/reservations',
    summary: 'Take a booking (idempotent, transactional availability decrement)',
    request: {
      headers: z.object({ 'X-Property-Id': propertyHeader, 'Idempotency-Key': idemHeader }),
      body: json(CreateReservationSchema),
    },
    responses: {
      201: { description: 'Created', ...json(ReservationSchema) },
      409: problem('AVAILABILITY_CONFLICT or STATE_CONFLICT'),
      422: problem('VALIDATION_FAILED'),
    },
  });

  r.registerPath({
    method: 'get',
    path: '/reservations/{id}',
    summary: 'Get a reservation',
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
      200: { description: 'Reservation', ...json(ReservationSchema) },
      404: problem('Not found'),
    },
  });

  r.registerPath({
    method: 'post',
    path: '/reservations/{id}/registration-card',
    summary: 'Capture a signed registration card for check-in',
    request: {
      params: z.object({ id: z.string().uuid() }),
      headers: z.object({ 'Idempotency-Key': idemHeader }),
      body: json(SignRegistrationCardSchema),
    },
    responses: {
      201: { description: 'Reservation', ...json(ReservationSchema) },
      409: problem('STATE_CONFLICT'),
    },
  });
  r.registerPath({
    method: 'post',
    path: '/reservations/{id}/key-cards',
    summary: 'Request or record key-card/mobile-key issuance for a reservation',
    request: {
      params: z.object({ id: z.string().uuid() }),
      headers: z.object({ 'Idempotency-Key': idemHeader }),
      body: json(IssueKeyCardSchema),
    },
    responses: {
      201: { description: 'Reservation', ...json(ReservationSchema) },
      409: problem('STATE_CONFLICT'),
    },
  });
  r.registerPath({
    method: 'post',
    path: '/reservations/{id}/id-documents',
    summary: 'Record minimized ID document verification evidence for check-in',
    request: {
      params: z.object({ id: z.string().uuid() }),
      headers: z.object({ 'Idempotency-Key': idemHeader }),
      body: json(VerifyIdDocumentSchema),
    },
    responses: {
      201: { description: 'Reservation', ...json(ReservationSchema) },
      409: problem('STATE_CONFLICT'),
    },
  });
  r.registerPath({
    method: 'post',
    path: '/reservations/{id}/queue-room',
    summary: 'Queue an early arrival for room readiness and bump housekeeping priority',
    request: {
      params: z.object({ id: z.string().uuid() }),
      headers: z.object({ 'Idempotency-Key': idemHeader }),
      body: json(QueueRoomSchema),
    },
    responses: {
      200: { description: 'Reservation', ...json(ReservationSchema) },
      409: problem('STATE_CONFLICT'),
      422: problem('VALIDATION_FAILED'),
    },
  });

  for (const [action, body] of [
    ['check-in', CheckInSchema],
    ['check-out', CheckOutSchema],
    ['cancel', CancelReservationSchema],
  ] as const) {
    r.registerPath({
      method: 'post',
      path: `/reservations/{id}/${action}`,
      summary: `Reservation action: ${action}`,
      request: {
        params: z.object({ id: z.string().uuid() }),
        headers: z.object({ 'Idempotency-Key': idemHeader }),
        body: json(body),
      },
      responses: {
        200: { description: 'Reservation', ...json(ReservationSchema) },
        409: problem('STATE_CONFLICT'),
      },
    });
  }

  r.registerPath({
    method: 'post',
    path: '/folios/{id}/postings',
    summary: 'Post a charge to a folio',
    request: {
      params: z.object({ id: z.string().uuid() }),
      headers: z.object({ 'Idempotency-Key': idemHeader }),
      body: json(PostChargeSchema),
    },
    responses: {
      201: { description: 'Folio', ...json(FolioSchema) },
      403: problem('PERMISSION_DENIED'),
    },
  });

  r.registerPath({
    method: 'post',
    path: '/folios/{id}/payments',
    summary: 'Record a payment against a folio',
    request: {
      params: z.object({ id: z.string().uuid() }),
      headers: z.object({ 'Idempotency-Key': idemHeader }),
      body: json(RecordPaymentSchema),
    },
    responses: { 201: { description: 'Folio', ...json(FolioSchema) } },
  });

  r.registerPath({
    method: 'post',
    path: '/folios/{id}/payment-intents',
    summary: 'Authorize a PSP-tokenized card payment intent for a folio',
    request: {
      params: z.object({ id: z.string().uuid() }),
      headers: z.object({ 'Idempotency-Key': idemHeader }),
      body: json(AuthorizePaymentSchema),
    },
    responses: {
      201: { description: 'Payment intent', ...json(PaymentIntentSchema) },
      409: problem('STATE_CONFLICT'),
      422: problem('VALIDATION_FAILED'),
    },
  });

  r.registerPath({
    method: 'post',
    path: '/payments/intents/{id}/capture',
    summary: 'Capture an authorized payment intent and post it to the folio ledger',
    request: {
      params: z.object({ id: z.string().uuid() }),
      headers: z.object({ 'Idempotency-Key': idemHeader }),
      body: json(CapturePaymentIntentSchema),
    },
    responses: {
      200: { description: 'Folio', ...json(FolioSchema) },
      409: problem('STATE_CONFLICT'),
    },
  });

  r.registerPath({
    method: 'get',
    path: '/front-desk/arrivals',
    summary: "Today's arrivals board",
    request: { headers: z.object({ 'X-Property-Id': propertyHeader }) },
    responses: { 200: { description: 'Arrivals', ...json(z.array(ArrivalRowSchema)) } },
  });

  // ── Phase-1 reservation lifecycle ──
  r.registerPath({
    method: 'get',
    path: '/reservations',
    summary: 'List/search reservations',
    request: {
      query: ReservationListQuerySchema,
      headers: z.object({ 'X-Property-Id': propertyHeader }),
    },
    responses: { 200: { description: 'Reservations', ...json(ReservationListPageSchema) } },
  });

  for (const [action, body] of [
    ['modify', ModifyReservationSchema],
    ['no-show', NoShowSchema],
    ['reinstate', ReinstateSchema],
    ['room-moves', RoomMoveSchema],
  ] as const) {
    r.registerPath({
      method: 'post',
      path: `/reservations/{id}/${action}`,
      summary: `Reservation action: ${action}`,
      request: {
        params: z.object({ id: z.string().uuid() }),
        headers: z.object({ 'Idempotency-Key': idemHeader }),
        body: json(body),
      },
      responses: {
        200: { description: 'Reservation', ...json(ReservationSchema) },
        409: problem('STATE_CONFLICT or AVAILABILITY_CONFLICT'),
      },
    });
  }

  r.registerPath({
    method: 'post',
    path: '/walk-ins',
    summary: 'Walk-in: book tonight and check in immediately',
    request: {
      headers: z.object({ 'X-Property-Id': propertyHeader, 'Idempotency-Key': idemHeader }),
      body: json(WalkInSchema),
    },
    responses: {
      201: { description: 'Reservation (checked in)', ...json(ReservationSchema) },
      409: problem('AVAILABILITY_CONFLICT'),
    },
  });

  r.registerPath({
    method: 'get',
    path: '/group-blocks',
    summary: 'List group blocks with pickup totals',
    request: {
      query: GroupBlockListQuerySchema,
      headers: z.object({ 'X-Property-Id': propertyHeader }),
    },
    responses: { 200: { description: 'Group blocks', ...json(GroupBlockListPageSchema) } },
  });
  r.registerPath({
    method: 'get',
    path: '/group-blocks/{id}',
    summary: 'Get group block inventory and routing instructions',
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
      200: { description: 'Group block', ...json(GroupBlockSchema) },
      404: problem('Not found'),
    },
  });
  r.registerPath({
    method: 'post',
    path: '/group-blocks',
    summary: 'Create a group block and hold blocked inventory',
    request: {
      headers: z.object({ 'X-Property-Id': propertyHeader, 'Idempotency-Key': idemHeader }),
      body: json(CreateGroupBlockSchema),
    },
    responses: {
      201: { description: 'Group block', ...json(GroupBlockSchema) },
      409: problem('AVAILABILITY_CONFLICT'),
    },
  });
  r.registerPath({
    method: 'post',
    path: '/group-blocks/{id}/pickup',
    summary: 'Pick up one room from a group block into a linked reservation',
    request: {
      params: z.object({ id: z.string().uuid() }),
      headers: z.object({ 'X-Property-Id': propertyHeader, 'Idempotency-Key': idemHeader }),
      body: json(PickupGroupBlockSchema),
    },
    responses: {
      201: { description: 'Reservation', ...json(ReservationSchema) },
      409: problem('AVAILABILITY_CONFLICT'),
    },
  });
  r.registerPath({
    method: 'post',
    path: '/group-blocks/{id}/rooming-list',
    summary: 'Import a rooming list and pick up reservations from a group block',
    request: {
      params: z.object({ id: z.string().uuid() }),
      headers: z.object({ 'X-Property-Id': propertyHeader, 'Idempotency-Key': idemHeader }),
      body: json(ImportRoomingListSchema),
    },
    responses: {
      201: { description: 'Imported rooming list', ...json(RoomingListImportResultSchema) },
      409: problem('AVAILABILITY_CONFLICT'),
    },
  });

  r.registerPath({
    method: 'get',
    path: '/front-desk/departures',
    summary: "Today's departures board",
    request: { headers: z.object({ 'X-Property-Id': propertyHeader }) },
    responses: { 200: { description: 'Departures', ...json(z.array(DepartureRowSchema)) } },
  });
  r.registerPath({
    method: 'get',
    path: '/front-desk/in-house',
    summary: 'In-house guests board',
    request: { headers: z.object({ 'X-Property-Id': propertyHeader }) },
    responses: { 200: { description: 'In-house', ...json(z.array(InHouseRowSchema)) } },
  });
  r.registerPath({
    method: 'get',
    path: '/front-desk/room-rack',
    summary: 'Room rack: rooms × dates grid with stays',
    request: { query: RoomRackQuerySchema, headers: z.object({ 'X-Property-Id': propertyHeader }) },
    responses: { 200: { description: 'Rack', ...json(z.array(RoomRackRowSchema)) } },
  });
  r.registerPath({
    method: 'get',
    path: '/front-desk/available-rooms',
    summary: 'Date-aware available room numbers for walk-ins and room assignment',
    request: {
      query: AvailableRoomsQuerySchema,
      headers: z.object({ 'X-Property-Id': propertyHeader }),
    },
    responses: { 200: { description: 'Available rooms', ...json(z.array(AvailableRoomSchema)) } },
  });

  // ── Folio operations, cashiering, deposits ──
  r.registerPath({
    method: 'post',
    path: '/folios',
    summary: 'Create an additional folio for a reservation (splits/routing)',
    request: {
      headers: z.object({ 'Idempotency-Key': idemHeader }),
      body: json(CreateFolioSchema),
    },
    responses: { 201: { description: 'Folio', ...json(FolioSchema) } },
  });
  r.registerPath({
    method: 'post',
    path: '/folios/{id}/transfers',
    summary: 'Transfer a posting to another folio (reversal + repost)',
    request: {
      params: z.object({ id: z.string().uuid() }),
      headers: z.object({ 'Idempotency-Key': idemHeader }),
      body: json(TransferPostingSchema),
    },
    responses: {
      200: { description: 'Source folio', ...json(FolioSchema) },
      409: problem('STATE_CONFLICT'),
    },
  });
  r.registerPath({
    method: 'post',
    path: '/cashier-sessions',
    summary: 'Open a cashier session',
    request: {
      headers: z.object({ 'X-Property-Id': propertyHeader, 'Idempotency-Key': idemHeader }),
      body: json(OpenCashierSessionSchema),
    },
    responses: { 201: { description: 'Session', ...json(CashierSessionSchema) } },
  });
  r.registerPath({
    method: 'post',
    path: '/cashier-sessions/{id}/close',
    summary: 'Close a cashier session (expected vs counted, variance)',
    request: {
      params: z.object({ id: z.string().uuid() }),
      headers: z.object({ 'Idempotency-Key': idemHeader }),
      body: json(CloseCashierSessionSchema),
    },
    responses: { 200: { description: 'Session', ...json(CashierSessionSchema) } },
  });
  r.registerPath({
    method: 'post',
    path: '/reservations/{id}/deposits',
    summary: 'Record a pre-arrival deposit (held on the deposit ledger until check-in)',
    request: {
      params: z.object({ id: z.string().uuid() }),
      headers: z.object({ 'Idempotency-Key': idemHeader }),
      body: json(RecordDepositSchema),
    },
    responses: { 201: { description: 'Deposit', ...json(DepositSchema) } },
  });

  // ── Housekeeping & maintenance ──
  r.registerPath({
    method: 'get',
    path: '/housekeeping/board',
    summary: 'Live room-status board',
    request: { headers: z.object({ 'X-Property-Id': propertyHeader }) },
    responses: { 200: { description: 'Board', ...json(z.array(HkBoardRoomSchema)) } },
  });
  r.registerPath({
    method: 'get',
    path: '/housekeeping/tasks',
    summary: 'List housekeeping tasks',
    request: {
      query: HkTaskListQuerySchema,
      headers: z.object({ 'X-Property-Id': propertyHeader }),
    },
    responses: { 200: { description: 'Tasks', ...json(HkTaskPageSchema) } },
  });
  r.registerPath({
    method: 'post',
    path: '/housekeeping/tasks',
    summary: 'Create a housekeeping task',
    request: {
      headers: z.object({ 'Idempotency-Key': idemHeader }),
      body: json(CreateHkTaskSchema),
    },
    responses: { 201: { description: 'Task', ...json(HkTaskSchema) } },
  });
  for (const action of ['start', 'complete', 'skip'] as const) {
    r.registerPath({
      method: 'post',
      path: `/housekeeping/tasks/{id}/${action}`,
      summary: `Housekeeping task action: ${action}`,
      request: {
        params: z.object({ id: z.string().uuid() }),
        headers: z.object({ 'Idempotency-Key': idemHeader }),
      },
      responses: {
        200: { description: 'Task', ...json(HkTaskSchema) },
        409: problem('STATE_CONFLICT'),
      },
    });
  }
  r.registerPath({
    method: 'get',
    path: '/rooms/out-of-service',
    summary: 'List active and upcoming out-of-order/out-of-service room blocks',
    request: {
      query: RoomBlockListQuerySchema,
      headers: z.object({ 'X-Property-Id': propertyHeader }),
    },
    responses: { 200: { description: 'Room blocks', ...json(RoomBlockPageSchema) } },
  });
  r.registerPath({
    method: 'post',
    path: '/rooms/{id}/status',
    summary: 'Update room housekeeping status (dirty → clean → inspected)',
    request: {
      params: z.object({ id: z.string().uuid() }),
      headers: z.object({ 'Idempotency-Key': idemHeader }),
      body: json(RoomStatusUpdateSchema),
    },
    responses: { 200: { description: 'Room', ...json(HkBoardRoomSchema) } },
  });
  r.registerPath({
    method: 'post',
    path: '/rooms/{id}/out-of-order',
    summary: 'Place a room out of order (decrements availability, CHECK-guarded)',
    request: {
      params: z.object({ id: z.string().uuid() }),
      headers: z.object({ 'Idempotency-Key': idemHeader }),
      body: json(OutOfOrderSchema),
    },
    responses: {
      201: { description: 'Created', ...json(z.object({ id: z.string().uuid() })) },
      409: problem('AVAILABILITY_CONFLICT'),
    },
  });
  r.registerPath({
    method: 'get',
    path: '/maintenance/tickets',
    summary: 'List maintenance tickets',
    request: {
      query: MaintenanceTicketListQuerySchema,
      headers: z.object({ 'X-Property-Id': propertyHeader }),
    },
    responses: { 200: { description: 'Tickets', ...json(MaintenanceTicketPageSchema) } },
  });
  r.registerPath({
    method: 'post',
    path: '/maintenance/tickets',
    summary: 'Report a maintenance ticket',
    request: {
      headers: z.object({ 'X-Property-Id': propertyHeader, 'Idempotency-Key': idemHeader }),
      body: json(CreateMaintenanceTicketSchema),
    },
    responses: { 201: { description: 'Ticket', ...json(MaintenanceTicketSchema) } },
  });

  // ── Rates management ──
  r.registerPath({
    method: 'get',
    path: '/rate-plans',
    summary: 'List rate plans',
    request: { headers: z.object({ 'X-Property-Id': propertyHeader }) },
    responses: { 200: { description: 'Rate plans', ...json(z.array(RatePlanSchema)) } },
  });
  r.registerPath({
    method: 'get',
    path: '/rate-plans/{id}/prices',
    summary: 'Read the price grid for a rate plan',
    request: { params: z.object({ id: z.string().uuid() }), query: RatePricesQuerySchema },
    responses: { 200: { description: 'Prices', ...json(z.array(RatePriceRowSchema)) } },
  });
  r.registerPath({
    method: 'put',
    path: '/rate-plans/{id}/prices',
    summary: 'Bulk price-grid upsert',
    request: {
      params: z.object({ id: z.string().uuid() }),
      headers: z.object({ 'X-Property-Id': propertyHeader, 'Idempotency-Key': idemHeader }),
      body: json(PriceGridUpdateSchema),
    },
    responses: { 200: { description: 'Updated prices', ...json(z.array(RatePriceRowSchema)) } },
  });

  // ── Settings catalogs ──
  r.registerPath({
    method: 'get',
    path: '/settings/catalog',
    summary: 'Property settings catalog',
    request: { headers: z.object({ 'X-Property-Id': propertyHeader }) },
    responses: { 200: { description: 'Settings catalog', ...json(SettingsCatalogSchema) } },
  });

  for (const [path, schema] of [
    ['/settings/floors', FloorSchema],
    ['/settings/room-types', RoomTypeSettingSchema],
    ['/settings/amenities', RoomAmenitySchema],
    ['/settings/rooms', RoomSettingSchema],
    ['/settings/charge-types', ChargeTypeSchema],
    ['/settings/payment-methods', PaymentMethodSchema],
  ] as const) {
    const label = path.split('/').slice(-1)[0];
    r.registerPath({
      method: 'get',
      path,
      summary: `List ${label}`,
      request: { headers: z.object({ 'X-Property-Id': propertyHeader }) },
      responses: { 200: { description: 'Rows', ...json(z.array(schema)) } },
    });
  }

  for (const [path, body, response] of [
    ['/settings/floors', CreateFloorSchema, FloorSchema],
    ['/settings/room-types', CreateRoomTypeSettingSchema, RoomTypeSettingSchema],
    ['/settings/amenities', CreateRoomAmenitySchema, RoomAmenitySchema],
    ['/settings/rooms', CreateRoomSchema, RoomSettingSchema],
    ['/settings/charge-types', CreateChargeTypeSchema, ChargeTypeSchema],
    ['/settings/payment-methods', CreatePaymentMethodSchema, PaymentMethodSchema],
  ] as const) {
    const label = path.split('/').slice(-1)[0];
    r.registerPath({
      method: 'post',
      path,
      summary: `Create ${label}`,
      request: {
        headers: z.object({ 'X-Property-Id': propertyHeader, 'Idempotency-Key': idemHeader }),
        body: json(body),
      },
      responses: {
        201: { description: 'Created', ...json(response) },
        403: problem('PERMISSION_DENIED'),
        422: problem('VALIDATION_FAILED'),
      },
    });
  }

  for (const [path, body, response] of [
    ['/settings/floors/{id}', UpdateFloorSchema, FloorSchema],
    ['/settings/room-types/{id}', UpdateRoomTypeSettingSchema, RoomTypeSettingSchema],
    ['/settings/amenities/{id}', UpdateRoomAmenitySchema, RoomAmenitySchema],
    ['/settings/rooms/{id}', UpdateRoomSchema, RoomSettingSchema],
    ['/settings/charge-types/{id}', UpdateChargeTypeSchema, ChargeTypeSchema],
    ['/settings/payment-methods/{id}', UpdatePaymentMethodSchema, PaymentMethodSchema],
  ] as const) {
    const label = path.split('/').slice(-2)[0];
    r.registerPath({
      method: 'patch',
      path,
      summary: `Update ${label}`,
      request: {
        params: z.object({ id: z.string().uuid() }),
        headers: z.object({ 'X-Property-Id': propertyHeader }),
        body: json(body),
      },
      responses: {
        200: { description: 'Updated', ...json(response) },
        403: problem('PERMISSION_DENIED'),
        404: problem('NOT_FOUND'),
        422: problem('VALIDATION_FAILED'),
      },
    });
  }

  for (const path of [
    '/settings/floors/{id}',
    '/settings/room-types/{id}',
    '/settings/amenities/{id}',
    '/settings/rooms/{id}',
    '/settings/charge-types/{id}',
    '/settings/payment-methods/{id}',
  ] as const) {
    const label = path.split('/').slice(-2)[0];
    r.registerPath({
      method: 'delete',
      path,
      summary: `Remove ${label}`,
      request: {
        params: z.object({ id: z.string().uuid() }),
        headers: z.object({ 'X-Property-Id': propertyHeader }),
      },
      responses: {
        200: { description: 'Removed', ...json(SettingsDeleteResultSchema) },
        403: problem('PERMISSION_DENIED'),
        404: problem('NOT_FOUND'),
        409: problem('STATE_CONFLICT'),
      },
    });
  }

  // ── Reports & guests ──
  r.registerPath({
    method: 'get',
    path: '/reports/manager-flash',
    summary: 'Manager flash: occupancy, ADR, RevPAR, revenue mix for a business date',
    request: {
      query: ManagerFlashQuerySchema,
      headers: z.object({ 'X-Property-Id': propertyHeader }),
    },
    responses: { 200: { description: 'Flash', ...json(ManagerFlashSchema) } },
  });
  r.registerPath({
    method: 'get',
    path: '/guests',
    summary: 'Search guest profiles',
    request: { query: GuestSearchQuerySchema },
    responses: { 200: { description: 'Guests', ...json(GuestSearchPageSchema) } },
  });
  r.registerPath({
    method: 'get',
    path: '/guests/{id}',
    summary: 'Guest profile with stay history',
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: { 200: { description: 'Guest', ...json(GuestProfileSchema) } },
  });
  r.registerPath({
    method: 'patch',
    path: '/guests/{id}',
    summary: 'Update a guest profile',
    request: {
      params: z.object({ id: z.string().uuid() }),
      headers: z.object({ 'Idempotency-Key': idemHeader }),
      body: json(UpdateGuestSchema),
    },
    responses: { 200: { description: 'Guest', ...json(GuestProfileSchema) } },
  });

  // ── POS v1 ──
  r.registerPath({
    method: 'get',
    path: '/pos/outlets',
    summary: 'List POS outlets',
    request: { headers: z.object({ 'X-Property-Id': propertyHeader }) },
    responses: { 200: { description: 'Outlets', ...json(z.array(PosOutletSchema)) } },
  });
  r.registerPath({
    method: 'get',
    path: '/pos/outlets/{id}/tables',
    summary: 'Floor plan tables for an outlet',
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: { 200: { description: 'Tables', ...json(z.array(PosTableSchema)) } },
  });
  r.registerPath({
    method: 'get',
    path: '/pos/room-charge/search',
    summary: 'Search in-house guests eligible for POS room charge',
    request: {
      query: PosRoomChargeSearchQuerySchema,
      headers: z.object({ 'X-Property-Id': propertyHeader }),
    },
    responses: {
      200: {
        description: 'Room-charge candidates',
        ...json(z.array(PosRoomChargeCandidateSchema)),
      },
    },
  });
  r.registerPath({
    method: 'post',
    path: '/pos/checks',
    summary: 'Open a POS check',
    request: {
      headers: z.object({ 'X-Property-Id': propertyHeader, 'Idempotency-Key': idemHeader }),
      body: json(OpenPosCheckSchema),
    },
    responses: { 201: { description: 'Check', ...json(PosCheckSchema) } },
  });
  r.registerPath({
    method: 'get',
    path: '/pos/checks',
    summary: 'List POS checks (terminal board state)',
    request: {
      query: PosCheckListQuerySchema,
      headers: z.object({ 'X-Property-Id': propertyHeader }),
    },
    responses: { 200: { description: 'Checks', ...json(PosCheckPageSchema) } },
  });
  r.registerPath({
    method: 'get',
    path: '/pos/checks/{id}',
    summary: 'Get a POS check',
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: { 200: { description: 'Check', ...json(PosCheckSchema) } },
  });
  r.registerPath({
    method: 'post',
    path: '/pos/checks/{id}/items',
    summary: 'Add an item to a POS check',
    request: {
      params: z.object({ id: z.string().uuid() }),
      headers: z.object({ 'Idempotency-Key': idemHeader }),
      body: json(AddPosItemSchema),
    },
    responses: { 200: { description: 'Check', ...json(PosCheckSchema) } },
  });
  r.registerPath({
    method: 'post',
    path: '/pos/checks/{id}/fire',
    summary: 'Fire a POS check to KDS',
    request: {
      params: z.object({ id: z.string().uuid() }),
      headers: z.object({ 'Idempotency-Key': idemHeader }),
    },
    responses: { 200: { description: 'Check', ...json(PosCheckSchema) } },
  });
  r.registerPath({
    method: 'post',
    path: '/pos/checks/{id}/close',
    summary: 'Close a POS check with payments or room charge to folio',
    request: {
      params: z.object({ id: z.string().uuid() }),
      headers: z.object({ 'Idempotency-Key': idemHeader }),
      body: json(ClosePosCheckSchema),
    },
    responses: { 200: { description: 'Check', ...json(PosCheckSchema) } },
  });
  r.registerPath({
    method: 'get',
    path: '/pos/kds',
    summary: 'Kitchen display queue',
    request: { headers: z.object({ 'X-Property-Id': propertyHeader }) },
    responses: { 200: { description: 'KDS items', ...json(z.array(PosKdsItemSchema)) } },
  });
  r.registerPath({
    method: 'post',
    path: '/pos/kds/items/{id}/ready',
    summary: 'Mark a KDS item ready',
    request: {
      params: z.object({ id: z.string().uuid() }),
      headers: z.object({ 'Idempotency-Key': idemHeader }),
    },
    responses: { 200: { description: 'Check', ...json(PosCheckSchema) } },
  });
  r.registerPath({
    method: 'post',
    path: '/pos/shifts',
    summary: 'Open a POS shift',
    request: {
      headers: z.object({ 'X-Property-Id': propertyHeader, 'Idempotency-Key': idemHeader }),
      body: json(OpenPosShiftSchema),
    },
    responses: { 201: { description: 'Shift', ...json(PosShiftSchema) } },
  });
  r.registerPath({
    method: 'post',
    path: '/pos/shifts/{id}/close',
    summary: 'Close a POS shift',
    request: {
      params: z.object({ id: z.string().uuid() }),
      headers: z.object({ 'Idempotency-Key': idemHeader }),
      body: json(ClosePosShiftSchema),
    },
    responses: { 200: { description: 'Shift', ...json(PosShiftSchema) } },
  });
  r.registerPath({
    method: 'post',
    path: '/pos/offline-ops',
    summary: 'Queue an offline POS operation from a terminal',
    request: {
      headers: z.object({ 'X-Property-Id': propertyHeader, 'Idempotency-Key': idemHeader }),
      body: json(QueueOfflineOpSchema),
    },
    responses: { 202: { description: 'Offline op', ...json(OfflineOpSchema) } },
  });

  // ── Booking engine, messaging, compliance ──
  r.registerPath({
    method: 'post',
    path: '/public/booking-sessions',
    summary: 'Start a booking-engine shopping session with quoted total',
    request: {
      headers: z.object({ 'X-Property-Id': propertyHeader, 'Idempotency-Key': idemHeader }),
      body: json(StartBookingSessionSchema),
    },
    responses: { 201: { description: 'Booking session', ...json(BookingSessionSchema) } },
  });
  r.registerPath({
    method: 'get',
    path: '/public/booking-sessions/{id}',
    summary: 'Get a booking-engine shopping session',
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: { 200: { description: 'Booking session', ...json(BookingSessionSchema) } },
  });
  r.registerPath({
    method: 'post',
    path: '/public/booking-sessions/{id}/confirm',
    summary: 'Confirm a booking session into a PMS reservation',
    request: {
      params: z.object({ id: z.string().uuid() }),
      headers: z.object({ 'Idempotency-Key': idemHeader }),
      body: json(ConfirmBookingSessionSchema),
    },
    responses: { 200: { description: 'Booking session', ...json(BookingSessionSchema) } },
  });
  r.registerPath({
    method: 'post',
    path: '/public/booking-sessions/{id}/cancel',
    summary: 'Cancel an unconfirmed booking session',
    request: {
      params: z.object({ id: z.string().uuid() }),
      headers: z.object({ 'Idempotency-Key': idemHeader }),
    },
    responses: { 200: { description: 'Booking session', ...json(BookingSessionSchema) } },
  });
  r.registerPath({
    method: 'post',
    path: '/messages/send',
    summary: 'Send a transactional guest message and attach it to the inbox',
    request: {
      headers: z.object({ 'X-Property-Id': propertyHeader, 'Idempotency-Key': idemHeader }),
      body: json(SendMessageSchema),
    },
    responses: { 200: { description: 'Message', ...json(MessageSchema) } },
  });
  r.registerPath({
    method: 'get',
    path: '/conversations',
    summary: 'Guest conversation inbox',
    request: {
      query: ConversationListQuerySchema,
      headers: z.object({ 'X-Property-Id': propertyHeader }),
    },
    responses: { 200: { description: 'Conversations', ...json(ConversationPageSchema) } },
  });
  r.registerPath({
    method: 'post',
    path: '/gdpr/requests',
    summary: 'Create a GDPR data-subject request',
    request: {
      headers: z.object({ 'X-Property-Id': propertyHeader, 'Idempotency-Key': idemHeader }),
      body: json(CreateGdprRequestSchema),
    },
    responses: { 201: { description: 'Request', ...json(GdprRequestSchema) } },
  });
  r.registerPath({
    method: 'patch',
    path: '/gdpr/requests/{id}',
    summary: 'Update a GDPR request status',
    request: {
      params: z.object({ id: z.string().uuid() }),
      headers: z.object({ 'Idempotency-Key': idemHeader }),
      body: json(UpdateGdprRequestSchema),
    },
    responses: { 200: { description: 'Request', ...json(GdprRequestSchema) } },
  });

  r.registerPath({
    method: 'get',
    path: '/webhooks/endpoints',
    summary: 'List tenant webhook endpoints',
    responses: {
      200: { description: 'Webhook endpoints', ...json(z.array(WebhookEndpointSchema)) },
    },
  });
  r.registerPath({
    method: 'post',
    path: '/webhooks/endpoints',
    summary: 'Create a signed webhook endpoint subscription',
    request: {
      headers: z.object({ 'Idempotency-Key': idemHeader }),
      body: json(CreateWebhookEndpointSchema),
    },
    responses: {
      201: { description: 'Webhook endpoint and one-time secret', ...json(WebhookSecretSchema) },
    },
  });
  r.registerPath({
    method: 'post',
    path: '/webhooks/endpoints/{id}/disable',
    summary: 'Disable a webhook endpoint',
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: { 200: { description: 'Webhook endpoint', ...json(WebhookEndpointSchema) } },
  });
  r.registerPath({
    method: 'post',
    path: '/webhooks/deliveries/{id}/redeliver',
    summary: 'Queue manual webhook redelivery',
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: { 202: { description: 'Queued delivery', ...json(WebhookDeliverySchema) } },
  });

  r.registerPath({
    method: 'post',
    path: '/night-audit/run',
    summary: 'Run the night audit (roll business date, post room+tax, generate daily journal)',
    request: {
      headers: z.object({ 'X-Property-Id': propertyHeader, 'Idempotency-Key': idemHeader }),
      body: json(NightAuditRunSchema),
    },
    responses: { 200: { description: 'Result', ...json(NightAuditResultSchema) } },
  });

  // ── Platform (superadmin) administration ──
  r.registerPath({
    method: 'get',
    path: '/platform/hotels',
    summary: 'List hotels across the platform (superadmin)',
    responses: {
      200: { description: 'Hotels', ...json(z.array(HotelSchema)) },
      403: problem('PERMISSION_DENIED'),
    },
  });
  r.registerPath({
    method: 'post',
    path: '/platform/hotels',
    summary: 'Provision a hotel: tenant + default property + role/financial baseline',
    request: { body: json(CreateHotelSchema) },
    responses: {
      201: { description: 'Created', ...json(HotelDetailSchema) },
      409: problem('SLUG_TAKEN'),
      422: problem('VALIDATION_FAILED'),
    },
  });
  r.registerPath({
    method: 'get',
    path: '/platform/hotels/{id}',
    summary: 'Hotel detail with properties and users',
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
      200: { description: 'Hotel', ...json(HotelDetailSchema) },
      404: problem('Not found'),
    },
  });
  r.registerPath({
    method: 'patch',
    path: '/platform/hotels/{id}',
    summary: 'Edit hotel name/slug',
    request: { params: z.object({ id: z.string().uuid() }), body: json(UpdateHotelSchema) },
    responses: {
      200: { description: 'Hotel', ...json(HotelDetailSchema) },
      409: problem('SLUG_TAKEN'),
    },
  });
  r.registerPath({
    method: 'post',
    path: '/platform/hotels/{id}/suspend',
    summary: 'Suspend a hotel (locks its users out; soft delete)',
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: { 200: { description: 'Hotel', ...json(HotelDetailSchema) } },
  });
  r.registerPath({
    method: 'post',
    path: '/platform/hotels/{id}/reactivate',
    summary: 'Reactivate a suspended hotel',
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: { 200: { description: 'Hotel', ...json(HotelDetailSchema) } },
  });
  r.registerPath({
    method: 'get',
    path: '/platform/hotels/{id}/users',
    summary: 'List a hotel’s users with their roles',
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: { 200: { description: 'Users', ...json(z.array(HotelUserSchema)) } },
  });
  r.registerPath({
    method: 'post',
    path: '/platform/hotels/{id}/users',
    summary: 'Create a hotel user with a role template (Hotel Admin, Accounts, Front Desk, …)',
    request: { params: z.object({ id: z.string().uuid() }), body: json(CreateHotelUserSchema) },
    responses: {
      201: { description: 'User', ...json(HotelUserSchema) },
      409: problem('ALREADY_MEMBER'),
    },
  });
  r.registerPath({
    method: 'patch',
    path: '/platform/users/{userId}',
    summary: 'Edit a user (name, membership status)',
    request: { params: z.object({ userId: z.string() }), body: json(UpdatePlatformUserSchema) },
    responses: { 200: { description: 'User id', ...json(z.object({ userId: z.string() })) } },
  });
  r.registerPath({
    method: 'post',
    path: '/platform/users/{userId}/password',
    summary: 'Administrative password reset (revokes the user’s sessions)',
    request: { params: z.object({ userId: z.string() }), body: json(ResetPasswordSchema) },
    responses: { 200: { description: 'User id', ...json(z.object({ userId: z.string() })) } },
  });
  r.registerPath({
    method: 'get',
    path: '/platform/roles',
    summary: 'List platform roles and their permission keys',
    responses: { 200: { description: 'Platform roles', ...json(z.array(PlatformRoleSchema)) } },
  });
  r.registerPath({
    method: 'get',
    path: '/platform/superadmins',
    summary: 'List platform administrators',
    responses: { 200: { description: 'Superadmins', ...json(z.array(SuperadminSchema)) } },
  });
  r.registerPath({
    method: 'post',
    path: '/platform/superadmins',
    summary: 'Create a platform administrator',
    request: { body: json(CreateSuperadminSchema) },
    responses: { 201: { description: 'Superadmin', ...json(SuperadminSchema) } },
  });
  r.registerPath({
    method: 'patch',
    path: '/platform/superadmins/{userId}',
    summary: 'Replace a platform administrator’s role grants',
    request: { params: z.object({ userId: z.string() }), body: json(UpdateSuperadminSchema) },
    responses: {
      200: { description: 'Superadmin', ...json(SuperadminSchema) },
      409: problem('LAST_SUPERADMIN'),
    },
  });
  r.registerPath({
    method: 'delete',
    path: '/platform/superadmins/{userId}',
    summary: 'Revoke all platform roles from a user',
    request: { params: z.object({ userId: z.string() }) },
    responses: {
      200: { description: 'Removed', ...json(PlatformDeleteResultSchema) },
      409: problem('LAST_SUPERADMIN'),
    },
  });
  r.registerPath({
    method: 'post',
    path: '/platform/context',
    summary: 'Switch the session’s active hotel (the Hotel Selector); null returns to platform',
    request: { body: json(SwitchContextSchema) },
    responses: { 200: { description: 'Active tenant', ...json(SwitchContextResultSchema) } },
  });

  const generator = new OpenApiGeneratorV3(r.definitions);
  const doc = generator.generateDocument({
    openapi: '3.0.3',
    info: {
      title: 'Vela API',
      version: '1.0.0',
      description: 'The Vela hospitality OS public API.',
    },
    servers: [{ url: 'https://api.vela.dev/v1' }, { url: 'http://localhost:4000/v1' }],
  });
  return doc as unknown as Record<string, unknown>;
}
