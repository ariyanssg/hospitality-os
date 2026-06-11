import { defineConfig } from 'vitest/config';

/**
 * Unit/property tests only (test/**). Integration tests that boot Nest live under a separate config
 * (they need SWC for decorator metadata); these specs import plain modules (e.g. Money) directly.
 */
export default defineConfig({
  test: {
    include: ['test/**/*.spec.ts'],
    environment: 'node',
  },
});
