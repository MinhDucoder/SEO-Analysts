import { config as baseConfig } from '@repo/eslint-config/base';
import { createRequire } from 'module';

// IMPORTANT — ESM hoisting behavior:
// Static `import` statements are hoisted and evaluated BEFORE any module body code,
// regardless of where they appear in source. Execution order here is:
//   1. base.js evaluates → its `import onlyWarn from "eslint-plugin-only-warn"` runs
//      → enable() patches Linter.prototype.verify
//   2. This module body executes → require() retrieves the same CJS-cached instance
//      → disable() unpatches Linter.prototype.verify
// So this disable() runs AFTER base config import, not before — and that is exactly
// what we want.
//
// Why we need it: only-warn (inherited from @repo/eslint-config/base) monkey-patches
// Linter.prototype.verify to downgrade ALL `error` severities to `warning`. Without
// disable(), the adapter-boundary rule below would silently degrade to a warning,
// defeating its load-bearing enforcement.
//
// See spec § 1: docs/superpowers/specs/2026-04-19-seo-ai-core-mvp-design.md
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
