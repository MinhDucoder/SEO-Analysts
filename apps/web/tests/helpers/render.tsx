import * as React from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import viMessages from "@/messages/vi.json";

/**
 * Build a fresh QueryClient per test so cache state never leaks between
 * cases. `retry: false` + `gcTime: 0` keep failed mutations from retrying
 * or lingering after the test finishes.
 */
function makeTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

export interface TestProvidersProps {
  children: React.ReactNode;
  queryClient?: QueryClient;
}

export function TestProviders({ children, queryClient }: TestProvidersProps) {
  const client = queryClient ?? makeTestQueryClient();
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

/**
 * Drop-in replacement for RTL's `render` that wraps the subject in the
 * test providers tree. Returns the usual render result plus the query
 * client instance so tests can inspect cache state.
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options: Omit<RenderOptions, "wrapper"> & { queryClient?: QueryClient } = {},
) {
  const { queryClient, ...rest } = options;
  const client = queryClient ?? makeTestQueryClient();

  const result = render(ui, {
    wrapper: ({ children }) => (
      <TestProviders queryClient={client}>{children}</TestProviders>
    ),
    ...rest,
  });

  return { ...result, queryClient: client };
}

/**
 * Like `renderWithProviders` but also wraps in NextIntlClientProvider (vi
 * messages) so components calling `useTranslations` render in tests.
 */
export function renderWithIntl(
  ui: React.ReactElement,
  options: Omit<RenderOptions, "wrapper"> & { queryClient?: QueryClient } = {},
) {
  const { queryClient, ...rest } = options;
  const client = queryClient ?? makeTestQueryClient();
  const result = render(ui, {
    wrapper: ({ children }) => (
      <NextIntlClientProvider locale="vi" messages={viMessages}>
        <TestProviders queryClient={client}>{children}</TestProviders>
      </NextIntlClientProvider>
    ),
    ...rest,
  });
  return { ...result, queryClient: client };
}
