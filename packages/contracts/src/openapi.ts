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
  HkTaskListQuerySchema,
  HkTaskSchema,
  MaintenanceTicketSchema,
  OutOfOrderSchema,
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
  GuestSchema,
  GuestSearchQuerySchema,
  UpdateGuestSchema,
} from './guests';
import {
  AddPosItemSchema,
  ClosePosCheckSchema,
  ClosePosShiftSchema,
  OfflineOpSchema,
  OpenPosCheckSchema,
  OpenPosShiftSchema,
  PosCheckItemSchema,
  PosCheckSchema,
  PosOutletSchema,
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
    TransferPosting: TransferPostingSchema,
    CreateFolio: CreateFolioSchema,
    OpenCashierSession: OpenCashierSessionSchema,
    CloseCashierSession: CloseCashierSessionSchema,
    CashierSession: CashierSessionSchema,
    RecordDeposit: RecordDepositSchema,
    Deposit: DepositSchema,
    HkTask: HkTaskSchema,
    CreateHkTask: CreateHkTaskSchema,
    HkBoardRoom: HkBoardRoomSchema,
    RoomStatusUpdate: RoomStatusUpdateSchema,
    OutOfOrder: OutOfOrderSchema,
    RoomBlock: RoomBlockSchema,
    MaintenanceTicket: MaintenanceTicketSchema,
    CreateMaintenanceTicket: CreateMaintenanceTicketSchema,
    RatePlan: RatePlanSchema,
    RatePriceRow: RatePriceRowSchema,
    PriceGridUpdate: PriceGridUpdateSchema,
    ManagerFlash: ManagerFlashSchema,
    Guest: GuestSchema,
    GuestProfile: GuestProfileSchema,
    UpdateGuest: UpdateGuestSchema,
    PosOutlet: PosOutletSchema,
    PosTable: PosTableSchema,
    PosCheck: PosCheckSchema,
    PosCheckItem: PosCheckItemSchema,
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
    CreateGdprRequest: CreateGdprRequestSchema,
    UpdateGdprRequest: UpdateGdprRequestSchema,
    GdprRequest: GdprRequestSchema,
    WebhookEndpoint: WebhookEndpointSchema,
    CreateWebhookEndpoint: CreateWebhookEndpointSchema,
    WebhookSecret: WebhookSecretSchema,
    WebhookDelivery: WebhookDeliverySchema,
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
    responses: { 200: { description: 'Reservations', ...json(z.array(ReservationListRowSchema)) } },
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
    request: { headers: z.object({ 'X-Property-Id': propertyHeader }) },
    responses: { 200: { description: 'Group blocks', ...json(z.array(GroupBlockListRowSchema)) } },
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
    responses: { 200: { description: 'Tasks', ...json(z.array(HkTaskSchema)) } },
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
    request: { headers: z.object({ 'X-Property-Id': propertyHeader }) },
    responses: { 200: { description: 'Room blocks', ...json(z.array(RoomBlockSchema)) } },
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
    request: { headers: z.object({ 'X-Property-Id': propertyHeader }) },
    responses: { 200: { description: 'Tickets', ...json(z.array(MaintenanceTicketSchema)) } },
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
    responses: { 200: { description: 'Guests', ...json(z.array(GuestSchema)) } },
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
    responses: { 200: { description: 'KDS items', ...json(z.array(PosCheckItemSchema)) } },
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
    request: { headers: z.object({ 'X-Property-Id': propertyHeader }) },
    responses: { 200: { description: 'Conversations', ...json(z.array(ConversationSchema)) } },
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
