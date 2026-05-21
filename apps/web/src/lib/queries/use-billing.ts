"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  cancelSubscription,
  createPaymentIntent,
  getMySubscription,
  getPaymentIntent,
  listPaymentIntents,
  listPlans,
  type PaymentIntentResponse,
  type PlanResponse,
  type SubscriptionResponse,
} from "@/lib/api/billing";
import { useAuthStore } from "@/lib/auth/store";
import { queryKeys } from "@/lib/queries/keys";
import type { PlanCode } from "@repo/shared";

/**
 * `GET /plans` — public plan catalogue. No auth required; stale for 1 hour
 * since plan definitions change rarely.
 */
export function usePlans() {
  return useQuery<PlanResponse[]>({
    queryKey: queryKeys.billing.plans(),
    queryFn: listPlans,
    staleTime: 60 * 60_000,
  });
}

/**
 * `GET /me/subscription` — current user's active plan with full quota +
 * feature matrix inlined. Disabled while unauthenticated so the page
 * doesn't fire 401s during the auth bootstrap.
 */
export function useSubscription() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery<SubscriptionResponse>({
    queryKey: queryKeys.billing.subscription(),
    queryFn: getMySubscription,
    enabled: accessToken !== null,
    staleTime: 5 * 60_000,
  });
}

/**
 * `POST /me/subscription/cancel` — cancels the active subscription and
 * immediately invalidates the cached subscription so the UI reflects the
 * updated state.
 */
export function useCancelSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: cancelSubscription,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.billing.subscription() }),
  });
}

/**
 * `POST /billing/payment-intents` — creates a VietQR payment intent for
 * the chosen plan and redirects to the checkout page on success.
 */
export function useCreatePaymentIntent() {
  const router = useRouter();
  return useMutation({
    mutationFn: (planCode: Exclude<PlanCode, "free">) => createPaymentIntent(planCode),
    onSuccess: (intent) => router.push(`/billing/checkout/${intent.id}`),
  });
}

/**
 * `GET /billing/payment-intents/:id` — single intent detail used on the
 * checkout page. Polls every 10 s while the intent is still `pending`;
 * stops as soon as it transitions to `paid`, `expired`, or `failed`.
 *
 * Note: Socket.IO `billing:confirmed` listener (Task 5.4) will supplement
 * this polling — for now the interval fallback is sufficient.
 */
export function usePaymentIntent(id: string) {
  return useQuery<PaymentIntentResponse>({
    queryKey: queryKeys.billing.intent(id),
    queryFn: () => getPaymentIntent(id),
    refetchInterval: (q) => (q.state.data?.status === "pending" ? 10_000 : false),
  });
}

/**
 * `GET /billing/payment-intents` — full payment history for the current
 * user. Disabled while unauthenticated.
 */
export function usePaymentIntentHistory() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery<PaymentIntentResponse[]>({
    queryKey: queryKeys.billing.intents(),
    queryFn: listPaymentIntents,
    enabled: accessToken !== null,
  });
}
