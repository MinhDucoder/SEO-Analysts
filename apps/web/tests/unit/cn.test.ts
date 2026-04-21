import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils/cn";

describe("cn()", () => {
  it("concatenates multiple class strings", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("drops falsy values (null, undefined, false, empty string)", () => {
    expect(cn("a", null, undefined, false, "", "b")).toBe("a b");
  });

  it("resolves conditional objects from clsx", () => {
    expect(cn("a", { b: true, c: false }, "d")).toBe("a b d");
  });

  it("accepts arrays", () => {
    expect(cn(["a", "b"], "c")).toBe("a b c");
  });

  it("twMerge dedupes conflicting Tailwind utilities (last wins)", () => {
    expect(cn("p-4", "p-2")).toBe("p-2");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
    expect(cn("bg-white text-black", "bg-slate-900")).toBe("text-black bg-slate-900");
  });

  it("preserves non-conflicting classes", () => {
    expect(cn("p-4", "m-2", "rounded")).toBe("p-4 m-2 rounded");
  });

  it("returns empty string when given no input", () => {
    expect(cn()).toBe("");
  });
});
