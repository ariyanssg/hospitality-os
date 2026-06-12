-- Phase 1: POS wedge, public booking sessions, guest messaging, GDPR baseline.

DO $$ BEGIN CREATE TYPE pos_check_status AS ENUM ('open','fired','closed','voided'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE pos_order_item_status AS ENUM ('new','fired','ready','served','voided'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE pos_shift_status AS ENUM ('open','closed'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE offline_op_status AS ENUM ('queued','applied','rejected'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE booking_session_status AS ENUM ('started','confirmed','cancelled','expired'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE message_channel AS ENUM ('email','sms'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE conversation_status AS ENUM ('open','pending','closed'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE gdpr_request_status AS ENUM ('received','verifying','processing','completed','rejected'); EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS pos_outlets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL, property_id uuid NOT NULL,
  code text NOT NULL, name text NOT NULL, currency char(3) NOT NULL DEFAULT 'USD',
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid
);
CREATE INDEX IF NOT EXISTS pos_outlets_property ON pos_outlets (tenant_id, property_id);

CREATE TABLE IF NOT EXISTS pos_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL, property_id uuid NOT NULL,
  outlet_id uuid NOT NULL REFERENCES pos_outlets(id),
  label text NOT NULL, section text, seats integer NOT NULL DEFAULT 2,
  x integer NOT NULL DEFAULT 0, y integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid
);
CREATE INDEX IF NOT EXISTS pos_tables_outlet ON pos_tables (tenant_id, outlet_id);

CREATE TABLE IF NOT EXISTS pos_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL, property_id uuid NOT NULL,
  outlet_id uuid NOT NULL REFERENCES pos_outlets(id),
  table_id uuid,
  check_number text NOT NULL,
  status pos_check_status NOT NULL DEFAULT 'open',
  covers integer NOT NULL DEFAULT 1,
  subtotal numeric(14,4) NOT NULL DEFAULT 0,
  discount_total numeric(14,4) NOT NULL DEFAULT 0,
  tax_total numeric(14,4) NOT NULL DEFAULT 0,
  total numeric(14,4) NOT NULL DEFAULT 0,
  currency char(3) NOT NULL DEFAULT 'USD',
  room_folio_id uuid,
  opened_by text, closed_by text,
  opened_at timestamptz NOT NULL DEFAULT now(), closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid
);
CREATE INDEX IF NOT EXISTS pos_checks_outlet ON pos_checks (tenant_id, property_id, outlet_id, status);
CREATE INDEX IF NOT EXISTS pos_checks_room_folio ON pos_checks (tenant_id, room_folio_id);

CREATE TABLE IF NOT EXISTS pos_check_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL, property_id uuid NOT NULL,
  check_id uuid NOT NULL REFERENCES pos_checks(id),
  name text NOT NULL, course text,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(14,4) NOT NULL,
  line_total numeric(14,4) NOT NULL,
  status pos_order_item_status NOT NULL DEFAULT 'new',
  void_reason text,
  fired_at timestamptz, ready_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pos_items_check ON pos_check_items (tenant_id, check_id);

CREATE TABLE IF NOT EXISTS pos_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL, property_id uuid NOT NULL,
  check_id uuid NOT NULL REFERENCES pos_checks(id),
  method payment_method NOT NULL,
  amount numeric(14,4) NOT NULL,
  currency char(3) NOT NULL,
  reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pos_payments_check ON pos_payments (tenant_id, check_id);

CREATE TABLE IF NOT EXISTS pos_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL, property_id uuid NOT NULL,
  outlet_id uuid NOT NULL REFERENCES pos_outlets(id),
  user_id text NOT NULL,
  status pos_shift_status NOT NULL DEFAULT 'open',
  expected_total numeric(14,4), counted_total numeric(14,4), variance numeric(14,4),
  opened_at timestamptz NOT NULL DEFAULT now(), closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pos_shifts_user ON pos_shifts (tenant_id, property_id, outlet_id, user_id, status);

CREATE TABLE IF NOT EXISTS offline_ops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL, property_id uuid NOT NULL,
  device_id text NOT NULL, op_key text NOT NULL,
  status offline_op_status NOT NULL DEFAULT 'queued',
  payload jsonb NOT NULL,
  applied_at timestamptz, rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS offline_ops_device ON offline_ops (tenant_id, property_id, device_id, status);

CREATE TABLE IF NOT EXISTS booking_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL, property_id uuid NOT NULL,
  status booking_session_status NOT NULL DEFAULT 'started',
  arrival_date date NOT NULL, departure_date date NOT NULL,
  room_type_id uuid NOT NULL, rate_plan_id uuid NOT NULL,
  adults text NOT NULL DEFAULT '1', children text NOT NULL DEFAULT '0',
  quoted_total numeric(14,4) NOT NULL, currency char(3) NOT NULL,
  guest jsonb NOT NULL, source jsonb NOT NULL,
  reservation_id uuid, expires_at timestamptz NOT NULL,
  confirmed_at timestamptz, cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid
);
CREATE INDEX IF NOT EXISTS booking_sessions_property ON booking_sessions (tenant_id, property_id, status, expires_at);

CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL, property_id uuid NOT NULL,
  guest_id uuid,
  status conversation_status NOT NULL DEFAULT 'open',
  channel message_channel NOT NULL,
  subject text, assignee_id text, sentiment text,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid
);
CREATE INDEX IF NOT EXISTS conversations_inbox ON conversations (tenant_id, property_id, status, last_message_at);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL, property_id uuid NOT NULL,
  conversation_id uuid REFERENCES conversations(id),
  guest_id uuid,
  channel message_channel NOT NULL,
  direction text NOT NULL,
  template_key text,
  subject text,
  body text NOT NULL,
  provider_message_id text,
  metadata jsonb NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_conversation ON messages (tenant_id, conversation_id, sent_at);

CREATE TABLE IF NOT EXISTS gdpr_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL, property_id uuid NOT NULL,
  guest_id uuid,
  request_type text NOT NULL,
  status gdpr_request_status NOT NULL DEFAULT 'received',
  requester_email text NOT NULL,
  notes text,
  due_at timestamptz NOT NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid
);
CREATE INDEX IF NOT EXISTS gdpr_requests_queue ON gdpr_requests (tenant_id, property_id, status, due_at);
