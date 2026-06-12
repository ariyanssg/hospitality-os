CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  property_id uuid REFERENCES properties(id),
  name text NOT NULL,
  url text NOT NULL,
  secret text NOT NULL,
  event_types text[] NOT NULL,
  status text NOT NULL DEFAULT 'active',
  failure_count integer NOT NULL DEFAULT 0,
  last_delivered_at timestamptz,
  last_failed_at timestamptz,
  disabled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS webhook_endpoints_tenant ON webhook_endpoints (tenant_id);
CREATE INDEX IF NOT EXISTS webhook_endpoints_active ON webhook_endpoints (tenant_id, status);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  property_id uuid REFERENCES properties(id),
  endpoint_id uuid NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  event_id uuid NOT NULL,
  event_type text NOT NULL,
  attempt integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending',
  status_code integer,
  error text,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS webhook_delivery_attempt_unique
  ON webhook_deliveries (endpoint_id, event_id, attempt);
CREATE INDEX IF NOT EXISTS webhook_deliveries_due
  ON webhook_deliveries (status, next_attempt_at);
CREATE INDEX IF NOT EXISTS webhook_deliveries_endpoint
  ON webhook_deliveries (tenant_id, endpoint_id, created_at);
