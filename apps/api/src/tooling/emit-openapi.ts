import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildOpenApiDocument } from '@vela/contracts/openapi';

/** Emits the OpenAPI document generated from the Zod contracts (doc 08 §7). */
const out = resolve(process.cwd(), 'openapi.json');
writeFileSync(out, JSON.stringify(buildOpenApiDocument(), null, 2) + '\n');
console.warn(`Wrote ${out}`);
