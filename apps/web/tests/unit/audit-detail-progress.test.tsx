import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { AuditStatus } from "@repo/shared";
import { server } from "../msw/server";
import { renderWithIntl } from "../helpers/render";
import { useAuthStore } from "@/lib/auth/store";

const AUDIT_ID = "3abab729-4b93-4109-aaac-b213258ea5f3";
const API = "http://localhost:3000/api/v1";

// The page reads the route param via next/navigation.
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: AUDIT_ID }),
}));

// Locale-aware router/Link — stub so no app-router context is needed.
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

// WS hook is the bug surface: simulate the gateway acking the room-join
// (`subscribed: true`) while delivering NO progress events (`latest: null`).
// This is what happens when the audit finishes before the subscribe ack, or
// the gateway/Redis pub-sub dropped the broadcast (pub/sub has no replay).
vi.mock("@/lib/ws/use-audit-realtime", () => ({
  useAuditRealtime: () => ({ subscribed: true, latest: null }),
}));

import AuditDetailPage from "@/app/[locale]/(app)/audits/[id]/page";

function auditDetail(status: AuditStatus) {
  return {
    audit: {
      id: AUDIT_ID,
      url: "https://fbshop.vn/p/giay-yonex-88-dial-xam-2022/",
      domain: "fbshop.vn",
      status,
      seoScore: null,
      targetKeyword: null,
      crawlerType: null,
      crawlDurationMs: null,
      createdAt: "2026-05-24T09:11:39.000Z",
      completedAt: null,
      errorMessage: null,
    },
    report: null,
  };
}

describe("AuditDetailPage — progress fallback (regression)", () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: "tok" });
  });

  it("reflects the polled /status progress when WS joins the room but sends no events", async () => {
    // Detail query is stuck on the pre-progress snapshot (still ANALYZING).
    server.use(
      http.get(`${API}/audits/${AUDIT_ID}`, () =>
        HttpResponse.json(auditDetail(AuditStatus.ANALYZING)),
      ),
    );
    // The /status poll is the only fresh signal — audit has advanced to 60%.
    server.use(
      http.get(`${API}/audits/${AUDIT_ID}/status`, () =>
        HttpResponse.json({
          auditId: AUDIT_ID,
          status: AuditStatus.ANALYZING,
          progress: 60,
          stage: "Running 20 SEO rules",
        }),
      ),
    );

    renderWithIntl(<AuditDetailPage />);

    // Before the fix the page disabled polling on the room-join ack and read
    // progress only from the (null) WS event, freezing the bar at 0%.
    expect(await screen.findByText("60%")).toBeInTheDocument();
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
  });
});
