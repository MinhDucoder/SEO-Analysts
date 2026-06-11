import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { GeoTab } from "@/components/audit-detail/geo/geo-tab";
import { renderWithIntl } from "../helpers/render";

const makeRules = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: `geo_ai_bot_access_${i}`,
    status: "pass" as const,
    score: 100,
    message: "OK",
    evidence: {},
  }));

describe("GeoTab", () => {
  it("renders geoScore and 8 rule cards when geoBreakdown present", () => {
    renderWithIntl(<GeoTab geoScore={42} rules={makeRules(8)} />);
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(8);
  });

  it("shows degraded badge when geoVersion is '1.0-degraded'", () => {
    renderWithIntl(
      <GeoTab geoScore={55} rules={makeRules(8)} geoVersion="1.0-degraded" />,
    );
    // badge text from vi.json: "Giảm cấp — Bỏ qua rule LLM"
    const badge = screen.getByText(/Giảm cấp/i);
    expect(badge).toBeInTheDocument();
  });

  it("renders empty state when geoBreakdown is null (rules empty)", () => {
    renderWithIntl(<GeoTab geoScore={null} rules={[]} />);
    // no articles rendered
    expect(screen.queryAllByRole("article")).toHaveLength(0);
    // score shows dash
    expect(screen.getByText("-")).toBeInTheDocument();
  });
});
