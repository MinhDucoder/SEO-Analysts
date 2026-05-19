import { describe, it, expect } from "vitest";
import {
  updateProfileSchema,
  changePasswordSchema,
} from "@/lib/auth/schemas";

describe("updateProfileSchema", () => {
  it("accepts a valid fullName", () => {
    expect(
      updateProfileSchema.safeParse({ fullName: "Nguyễn Văn A" }).success,
    ).toBe(true);
  });

  it("rejects fullName shorter than 2 chars", () => {
    expect(updateProfileSchema.safeParse({ fullName: "A" }).success).toBe(
      false,
    );
  });

  it("rejects fullName longer than 100 chars", () => {
    expect(
      updateProfileSchema.safeParse({ fullName: "A".repeat(101) }).success,
    ).toBe(false);
  });
});

describe("changePasswordSchema", () => {
  const valid = {
    currentPassword: "OldPass1!",
    newPassword: "NewPass123!",
    confirmPassword: "NewPass123!",
  };

  it("accepts valid payload", () => {
    expect(changePasswordSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects mismatched confirm", () => {
    const r = changePasswordSchema.safeParse({
      ...valid,
      confirmPassword: "OtherPass!",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes("confirmPassword"))).toBe(
        true,
      );
    }
  });

  it("rejects new password identical to current password", () => {
    const r = changePasswordSchema.safeParse({
      currentPassword: "SamePass1!",
      newPassword: "SamePass1!",
      confirmPassword: "SamePass1!",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes("newPassword"))).toBe(
        true,
      );
    }
  });

  it("rejects new password shorter than 8 chars", () => {
    expect(
      changePasswordSchema.safeParse({
        ...valid,
        newPassword: "short",
        confirmPassword: "short",
      }).success,
    ).toBe(false);
  });

  it("rejects empty currentPassword", () => {
    expect(
      changePasswordSchema.safeParse({ ...valid, currentPassword: "" }).success,
    ).toBe(false);
  });
});
