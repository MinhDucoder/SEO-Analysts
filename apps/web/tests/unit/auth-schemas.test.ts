import { describe, it, expect } from "vitest";
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/auth/schemas";

describe("loginSchema", () => {
  it("accepts valid email + password", () => {
    const result = loginSchema.safeParse({ email: "a@b.com", password: "secret" });
    expect(result.success).toBe(true);
  });

  it("rejects empty email", () => {
    const result = loginSchema.safeParse({ email: "", password: "secret" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/email/i);
    }
  });

  it("rejects malformed email", () => {
    const result = loginSchema.safeParse({ email: "not-email", password: "secret" });
    expect(result.success).toBe(false);
  });

  it("rejects empty password", () => {
    const result = loginSchema.safeParse({ email: "a@b.com", password: "" });
    expect(result.success).toBe(false);
  });
});

describe("registerSchema", () => {
  const valid = {
    fullName: "Nguyễn Văn A",
    email: "a@b.com",
    password: "password123",
    confirmPassword: "password123",
    agreed: true as const,
  };

  it("accepts valid payload", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects short full name", () => {
    expect(registerSchema.safeParse({ ...valid, fullName: "A" }).success).toBe(false);
  });

  it("rejects short password", () => {
    expect(registerSchema.safeParse({ ...valid, password: "short" }).success).toBe(false);
  });

  it("rejects mismatched confirm password", () => {
    const result = registerSchema.safeParse({ ...valid, confirmPassword: "other" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("confirmPassword"))).toBe(true);
    }
  });

  it("rejects agreed=false", () => {
    const result = registerSchema.safeParse({ ...valid, agreed: false });
    expect(result.success).toBe(false);
  });
});

describe("forgotPasswordSchema", () => {
  it("accepts valid email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "a@b.com" }).success).toBe(true);
  });

  it("rejects empty email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "" }).success).toBe(false);
  });

  it("rejects malformed email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "bad" }).success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  it("accepts matching passwords", () => {
    expect(
      resetPasswordSchema.safeParse({
        newPassword: "password123",
        confirmPassword: "password123",
      }).success,
    ).toBe(true);
  });

  it("rejects mismatched confirm", () => {
    const result = resetPasswordSchema.safeParse({
      newPassword: "password123",
      confirmPassword: "other123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects short new password", () => {
    expect(
      resetPasswordSchema.safeParse({
        newPassword: "short",
        confirmPassword: "short",
      }).success,
    ).toBe(false);
  });
});
