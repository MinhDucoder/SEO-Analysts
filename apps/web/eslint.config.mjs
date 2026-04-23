import { config as base } from '@repo/eslint-config/base';

export default [
  ...base,
  {
    ignores: ['.next/**', 'node_modules/**', '.turbo/**', 'playwright-report/**', 'test-results/**'],
  },
];
