# Recipe — `renderWithProviders` Helper

Drop-in replacement của RTL `render()` wrap sẵn TanStack Query provider với config hermetic.

## File: `apps/web/tests/helpers/render.tsx`

```tsx
import * as React from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Build fresh QueryClient per test. `retry: false` + `gcTime: 0` +
 * `staleTime: 0` đảm bảo:
 *  - Failed mutations KHÔNG retry → assertion errors đoán được.
 *  - Cache không lingering sau test → không leak sang test kế tiếp.
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
 * Drop-in RTL `render` wrap providers. Returns kết quả RTL + queryClient
 * để tests inspect cache state khi cần.
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
```

## Usage

```tsx
import { renderWithProviders } from "../helpers/render";
import LoginPage from "@/app/(auth)/login/page";

it("renders login form", () => {
  renderWithProviders(<LoginPage />);
  expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
});

it("inspects query cache", async () => {
  const { queryClient } = renderWithProviders(<MePage />);
  // ... interact ...
  expect(queryClient.getQueryData(["auth", "me"])).toEqual(sampleUser);
});
```

## Mở rộng provider tree khi slug thêm

Nếu slug mới thêm provider (vd: `<ThemeProvider>`, `<TooltipProvider>`), thêm vào `TestProviders`:

```tsx
export function TestProviders({ children, queryClient }: TestProvidersProps) {
  const client = queryClient ?? makeTestQueryClient();
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider attribute="class" defaultTheme="light">
        <TooltipProvider>{children}</TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
```

**Giữ provider tree GIỐNG `apps/web/src/app/providers.tsx`** — nếu runtime có 3 provider mà test chỉ wrap 2, bug sẽ trốn.

## Anti-patterns

- ❌ Share QueryClient giữa test → cache leak.
- ❌ `retry: 3` default → mutation fail sẽ retry 3 lần, test timeout thay vì fail thẳng.
- ❌ `gcTime: 5 * 60 * 1000` default → data stay in cache, test 2 thấy kết quả test 1.
- ❌ Không return `queryClient` từ helper → test muốn inspect cache phải tự tạo client riêng → mất hermetic.

## Checklist

- [ ] Factory `makeTestQueryClient()` tạo client mới mỗi test.
- [ ] `retry: false` cho cả queries + mutations.
- [ ] `gcTime: 0` + `staleTime: 0`.
- [ ] Provider tree match với `apps/web/src/app/providers.tsx`.
- [ ] Return `queryClient` để inspect được.