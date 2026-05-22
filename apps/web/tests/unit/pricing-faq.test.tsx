import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "../helpers/render";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

import { PricingFaq } from "@/components/billing/PricingFaq";

describe("PricingFaq", () => {
  it("renders each FAQ question and a link to /policy", () => {
    renderWithIntl(<PricingFaq />);
    expect(screen.getByText("Thanh toán bằng cách nào?")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /chính sách/i });
    expect(link).toHaveAttribute("href", "/policy");
  });
});
