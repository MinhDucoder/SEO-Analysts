import { z } from "zod";

/**
 * Shared zod schemas for the audit-creation surface. Inputs are validated
 * client-side before hitting the gateway; the server enforces the same
 * rules so any validation gap surfaces as a 400 with a translated message.
 *
 * URL: http(s), max 2048 — matches BACKEND-API §CreateAuditDto.
 * maxUrls: 1..5000, only meaningful when mode='site'.
 */

const urlSchema = z
  .string()
  .min(1, "Vui lòng nhập URL")
  .url("URL không hợp lệ")
  .max(2048, "URL quá dài (tối đa 2048 ký tự)")
  .refine((u) => /^https?:\/\//i.test(u), {
    message: "URL phải bắt đầu bằng http hoặc https",
  });

const keywordSchema = z
  .string()
  .max(255, "Từ khóa tối đa 255 ký tự")
  .optional()
  .or(z.literal(""));

const modeSchema = z.enum(["single", "site"]).default("single");

const maxUrlsSchema = z
  .number({ invalid_type_error: "Phải là số" })
  .int("Phải là số nguyên")
  .min(1, "Tối thiểu 1")
  .max(5000, "Tối đa 5000");

export const createAuditFormSchema = z
  .object({
    url: urlSchema,
    targetKeyword: keywordSchema,
    mode: modeSchema,
    maxUrls: z.union([maxUrlsSchema, z.literal("").transform(() => undefined)])
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.mode === "site" && (data.maxUrls === undefined || data.maxUrls === null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["maxUrls"],
        message: "Vui lòng nhập số trang tối đa",
      });
    }
  });

export type CreateAuditFormInput = z.infer<typeof createAuditFormSchema>;

const cronSchema = z
  .string()
  .min(1, "Vui lòng nhập cron")
  .refine(
    (s) => s.trim().split(/\s+/).length === 5,
    "Cron không hợp lệ (cần 5 trường)",
  );

export const createScheduledAuditFormSchema = z
  .object({
    url: urlSchema,
    cron: cronSchema,
    mode: modeSchema,
    maxUrls: z.union([maxUrlsSchema, z.literal("").transform(() => undefined)])
      .optional(),
    targetKeyword: keywordSchema,
  })
  .superRefine((data, ctx) => {
    if (data.mode === "site" && (data.maxUrls === undefined || data.maxUrls === null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["maxUrls"],
        message: "Vui lòng nhập số trang tối đa",
      });
    }
  });

export type CreateScheduledAuditFormInput = z.infer<
  typeof createScheduledAuditFormSchema
>;
