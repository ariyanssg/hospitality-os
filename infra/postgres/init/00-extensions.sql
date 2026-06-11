-- Vela — required PostgreSQL extensions.
-- pgcrypto: gen_random_uuid() fallback. uuidv7() is provided in app code (PG16 lacks native uuidv7()).
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
