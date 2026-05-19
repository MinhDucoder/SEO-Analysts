import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@repo/seo-ai-core': fileURLToPath(new URL('./src/index.ts', import.meta.url)),
    },
  },
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
