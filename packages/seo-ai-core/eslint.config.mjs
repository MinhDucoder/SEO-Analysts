import { config as baseConfig } from '@repo/eslint-config/base';
import { createRequire } from 'module';

// only-warn is a global Linter.prototype monkey-patch loaded on import of base.
// Disable the patch immediately so our adapter-boundary rule fires as 'error'.
const require = createRequire(import.meta.url);
const onlyWarn = require('eslint-plugin-only-warn');
onlyWarn.disable();

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...baseConfig,
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@langchain/*', 'langchain', 'langchain/*'],
              message:
                'LangChain imports are forbidden outside src/llm/adapters/. This is the adapter-boundary rule — see docs/superpowers/specs/2026-04-19-seo-ai-core-mvp-design.md § 1.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/llm/adapters/**/*.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
];
