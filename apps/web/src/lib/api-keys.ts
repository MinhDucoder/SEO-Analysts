/**
 * @file Typed wrappers around ApiClient for /users/me/api-keys.
 * Thin layer — each function is 3-4 lines — but centralizing the URL
 * path + return type avoids drift between consumers.
 */
import type { ApiClient } from './api';
import type { ApiKeyDto, CreateApiKeyInput, CreateApiKeyResponse } from '@/types/api';

export async function listApiKeys(client: ApiClient): Promise<ApiKeyDto[]> {
  return client.get<ApiKeyDto[]>('/users/me/api-keys');
}

export async function createApiKey(
  client: ApiClient,
  input: CreateApiKeyInput,
): Promise<CreateApiKeyResponse> {
  return client.post<CreateApiKeyResponse>('/users/me/api-keys', input);
}

export async function revokeApiKey(client: ApiClient, id: string): Promise<void> {
  await client.delete<void>(`/users/me/api-keys/${id}`);
}
