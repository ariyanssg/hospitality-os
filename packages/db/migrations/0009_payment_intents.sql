CREATE TABLE IF NOT EXISTS payment_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  property_id uuid NOT NULL,
  folio_id uuid NOT NULL REFERENCES folios(id),
  method payment_method NOT NULL DEFAULT 'card',
  status text NOT NULL DEFAULT 'requires_authorization',
  amount numeric(14,4) NOT NULL,
  captured_amount numeric(14,4) NOT NULL DEFAULT 0,
  currency char(3) NOT NULL,
  psp_provider text NOT NULL DEFAULT 'manual',
  psp_token text NOT NULL,
  provider_intent_id text,
  provider_authorization_id text,
  captured_payment_id uuid,
  authorized_at timestamptz,
  captured_at timestamptz,
  voided_at timestamptz,
  failure_reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT payment_intents_status CHECK (
    status IN ('requires_authorization','authorized','captured','voided','failed')
  )
);

CREATE INDEX IF NOT EXISTS payment_intents_folio
  ON payment_intents (tenant_id, property_id, folio_id, status);

CREATE INDEX IF NOT EXISTS payment_intents_provider
  ON payment_intents (tenant_id, provider_intent_id);
