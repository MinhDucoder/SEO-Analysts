import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.spec.ts', 'examples/**/*.smoke.spec.ts'],
    environment: 'node',
    globals: false,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/types.ts'],
      thresholds: {
        'src/guardrails/**': { branches: 80, functions: 80 },
        'src/chains/rag.chain.ts': { branches: 80, functions: 80 },
      },
    },
  },
});
