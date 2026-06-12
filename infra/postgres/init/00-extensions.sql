-- Vela — required PostgreSQL extensions.
-- pgcrypto: gen_random_uuid() fallback. uuidv7() is provided in app code (PG16 lacks native uuidv7()).
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- UUIDv7 function (time-ordered UUID for better index performance — doc 07 §1).
CREATE OR REPLACE FUNCTION uuidv7()
RETURNS uuid AS $$
DECLARE
  v_timestamp BIGINT;
  v_random BYTEA;
BEGIN
  -- Get Unix timestamp in milliseconds
  v_timestamp := (EXTRACT(EPOCH FROM now()) * 1000)::BIGINT;
  
  -- Generate 10 random bytes
  v_random := gen_random_bytes(10);
  
  -- Construct UUIDv7:
  -- 48 bits of timestamp (ms) + 4 bits version (0111) + 12 bits random +
  -- 2 bits variant (10) + 62 bits random
  RETURN (
    lpad(to_hex((v_timestamp >> 16)::INT), 8, '0') ||
    lpad(to_hex((v_timestamp & 65535)::INT), 4, '0') ||
    '7' || lpad(to_hex((get_byte(v_random, 0) >> 4)::INT), 3, '0') ||
    lpad(to_hex((get_byte(v_random, 0) & 15) | 128), 2, '0') ||
    lpad(to_hex(get_byte(v_random, 1)::INT), 2, '0') ||
    lpad(encode(bytea_substr(v_random, 2, 6), 'hex'), 12, '0')
  )::uuid;
END;
$$ LANGUAGE plpgsql IMMUTABLE PARALLEL SAFE;
