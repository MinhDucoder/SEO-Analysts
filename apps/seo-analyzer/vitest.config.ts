import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['test/setup.ts'],
    include: ['test/**/*.spec.ts', 'test/**/*.e2e-spec.ts', 'src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/analyzer/**/*.ts'],
      exclude: ['**/*.spec.ts', '**/interfaces/**', '**/test-fixtures/**'],
    },
  },
  resolve: {
    alias: {
      '@analyzer': resolve(__dirname, 'src/analyzer'),
    },
  },
});
