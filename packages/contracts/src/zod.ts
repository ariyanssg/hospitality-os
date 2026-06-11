import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

// Adds `.openapi()` metadata support so the same Zod schemas validate requests AND generate the
// OpenAPI spec (doc 08 §7 — the spec is generated from code, never hand-maintained).
extendZodWithOpenApi(z);

export { z };
