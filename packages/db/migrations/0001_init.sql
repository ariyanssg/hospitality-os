-- Vela canonical schema (Phase 0). Hand-reviewed DDL (doc 07 §1).
-- Mirrors packages/db/src/schema/*. RLS policies are applied at runtime from src/rls.ts.
-- Immutability + balanced-ledger triggers live in 0002_triggers.sql.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────────── Enums ───────────────────────────────
DO $$ BEGIN
  CREATE TYPE reservation_status AS ENUM ('inquiry','tentative','confirmed','checked_in','checked_out','cancelled','no_show','released');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE folio_status AS ENUM ('open','closed','transferred'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE folio_type AS ENUM ('guest','master','company','paymaster'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE posting_source_type AS ENUM ('room','tax','pos_check','payment','refund','adjustment','deposit','package','manual'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE payment_method AS ENUM ('card','cash','bank_transfer','ar_transfer','voucher','deposit'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE payment_status AS ENUM ('pending','captured','failed','voided','refunded'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE room_hk_status AS ENUM ('dirty','clean','inspected'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE room_occupancy AS ENUM ('vacant','occupied'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE rate_plan_type AS ENUM ('bar','corporate','package','member','wholesale','promotional'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE restriction_kind AS ENUM ('min_los','max_los','cta','ctd','stop_sell'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE journal_entry_source AS ENUM ('folio_posting','payment','night_audit','manual'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE gl_account_type AS ENUM ('asset','liability','equity','revenue','expense'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE normal_balance AS ENUM ('debit','credit'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE business_date_status AS ENUM ('open','closed'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE cashier_session_status AS ENUM ('open','closed'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE assignment_scope AS ENUM ('tenant','property','department'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE permission_risk_tier AS ENUM ('standard','elevated','critical'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─────────────────────────── Identity (global) ───────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  email_verified boolean NOT NULL DEFAULT false,
  image text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  ip_address text,
  user_agent text,
  active_tenant_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS accounts (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id text NOT NULL,
  provider_id text NOT NULL,
  access_token text, refresh_token text, id_token text, password text,
  access_token_expires_at timestamptz, refresh_token_expires_at timestamptz, scope text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS verifications (
  id text PRIMARY KEY,
  identifier text NOT NULL,
  value text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────── Tenancy ───────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active',
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid
);
CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  code text NOT NULL,
  timezone text NOT NULL DEFAULT 'UTC',
  currency text NOT NULL DEFAULT 'USD',
  business_day_rollover text NOT NULL DEFAULT '03:00',
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid
);
CREATE INDEX IF NOT EXISTS properties_tenant ON properties (tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS properties_tenant_code ON properties (tenant_id, code);

CREATE TABLE IF NOT EXISTS tenant_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid
);
CREATE UNIQUE INDEX IF NOT EXISTS memberships_tenant_user ON tenant_memberships (tenant_id, user_id);

-- ─────────────────────────── Permission engine ───────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  key text NOT NULL,
  name text NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid
);
CREATE UNIQUE INDEX IF NOT EXISTS roles_tenant_key ON roles (tenant_id, key);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_key text NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS role_permissions_pk ON role_permissions (role_id, permission_key);

CREATE TABLE IF NOT EXISTS role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  membership_id uuid NOT NULL REFERENCES tenant_memberships(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  scope assignment_scope NOT NULL,
  property_id uuid,
  department text,
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_deny boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid
);
CREATE INDEX IF NOT EXISTS assignments_membership ON role_assignments (membership_id);
CREATE INDEX IF NOT EXISTS assignments_tenant ON role_assignments (tenant_id);

-- ─────────────────────────── Outbox + audit + business dates ───────────────────────────
CREATE TABLE IF NOT EXISTS outbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  property_id uuid,
  aggregate_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  event_type text NOT NULL,
  payload_version text NOT NULL DEFAULT '1',
  payload jsonb NOT NULL,
  actor_id text,
  correlation_id text NOT NULL,
  causation_id text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);
CREATE INDEX IF NOT EXISTS outbox_unpublished ON outbox_events (occurred_at) WHERE published_at IS NULL;
CREATE INDEX IF NOT EXISTS outbox_tenant_aggregate ON outbox_events (tenant_id, aggregate_type, aggregate_id);

CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  property_id uuid,
  actor_id text,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  before jsonb, after jsonb, reason text, ip text,
  correlation_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_tenant_entity ON audit_log (tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS audit_tenant_created ON audit_log (tenant_id, created_at);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  tenant_id uuid NOT NULL,
  key text NOT NULL,
  request_hash text NOT NULL,
  response jsonb,
  status_code int NOT NULL DEFAULT 200,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idempotency_keys_pk ON idempotency_keys (tenant_id, key);

CREATE TABLE IF NOT EXISTS business_dates (
  tenant_id uuid NOT NULL,
  property_id uuid NOT NULL,
  business_date date NOT NULL,
  status business_date_status NOT NULL DEFAULT 'open',
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS business_dates_pk ON business_dates (tenant_id, property_id);

-- ─────────────────────────── Inventory & availability ───────────────────────────
CREATE TABLE IF NOT EXISTS room_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL, property_id uuid NOT NULL,
  code text NOT NULL, name text NOT NULL, description text,
  max_occupancy int NOT NULL DEFAULT 2, default_occupancy int NOT NULL DEFAULT 2,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid
);
CREATE UNIQUE INDEX IF NOT EXISTS room_types_tenant_property_code ON room_types (tenant_id, property_id, code);

CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL, property_id uuid NOT NULL,
  room_type_id uuid NOT NULL REFERENCES room_types(id),
  number text NOT NULL, floor text,
  hk_status room_hk_status NOT NULL DEFAULT 'clean',
  occupancy room_occupancy NOT NULL DEFAULT 'vacant',
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  status_updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid
);
CREATE UNIQUE INDEX IF NOT EXISTS rooms_tenant_property_number ON rooms (tenant_id, property_id, number);
CREATE INDEX IF NOT EXISTS rooms_by_type ON rooms (tenant_id, property_id, room_type_id);

CREATE TABLE IF NOT EXISTS availability_days (
  tenant_id uuid NOT NULL, property_id uuid NOT NULL,
  room_type_id uuid NOT NULL, stay_date date NOT NULL,
  physical int NOT NULL, out_of_order int NOT NULL DEFAULT 0,
  sold int NOT NULL DEFAULT 0, blocked int NOT NULL DEFAULT 0,
  overbook_limit int NOT NULL DEFAULT 0,
  CONSTRAINT availability_no_overbook CHECK (sold + blocked <= physical - out_of_order + overbook_limit),
  CONSTRAINT availability_nonneg CHECK (sold >= 0 AND blocked >= 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS availability_days_pk ON availability_days (tenant_id, property_id, room_type_id, stay_date);

CREATE TABLE IF NOT EXISTS out_of_order_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL, property_id uuid NOT NULL,
  room_id uuid NOT NULL REFERENCES rooms(id),
  from_date date NOT NULL, to_date date NOT NULL,
  kind text NOT NULL DEFAULT 'out_of_order', reason text,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid
);
CREATE INDEX IF NOT EXISTS ooo_room ON out_of_order_periods (tenant_id, property_id, room_id);

-- ─────────────────────────── Rates ───────────────────────────
CREATE TABLE IF NOT EXISTS rate_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL, property_id uuid NOT NULL,
  code text NOT NULL, name text NOT NULL,
  type rate_plan_type NOT NULL DEFAULT 'bar',
  currency text NOT NULL DEFAULT 'USD',
  derived_from_plan_id uuid,
  derivation_adjustment_pct numeric(14,4),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid
);
CREATE UNIQUE INDEX IF NOT EXISTS rate_plans_tenant_property_code ON rate_plans (tenant_id, property_id, code);

CREATE TABLE IF NOT EXISTS rate_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL, property_id uuid NOT NULL,
  rate_plan_id uuid NOT NULL REFERENCES rate_plans(id),
  room_type_id uuid NOT NULL, stay_date date NOT NULL,
  price numeric(14,4) NOT NULL,
  single_price numeric(14,4), extra_adult_price numeric(14,4), extra_child_price numeric(14,4),
  currency text NOT NULL DEFAULT 'USD',
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid
);
CREATE UNIQUE INDEX IF NOT EXISTS rate_prices_lookup ON rate_prices (tenant_id, property_id, rate_plan_id, room_type_id, stay_date);

CREATE TABLE IF NOT EXISTS rate_restrictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL, property_id uuid NOT NULL,
  rate_plan_id uuid NOT NULL REFERENCES rate_plans(id),
  room_type_id uuid NOT NULL, stay_date date NOT NULL,
  kind restriction_kind NOT NULL, value int,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid
);
CREATE INDEX IF NOT EXISTS rate_restrictions_lookup ON rate_restrictions (tenant_id, property_id, rate_plan_id, room_type_id, stay_date);

-- ─────────────────────────── Guests + reservations ───────────────────────────
CREATE TABLE IF NOT EXISTS guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  first_name text NOT NULL, last_name text NOT NULL,
  email text, phone text, vip_tier text,
  traits jsonb NOT NULL DEFAULT '[]'::jsonb,
  nationality text,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid
);
CREATE INDEX IF NOT EXISTS guests_tenant_name ON guests (tenant_id, last_name, first_name);
CREATE INDEX IF NOT EXISTS guests_tenant_email ON guests (tenant_id, email);

CREATE TABLE IF NOT EXISTS reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL, property_id uuid NOT NULL,
  confirmation_number text NOT NULL,
  status reservation_status NOT NULL DEFAULT 'confirmed',
  guest_id uuid NOT NULL REFERENCES guests(id),
  company_id uuid, group_block_id uuid,
  arrival_date date NOT NULL, departure_date date NOT NULL,
  room_type_id uuid NOT NULL, rate_plan_id uuid NOT NULL,
  adults int NOT NULL DEFAULT 1, children int NOT NULL DEFAULT 0,
  total_amount numeric(14,4) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  source jsonb NOT NULL DEFAULT '{}'::jsonb,
  guarantee jsonb NOT NULL DEFAULT '{}'::jsonb,
  hold_expires_at timestamptz,
  notes text,
  cancelled_at timestamptz, checked_in_at timestamptz, checked_out_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid,
  CONSTRAINT reservations_dates CHECK (departure_date > arrival_date)
);
CREATE UNIQUE INDEX IF NOT EXISTS reservations_confirmation ON reservations (tenant_id, property_id, confirmation_number);
CREATE INDEX IF NOT EXISTS res_arrivals ON reservations (tenant_id, property_id, arrival_date) WHERE status IN ('confirmed','checked_in');
CREATE INDEX IF NOT EXISTS res_departures ON reservations (tenant_id, property_id, departure_date) WHERE status = 'checked_in';
CREATE INDEX IF NOT EXISTS res_guest ON reservations (tenant_id, guest_id);

CREATE TABLE IF NOT EXISTS reservation_nights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL, property_id uuid NOT NULL,
  reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  stay_date date NOT NULL,
  room_type_id uuid NOT NULL, rate_plan_id uuid NOT NULL,
  price numeric(14,4) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  market_segment text,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid
);
CREATE UNIQUE INDEX IF NOT EXISTS reservation_nights_unique ON reservation_nights (reservation_id, stay_date);
CREATE INDEX IF NOT EXISTS reservation_nights_res ON reservation_nights (tenant_id, reservation_id);

CREATE TABLE IF NOT EXISTS reservation_room_stays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL, property_id uuid NOT NULL,
  reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  room_id uuid, from_date date NOT NULL, to_date date NOT NULL,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid
);
CREATE INDEX IF NOT EXISTS room_stays_res ON reservation_room_stays (tenant_id, reservation_id);

CREATE TABLE IF NOT EXISTS reservation_guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  guest_id uuid NOT NULL REFERENCES guests(id),
  is_primary text NOT NULL DEFAULT 'true'
);
CREATE UNIQUE INDEX IF NOT EXISTS reservation_guests_unique ON reservation_guests (reservation_id, guest_id);

CREATE TABLE IF NOT EXISTS reservation_status_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL, property_id uuid NOT NULL,
  reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  from_status text, to_status text NOT NULL, reason text, actor_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reservation_status_log_res ON reservation_status_log (tenant_id, reservation_id);

-- ─────────────────────────── Folio & payments ───────────────────────────
CREATE TABLE IF NOT EXISTS charge_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL, property_id uuid,
  code text NOT NULL, name text NOT NULL, category text NOT NULL,
  gl_account_code text, is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid
);
CREATE UNIQUE INDEX IF NOT EXISTS charge_codes_tenant_code ON charge_codes (tenant_id, code);

CREATE TABLE IF NOT EXISTS tax_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL, property_id uuid,
  code text NOT NULL, name text NOT NULL,
  rate_pct numeric(7,4) NOT NULL, inclusive boolean NOT NULL DEFAULT false,
  applies_to_category text NOT NULL DEFAULT 'room', gl_account_code text,
  effective_from date, effective_to date,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid
);
CREATE UNIQUE INDEX IF NOT EXISTS tax_rules_tenant_code ON tax_rules (tenant_id, code);

CREATE TABLE IF NOT EXISTS folios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL, property_id uuid NOT NULL,
  folio_number text NOT NULL,
  reservation_id uuid, guest_id uuid, company_id uuid,
  type folio_type NOT NULL DEFAULT 'guest',
  status folio_status NOT NULL DEFAULT 'open',
  currency char(3) NOT NULL DEFAULT 'USD',
  balance numeric(14,4) NOT NULL DEFAULT 0,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid
);
CREATE UNIQUE INDEX IF NOT EXISTS folios_tenant_number ON folios (tenant_id, property_id, folio_number);
CREATE INDEX IF NOT EXISTS folio_open ON folios (tenant_id, property_id, status) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS folios_reservation ON folios (tenant_id, reservation_id);

CREATE TABLE IF NOT EXISTS folio_postings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL, property_id uuid NOT NULL,
  folio_id uuid NOT NULL REFERENCES folios(id),
  business_date date NOT NULL,
  charge_code_id uuid NOT NULL,
  description text NOT NULL,
  amount numeric(14,4) NOT NULL,
  currency char(3) NOT NULL,
  base_amount numeric(14,4) NOT NULL,
  fx_rate numeric(12,6) NOT NULL DEFAULT 1,
  quantity numeric(10,3) NOT NULL DEFAULT 1,
  source_type posting_source_type NOT NULL,
  source_id uuid,
  reverses_posting_id uuid REFERENCES folio_postings(id),
  posted_by text NOT NULL,
  posted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS postings_by_folio ON folio_postings (tenant_id, folio_id, business_date);
CREATE INDEX IF NOT EXISTS postings_by_source ON folio_postings (tenant_id, source_type, source_id);

CREATE TABLE IF NOT EXISTS posting_taxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL, property_id uuid NOT NULL,
  posting_id uuid NOT NULL REFERENCES folio_postings(id),
  tax_rule_id uuid NOT NULL,
  amount numeric(14,4) NOT NULL, base_amount numeric(14,4) NOT NULL,
  currency char(3) NOT NULL
);
CREATE INDEX IF NOT EXISTS posting_taxes_posting ON posting_taxes (tenant_id, posting_id);

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL, property_id uuid NOT NULL,
  folio_id uuid NOT NULL REFERENCES folios(id),
  method payment_method NOT NULL,
  amount numeric(14,4) NOT NULL, currency char(3) NOT NULL,
  base_amount numeric(14,4) NOT NULL, fx_rate numeric(12,6) NOT NULL DEFAULT 1,
  status payment_status NOT NULL DEFAULT 'captured',
  psp_token text, reference text,
  posting_id uuid, refunds_payment_id uuid, cashier_session_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid
);
CREATE INDEX IF NOT EXISTS payments_folio ON payments (tenant_id, folio_id);

CREATE TABLE IF NOT EXISTS cashier_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL, property_id uuid NOT NULL,
  user_id text NOT NULL,
  status cashier_session_status NOT NULL DEFAULT 'open',
  opening_float numeric(14,4) NOT NULL DEFAULT 0,
  expected_total numeric(14,4), counted_total numeric(14,4), variance numeric(14,4),
  opened_at timestamptz NOT NULL DEFAULT now(), closed_at timestamptz,
  variance_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cashier_sessions_user ON cashier_sessions (tenant_id, property_id, user_id);

-- ─────────────────────────── General ledger ───────────────────────────
CREATE TABLE IF NOT EXISTS gl_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL, property_id uuid,
  code text NOT NULL, name text NOT NULL,
  type gl_account_type NOT NULL, normal_balance normal_balance NOT NULL,
  is_control text, parent_code text,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid
);
CREATE UNIQUE INDEX IF NOT EXISTS gl_accounts_tenant_code ON gl_accounts (tenant_id, code);

CREATE TABLE IF NOT EXISTS cost_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL, property_id uuid,
  code text NOT NULL, name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid
);
CREATE UNIQUE INDEX IF NOT EXISTS cost_centers_tenant_code ON cost_centers (tenant_id, code);

CREATE TABLE IF NOT EXISTS journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL, property_id uuid NOT NULL,
  business_date date NOT NULL,
  source journal_entry_source NOT NULL, source_id uuid,
  description text NOT NULL,
  currency char(3) NOT NULL DEFAULT 'USD',
  posted_at timestamptz NOT NULL DEFAULT now(), posted_by text
);
CREATE INDEX IF NOT EXISTS journal_entries_business_date ON journal_entries (tenant_id, property_id, business_date);
CREATE INDEX IF NOT EXISTS journal_entries_source ON journal_entries (tenant_id, source, source_id);

CREATE TABLE IF NOT EXISTS journal_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL, property_id uuid NOT NULL,
  journal_entry_id uuid NOT NULL REFERENCES journal_entries(id),
  business_date date NOT NULL,
  account_code text NOT NULL, cost_center_code text,
  debit numeric(14,4) NOT NULL DEFAULT 0,
  credit numeric(14,4) NOT NULL DEFAULT 0,
  currency char(3) NOT NULL DEFAULT 'USD',
  memo text,
  CONSTRAINT journal_line_one_side CHECK ((debit = 0) <> (credit = 0)),
  CONSTRAINT journal_line_nonneg CHECK (debit >= 0 AND credit >= 0)
);
CREATE INDEX IF NOT EXISTS journal_lines_entry ON journal_lines (journal_entry_id);
CREATE INDEX IF NOT EXISTS journal_lines_account ON journal_lines (tenant_id, property_id, account_code, business_date);
