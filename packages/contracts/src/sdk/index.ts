import type { Problem } from '../common';
import type { Me } from '../identity';
import type { RoomTypeAvailability } from '../availability';
import type {
  ArrivalRow,
  AvailableRoom,
  CheckInInput,
  CreateGroupBlockInput,
  CreateReservationInput,
  DepartureRow,
  GroupBlock,
  GroupBlockListPage,
  InHouseRow,
  ImportRoomingListInput,
  IssueKeyCardInput,
  ModifyReservationInput,
  PickupGroupBlockInput,
  QueueRoomInput,
  Reservation,
  ReservationListPage,
  RoomMoveInput,
  RoomRackRow,
  RoomingListImportResult,
  SignRegistrationCardInput,
  VerifyIdDocumentInput,
  WalkInInput,
} from '../reservations';
import type {
  AuthorizePaymentInput,
  CashierSession,
  CapturePaymentIntentInput,
  CloseCashierSessionInput,
  CreateFolioInput,
  Deposit,
  Folio,
  OpenCashierSessionInput,
  PaymentIntent,
  PostChargeInput,
  RecordDepositInput,
  RecordPaymentInput,
  RefundInput,
  TransferPostingInput,
} from '../folio';
import type { NightAuditResult } from '../night-audit';
import type {
  AssignTicketSchema,
  CompleteTicketSchema,
  CreateHkTaskInput,
  CreateMaintenanceTicketInput,
  HkBoardRoom,
  HkTask,
  HkTaskPage,
  MaintenanceTicket,
  MaintenanceTicketPage,
  OutOfOrderInput,
  RoomBlockPage,
  RoomStatusUpdateInput,
} from '../housekeeping';
import type { PriceGridUpdateInput, RatePlan, RatePriceRow } from '../rates';
import type { ManagerFlash } from '../reports';
import type { GuestProfile, GuestSearchPage, UpdateGuestInput } from '../guests';
import type {
  ChargeType,
  CreateChargeTypeInput,
  CreateFloorInput,
  CreatePaymentMethodInput,
  CreateRoomAmenityInput,
  CreateRoomInput,
  CreateRoomTypeSettingInput,
  Floor,
  PaymentMethod,
  RoomAmenity,
  RoomSetting,
  RoomTypeSetting,
  SettingsDeleteResult,
  SettingsCatalog,
  UpdateChargeTypeInput,
  UpdateFloorInput,
  UpdatePaymentMethodInput,
  UpdateRoomAmenityInput,
  UpdateRoomInput,
  UpdateRoomTypeSettingInput,
} from '../settings';
import type {
  AddPosItemInput,
  BookingSession,
  ClosePosCheckInput,
  ClosePosShiftInput,
  ConversationPage,
  CreateGdprRequestInput,
  GdprRequest,
  Message,
  OfflineOp,
  OpenPosCheckInput,
  OpenPosShiftInput,
  PosCheck,
  PosCheckPage,
  PosKdsItem,
  PosOutlet,
  PosRoomChargeCandidate,
  PosShift,
  PosTable,
  QueueOfflineOpInput,
  SendMessageInput,
  StartBookingSessionInput,
  UpdateGdprRequestInput,
} from '../index';
import type {
  CreateWebhookEndpointInput,
  WebhookDelivery,
  WebhookEndpoint,
  WebhookSecret,
} from '../webhooks';
import type {
  CreateHotelInput,
  CreateHotelUserInput,
  CreateSuperadminInput,
  Hotel,
  HotelDetail,
  HotelUser,
  PlatformDeleteResult,
  PlatformRole,
  ResetPasswordInput,
  Superadmin,
  SwitchContextResult,
  UpdateHotelInput,
  UpdatePlatformUserInput,
  UpdateSuperadminInput,
} from '../platform';
import type { z } from '../zod';

/** Error carrying the RFC 9457 problem document — every failure has a stable `code` + `correlationId`. */
export class VelaApiError extends Error {
  constructor(
    readonly problem: Problem,
    readonly httpStatus: number,
  ) {
    super(`${problem.code}: ${problem.title}`);
    this.name = 'VelaApiError';
  }
}

export interface SdkOptions {
  baseUrl: string;
  /** Default property scope; per-call override supported. */
  propertyId?: string;
  fetch?: typeof globalThis.fetch;
  /** Bearer/API-key token for non-cookie consumers (server-side, integrations). */
  token?: string;
}

interface CallOptions {
  propertyId?: string;
  idempotencyKey?: string;
  query?: Record<string, string | number | undefined>;
  signal?: AbortSignal;
}

export type VelaClient = ReturnType<typeof createClient>;

export function createClient(opts: SdkOptions) {
  const doFetch = opts.fetch ?? globalThis.fetch;
  const base = `${opts.baseUrl.replace(/\/$/, '')}/v1`;

  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
    call: CallOptions = {},
  ): Promise<T> {
    const url = new URL(base + path);
    if (call.query) {
      for (const [k, v] of Object.entries(call.query)) {
        if (v !== undefined) url.searchParams.set(k, String(v));
      }
    }
    const headers: Record<string, string> = { Accept: 'application/json' };
    const propertyId = call.propertyId ?? opts.propertyId;
    if (propertyId) headers['X-Property-Id'] = propertyId;
    if (call.idempotencyKey) headers['Idempotency-Key'] = call.idempotencyKey;
    if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    const res = await doFetch(url.toString(), {
      method,
      headers,
      credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: call.signal,
    });

    if (res.status === 204) return undefined as T;
    const text = await res.text();
    const json = text ? JSON.parse(text) : undefined;
    if (!res.ok) {
      throw new VelaApiError(json as Problem, res.status);
    }
    return json as T;
  }

  return {
    me: () => request<Me>('GET', '/me'),
    availability: (
      query: {
        from: string;
        to: string;
        roomTypeId?: string;
        ratePlanId?: string;
        adults?: number;
        children?: number;
        promoCode?: string;
      },
      call?: CallOptions,
    ) => request<RoomTypeAvailability[]>('GET', '/availability', undefined, { ...call, query }),
    createReservation: (input: CreateReservationInput, call?: CallOptions) =>
      request<Reservation>('POST', '/reservations', input, call),
    getReservation: (id: string) => request<Reservation>('GET', `/reservations/${id}`),
    checkIn: (id: string, body: Partial<CheckInInput> = {}, call?: CallOptions) =>
      request<Reservation>('POST', `/reservations/${id}/check-in`, body, call),
    signRegistrationCard: (id: string, input: SignRegistrationCardInput, call?: CallOptions) =>
      request<Reservation>('POST', `/reservations/${id}/registration-card`, input, call),
    issueKeyCard: (id: string, input: IssueKeyCardInput, call?: CallOptions) =>
      request<Reservation>('POST', `/reservations/${id}/key-cards`, input, call),
    verifyIdDocument: (id: string, input: VerifyIdDocumentInput, call?: CallOptions) =>
      request<Reservation>('POST', `/reservations/${id}/id-documents`, input, call),
    queueRoom: (id: string, input: QueueRoomInput = {}, call?: CallOptions) =>
      request<Reservation>('POST', `/reservations/${id}/queue-room`, input, call),
    checkOut: (id: string, body: { sendInvoice?: boolean } = {}, call?: CallOptions) =>
      request<Reservation>('POST', `/reservations/${id}/check-out`, body, call),
    cancel: (id: string, body: { reason?: string; waiveFee?: boolean } = {}, call?: CallOptions) =>
      request<Reservation>('POST', `/reservations/${id}/cancel`, body, call),
    arrivals: (call?: CallOptions) =>
      request<ArrivalRow[]>('GET', '/front-desk/arrivals', undefined, call),
    getFolio: (id: string) => request<Folio>('GET', `/folios/${id}`),
    postCharge: (folioId: string, input: PostChargeInput, call?: CallOptions) =>
      request<Folio>('POST', `/folios/${folioId}/postings`, input, call),
    recordPayment: (folioId: string, input: RecordPaymentInput, call?: CallOptions) =>
      request<Folio>('POST', `/folios/${folioId}/payments`, input, call),
    authorizePayment: (folioId: string, input: AuthorizePaymentInput, call?: CallOptions) =>
      request<PaymentIntent>('POST', `/folios/${folioId}/payment-intents`, input, call),
    capturePaymentIntent: (
      paymentIntentId: string,
      input: CapturePaymentIntentInput = {},
      call?: CallOptions,
    ) => request<Folio>('POST', `/payments/intents/${paymentIntentId}/capture`, input, call),
    refund: (paymentId: string, input: RefundInput, call?: CallOptions) =>
      request<Folio>('POST', `/payments/${paymentId}/refunds`, input, call),
    runNightAudit: (body: { businessDate?: string } = {}, call?: CallOptions) =>
      request<NightAuditResult>('POST', '/night-audit/run', body, call),

    // ── Reservations lifecycle (Phase 1) ──
    listReservations: (
      query: {
        status?: string;
        from?: string;
        to?: string;
        q?: string;
        cursor?: string;
        limit?: number;
      } = {},
      call?: CallOptions,
    ) =>
      request<ReservationListPage>('GET', '/reservations', undefined, { ...call, query }).then(
        (page) => page.data,
      ),
    listReservationsPage: (
      query: {
        status?: string;
        from?: string;
        to?: string;
        q?: string;
        cursor?: string;
        limit?: number;
      } = {},
      call?: CallOptions,
    ) => request<ReservationListPage>('GET', '/reservations', undefined, { ...call, query }),
    modifyReservation: (id: string, input: ModifyReservationInput, call?: CallOptions) =>
      request<Reservation>('POST', `/reservations/${id}/modify`, input, call),
    markNoShow: (id: string, body: { reason?: string } = {}, call?: CallOptions) =>
      request<Reservation>('POST', `/reservations/${id}/no-show`, body, call),
    reinstate: (id: string, body: { reason?: string } = {}, call?: CallOptions) =>
      request<Reservation>('POST', `/reservations/${id}/reinstate`, body, call),
    roomMove: (id: string, input: RoomMoveInput, call?: CallOptions) =>
      request<Reservation>('POST', `/reservations/${id}/room-moves`, input, call),
    walkIn: (input: WalkInInput, call?: CallOptions) =>
      request<Reservation>('POST', '/walk-ins', input, call),
    groupBlocks: (query: { cursor?: string; limit?: number } = {}, call?: CallOptions) =>
      request<GroupBlockListPage>('GET', '/group-blocks', undefined, { ...call, query }).then(
        (page) => page.data,
      ),
    groupBlocksPage: (query: { cursor?: string; limit?: number } = {}, call?: CallOptions) =>
      request<GroupBlockListPage>('GET', '/group-blocks', undefined, { ...call, query }),
    getGroupBlock: (id: string, call?: CallOptions) =>
      request<GroupBlock>('GET', `/group-blocks/${id}`, undefined, call),
    createGroupBlock: (input: CreateGroupBlockInput, call?: CallOptions) =>
      request<GroupBlock>('POST', '/group-blocks', input, call),
    pickupGroupBlock: (id: string, input: PickupGroupBlockInput, call?: CallOptions) =>
      request<Reservation>('POST', `/group-blocks/${id}/pickup`, input, call),
    importRoomingList: (id: string, input: ImportRoomingListInput, call?: CallOptions) =>
      request<RoomingListImportResult>('POST', `/group-blocks/${id}/rooming-list`, input, call),
    departures: (call?: CallOptions) =>
      request<DepartureRow[]>('GET', '/front-desk/departures', undefined, call),
    inHouse: (call?: CallOptions) =>
      request<InHouseRow[]>('GET', '/front-desk/in-house', undefined, call),
    roomRack: (query: { from: string; to: string }, call?: CallOptions) =>
      request<RoomRackRow[]>('GET', '/front-desk/room-rack', undefined, { ...call, query }),
    availableRooms: (
      query: { from: string; to: string; roomTypeId?: string },
      call?: CallOptions,
    ) =>
      request<AvailableRoom[]>('GET', '/front-desk/available-rooms', undefined, {
        ...call,
        query,
      }),

    // ── Folio operations, cashiering, deposits ──
    createFolio: (input: CreateFolioInput, call?: CallOptions) =>
      request<Folio>('POST', '/folios', input, call),
    transferPosting: (folioId: string, input: TransferPostingInput, call?: CallOptions) =>
      request<Folio>('POST', `/folios/${folioId}/transfers`, input, call),
    openCashierSession: (input: OpenCashierSessionInput, call?: CallOptions) =>
      request<CashierSession>('POST', '/cashier-sessions', input, call),
    currentCashierSession: (call?: CallOptions) =>
      request<CashierSession | null>('GET', '/cashier-sessions/current', undefined, call),
    closeCashierSession: (id: string, input: CloseCashierSessionInput, call?: CallOptions) =>
      request<CashierSession>('POST', `/cashier-sessions/${id}/close`, input, call),
    recordDeposit: (reservationId: string, input: RecordDepositInput, call?: CallOptions) =>
      request<Deposit>('POST', `/reservations/${reservationId}/deposits`, input, call),
    listDeposits: (reservationId: string) =>
      request<Deposit[]>('GET', `/reservations/${reservationId}/deposits`),

    // ── Housekeeping & maintenance ──
    hkBoard: (call?: CallOptions) =>
      request<HkBoardRoom[]>('GET', '/housekeeping/board', undefined, call),
    hkTasks: (
      query: { status?: string; dueDate?: string; cursor?: string; limit?: number } = {},
      call?: CallOptions,
    ) =>
      request<HkTaskPage>('GET', '/housekeeping/tasks', undefined, { ...call, query }).then(
        (page) => page.data,
      ),
    hkTasksPage: (
      query: { status?: string; dueDate?: string; cursor?: string; limit?: number } = {},
      call?: CallOptions,
    ) => request<HkTaskPage>('GET', '/housekeeping/tasks', undefined, { ...call, query }),
    createHkTask: (input: CreateHkTaskInput, call?: CallOptions) =>
      request<HkTask>('POST', '/housekeeping/tasks', input, call),
    hkTaskAction: (id: string, action: 'start' | 'complete' | 'skip', call?: CallOptions) =>
      request<HkTask>('POST', `/housekeeping/tasks/${id}/${action}`, {}, call),
    updateRoomStatus: (roomId: string, input: RoomStatusUpdateInput, call?: CallOptions) =>
      request<HkBoardRoom>('POST', `/rooms/${roomId}/status`, input, call),
    setOutOfOrder: (roomId: string, input: OutOfOrderInput, call?: CallOptions) =>
      request<{ id: string }>('POST', `/rooms/${roomId}/out-of-order`, input, call),
    roomBlocks: (query: { cursor?: string; limit?: number } = {}, call?: CallOptions) =>
      request<RoomBlockPage>('GET', '/rooms/out-of-service', undefined, {
        ...call,
        query,
      }).then((page) => page.data),
    roomBlocksPage: (query: { cursor?: string; limit?: number } = {}, call?: CallOptions) =>
      request<RoomBlockPage>('GET', '/rooms/out-of-service', undefined, { ...call, query }),
    maintenanceTickets: (
      query: { status?: string; cursor?: string; limit?: number } = {},
      call?: CallOptions,
    ) =>
      request<MaintenanceTicketPage>('GET', '/maintenance/tickets', undefined, {
        ...call,
        query,
      }).then((page) => page.data),
    maintenanceTicketsPage: (
      query: { status?: string; cursor?: string; limit?: number } = {},
      call?: CallOptions,
    ) =>
      request<MaintenanceTicketPage>('GET', '/maintenance/tickets', undefined, { ...call, query }),
    createMaintenanceTicket: (input: CreateMaintenanceTicketInput, call?: CallOptions) =>
      request<MaintenanceTicket>('POST', '/maintenance/tickets', input, call),
    assignMaintenanceTicket: (
      id: string,
      input: z.infer<typeof AssignTicketSchema>,
      call?: CallOptions,
    ) => request<MaintenanceTicket>('POST', `/maintenance/tickets/${id}/assign`, input, call),
    completeMaintenanceTicket: (
      id: string,
      input: z.infer<typeof CompleteTicketSchema> = {},
      call?: CallOptions,
    ) => request<MaintenanceTicket>('POST', `/maintenance/tickets/${id}/complete`, input, call),
    closeMaintenanceTicket: (id: string, call?: CallOptions) =>
      request<MaintenanceTicket>('POST', `/maintenance/tickets/${id}/close`, {}, call),

    // ── Rates management ──
    ratePlans: (call?: CallOptions) => request<RatePlan[]>('GET', '/rate-plans', undefined, call),
    ratePrices: (
      ratePlanId: string,
      query: { from: string; to: string; roomTypeId?: string },
      call?: CallOptions,
    ) =>
      request<RatePriceRow[]>('GET', `/rate-plans/${ratePlanId}/prices`, undefined, {
        ...call,
        query,
      }),
    updateRatePrices: (ratePlanId: string, input: PriceGridUpdateInput, call?: CallOptions) =>
      request<RatePriceRow[]>('PUT', `/rate-plans/${ratePlanId}/prices`, input, call),

    // ── Settings catalogs ──
    settingsCatalog: (call?: CallOptions) =>
      request<SettingsCatalog>('GET', '/settings/catalog', undefined, call),
    floors: (call?: CallOptions) => request<Floor[]>('GET', '/settings/floors', undefined, call),
    createFloor: (input: CreateFloorInput, call?: CallOptions) =>
      request<Floor>('POST', '/settings/floors', input, call),
    updateFloor: (id: string, input: UpdateFloorInput, call?: CallOptions) =>
      request<Floor>('PATCH', `/settings/floors/${id}`, input, call),
    removeFloor: (id: string, call?: CallOptions) =>
      request<SettingsDeleteResult>('DELETE', `/settings/floors/${id}`, undefined, call),
    roomTypes: (call?: CallOptions) =>
      request<RoomTypeSetting[]>('GET', '/settings/room-types', undefined, call),
    createRoomType: (input: CreateRoomTypeSettingInput, call?: CallOptions) =>
      request<RoomTypeSetting>('POST', '/settings/room-types', input, call),
    updateRoomType: (id: string, input: UpdateRoomTypeSettingInput, call?: CallOptions) =>
      request<RoomTypeSetting>('PATCH', `/settings/room-types/${id}`, input, call),
    removeRoomType: (id: string, call?: CallOptions) =>
      request<SettingsDeleteResult>('DELETE', `/settings/room-types/${id}`, undefined, call),
    roomAmenities: (call?: CallOptions) =>
      request<RoomAmenity[]>('GET', '/settings/amenities', undefined, call),
    createRoomAmenity: (input: CreateRoomAmenityInput, call?: CallOptions) =>
      request<RoomAmenity>('POST', '/settings/amenities', input, call),
    updateRoomAmenity: (id: string, input: UpdateRoomAmenityInput, call?: CallOptions) =>
      request<RoomAmenity>('PATCH', `/settings/amenities/${id}`, input, call),
    removeRoomAmenity: (id: string, call?: CallOptions) =>
      request<SettingsDeleteResult>('DELETE', `/settings/amenities/${id}`, undefined, call),
    rooms: (call?: CallOptions) =>
      request<RoomSetting[]>('GET', '/settings/rooms', undefined, call),
    createRoom: (input: CreateRoomInput, call?: CallOptions) =>
      request<RoomSetting>('POST', '/settings/rooms', input, call),
    updateRoom: (id: string, input: UpdateRoomInput, call?: CallOptions) =>
      request<RoomSetting>('PATCH', `/settings/rooms/${id}`, input, call),
    removeRoom: (id: string, call?: CallOptions) =>
      request<SettingsDeleteResult>('DELETE', `/settings/rooms/${id}`, undefined, call),
    chargeTypes: (call?: CallOptions) =>
      request<ChargeType[]>('GET', '/settings/charge-types', undefined, call),
    createChargeType: (input: CreateChargeTypeInput, call?: CallOptions) =>
      request<ChargeType>('POST', '/settings/charge-types', input, call),
    updateChargeType: (id: string, input: UpdateChargeTypeInput, call?: CallOptions) =>
      request<ChargeType>('PATCH', `/settings/charge-types/${id}`, input, call),
    removeChargeType: (id: string, call?: CallOptions) =>
      request<SettingsDeleteResult>('DELETE', `/settings/charge-types/${id}`, undefined, call),
    paymentMethods: (call?: CallOptions) =>
      request<PaymentMethod[]>('GET', '/settings/payment-methods', undefined, call),
    createPaymentMethod: (input: CreatePaymentMethodInput, call?: CallOptions) =>
      request<PaymentMethod>('POST', '/settings/payment-methods', input, call),
    updatePaymentMethod: (id: string, input: UpdatePaymentMethodInput, call?: CallOptions) =>
      request<PaymentMethod>('PATCH', `/settings/payment-methods/${id}`, input, call),
    removePaymentMethod: (id: string, call?: CallOptions) =>
      request<SettingsDeleteResult>('DELETE', `/settings/payment-methods/${id}`, undefined, call),

    // ── Reports & guests ──
    managerFlash: (query: { businessDate?: string } = {}, call?: CallOptions) =>
      request<ManagerFlash>('GET', '/reports/manager-flash', undefined, { ...call, query }),
    searchGuests: (query: { q: string; cursor?: string; limit?: number }, call?: CallOptions) =>
      request<GuestSearchPage>('GET', '/guests', undefined, { ...call, query }).then(
        (page) => page.data,
      ),
    searchGuestsPage: (query: { q: string; cursor?: string; limit?: number }, call?: CallOptions) =>
      request<GuestSearchPage>('GET', '/guests', undefined, { ...call, query }),
    getGuest: (id: string) => request<GuestProfile>('GET', `/guests/${id}`),
    updateGuest: (id: string, input: UpdateGuestInput, call?: CallOptions) =>
      request<GuestProfile>('PATCH', `/guests/${id}`, input, call),

    // ── POS v1 ──
    posOutlets: (call?: CallOptions) =>
      request<PosOutlet[]>('GET', '/pos/outlets', undefined, call),
    posTables: (outletId: string) => request<PosTable[]>('GET', `/pos/outlets/${outletId}/tables`),
    posRoomChargeSearch: (query: { q: string; limit?: number }, call?: CallOptions) =>
      request<PosRoomChargeCandidate[]>('GET', '/pos/room-charge/search', undefined, {
        ...call,
        query,
      }),
    openPosCheck: (input: OpenPosCheckInput, call?: CallOptions) =>
      request<PosCheck>('POST', '/pos/checks', input, call),
    listPosChecks: (
      query: {
        outletId?: string;
        status?: 'open' | 'fired' | 'closed' | 'voided';
        cursor?: string;
        limit?: number;
      } = {},
      call?: CallOptions,
    ) =>
      request<PosCheckPage>('GET', '/pos/checks', undefined, { ...call, query }).then(
        (page) => page.data,
      ),
    listPosChecksPage: (
      query: {
        outletId?: string;
        status?: 'open' | 'fired' | 'closed' | 'voided';
        cursor?: string;
        limit?: number;
      } = {},
      call?: CallOptions,
    ) => request<PosCheckPage>('GET', '/pos/checks', undefined, { ...call, query }),
    getPosCheck: (id: string) => request<PosCheck>('GET', `/pos/checks/${id}`),
    addPosItem: (checkId: string, input: AddPosItemInput, call?: CallOptions) =>
      request<PosCheck>('POST', `/pos/checks/${checkId}/items`, input, call),
    firePosCheck: (checkId: string, call?: CallOptions) =>
      request<PosCheck>('POST', `/pos/checks/${checkId}/fire`, {}, call),
    closePosCheck: (checkId: string, input: ClosePosCheckInput, call?: CallOptions) =>
      request<PosCheck>('POST', `/pos/checks/${checkId}/close`, input, call),
    kds: (call?: CallOptions) => request<PosKdsItem[]>('GET', '/pos/kds', undefined, call),
    markKdsItemReady: (itemId: string, call?: CallOptions) =>
      request<PosCheck>('POST', `/pos/kds/items/${itemId}/ready`, {}, call),
    openPosShift: (input: OpenPosShiftInput, call?: CallOptions) =>
      request<PosShift>('POST', '/pos/shifts', input, call),
    closePosShift: (id: string, input: ClosePosShiftInput, call?: CallOptions) =>
      request<PosShift>('POST', `/pos/shifts/${id}/close`, input, call),
    queueOfflineOp: (input: QueueOfflineOpInput, call?: CallOptions) =>
      request<OfflineOp>('POST', '/pos/offline-ops', input, call),

    // ── Booking engine, guest messaging, compliance ──
    startBookingSession: (input: StartBookingSessionInput, call?: CallOptions) =>
      request<BookingSession>('POST', '/public/booking-sessions', input, call),
    getBookingSession: (id: string) =>
      request<BookingSession>('GET', `/public/booking-sessions/${id}`),
    confirmBookingSession: (
      id: string,
      input: { pspToken?: string; idempotencyKey?: string } = {},
      call?: CallOptions,
    ) =>
      request<BookingSession>('POST', `/public/booking-sessions/${id}/confirm`, input, {
        ...call,
        idempotencyKey: call?.idempotencyKey ?? input.idempotencyKey,
      }),
    cancelBookingSession: (id: string, call?: CallOptions) =>
      request<BookingSession>('POST', `/public/booking-sessions/${id}/cancel`, {}, call),
    sendMessage: (input: SendMessageInput, call?: CallOptions) =>
      request<Message>('POST', '/messages/send', input, call),
    conversations: (
      query: { status?: string; cursor?: string; limit?: number } = {},
      call?: CallOptions,
    ) =>
      request<ConversationPage>('GET', '/conversations', undefined, { ...call, query }).then(
        (page) => page.data,
      ),
    conversationsPage: (
      query: { status?: string; cursor?: string; limit?: number } = {},
      call?: CallOptions,
    ) => request<ConversationPage>('GET', '/conversations', undefined, { ...call, query }),
    createGdprRequest: (input: CreateGdprRequestInput, call?: CallOptions) =>
      request<GdprRequest>('POST', '/gdpr/requests', input, call),
    updateGdprRequest: (id: string, input: UpdateGdprRequestInput, call?: CallOptions) =>
      request<GdprRequest>('PATCH', `/gdpr/requests/${id}`, input, call),
    webhookEndpoints: (call?: CallOptions) =>
      request<WebhookEndpoint[]>('GET', '/webhooks/endpoints', undefined, call),
    createWebhookEndpoint: (input: CreateWebhookEndpointInput, call?: CallOptions) =>
      request<WebhookSecret>('POST', '/webhooks/endpoints', input, call),
    disableWebhookEndpoint: (id: string, call?: CallOptions) =>
      request<WebhookEndpoint>('POST', `/webhooks/endpoints/${id}/disable`, {}, call),
    redeliverWebhook: (id: string, call?: CallOptions) =>
      request<WebhookDelivery>('POST', `/webhooks/deliveries/${id}/redeliver`, {}, call),

    // ── Platform (superadmin) administration ──
    listHotels: (call?: CallOptions) => request<Hotel[]>('GET', '/platform/hotels', undefined, call),
    createHotel: (input: CreateHotelInput, call?: CallOptions) =>
      request<HotelDetail>('POST', '/platform/hotels', input, call),
    getHotel: (id: string, call?: CallOptions) =>
      request<HotelDetail>('GET', `/platform/hotels/${id}`, undefined, call),
    updateHotel: (id: string, input: UpdateHotelInput, call?: CallOptions) =>
      request<HotelDetail>('PATCH', `/platform/hotels/${id}`, input, call),
    suspendHotel: (id: string, call?: CallOptions) =>
      request<HotelDetail>('POST', `/platform/hotels/${id}/suspend`, {}, call),
    reactivateHotel: (id: string, call?: CallOptions) =>
      request<HotelDetail>('POST', `/platform/hotels/${id}/reactivate`, {}, call),
    listHotelUsers: (id: string, call?: CallOptions) =>
      request<HotelUser[]>('GET', `/platform/hotels/${id}/users`, undefined, call),
    createHotelUser: (id: string, input: CreateHotelUserInput, call?: CallOptions) =>
      request<HotelUser>('POST', `/platform/hotels/${id}/users`, input, call),
    updatePlatformUser: (userId: string, input: UpdatePlatformUserInput, call?: CallOptions) =>
      request<{ userId: string }>('PATCH', `/platform/users/${userId}`, input, call),
    resetUserPassword: (userId: string, input: ResetPasswordInput, call?: CallOptions) =>
      request<{ userId: string }>('POST', `/platform/users/${userId}/password`, input, call),
    listPlatformRoles: (call?: CallOptions) =>
      request<PlatformRole[]>('GET', '/platform/roles', undefined, call),
    listSuperadmins: (call?: CallOptions) =>
      request<Superadmin[]>('GET', '/platform/superadmins', undefined, call),
    createSuperadmin: (input: CreateSuperadminInput, call?: CallOptions) =>
      request<Superadmin>('POST', '/platform/superadmins', input, call),
    updateSuperadmin: (userId: string, input: UpdateSuperadminInput, call?: CallOptions) =>
      request<Superadmin>('PATCH', `/platform/superadmins/${userId}`, input, call),
    removeSuperadmin: (userId: string, call?: CallOptions) =>
      request<PlatformDeleteResult>('DELETE', `/platform/superadmins/${userId}`, undefined, call),
    switchContext: (tenantId: string | null, call?: CallOptions) =>
      request<SwitchContextResult>('POST', '/platform/context', { tenantId }, call),
  };
}
