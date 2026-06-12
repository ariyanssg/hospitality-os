-- Settings module catalogs: floors, room amenities, configurable rooms, charges, and payment methods.

CREATE TABLE IF NOT EXISTS floors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL, property_id uuid NOT NULL,
  code text NOT NULL, name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid
);
CREATE UNIQUE INDEX IF NOT EXISTS floors_tenant_property_code ON floors (tenant_id, property_id, code);
CREATE INDEX IF NOT EXISTS floors_property ON floors (tenant_id, property_id, sort_order);

ALTER TABLE rooms ADD COLUMN IF NOT EXISTS floor_id uuid REFERENCES floors(id);
CREATE INDEX IF NOT EXISTS rooms_by_floor ON rooms (tenant_id, property_id, floor_id);

INSERT INTO floors (tenant_id, property_id, code, name, sort_order)
SELECT DISTINCT
  r.tenant_id,
  r.property_id,
  r.floor,
  'Floor ' || r.floor,
  CASE WHEN r.floor ~ '^[0-9]+$' THEN r.floor::int ELSE 0 END
FROM rooms r
WHERE r.floor IS NOT NULL AND btrim(r.floor) <> ''
ON CONFLICT (tenant_id, property_id, code) DO NOTHING;

UPDATE rooms r
SET floor_id = f.id
FROM floors f
WHERE r.floor_id IS NULL
  AND r.tenant_id = f.tenant_id
  AND r.property_id = f.property_id
  AND r.floor = f.code;

CREATE TABLE IF NOT EXISTS room_amenities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL, property_id uuid NOT NULL,
  code text NOT NULL, name text NOT NULL,
  category text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid
);
CREATE UNIQUE INDEX IF NOT EXISTS room_amenities_tenant_property_code ON room_amenities (tenant_id, property_id, code);
CREATE INDEX IF NOT EXISTS room_amenities_property ON room_amenities (tenant_id, property_id, category);

CREATE TABLE IF NOT EXISTS room_amenity_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL, property_id uuid NOT NULL,
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  amenity_id uuid NOT NULL REFERENCES room_amenities(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS room_amenity_assignments_unique ON room_amenity_assignments (room_id, amenity_id);
CREATE INDEX IF NOT EXISTS room_amenity_assignments_room ON room_amenity_assignments (tenant_id, property_id, room_id);

CREATE TABLE IF NOT EXISTS payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL, property_id uuid NOT NULL,
  code text NOT NULL, name text NOT NULL,
  category text NOT NULL DEFAULT 'payment',
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid
);
CREATE UNIQUE INDEX IF NOT EXISTS payment_methods_tenant_property_code ON payment_methods (tenant_id, property_id, code);
CREATE INDEX IF NOT EXISTS payment_methods_property ON payment_methods (tenant_id, property_id, sort_order);

ALTER TABLE payments ALTER COLUMN method TYPE text USING method::text;
ALTER TABLE deposits ALTER COLUMN method TYPE text USING method::text;
ALTER TABLE pos_payments ALTER COLUMN method TYPE text USING method::text;
ALTER TABLE payment_intents ALTER COLUMN method DROP DEFAULT;
ALTER TABLE payment_intents ALTER COLUMN method TYPE text USING method::text;
ALTER TABLE payment_intents ALTER COLUMN method SET DEFAULT 'card';

INSERT INTO payment_methods (tenant_id, property_id, code, name, category, sort_order)
SELECT
  p.tenant_id,
  p.id,
  v.code,
  v.name,
  'payment',
  v.sort_order
FROM properties p
CROSS JOIN (
  VALUES
    ('card', 'Card', 10),
    ('cash', 'Cash', 20),
    ('bank_transfer', 'Bank transfer', 30),
    ('ar_transfer', 'AR transfer', 40),
    ('voucher', 'Voucher', 50)
) AS v(code, name, sort_order)
ON CONFLICT (tenant_id, property_id, code) DO NOTHING;
