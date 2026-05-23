import { describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { api } from "@/lib/api/client";
import { useGlobalModalStore } from "@/lib/ui/global-modal-store";
import { useQuotaDialog } from "@/lib/billing/quota-dialog.store";

const API = "http://localhost:3000/api/v1";

describe("ky afterResponse → global modal interceptor", () => {
  beforeEach(() => {
    useGlobalModalStore.getState().close();
    useQuotaDialog.getState().close();
  });

  it("opens AccountLockedModal on 403 with code='ACCOUNT_LOCKED'", async () => {
    server.use(
      http.get(`${API}/audits`, () =>
        HttpResponse.json(
          { code: "ACCOUNT_LOCKED", message: "Account locked" },
          { status: 403 },
        ),
      ),
    );

    await expect(api.get("audits").json()).rejects.toBeDefined();
    expect(useGlobalModalStore.getState().kind).toBe("accountLocked");
  });

  it("opens AccountLockedModal on 403 with message containing 'locked' (no code)", async () => {
    server.use(
      http.get(`${API}/audits`, () =>
        HttpResponse.json(
          { message: "Your account is locked" },
          { status: 403 },
        ),
      ),
    );

    await expect(api.get("audits").json()).rejects.toBeDefined();
    expect(useGlobalModalStore.getState().kind).toBe("accountLocked");
  });

  it("does NOT open AccountLockedModal on 403 with 'verify' message", async () => {
    server.use(
      http.get(`${API}/audits`, () =>
        HttpResponse.json(
          { message: "Please verify your email" },
          { status: 403 },
        ),
      ),
    );

    await expect(api.get("audits").json()).rejects.toBeDefined();
    expect(useGlobalModalStore.getState().kind).toBeNull();
  });

  it("opens RateLimitModal on 429 and reads the Retry-After header", async () => {
    // Retry-After=0 lets ky retry immediately so the test doesn't hit the
    // 5s timeout. We still verify the interceptor captured the value
    // before ky's retry logic kicked in.
    server.use(
      http.get(`${API}/audits`, () =>
        HttpResponse.json(
          { message: "Too many requests" },
          { status: 429, headers: { "Retry-After": "0" } },
        ),
      ),
    );

    await expect(api.get("audits").json()).rejects.toBeDefined();
    const s = useGlobalModalStore.getState();
    expect(s.kind).toBe("rateLimit");
    expect(s.retryAfterSec).toBe(0);
  });

  it("falls back to 60s when Retry-After header is missing", async () => {
    server.use(
      http.get(`${API}/audits`, () =>
        HttpResponse.json(
          { message: "Too many requests" },
          { status: 429 },
        ),
      ),
    );

    await expect(api.get("audits").json()).rejects.toBeDefined();
    const s = useGlobalModalStore.getState();
    expect(s.kind).toBe("rateLimit");
    expect(s.retryAfterSec).toBe(60);
  });

  it("opens the quota dialog (NOT rateLimit) on 429 with code='QUOTA_EXCEEDED'", async () => {
    server.use(
      http.get(`${API}/audits`, () =>
        HttpResponse.json(
          {
            code: "QUOTA_EXCEEDED",
            message: "Đã đạt giới hạn 10 cho audits_monthly",
            resetAt: "2026-06-01T00:00:00.000Z",
          },
          { status: 429, headers: { "Retry-After": "0" } },
        ),
      ),
    );

    await expect(api.get("audits").json()).rejects.toBeDefined();
    expect(useQuotaDialog.getState().open).toBe(true);
    expect(useQuotaDialog.getState().resetAt).toBe("2026-06-01T00:00:00.000Z");
    // Billing quota must NOT be mistaken for a transport rate limit.
    expect(useGlobalModalStore.getState().kind).toBeNull();
  });

  it("opens the quota dialog (NOT rateLimit) on 429 with code='AI_QUOTA_EXCEEDED'", async () => {
    server.use(
      http.get(`${API}/audits`, () =>
        HttpResponse.json(
          { code: "AI_QUOTA_EXCEEDED", message: "AI calls/month exceeded" },
          { status: 429, headers: { "Retry-After": "0" } },
        ),
      ),
    );

    await expect(api.get("audits").json()).rejects.toBeDefined();
    expect(useQuotaDialog.getState().open).toBe(true);
    expect(useGlobalModalStore.getState().kind).toBeNull();
  });

  it("opens the quota dialog (feature variant) on 403 with code='FEATURE_NOT_AVAILABLE'", async () => {
    server.use(
      http.get(`${API}/audits`, () =>
        HttpResponse.json(
          {
            code: "FEATURE_NOT_AVAILABLE",
            message: 'Tính năng "pdf_export" không có trong gói "free".',
          },
          { status: 403 },
        ),
      ),
    );

    await expect(api.get("audits").json()).rejects.toBeDefined();
    expect(useQuotaDialog.getState().open).toBe(true);
    expect(useGlobalModalStore.getState().kind).toBeNull();
  });
});
