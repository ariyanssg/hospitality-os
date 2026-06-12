-- Platform administration: global (non-tenant) RBAC for superadmins + platform audit trail.
-- These tables deliberately carry NO tenant_id column — they are global like users/sessions,
-- so they take no RLS policies and are reachable only through the admin connection
-- (PlatformUnitOfWork), never from tenant request paths.

CREATE TABLE IF NOT EXISTS platform_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid
);

CREATE TABLE IF NOT EXISTS platform_role_permissions (
  role_id uuid NOT NULL REFERENCES platform_roles(id) ON DELETE CASCADE,
  -- Concrete `platform.*` key from PLATFORM_CATALOG — wildcards expand at role-save time,
  -- mirroring role_permissions.
  permission_key text NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS platform_role_permissions_pk
  ON platform_role_permissions (role_id, permission_key);

CREATE TABLE IF NOT EXISTS platform_role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES platform_roles(id) ON DELETE CASCADE,
  is_deny boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid
);
CREATE UNIQUE INDEX IF NOT EXISTS platform_role_assignments_user_role
  ON platform_role_assignments (user_id, role_id);
CREATE INDEX IF NOT EXISTS platform_role_assignments_user
  ON platform_role_assignments (user_id);

-- Global audit trail for platform actions. target_tenant_id is an attribute of the action
-- (which hotel it concerned), NOT a row-scoping key — hence not named tenant_id.
CREATE TABLE IF NOT EXISTS platform_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id text,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  before jsonb,
  after jsonb,
  reason text,
  ip text,
  correlation_id text NOT NULL,
  target_tenant_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS platform_audit_entity ON platform_audit_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS platform_audit_created ON platform_audit_log (created_at);
CREATE INDEX IF NOT EXISTS platform_audit_tenant ON platform_audit_log (target_tenant_id);

-- System platform role; its permission rows are synced from the TS catalog by the
-- superadmin bootstrap (tooling/create-superadmin) and seed.
INSERT INTO platform_roles (key, name, description, is_system)
VALUES ('platform_superadmin', 'Platform Superadmin', 'Full platform administration', true)
ON CONFLICT (key) DO NOTHING;
