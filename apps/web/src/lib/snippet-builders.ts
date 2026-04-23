/**
 * @file Pure string builders for "Copy as cURL / JS / response".
 * Kept pure (no React, no DOM) so they're trivially unit-testable.
 */
import type { PublicCheckRequest } from '@/types/api';

export function buildCurl(apiBase: string, apiKey: string, body: PublicCheckRequest): string {
  const key = apiKey || '<YOUR_API_KEY>';
  const json = JSON.stringify(body);
  return [
    `curl -X POST '${apiBase}/public/check' \\`,
    `  -H 'authorization: Bearer ${key}' \\`,
    `  -H 'content-type: application/json' \\`,
    `  --data '${json.replace(/'/g, `'\\''`)}'`,
  ].join('\n');
}

export function buildJs(apiBase: string, apiKey: string, body: PublicCheckRequest): string {
  const key = apiKey || '<YOUR_API_KEY>';
  return [
    `const res = await fetch('${apiBase}/public/check', {`,
    `  method: 'POST',`,
    `  headers: {`,
    `    Authorization: 'Bearer ${key}',`,
    `    'Content-Type': 'application/json',`,
    `  },`,
    `  body: JSON.stringify(${JSON.stringify(body, null, 2)}),`,
    `});`,
    `const data = await res.json();`,
    `console.log(data);`,
  ].join('\n');
}

export function buildResponseCopy(response: unknown): string {
  return JSON.stringify(response, null, 2);
}
