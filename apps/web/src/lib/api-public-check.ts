/**
 * @file POST /public/check with Bearer sk_* instead of JWT. A
 * dedicated `runPublicCheck` builds its own fetch call because the
 * ApiClient scaffolding assumes JWT; the playground sends a user-
 * supplied API key (sk_live_... / sk_test_...).
 */
import type { PublicCheckRequest, PublicCheckResponse } from '@/types/api';
import { ApiError } from './api';
import { env } from './env';

export async function runPublicCheck(
  apiKey: string,
  body: PublicCheckRequest,
  signal?: AbortSignal,
): Promise<PublicCheckResponse> {
  const res = await fetch(`${env.apiBase}/public/check`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    let payload: unknown = null;
    try {
      payload = await res.json();
    } catch {
      /* ignore */
    }
    const p = payload as { message?: string; code?: string } | null;
    throw new ApiError(p?.message ?? `HTTP ${res.status}`, res.status, p?.code, payload);
  }
  return (await res.json()) as PublicCheckResponse;
}
