CREATE TABLE IF NOT EXISTS key_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  property_id uuid NOT NULL,
  reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  room_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'requested',
  provider text NOT NULL DEFAULT 'manual',
  key_count integer NOT NULL DEFAULT 1,
  encoded_at timestamptz,
  expires_at timestamptz,
  encoder_ref text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  updated_by text,
  CONSTRAINT key_cards_status CHECK (status IN ('requested','encoded','failed','voided')),
  CONSTRAINT key_cards_count_positive CHECK (key_count > 0)
);

CREATE INDEX IF NOT EXISTS key_cards_res
  ON key_cards (tenant_id, property_id, reservation_id);

CREATE INDEX IF NOT EXISTS key_cards_room
  ON key_cards (tenant_id, property_id, room_id, status);
