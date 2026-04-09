import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['test/setup.ts'],
    include: ['test/**/*.spec.ts', 'test/**/*.e2e-spec.ts', 'src/**/*.spec.ts'],
    testTimeout: 60_000, // Playwright + Lighthouse can be slow
    hookTimeout: 60_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/crawler/**/*.ts'],
      exclude: ['**/*.spec.ts', '**/interfaces/**'],
    },
  },
  resolve: {
    alias: {
      '@crawler': resolve(__dirname, 'src/crawler'),
    },
  },
});
