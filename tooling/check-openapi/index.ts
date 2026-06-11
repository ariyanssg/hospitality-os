/**
 * OpenAPI drift gate (doc 08 §7, IMPLEMENTATION §5).
 *
 * The OpenAPI document is generated from the Zod contracts (code-first). This check regenerates it
 * and diffs against the committed `openapi.json` at the repo root. A mismatch means the contract
 * changed without the spec being regenerated — fail CI and tell the dev to run `pnpm openapi:emit`.
 *
 *     pnpm check:openapi          # verify (CI)
 *     pnpm openapi:emit           # regenerate + write
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildOpenApiDocument } from '@vela/contracts/openapi';

const OUT = resolve(import.meta.dirname, '..', '..', 'openapi.json');
const WRITE = process.argv.includes('--write') || process.env.OPENAPI_WRITE === '1';

function serialize(): string {
  return JSON.stringify(buildOpenApiDocument(), null, 2) + '\n';
}

function main(): void {
  const next = serialize();

  if (WRITE) {
    writeFileSync(OUT, next);
    console.warn(`✓ wrote ${OUT}`);
    return;
  }

  if (!existsSync(OUT)) {
    console.error('✖ openapi.json does not exist. Run `pnpm openapi:emit` and commit it.');
    process.exit(1);
  }

  const current = readFileSync(OUT, 'utf8');
  if (current !== next) {
    console.error('✖ openapi.json is OUT OF DATE with the Zod contracts.');
    console.error('  Run `pnpm openapi:emit` and commit the result.');
    // Show a short hint of where they diverge.
    const a = current.split('\n');
    const b = next.split('\n');
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      if (a[i] !== b[i]) {
        console.error(`  first diff at line ${i + 1}:`);
        console.error(`    committed: ${a[i] ?? '<eof>'}`);
        console.error(`    generated: ${b[i] ?? '<eof>'}`);
        break;
      }
    }
    process.exit(1);
  }

  console.warn('✓ openapi.json is in sync with the Zod contracts.');
}

main();
