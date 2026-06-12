CREATE TABLE IF NOT EXISTS registration_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  property_id uuid NOT NULL,
  reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  guest_id uuid REFERENCES guests(id),
  status text NOT NULL DEFAULT 'signed',
  terms_version text NOT NULL,
  signature_hash text NOT NULL,
  signer_name text NOT NULL,
  signed_at timestamptz NOT NULL DEFAULT now(),
  consent jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  updated_by text,
  CONSTRAINT registration_cards_status CHECK (status IN ('signed','voided'))
);

CREATE INDEX IF NOT EXISTS registration_cards_res
  ON registration_cards (tenant_id, property_id, reservation_id);

CREATE UNIQUE INDEX IF NOT EXISTS registration_cards_latest_signed
  ON registration_cards (tenant_id, reservation_id)
  WHERE status = 'signed';
