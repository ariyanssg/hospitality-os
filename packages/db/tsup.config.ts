import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.ts', schema: 'src/schema/index.ts', rls: 'src/rls.ts' },
  format: ['cjs'],
  target: 'node20',
  clean: true,
  sourcemap: true,
  dts: true,
});
