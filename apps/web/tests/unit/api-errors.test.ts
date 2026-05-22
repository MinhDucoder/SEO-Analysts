import { describe, it, expect } from "vitest";
import { HTTPError, type NormalizedOptions } from "ky";
import { isHandledByModal, getFriendlyMessage } from "@/lib/api/errors";

function httpError(status: number): HTTPError {
  const response = new Response(null, { status });
  const request = new Request("http://localhost/x");
  return new HTTPError(response, request, {} as NormalizedOptions);
}

describe("isHandledByModal", () => {
  it.each([401, 403, 429])(
    "is true for HTTPError %i (a global modal / auth flow already surfaces it)",
    (status) => {
      expect(isHandledByModal(httpError(status))).toBe(true);
    },
  );

  it("is false for HTTPError statuses without a global modal (400, 500)", () => {
    expect(isHandledByModal(httpError(400))).toBe(false);
    expect(isHandledByModal(httpError(500))).toBe(false);
  });

  it("is false for a plain Error and for non-error values", () => {
    expect(isHandledByModal(new Error("x"))).toBe(false);
    expect(isHandledByModal("boom")).toBe(false);
    expect(isHandledByModal(undefined)).toBe(false);
  });
});

describe("getFriendlyMessage", () => {
  it("never leaks ky's raw 'Request failed with status code' message", () => {
    const err = httpError(500);
    expect(err.message).toContain("status code"); // sanity: that's the raw msg
    expect(getFriendlyMessage(err, "Có lỗi xảy ra")).toBe("Có lỗi xảy ra");
  });

  it("uses a plain Error's own (already human) message", () => {
    expect(getFriendlyMessage(new Error("Email không hợp lệ"), "fallback")).toBe(
      "Email không hợp lệ",
    );
  });

  it("returns the fallback for unknown thrown values", () => {
    expect(getFriendlyMessage("boom", "fallback")).toBe("fallback");
    expect(getFriendlyMessage(undefined, "fallback")).toBe("fallback");
  });
});
