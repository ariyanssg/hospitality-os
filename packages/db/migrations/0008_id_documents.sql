CREATE TABLE IF NOT EXISTS id_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  property_id uuid NOT NULL,
  reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  guest_id uuid NOT NULL REFERENCES guests(id),
  document_type text NOT NULL,
  issuing_country text,
  document_hash text NOT NULL,
  artifact_ref text,
  expiry_date date,
  verification_status text NOT NULL DEFAULT 'verified',
  verified_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  updated_by text,
  CONSTRAINT id_documents_status CHECK (verification_status IN ('pending','verified','rejected')),
  CONSTRAINT id_documents_type CHECK (document_type IN ('passport','national_id','drivers_license','residence_permit','other'))
);

CREATE INDEX IF NOT EXISTS id_documents_res
  ON id_documents (tenant_id, property_id, reservation_id);

CREATE INDEX IF NOT EXISTS id_documents_guest
  ON id_documents (tenant_id, guest_id);
