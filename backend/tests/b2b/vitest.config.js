// @ts-check
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.test.js'],
    testTimeout: 20_000,
    hookTimeout: 180_000, // first run downloads the MongoDB test binary
  },
});
