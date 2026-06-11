import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithIntl } from "../helpers/render";
import type { AdminRevenue } from "@/lib/api/types";

const revenue: AdminRevenue = {
  period: { type: "month", year: 2026, month: 5, label: "Tháng 5/2026", start: "", end: "" },
  grossVnd: 497000,
  netVnd: 451818,
  vatVnd: 45182,
  vatPercent: 10,
  paidCount: 3,
  deltaPercent: 24.25,
  byPlan: [
    { planCode: "business", displayName: "Doanh nghiệp", count: 1, grossVnd: 299000 },
    { planCode: "pro", displayName: "Chuyên nghiệp", count: 2, grossVnd: 198000 },
  ],
};

const useAdminRevenue = vi.fn();
const exportAdminRevenueCsv = vi.fn();

vi.mock("@/lib/queries/use-admin", () => ({
  useAdminRevenue: (q: Record<string, string>) => useAdminRevenue(q),
}));
vi.mock("@/lib/api/admin", () => ({
  exportAdminRevenueCsv: (q: Record<string, string>) => exportAdminRevenueCsv(q),
}));

import { AdminRevenueSection } from "@/components/admin/admin-revenue-section";

beforeEach(() => {
  vi.clearAllMocks();
  useAdminRevenue.mockReturnValue({ data: revenue, isLoading: false, isError: false });
});

describe("AdminRevenueSection", () => {
  it("renders gross/net/vat, the delta, and the per-plan breakdown", () => {
    renderWithIntl(<AdminRevenueSection />);
    expect(screen.getByText("497.000đ")).toBeInTheDocument();
    expect(screen.getByText("451.818đ")).toBeInTheDocument();
    expect(screen.getByText("45.182đ")).toBeInTheDocument();
    expect(screen.getByText("VAT 10%")).toBeInTheDocument();
    expect(screen.getByText("3 giao dịch")).toBeInTheDocument();
    expect(screen.getByText(/24[.,]25/)).toBeInTheDocument();
    expect(screen.getByText("Doanh nghiệp")).toBeInTheDocument();
    expect(screen.getByText("Chuyên nghiệp")).toBeInTheDocument();
  });

  it("requests quarter data when the Quý toggle is clicked", () => {
    renderWithIntl(<AdminRevenueSection />);
    fireEvent.click(screen.getByRole("button", { name: "Quý" }));
    const lastArg = useAdminRevenue.mock.calls.at(-1)?.[0];
    expect(lastArg).toMatchObject({ type: "quarter" });
  });

  it("exports the CSV for the current period when Xuất CSV is clicked", () => {
    renderWithIntl(<AdminRevenueSection />);
    fireEvent.click(screen.getByRole("button", { name: "Xuất CSV" }));
    expect(exportAdminRevenueCsv).toHaveBeenCalledWith(
      expect.objectContaining({ type: "month" }),
    );
  });
});
