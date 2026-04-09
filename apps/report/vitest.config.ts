import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.spec.ts', 'src/**/*.spec.ts'],
    testTimeout: 20_000, // PDF generation can be slow
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/report/**/*.ts', 'src/pdf/**/*.ts'],
      exclude: ['**/*.spec.ts', '**/interfaces/**', '**/test-fixtures/**', '**/templates/**'],
    },
  },
  resolve: {
    alias: {
      '@report': resolve(__dirname, 'src/report'),
      '@pdf': resolve(__dirname, 'src/pdf'),
    },
  },
});
