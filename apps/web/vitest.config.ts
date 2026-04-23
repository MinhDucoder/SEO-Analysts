import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.spec.ts', 'test/**/*.spec.tsx'],
    alias: { '@': resolve(__dirname, 'src') },
    env: {
      NEXT_PUBLIC_API_BASE: 'http://api.test/v1',
    },
  },
});
