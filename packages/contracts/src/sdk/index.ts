import type { Problem } from '../common';
import type { Me } from '../identity';
import type { RoomTypeAvailability } from '../availability';
import type {
  ArrivalRow,
  CreateReservationInput,
  DepartureRow,
  InHouseRow,
  ModifyReservationInput,
  Reservation,
  ReservationListRow,
  RoomMoveInput,
  RoomRackRow,
  WalkInInput,
} from '../reservations';
import type {
  CashierSession,
  CloseCashierSessionInput,
  CreateFolioInput,
  Deposit,
  Folio,
  OpenCashierSessionInput,
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
  MaintenanceTicket,
  OutOfOrderInput,
  RoomStatusUpdateInput,
} from '../housekeeping';
import type { PriceGridUpdateInput, RatePlan, RatePriceRow } from '../rates';
import type { ManagerFlash } from '../reports';
import type { Guest, GuestProfile, UpdateGuestInput } from '../guests';
import type {
  AddPosItemInput,
  BookingSession,
  ClosePosCheckInput,
  ClosePosShiftInput,
  Conversation,
  CreateGdprRequestInput,
  GdprRequest,
  Message,
  OfflineOp,
  OpenPosCheckInput,
  OpenPosShiftInput,
  PosCheck,
  PosCheckItem,
  PosOutlet,
  PosShift,
  PosTable,
  QueueOfflineOpInput,
  SendMessageInput,
  StartBookingSessionInput,
  UpdateGdprRequestInput,
} from '../index';
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
      query: { from: string; to: string; roomTypeId?: string; adults?: number; promoCode?: string },
      call?: CallOptions,
    ) => request<RoomTypeAvailability[]>('GET', '/availability', undefined, { ...call, query }),
    createReservation: (input: CreateReservationInput, call?: CallOptions) =>
      request<Reservation>('POST', '/reservations', input, call),
    getReservation: (id: string) => request<Reservation>('GET', `/reservations/${id}`),
    checkIn: (id: string, body: { roomId?: string } = {}) =>
      request<Reservation>('POST', `/reservations/${id}/check-in`, body),
    checkOut: (id: string, body: { sendInvoice?: boolean } = {}) =>
      request<Reservation>('POST', `/reservations/${id}/check-out`, body),
    cancel: (id: string, body: { reason?: string; waiveFee?: boolean } = {}) =>
      request<Reservation>('POST', `/reservations/${id}/cancel`, body),
    arrivals: (call?: CallOptions) =>
      request<ArrivalRow[]>('GET', '/front-desk/arrivals', undefined, call),
    getFolio: (id: string) => request<Folio>('GET', `/folios/${id}`),
    postCharge: (folioId: string, input: PostChargeInput) =>
      request<Folio>('POST', `/folios/${folioId}/postings`, input),
    recordPayment: (folioId: string, input: RecordPaymentInput) =>
      request<Folio>('POST', `/folios/${folioId}/payments`, input),
    refund: (paymentId: string, input: RefundInput) =>
      request<Folio>('POST', `/payments/${paymentId}/refunds`, input),
    runNightAudit: (body: { businessDate?: string } = {}, call?: CallOptions) =>
      request<NightAuditResult>('POST', '/night-audit/run', body, call),

    // ── Reservations lifecycle (Phase 1) ──
    listReservations: (
      query: { status?: string; from?: string; to?: string; q?: string; limit?: number } = {},
      call?: CallOptions,
    ) => request<ReservationListRow[]>('GET', '/reservations', undefined, { ...call, query }),
    modifyReservation: (id: string, input: ModifyReservationInput) =>
      request<Reservation>('POST', `/reservations/${id}/modify`, input),
    markNoShow: (id: string, body: { reason?: string } = {}) =>
      request<Reservation>('POST', `/reservations/${id}/no-show`, body),
    reinstate: (id: string, body: { reason?: string } = {}) =>
      request<Reservation>('POST', `/reservations/${id}/reinstate`, body),
    roomMove: (id: string, input: RoomMoveInput) =>
      request<Reservation>('POST', `/reservations/${id}/room-moves`, input),
    walkIn: (input: WalkInInput, call?: CallOptions) =>
      request<Reservation>('POST', '/walk-ins', input, call),
    departures: (call?: CallOptions) =>
      request<DepartureRow[]>('GET', '/front-desk/departures', undefined, call),
    inHouse: (call?: CallOptions) =>
      request<InHouseRow[]>('GET', '/front-desk/in-house', undefined, call),
    roomRack: (query: { from: string; to: string }, call?: CallOptions) =>
      request<RoomRackRow[]>('GET', '/front-desk/room-rack', undefined, { ...call, query }),

    // ── Folio operations, cashiering, deposits ──
    createFolio: (input: CreateFolioInput, call?: CallOptions) =>
      request<Folio>('POST', '/folios', input, call),
    transferPosting: (folioId: string, input: TransferPostingInput) =>
      request<Folio>('POST', `/folios/${folioId}/transfers`, input),
    openCashierSession: (input: OpenCashierSessionInput, call?: CallOptions) =>
      request<CashierSession>('POST', '/cashier-sessions', input, call),
    currentCashierSession: (call?: CallOptions) =>
      request<CashierSession | null>('GET', '/cashier-sessions/current', undefined, call),
    closeCashierSession: (id: string, input: CloseCashierSessionInput) =>
      request<CashierSession>('POST', `/cashier-sessions/${id}/close`, input),
    recordDeposit: (reservationId: string, input: RecordDepositInput) =>
      request<Deposit>('POST', `/reservations/${reservationId}/deposits`, input),
    listDeposits: (reservationId: string) =>
      request<Deposit[]>('GET', `/reservations/${reservationId}/deposits`),

    // ── Housekeeping & maintenance ──
    hkBoard: (call?: CallOptions) =>
      request<HkBoardRoom[]>('GET', '/housekeeping/board', undefined, call),
    hkTasks: (query: { status?: string; dueDate?: string } = {}, call?: CallOptions) =>
      request<HkTask[]>('GET', '/housekeeping/tasks', undefined, { ...call, query }),
    createHkTask: (input: CreateHkTaskInput, call?: CallOptions) =>
      request<HkTask>('POST', '/housekeeping/tasks', input, call),
    hkTaskAction: (id: string, action: 'start' | 'complete' | 'skip') =>
      request<HkTask>('POST', `/housekeeping/tasks/${id}/${action}`, {}),
    updateRoomStatus: (roomId: string, input: RoomStatusUpdateInput) =>
      request<HkBoardRoom>('POST', `/rooms/${roomId}/status`, input),
    setOutOfOrder: (roomId: string, input: OutOfOrderInput) =>
      request<{ id: string }>('POST', `/rooms/${roomId}/out-of-order`, input),
    maintenanceTickets: (query: { status?: string } = {}, call?: CallOptions) =>
      request<MaintenanceTicket[]>('GET', '/maintenance/tickets', undefined, { ...call, query }),
    createMaintenanceTicket: (input: CreateMaintenanceTicketInput, call?: CallOptions) =>
      request<MaintenanceTicket>('POST', '/maintenance/tickets', input, call),
    assignMaintenanceTicket: (id: string, input: z.infer<typeof AssignTicketSchema>) =>
      request<MaintenanceTicket>('POST', `/maintenance/tickets/${id}/assign`, input),
    completeMaintenanceTicket: (id: string, input: z.infer<typeof CompleteTicketSchema> = {}) =>
      request<MaintenanceTicket>('POST', `/maintenance/tickets/${id}/complete`, input),
    closeMaintenanceTicket: (id: string) =>
      request<MaintenanceTicket>('POST', `/maintenance/tickets/${id}/close`, {}),

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
    updateRatePrices: (ratePlanId: string, input: PriceGridUpdateInput) =>
      request<RatePriceRow[]>('PUT', `/rate-plans/${ratePlanId}/prices`, input),

    // ── Reports & guests ──
    managerFlash: (query: { businessDate?: string } = {}, call?: CallOptions) =>
      request<ManagerFlash>('GET', '/reports/manager-flash', undefined, { ...call, query }),
    searchGuests: (query: { q: string; limit?: number }, call?: CallOptions) =>
      request<Guest[]>('GET', '/guests', undefined, { ...call, query }),
    getGuest: (id: string) => request<GuestProfile>('GET', `/guests/${id}`),
    updateGuest: (id: string, input: UpdateGuestInput) =>
      request<GuestProfile>('PATCH', `/guests/${id}`, input),

    // ── POS v1 ──
    posOutlets: (call?: CallOptions) =>
      request<PosOutlet[]>('GET', '/pos/outlets', undefined, call),
    posTables: (outletId: string) => request<PosTable[]>('GET', `/pos/outlets/${outletId}/tables`),
    openPosCheck: (input: OpenPosCheckInput, call?: CallOptions) =>
      request<PosCheck>('POST', '/pos/checks', input, call),
    getPosCheck: (id: string) => request<PosCheck>('GET', `/pos/checks/${id}`),
    addPosItem: (checkId: string, input: AddPosItemInput, call?: CallOptions) =>
      request<PosCheck>('POST', `/pos/checks/${checkId}/items`, input, call),
    firePosCheck: (checkId: string, call?: CallOptions) =>
      request<PosCheck>('POST', `/pos/checks/${checkId}/fire`, {}, call),
    closePosCheck: (checkId: string, input: ClosePosCheckInput, call?: CallOptions) =>
      request<PosCheck>('POST', `/pos/checks/${checkId}/close`, input, call),
    kds: (call?: CallOptions) => request<PosCheckItem[]>('GET', '/pos/kds', undefined, call),
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
    conversations: (query: { status?: string } = {}, call?: CallOptions) =>
      request<Conversation[]>('GET', '/conversations', undefined, { ...call, query }),
    createGdprRequest: (input: CreateGdprRequestInput, call?: CallOptions) =>
      request<GdprRequest>('POST', '/gdpr/requests', input, call),
    updateGdprRequest: (id: string, input: UpdateGdprRequestInput) =>
      request<GdprRequest>('PATCH', `/gdpr/requests/${id}`, input),
  };
}
