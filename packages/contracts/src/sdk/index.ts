import type { Problem } from '../common';
import type { Me } from '../identity';
import type { RoomTypeAvailability } from '../availability';
import type { ArrivalRow, CreateReservationInput, Reservation } from '../reservations';
import type { Folio, PostChargeInput, RecordPaymentInput, RefundInput } from '../folio';
import type { NightAuditResult } from '../night-audit';

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
    arrivals: (call?: CallOptions) => request<ArrivalRow[]>('GET', '/front-desk/arrivals', undefined, call),
    getFolio: (id: string) => request<Folio>('GET', `/folios/${id}`),
    postCharge: (folioId: string, input: PostChargeInput) =>
      request<Folio>('POST', `/folios/${folioId}/postings`, input),
    recordPayment: (folioId: string, input: RecordPaymentInput) =>
      request<Folio>('POST', `/folios/${folioId}/payments`, input),
    refund: (paymentId: string, input: RefundInput) =>
      request<Folio>('POST', `/payments/${paymentId}/refunds`, input),
    runNightAudit: (body: { businessDate?: string } = {}, call?: CallOptions) =>
      request<NightAuditResult>('POST', '/night-audit/run', body, call),
  };
}
