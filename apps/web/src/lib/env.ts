/**
 * @file Runtime environment accessor for the web app. `process.env`
 * in Next client code is statically baked at build time for
 * `NEXT_PUBLIC_*` vars; this helper fails fast when absent so we
 * never make a request with an empty base URL.
 */
function required(name: string, value: string | undefined): string {
  if (!value || value.length === 0) {
    throw new Error(`Missing required env var ${name}`);
  }
  return value;
}

export const env = {
  apiBase: required('NEXT_PUBLIC_API_BASE', process.env.NEXT_PUBLIC_API_BASE),
};
