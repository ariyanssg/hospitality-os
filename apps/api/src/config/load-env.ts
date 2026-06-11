/**
 * Loads the repo-root `.env` into process.env for local dev. NestJS (`nest start`, `node dist/main`)
 * does not read `.env` on its own, so without this the API falls back to the built-in connection
 * defaults and fails to reach the dev database. Production injects real env and this is a no-op
 * (every key it would set is already present, and it never overrides).
 *
 * Imported for its side effect at the top of config/env.ts, so any code path that reads env is safe.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

function findEnvFile(): string | undefined {
  const starts = [process.cwd(), __dirname];
  for (const start of starts) {
    let dir = start;
    for (let i = 0; i < 6; i++) {
      const candidate = join(dir, '.env');
      if (existsSync(candidate)) return candidate;
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  return undefined;
}

function parseEnv(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) out[key] = value;
  }
  return out;
}

let loaded = false;
export function loadRootEnv(): void {
  if (loaded) return;
  loaded = true;
  const file = findEnvFile();
  if (!file) return;
  try {
    const vars = parseEnv(readFileSync(file, 'utf8'));
    for (const [key, value] of Object.entries(vars)) {
      // Never override an already-set variable (CI / container / demo child env wins).
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    /* best-effort in dev only */
  }
}

loadRootEnv();
