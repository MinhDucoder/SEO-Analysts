import { http, HttpResponse } from "msw";
import { AuditStatus } from "@repo/shared";
import { API_URL } from "@/lib/constants";
import {
  mockAdminStats,
  mockAdminUsers,
  mockAudits,
  mockAuditDetail,
  mockAuditsPaginated,
  mockCompare,
  mockMeUser,
  mockReportFor,
  mockRules,
  mockScheduled,
  paginateAdminUsers,
} from "@/lib/dev/mock-fixtures";

/**
 * MSW handlers for dev bypass mode. Covers every gateway endpoint the FE
 * touches so guarded pages render with realistic data. Mutations succeed
 * optimistically — they don't persist between page reloads.
 */

const BASE = API_URL.replace(/\/$/, "");
const url = (path: string) => `${BASE}/${path.replace(/^\//, "")}`;

export const mockHandlers = [
  http.post(url("auth/refresh"), () =>
    HttpResponse.json({ accessToken: "dev-bypass-fake-token" }, { status: 200 }),
  ),
  http.get(url("auth/me"), () => HttpResponse.json(mockMeUser, { status: 200 })),
  http.post(url("auth/login"), () =>
    HttpResponse.json({ user: mockMeUser, accessToken: "dev-bypass-fake-token" }, { status: 200 }),
  ),
  http.post(url("auth/logout"), () => HttpResponse.json({ message: "ok" }, { status: 200 })),
  http.post(url("auth/register"), () =>
    HttpResponse.json({ user: mockMeUser, accessToken: "dev-bypass-fake-token" }, { status: 201 }),
  ),
  http.post(url("auth/verify-email"), () =>
    HttpResponse.json({ message: "Verified" }, { status: 200 }),
  ),
  http.post(url("auth/forgot-password"), () =>
    HttpResponse.json({ message: "Sent" }, { status: 200 }),
  ),
  http.post(url("auth/reset-password"), () =>
    HttpResponse.json({ message: "Reset" }, { status: 200 }),
  ),

  http.get(url("audits"), ({ request }) => {
    const u = new URL(request.url);
    const search = u.searchParams.get("search")?.toLowerCase() ?? "";
    const status = u.searchParams.get("status") ?? "";
    const limit = Number(u.searchParams.get("limit") ?? 30);
    const page = Number(u.searchParams.get("page") ?? 1);
    let rows = mockAudits;
    if (search) rows = rows.filter((a) => a.url.toLowerCase().includes(search) || a.domain.toLowerCase().includes(search));
    if (status) rows = rows.filter((a) => a.status === status);
    const start = (page - 1) * limit;
    return HttpResponse.json(
      { data: rows.slice(start, start + limit), total: rows.length, page, limit },
      { status: 200 },
    );
  }),

  http.get(url("audits/compare"), () => HttpResponse.json(mockCompare, { status: 200 })),

  http.get(url("audits/:id"), ({ params }) =>
    HttpResponse.json(mockAuditDetail(String(params.id)), { status: 200 }),
  ),

  http.get(url("audits/:id/status"), ({ params }) => {
    const a = mockAudits.find((x) => x.id === String(params.id)) ?? mockAudits[0]!;
    return HttpResponse.json(
      {
        auditId: a.id,
        status: a.status,
        progress: a.status === AuditStatus.COMPLETED ? 100 : 60,
        stage: a.status === AuditStatus.COMPLETED ? "done" : a.status,
        seoScore: a.seoScore ?? undefined,
      },
      { status: 200 },
    );
  }),

  http.post(url("audits"), async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as { mode?: "single" | "site" };
    return HttpResponse.json(
      {
        auditId: `aud-new-${Date.now()}`,
        status: "pending",
        mode: body.mode ?? "single",
        message: "Audit queued (mock)",
      },
      { status: 202 },
    );
  }),

  http.delete(url("audits/:id"), () => HttpResponse.json({}, { status: 204 })),

  http.post(url("audits/:id/share"), ({ params }) =>
    HttpResponse.json(
      {
        shareToken: `share-${params.id}-mock`,
        shareUrl: `${typeof window !== "undefined" ? window.location.origin : "http://localhost:3001"}/vi/shared/share-${params.id}-mock`,
      },
      { status: 201 },
    ),
  ),
  http.delete(url("audits/:id/share"), () => HttpResponse.json({}, { status: 204 })),

  http.get(url("scheduled-audits"), () =>
    HttpResponse.json(mockScheduled, { status: 200 }),
  ),
  http.post(url("scheduled-audits"), async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as Partial<(typeof mockScheduled)[number]>;
    return HttpResponse.json(
      { ...mockScheduled[0]!, ...body, id: `sch-new-${Date.now()}` },
      { status: 201 },
    );
  }),
  http.patch(url("scheduled-audits/:id/pause"), ({ params }) => {
    const s = mockScheduled.find((x) => x.id === params.id) ?? mockScheduled[0]!;
    return HttpResponse.json({ ...s, isActive: false }, { status: 200 });
  }),
  http.patch(url("scheduled-audits/:id/resume"), ({ params }) => {
    const s = mockScheduled.find((x) => x.id === params.id) ?? mockScheduled[0]!;
    return HttpResponse.json({ ...s, isActive: true }, { status: 200 });
  }),
  http.delete(url("scheduled-audits/:id"), () => HttpResponse.json({}, { status: 204 })),

  http.get(url("admin/users"), ({ request }) => {
    const u = new URL(request.url);
    const page = Number(u.searchParams.get("page") ?? 1);
    const limit = Number(u.searchParams.get("limit") ?? 20);
    const search = u.searchParams.get("search") ?? undefined;
    const role = (u.searchParams.get("role") as "user" | "admin" | null) ?? undefined;
    const isLocked = (u.searchParams.get("isLocked") as "true" | "false" | null) ?? undefined;
    return HttpResponse.json(
      paginateAdminUsers(page, limit, {
        search: search ?? undefined,
        role: role ?? undefined,
        isLocked: isLocked ?? undefined,
      }),
      { status: 200 },
    );
  }),

  http.patch(url("admin/users/:id"), async ({ params, request }) => {
    const body = (await request.json().catch(() => ({}))) as { isLocked?: boolean };
    const u = mockAdminUsers.find((x) => x.id === params.id) ?? mockAdminUsers[0]!;
    return HttpResponse.json(
      { id: u.id, email: u.email, isLocked: body.isLocked ?? !u.isLocked },
      { status: 200 },
    );
  }),

  http.get(url("admin/stats"), () => HttpResponse.json(mockAdminStats, { status: 200 })),

  http.get(url("admin/rules"), () => HttpResponse.json({ rules: mockRules }, { status: 200 })),
  http.put(url("admin/rules"), async ({ request }) => {
    const body = (await request.json().catch(() => ({ rules: [] }))) as {
      rules: Array<{ name: string; weight: number }>;
    };
    const updated = mockRules.map((r) => {
      const patch = body.rules?.find((p) => p.name === r.name);
      return patch ? { ...r, weight: patch.weight } : r;
    });
    return HttpResponse.json({ updated }, { status: 200 });
  }),

  http.patch(url("users/profile"), async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      fullName?: string;
      avatarUrl?: string;
    };
    return HttpResponse.json(
      {
        id: mockMeUser.id,
        fullName: body.fullName ?? mockMeUser.fullName,
        avatarUrl: body.avatarUrl ?? null,
      },
      { status: 200 },
    );
  }),
  http.patch(url("users/password"), () =>
    HttpResponse.json({ message: "Password changed" }, { status: 200 }),
  ),

  http.get(url("shared/audits/:token"), ({ params }) =>
    HttpResponse.json(mockReportFor(String(params.token)), { status: 200 }),
  ),
];
