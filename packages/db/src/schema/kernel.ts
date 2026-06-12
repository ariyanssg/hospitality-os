import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { assignmentScope, businessDateStatus } from './enums';
import { auditColumns, createdAt, pk, propertyIdNullable, tenantId } from './_shared';

/* ─────────────────────────── Identity (global — NOT tenant-scoped) ───────────────────────────
 * Users are global: one login across every tenant they belong to (doc 05 §1). These mirror the
 * Better Auth core tables; access to tenant data is granted via memberships + role assignments.
 */

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: createdAt(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  /** Active tenant for this session — the org-plugin's active organization, mapped to a tenant. */
  activeTenantId: uuid('active_tenant_id'),
  createdAt: createdAt(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  password: text('password'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  createdAt: createdAt(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const verifications = pgTable('verifications', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: createdAt(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/* ─────────────────────────────────── Tenancy ─────────────────────────────────── */

export const tenants = pgTable('tenants', {
  id: pk(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  status: text('status').notNull().default('active'), // active | suspended | offboarding
  settings: jsonb('settings')
    .notNull()
    .default(sql`'{}'::jsonb`),
  ...auditColumns(),
});

export const properties = pgTable(
  'properties',
  {
    id: pk(),
    tenantId: tenantId(),
    name: text('name').notNull(),
    code: text('code').notNull(),
    timezone: text('timezone').notNull().default('UTC'),
    currency: text('currency').notNull().default('USD'),
    /** Local time the business day rolls at night audit — NOT midnight (doc 07 §1). */
    businessDayRollover: text('business_day_rollover').notNull().default('03:00'),
    settings: jsonb('settings')
      .notNull()
      .default(sql`'{}'::jsonb`),
    ...auditColumns(),
  },
  (t) => [
    index('properties_tenant').on(t.tenantId),
    uniqueIndex('properties_tenant_code').on(t.tenantId, t.code),
  ],
);

export const tenantMemberships = pgTable(
  'tenant_memberships',
  {
    id: pk(),
    tenantId: tenantId(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('active'), // active | suspended
    ...auditColumns(),
  },
  (t) => [uniqueIndex('memberships_tenant_user').on(t.tenantId, t.userId)],
);

/* ─────────────────────────── Permission engine (doc 06) ─────────────────────────── */

export const roles = pgTable(
  'roles',
  {
    id: pk(),
    /** null tenant = system role template; instantiated/cloned per tenant. */
    tenantId: uuid('tenant_id'),
    key: text('key').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    isSystem: boolean('is_system').notNull().default(false),
    ...auditColumns(),
  },
  (t) => [uniqueIndex('roles_tenant_key').on(t.tenantId, t.key)],
);

export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    /** Concrete `resource.action` string from the catalog — wildcards expand at role-save time. */
    permissionKey: text('permission_key').notNull(),
  },
  (t) => [uniqueIndex('role_permissions_pk').on(t.roleId, t.permissionKey)],
);

export const roleAssignments = pgTable(
  'role_assignments',
  {
    id: pk(),
    tenantId: tenantId(),
    membershipId: uuid('membership_id')
      .notNull()
      .references(() => tenantMemberships.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    scope: assignmentScope('scope').notNull(),
    /** Scoping target: null property = tenant-wide; department nests under a property. */
    propertyId: propertyIdNullable(),
    department: text('department'),
    /** Closed-set ABAC conditions (amount thresholds, own-record, …) — doc 06 §4. */
    conditions: jsonb('conditions')
      .notNull()
      .default(sql`'{}'::jsonb`),
    /** Rare explicit deny grant — overrides allows (doc 06 §1). */
    isDeny: boolean('is_deny').notNull().default(false),
    ...auditColumns(),
  },
  (t) => [
    index('assignments_membership').on(t.membershipId),
    index('assignments_tenant').on(t.tenantId),
  ],
);

/* ─────────────────────────── Transactional outbox (doc 04 §4) ───────────────────────────
 * Written in the SAME transaction as the business change. The relay worker publishes
 * unpublished rows to Redis Streams; consumers are idempotent.
 */

export const outboxEvents = pgTable(
  'outbox_events',
  {
    id: pk(),
    tenantId: tenantId(),
    propertyId: propertyIdNullable(),
    aggregateType: text('aggregate_type').notNull(),
    aggregateId: uuid('aggregate_id').notNull(),
    eventType: text('event_type').notNull(),
    payloadVersion: text('payload_version').notNull().default('1'),
    payload: jsonb('payload').notNull(),
    actorId: text('actor_id'),
    correlationId: text('correlation_id').notNull(),
    causationId: text('causation_id'),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
  },
  (t) => [
    // Relay hot set: tiny, only unpublished rows.
    index('outbox_unpublished')
      .on(t.occurredAt)
      .where(sql`published_at IS NULL`),
    index('outbox_tenant_aggregate').on(t.tenantId, t.aggregateType, t.aggregateId),
  ],
);

/* ─────────────────────────── Webhooks (doc 08 §8) ───────────────────────────
 * Tenant-managed endpoints subscribe to the public event taxonomy. Delivery attempts are durable
 * so retries, dead letters, and manual replay can be inspected from the platform/API.
 */

export const webhookEndpoints = pgTable(
  'webhook_endpoints',
  {
    id: pk(),
    tenantId: tenantId(),
    propertyId: propertyIdNullable(),
    name: text('name').notNull(),
    url: text('url').notNull(),
    secret: text('secret').notNull(),
    eventTypes: text('event_types').array().notNull(),
    status: text('status').notNull().default('active'), // active | disabled
    failureCount: integer('failure_count').notNull().default(0),
    lastDeliveredAt: timestamp('last_delivered_at', { withTimezone: true }),
    lastFailedAt: timestamp('last_failed_at', { withTimezone: true }),
    disabledAt: timestamp('disabled_at', { withTimezone: true }),
    ...auditColumns(),
  },
  (t) => [
    index('webhook_endpoints_tenant').on(t.tenantId),
    index('webhook_endpoints_active').on(t.tenantId, t.status),
  ],
);

export const webhookDeliveries = pgTable(
  'webhook_deliveries',
  {
    id: pk(),
    tenantId: tenantId(),
    propertyId: propertyIdNullable(),
    endpointId: uuid('endpoint_id')
      .notNull()
      .references(() => webhookEndpoints.id, { onDelete: 'cascade' }),
    eventId: uuid('event_id').notNull(),
    eventType: text('event_type').notNull(),
    attempt: integer('attempt').notNull().default(1),
    status: text('status').notNull().default('pending'), // pending | delivered | failed | dead
    statusCode: integer('status_code'),
    error: text('error'),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).notNull().defaultNow(),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('webhook_delivery_attempt_unique').on(t.endpointId, t.eventId, t.attempt),
    index('webhook_deliveries_due').on(t.status, t.nextAttemptAt),
    index('webhook_deliveries_endpoint').on(t.tenantId, t.endpointId, t.createdAt),
  ],
);

/* ─────────────────────────── Audit log (doc 07 §5) ─────────────────────────── */

export const auditLog = pgTable(
  'audit_log',
  {
    id: pk(),
    tenantId: tenantId(),
    propertyId: propertyIdNullable(),
    actorId: text('actor_id'),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    before: jsonb('before'),
    after: jsonb('after'),
    reason: text('reason'),
    ip: text('ip'),
    correlationId: text('correlation_id').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index('audit_tenant_entity').on(t.tenantId, t.entityType, t.entityId),
    index('audit_tenant_created').on(t.tenantId, t.createdAt),
  ],
);

/* ─────────────────────────── Idempotency keys (doc 08 §4) ───────────────────────────
 * Server stores key → response so an unsafe request replayed with the same key returns the same
 * response; the same key with a different body is rejected. Written in the mutation's transaction.
 */
export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    tenantId: tenantId(),
    key: text('key').notNull(),
    requestHash: text('request_hash').notNull(),
    response: jsonb('response'),
    statusCode: integer('status_code').notNull().default(200),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('idempotency_keys_pk').on(t.tenantId, t.key)],
);

/* ─────────────────────────── Business dates (doc 07 §1, owned by GL) ─────────────────────────── */

export const businessDates = pgTable(
  'business_dates',
  {
    tenantId: tenantId(),
    propertyId: uuid('property_id').notNull(),
    businessDate: date('business_date').notNull(),
    status: businessDateStatus('status').notNull().default('open'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('business_dates_pk').on(t.tenantId, t.propertyId)],
);
