import { defineConfig } from 'vitest/config';

/** Integration tests use Testcontainers — generous timeouts for image pull + container start. */
export default defineConfig({
  test: {
    include: ['test/**/*.spec.ts'],
    environment: 'node',
    testTimeout: 60_000,
    hookTimeout: 180_000,
  },
});
