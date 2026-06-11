import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from '@asteasolutions/zod-to-openapi';
import { z } from './zod';
import { MoneySchema, PageMetaSchema, ProblemSchema } from './common';
import {
  ArrivalRowSchema,
  CancelReservationSchema,
  CheckInSchema,
  CheckOutSchema,
  CreateReservationSchema,
  ReservationSchema,
} from './reservations';
import { FolioSchema, PostChargeSchema, RecordPaymentSchema, RefundSchema } from './folio';
import { AvailabilityQuerySchema, RoomTypeAvailabilitySchema } from './availability';
import { MeSchema } from './identity';
import { NightAuditResultSchema, NightAuditRunSchema, TrialBalanceSchema } from './night-audit';

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
    ArrivalRow: ArrivalRowSchema,
    Folio: FolioSchema,
    PostCharge: PostChargeSchema,
    RecordPayment: RecordPaymentSchema,
    Refund: RefundSchema,
    RoomTypeAvailability: RoomTypeAvailabilitySchema,
    TrialBalance: TrialBalanceSchema,
    NightAuditResult: NightAuditResultSchema,
  };
  for (const [name, schema] of Object.entries(components)) r.register(name, schema);

  const propertyHeader = z.string().uuid().openapi({ param: { name: 'X-Property-Id', in: 'header' } });
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
    request: { query: AvailabilityQuerySchema, headers: z.object({ 'X-Property-Id': propertyHeader }) },
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
    responses: { 200: { description: 'Reservation', ...json(ReservationSchema) }, 404: problem('Not found') },
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
      request: { params: z.object({ id: z.string().uuid() }), body: json(body) },
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
    request: { params: z.object({ id: z.string().uuid() }), body: json(PostChargeSchema) },
    responses: { 201: { description: 'Folio', ...json(FolioSchema) }, 403: problem('PERMISSION_DENIED') },
  });

  r.registerPath({
    method: 'post',
    path: '/folios/{id}/payments',
    summary: 'Record a payment against a folio',
    request: { params: z.object({ id: z.string().uuid() }), body: json(RecordPaymentSchema) },
    responses: { 201: { description: 'Folio', ...json(FolioSchema) } },
  });

  r.registerPath({
    method: 'get',
    path: '/front-desk/arrivals',
    summary: "Today's arrivals board",
    request: { headers: z.object({ 'X-Property-Id': propertyHeader }) },
    responses: { 200: { description: 'Arrivals', ...json(z.array(ArrivalRowSchema)) } },
  });

  r.registerPath({
    method: 'post',
    path: '/night-audit/run',
    summary: 'Run the night audit (roll business date, post room+tax, generate daily journal)',
    request: {
      headers: z.object({ 'X-Property-Id': propertyHeader }),
      body: json(NightAuditRunSchema),
    },
    responses: { 200: { description: 'Result', ...json(NightAuditResultSchema) } },
  });

  const generator = new OpenApiGeneratorV3(r.definitions);
  const doc = generator.generateDocument({
    openapi: '3.0.3',
    info: { title: 'Vela API', version: '1.0.0', description: 'The Vela hospitality OS public API.' },
    servers: [{ url: 'https://api.vela.dev/v1' }, { url: 'http://localhost:4000/v1' }],
  });
  return doc as unknown as Record<string, unknown>;
}
