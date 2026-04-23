import { config as base } from '@repo/eslint-config/base';

export default [
  ...base,
  {
    ignores: ['dist/**', 'node_modules/**', '.turbo/**', 'coverage/**'],
  },
];
