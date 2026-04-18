import { nextJsConfig } from "@repo/eslint-config/next-js";

/** @type {import("eslint").Linter.Config} */
export default [
  ...nextJsConfig,
  {
    ignores: ["**/.next/**", "**/node_modules/**", "**/coverage/**", "**/playwright-report/**", "**/test-results/**"],
  },
  {
    // App Router — no /pages dir. Disable Pages-Router-only lint rule that
    // otherwise errors when it cannot locate `pages/` or `src/pages/`.
    rules: {
      "@next/next/no-html-link-for-pages": "off",
    },
  },
];
