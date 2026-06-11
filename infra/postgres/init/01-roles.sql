-- Vela — database role setup (doc 05 §2).
-- The container superuser is `vela_admin` (used for migrations + platform jobs only).
-- The application connects as `vela_app`: a NON-superuser role WITHOUT BYPASSRLS.
-- A missing `SET LOCAL app.tenant_id` therefore yields ZERO rows, never all rows (fail closed).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'vela_app') THEN
    CREATE ROLE vela_app LOGIN PASSWORD 'vela_app' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
END
$$;

GRANT CONNECT ON DATABASE vela TO vela_app;
GRANT USAGE ON SCHEMA public TO vela_app;

-- The app role gets DML on all current + future tables, but NOT DDL and NOT BYPASSRLS.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO vela_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO vela_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO vela_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO vela_app;

-- Per-role guardrail: cap statement time for the request-path role class (doc 05 §3).
ALTER ROLE vela_app SET statement_timeout = '15s';
ALTER ROLE vela_app SET idle_in_transaction_session_timeout = '30s';
