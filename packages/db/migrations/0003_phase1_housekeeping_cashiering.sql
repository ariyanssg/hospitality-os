-- Phase 1: housekeeping & maintenance, deposits, room status log (doc modules/01, modules/02).
-- Mirrors packages/db/src/schema/{housekeeping,folio}.ts. RLS is applied at runtime from src/rls.ts.

-- ─────────────────────────────── Enums ───────────────────────────────
DO $$ BEGIN CREATE TYPE deposit_status AS ENUM ('held','applied','refunded'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE hk_task_type AS ENUM ('departure_clean','stayover','turndown','deep_clean','inspection'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE hk_task_status AS ENUM ('pending','in_progress','done','skipped'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE maintenance_status AS ENUM ('reported','triaged','assigned','in_progress','done','verified','cancelled'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE maintenance_priority AS ENUM ('low','medium','high','urgent'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─────────────────────────── Housekeeping ───────────────────────────
CREATE TABLE IF NOT EXISTS housekeeping_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL, property_id uuid NOT NULL,
  room_id uuid NOT NULL REFERENCES rooms(id),
  reservation_id uuid,
  task_type hk_task_type NOT NULL,
  status hk_task_status NOT NULL DEFAULT 'pending',
  priority text NOT NULL DEFAULT 'normal',
  due_date date NOT NULL,
  assigned_to uuid,
  notes text,
  started_at timestamptz, completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid
);
CREATE INDEX IF NOT EXISTS hk_tasks_board ON housekeeping_tasks (tenant_id, property_id, due_date, status);
CREATE INDEX IF NOT EXISTS hk_tasks_room ON housekeeping_tasks (tenant_id, room_id);

CREATE TABLE IF NOT EXISTS maintenance_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL, property_id uuid NOT NULL,
  room_id uuid,
  category text NOT NULL,
  priority maintenance_priority NOT NULL DEFAULT 'medium',
  status maintenance_status NOT NULL DEFAULT 'reported',
  title text NOT NULL,
  description text,
  reported_by uuid, assigned_to uuid,
  resolution_notes text,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid
);
CREATE INDEX IF NOT EXISTS maintenance_open ON maintenance_tickets (tenant_id, property_id, status);
CREATE INDEX IF NOT EXISTS maintenance_room ON maintenance_tickets (tenant_id, room_id);

CREATE TABLE IF NOT EXISTS room_status_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL, property_id uuid NOT NULL,
  room_id uuid NOT NULL REFERENCES rooms(id),
  hk_status room_hk_status NOT NULL,
  occupancy room_occupancy NOT NULL,
  reason text,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS room_status_log_room ON room_status_log (tenant_id, room_id, created_at);

-- ─────────────────────────── Deposits ───────────────────────────
CREATE TABLE IF NOT EXISTS deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL, property_id uuid NOT NULL,
  reservation_id uuid NOT NULL,
  method payment_method NOT NULL,
  amount numeric(14,4) NOT NULL,
  currency char(3) NOT NULL,
  status deposit_status NOT NULL DEFAULT 'held',
  reference text,
  applied_posting_id uuid,
  held_at timestamptz NOT NULL DEFAULT now(),
  applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid
);
CREATE INDEX IF NOT EXISTS deposits_reservation ON deposits (tenant_id, reservation_id);
