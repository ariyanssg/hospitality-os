-- Phase 1 PMS groups: block inventory, cutoff, and master-folio metadata.

DO $$ BEGIN CREATE TYPE group_block_status AS ENUM ('tentative','definite','released'); EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS group_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  property_id uuid NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  status group_block_status NOT NULL DEFAULT 'tentative',
  arrival_date date NOT NULL,
  departure_date date NOT NULL,
  cutoff_date date,
  contact_name text,
  contact_email text,
  billing_instructions jsonb NOT NULL DEFAULT '{}'::jsonb,
  master_folio_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT group_block_date_order CHECK (departure_date > arrival_date)
);

CREATE UNIQUE INDEX IF NOT EXISTS group_blocks_code
  ON group_blocks (tenant_id, property_id, code);
CREATE INDEX IF NOT EXISTS group_blocks_property_dates
  ON group_blocks (tenant_id, property_id, arrival_date, status);

CREATE TABLE IF NOT EXISTS group_block_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  property_id uuid NOT NULL,
  group_block_id uuid NOT NULL REFERENCES group_blocks(id) ON DELETE CASCADE,
  room_type_id uuid NOT NULL,
  stay_date date NOT NULL,
  blocked integer NOT NULL,
  picked_up integer NOT NULL DEFAULT 0,
  rate_amount numeric(14,4),
  currency text NOT NULL DEFAULT 'USD',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT group_block_inventory_nonneg CHECK (blocked >= 0 AND picked_up >= 0),
  CONSTRAINT group_block_inventory_pickup_lte_blocked CHECK (picked_up <= blocked)
);

CREATE UNIQUE INDEX IF NOT EXISTS group_block_inventory_unique
  ON group_block_inventory (group_block_id, room_type_id, stay_date);
CREATE INDEX IF NOT EXISTS group_block_inventory_block
  ON group_block_inventory (tenant_id, property_id, group_block_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reservations_group_block_fk'
  ) THEN
    ALTER TABLE reservations
      ADD CONSTRAINT reservations_group_block_fk
      FOREIGN KEY (group_block_id) REFERENCES group_blocks(id);
  END IF;
END $$;
