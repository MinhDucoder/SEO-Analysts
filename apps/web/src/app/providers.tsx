"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";

/**
 * Client-side providers wrapper. Rendered inside the root server layout.
 *
 * - QueryClient uses a 60s staleTime + no refetch-on-window-focus to avoid
 *   hammering the gateway on tab switches (per
 *   docs/design/30-frontend-architecture.md §9).
 * - Toaster renders via `sonner` (top-right desktop, top-center mobile).
 *
 * Future slugs (e.g. slug 2 auth-flow) may layer additional providers here —
 * theme provider, auth hydration, next-intl, etc.
 */

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}

let browserClient: QueryClient | undefined;

function getQueryClient(): QueryClient {
  if (typeof window === "undefined") {
    // Server: always create a fresh client per request.
    return makeQueryClient();
  }
  if (!browserClient) {
    browserClient = makeQueryClient();
  }
  return browserClient;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}
