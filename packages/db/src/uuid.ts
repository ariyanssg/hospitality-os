import { uuidv7 as generate } from 'uuidv7';

/**
 * UUIDv7 — time-ordered, index-friendly, no insert hotspot, safe to expose (doc 07 §1).
 * The single source of identity generation in application code; the DB carries a
 * gen_random_uuid() default only as a fallback for SQL-seeded rows.
 */
export function uuidv7(): string {
  return generate();
}
