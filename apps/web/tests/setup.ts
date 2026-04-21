import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./msw/server";
import { useAuthStore } from "@/lib/auth/store";

// jsdom doesn't implement ResizeObserver. Recharts' <ResponsiveContainer>
// relies on it to observe the parent element size — stub it so chart
// widgets render in unit tests. (Actual chart sizing is exercised in
// Playwright e2e which uses a real browser.)
if (typeof globalThis.ResizeObserver === "undefined") {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver =
    ResizeObserverStub;
}

beforeAll(() => {
  // `onUnhandledRequest: 'error'` catches accidental network leaks from
  // tests — every HTTP call MUST be handled by MSW or the test fails loudly.
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
