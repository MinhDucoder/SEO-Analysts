import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/keyword/**/*.ts'],
      exclude: ['src/keyword/**/*.spec.ts', 'src/keyword/**/*.module.ts'],
    },
    testTimeout: 10000,
  },
});
