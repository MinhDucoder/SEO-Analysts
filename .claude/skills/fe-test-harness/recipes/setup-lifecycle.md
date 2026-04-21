# Recipe — `tests/setup.ts` Lifecycle

Lifecycle hooks đảm bảo:
- MSW server listen trước test đầu tiên.
- Unhandled request = FAIL, không warn (strict network hygiene).
- Sau mỗi test: reset handlers + cleanup DOM + clear auth store.
- Sau toàn bộ: close server.

## File: `apps/web/tests/setup.ts`

```ts
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./msw/server";
import { useAuthStore } from "@/lib/auth/store";

beforeAll(() => {
  // `onUnhandledRequest: 'error'` catches accidental network leaks from
  // tests — mọi HTTP call PHẢI được MSW xử lý, không thì test fail loud.
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  server.resetHandlers();
  cleanup();
  useAuthStore.getState().clearAuth();
});

afterAll(() => {
  server.close();
});
```

## Vitest config phải reference setup

`apps/web/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    globals: true,
    css: true,
    include: ["tests/unit/**/*.test.{ts,tsx}"],
  },
});
```

## Thêm store reset cho mỗi state-holding module

Trong DO_AN, `useAuthStore` là Zustand store persist-ed. Reset cần:

```ts
// store.ts
export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  accessToken: null,
  clearAuth: () => set({ user: null, accessToken: null }),
  // ...
}));
```

→ `useAuthStore.getState().clearAuth()` trong `afterEach` đảm bảo test 2 không thấy state từ test 1.

**Nếu slug thêm store khác** (vd: `useUiStore`, `useReportStore`), append thêm dòng `.clearXxx()` tương ứng trong `afterEach`.

## Tại sao `onUnhandledRequest: 'error'`?

| Mode | Hành vi | Vấn đề |
|---|---|---|
| `'warn'` (default) | Log warning, request đi thật | Test "green" nhưng call network thật — flaky khi CI offline |
| `'bypass'` | Request đi thật, không warn | Tệ hơn — silent network leak |
| **`'error'`** ✅ | Fail test ngay lập tức | Buộc dev khai báo handler hoặc `server.use()` override |

**Strict mode là contract**: mọi endpoint page/component gọi phải được handler cover hoặc mock explicit per-test. Nếu fail đột ngột trong CI, grep error message sẽ chỉ đúng endpoint thiếu handler.

## Checklist

- [ ] `beforeAll` dùng `onUnhandledRequest: 'error'`.
- [ ] `afterEach` có cả `resetHandlers()` + `cleanup()` + clear store(s).
- [ ] `afterAll` đóng server.
- [ ] `vitest.config.ts` reference đúng path setup file.
- [ ] Import `@testing-library/jest-dom/vitest` ở dòng đầu để matchers (`toBeInTheDocument` etc.) có sẵn.