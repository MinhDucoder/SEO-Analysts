import { z } from "zod";

/**
 * Zod schemas for auth forms. Each schema's inferred type is exported for
 * reuse in page components, API wrappers, and tests.
 *
 * Error messages are Vietnamese to match UI copy. They surface via
 * react-hook-form's `formState.errors` and also inside toasts when needed.
 */

export const loginSchema = z.object({
  email: z.string().min(1, "Vui lòng nhập email").email("Email không hợp lệ"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .min(2, "Họ tên tối thiểu 2 ký tự")
      .max(100, "Họ tên tối đa 100 ký tự"),
    email: z.string().min(1, "Vui lòng nhập email").email("Email không hợp lệ"),
    password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự"),
    confirmPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu"),
    agreed: z.literal<boolean>(true, {
      errorMap: () => ({ message: "Bạn cần đồng ý với điều khoản" }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu không khớp",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Vui lòng nhập email").email("Email không hợp lệ"),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự"),
    confirmPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Mật khẩu không khớp",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
