import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { GeoRuleCard } from "@/components/audit-detail/geo/geo-rule-card";
import { renderWithIntl } from "../helpers/render";

describe("GeoRuleCard", () => {
  it("renders rule message + fail status icon", () => {
    renderWithIntl(
      <GeoRuleCard
        rule={{
          id: "geo_ai_bot_access",
          status: "fail",
          score: 0,
          message: "GPTBot blocked",
          evidence: {},
        }}
      />,
    );
    expect(screen.getByText("GPTBot blocked")).toBeInTheDocument();
    expect(screen.getByLabelText(/fail/i)).toBeInTheDocument();
  });

  it("renders pass status icon", () => {
    renderWithIntl(
      <GeoRuleCard
        rule={{
          id: "geo_llms_txt_present",
          status: "pass",
          score: 100,
          message: "OK",
          evidence: {},
        }}
      />,
    );
    expect(screen.getByLabelText(/pass/i)).toBeInTheDocument();
  });

  it("renders warn status icon", () => {
    renderWithIntl(
      <GeoRuleCard
        rule={{
          id: "geo_article_schema",
          status: "warn",
          score: 50,
          message: "Missing dateModified",
          evidence: {},
        }}
      />,
    );
    expect(screen.getByLabelText(/warn/i)).toBeInTheDocument();
  });

  it("expands to show evidence on click", async () => {
    const userEvent = (await import("@testing-library/user-event")).default.setup();
    renderWithIntl(
      <GeoRuleCard
        rule={{
          id: "geo_llms_txt_present",
          status: "pass",
          score: 100,
          message: "OK",
          evidence: { url: "https://x.com/llms.txt" },
        }}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /expand|details/i }));
    expect(screen.getByText(/x\.com\/llms\.txt/)).toBeInTheDocument();
  });
});
