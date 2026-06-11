/**
 * @file Typed wrappers around the gateway `/users/me/api-keys` endpoints.
 * Thin layer over the shared `api` ky client (current auth stack) — each
 * function centralizes the URL + return type so consumers never drift.
 */
import { api } from "@/lib/api/client";
import type { ApiKeyDto, CreateApiKeyInput, CreateApiKeyResponse } from "@/types/api";

export async function listApiKeys(): Promise<ApiKeyDto[]> {
  return api.get("users/me/api-keys").json<ApiKeyDto[]>();
}

export async function createApiKey(
  input: CreateApiKeyInput,
): Promise<CreateApiKeyResponse> {
  return api.post("users/me/api-keys", { json: input }).json<CreateApiKeyResponse>();
}

export async function revokeApiKey(id: string): Promise<void> {
  await api.delete(`users/me/api-keys/${id}`);
}

export async function rebindApiKey(id: string): Promise<void> {
  await api.post(`users/me/api-keys/${id}/rebind`);
}
