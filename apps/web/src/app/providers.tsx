"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeApplier } from "@/lib/ui/theme";
import { Toaster } from "@/components/ui/sonner";
import { AuthBootstrap } from "@/components/auth/auth-bootstrap";
import { AccountLockedModal } from "@/components/global/account-locked-modal";
import { RateLimitModal } from "@/components/global/rate-limit-modal";

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
      <ThemeApplier />
      <AuthBootstrap />
      {children}
      <AccountLockedModal />
      <RateLimitModal />
      <Toaster />
    </QueryClientProvider>
  );
}
