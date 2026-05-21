import { api } from "@/lib/api/client";
import type { PlanCode, PlanDefinition } from "@repo/shared";

/**
 * Mirrors `PlanDto` from `GET /plans`. Sorted by `sortOrder` server-side.
 */
export interface PlanResponse {
  code: PlanCode;
  displayName: string;
  priceVnd: number;
  sortOrder: number;
  features: PlanDefinition;
}

/**
 * Mirrors `SubscriptionResponseDto` from `GET /me/subscription`.
 * `features` carries the full quota + feature-flag matrix inline so the
 * caller never needs a second round-trip to look up the plan definition.
 */
export interface SubscriptionResponse {
  planCode: PlanCode;
  status: "active" | "expired" | "canceled";
  expiresAt: string | null;
  isAdminGranted: boolean;
  features: PlanDefinition;
  // Optional — present when a persisted subscription row exists:
  id?: string;
  userId?: string;
  startedAt?: string;
  canceledAt?: string | null;
}

/**
 * Mirrors `PaymentIntentResponseDto` from `POST /billing/payment-intents`
 * and `GET /billing/payment-intents/:id`.
 */
export interface PaymentIntentResponse {
  id: string;
  userId: string;
  refCode: string;
  planCode: PlanCode;
  amountVnd: number;
  vietqrUrl: string;
  status: "pending" | "paid" | "expired" | "failed";
  expiresAt: string;
  paidAt: string | null;
}

// ─── API functions ──────────────────────────────────────────────────────────

/** `GET /plans` — public, no auth required. */
export async function listPlans(): Promise<PlanResponse[]> {
  return api.get("plans").json<PlanResponse[]>();
}

/** `GET /me/subscription` — returns current user's active plan + quotas. */
export async function getMySubscription(): Promise<SubscriptionResponse> {
  return api.get("me/subscription").json<SubscriptionResponse>();
}

/** `POST /me/subscription/cancel` — cancel the active subscription. */
export async function cancelSubscription(): Promise<void> {
  await api.post("me/subscription/cancel");
}

/** `POST /billing/payment-intents` — create a VietQR payment intent. */
export async function createPaymentIntent(
  planCode: Exclude<PlanCode, "free">,
): Promise<PaymentIntentResponse> {
  return api
    .post("billing/payment-intents", { json: { planCode } })
    .json<PaymentIntentResponse>();
}

/** `GET /billing/payment-intents/:id` — single intent (used for polling). */
export async function getPaymentIntent(id: string): Promise<PaymentIntentResponse> {
  return api.get(`billing/payment-intents/${id}`).json<PaymentIntentResponse>();
}

/** `GET /billing/payment-intents` — history list for the current user. */
export async function listPaymentIntents(): Promise<PaymentIntentResponse[]> {
  return api.get("billing/payment-intents").json<PaymentIntentResponse[]>();
}
