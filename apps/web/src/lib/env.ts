/**
 * @file Runtime environment accessor for the web app. `process.env`
 * in Next client code is statically baked at build time for
 * `NEXT_PUBLIC_*` vars. Missing at build time falls back to the
 * local-dev gateway so builds succeed in CI where the env isn't
 * set; runtime consumers see the baked value.
 */
const DEFAULT_API_BASE = 'http://localhost:3000/api/v1';

export const env = {
  apiBase: process.env.NEXT_PUBLIC_API_BASE ?? DEFAULT_API_BASE,
};
