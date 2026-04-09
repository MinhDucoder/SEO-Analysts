import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    // SWC plugin emits full reflect-metadata calls (emitDecoratorMetadata)
    // which esbuild cannot do — required for NestJS constructor DI in tests.
    swc.vite({
      module: { type: 'es6' },
      jsc: {
        parser: { syntax: 'typescript', decorators: true },
        transform: { decoratorMetadata: true },
        target: 'es2022',
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts', '**/*.e2e-spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/keyword/**/*.ts'],
      exclude: ['src/keyword/**/*.spec.ts', 'src/keyword/**/*.module.ts'],
    },
    testTimeout: 10000,
  },
});
