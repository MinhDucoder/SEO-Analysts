import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./msw/server";
import { useAuthStore } from "@/lib/auth/store";

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
