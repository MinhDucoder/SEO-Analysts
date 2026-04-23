// Adapter boundary: @langchain/* may only be imported from
// src/llm/adapters/**. Breaking this rule reintroduces vendor
// lock-in and must be caught by CI.

import { config as base } from '@repo/eslint-config/base';

export default [
  ...base,
  {
    ignores: ['dist/**', 'node_modules/**', '.turbo/**', 'coverage/**'],
  },
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@langchain/*'],
              message:
                'Import @langchain/* only from src/llm/adapters/** to preserve the adapter boundary.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/llm/adapters/**/*.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },
];
