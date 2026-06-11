import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.ts', sdk: 'src/sdk/index.ts', openapi: 'src/openapi.ts' },
  format: ['cjs'],
  target: 'node20',
  clean: true,
  sourcemap: true,
  dts: true,
});
