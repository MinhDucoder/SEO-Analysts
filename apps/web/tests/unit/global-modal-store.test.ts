import { describe, it, expect, beforeEach } from "vitest";
import { useGlobalModalStore } from "@/lib/ui/global-modal-store";

describe("useGlobalModalStore", () => {
  beforeEach(() => useGlobalModalStore.getState().close());

  it("starts dismissed", () => {
    expect(useGlobalModalStore.getState().kind).toBeNull();
  });

  it("opens AccountLocked with default contact email", () => {
    useGlobalModalStore.getState().open({ kind: "accountLocked" });
    const s = useGlobalModalStore.getState();
    expect(s.kind).toBe("accountLocked");
    expect(s.contactEmail).toMatch(/@/);
  });

  it("opens AccountLocked with a custom contact email", () => {
    useGlobalModalStore.getState().open({
      kind: "accountLocked",
      contactEmail: "ops@example.com",
    });
    expect(useGlobalModalStore.getState().contactEmail).toBe(
      "ops@example.com",
    );
  });

  it("opens RateLimit and clamps negative Retry-After to 0", () => {
    useGlobalModalStore.getState().open({
      kind: "rateLimit",
      retryAfterSec: -5,
    });
    const s = useGlobalModalStore.getState();
    expect(s.kind).toBe("rateLimit");
    expect(s.retryAfterSec).toBe(0);
  });

  it("floors fractional Retry-After seconds", () => {
    useGlobalModalStore.getState().open({
      kind: "rateLimit",
      retryAfterSec: 12.7,
    });
    expect(useGlobalModalStore.getState().retryAfterSec).toBe(12);
  });

  it("close() resets kind to null", () => {
    useGlobalModalStore.getState().open({
      kind: "rateLimit",
      retryAfterSec: 30,
    });
    useGlobalModalStore.getState().close();
    expect(useGlobalModalStore.getState().kind).toBeNull();
  });

  it("a later open() overrides the earlier modal (latest wins)", () => {
    useGlobalModalStore.getState().open({
      kind: "rateLimit",
      retryAfterSec: 30,
    });
    useGlobalModalStore.getState().open({ kind: "accountLocked" });
    expect(useGlobalModalStore.getState().kind).toBe("accountLocked");
  });
});
