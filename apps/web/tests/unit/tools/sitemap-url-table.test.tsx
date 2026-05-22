import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SitemapUrlTable } from "@/components/tools/sitemap-url-table";
import type { SitemapUrlEntry } from "@/lib/api/tools";

function make(n: number): SitemapUrlEntry[] {
  return Array.from({ length: n }, (_, i) => ({
    loc: `https://example.com/page-${i}`,
    isValid: true,
    errors: [],
  }));
}

describe("SitemapUrlTable", () => {
  it("paginates at 50 per page", () => {
    render(<SitemapUrlTable urls={make(120)} />);
    expect(screen.getByText("120 URLs")).toBeInTheDocument();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    expect(screen.getByText("https://example.com/page-0")).toBeInTheDocument();
    expect(screen.queryByText("https://example.com/page-60")).not.toBeInTheDocument();
  });

  it("advances to the next page", () => {
    render(<SitemapUrlTable urls={make(120)} />);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
    expect(screen.getByText("https://example.com/page-50")).toBeInTheDocument();
  });

  it("filters by query and resets pagination", () => {
    render(<SitemapUrlTable urls={make(120)} />);
    fireEvent.change(screen.getByPlaceholderText("Filter URLs…"), {
      target: { value: "page-99" },
    });
    expect(screen.getByText("1 URLs")).toBeInTheDocument();
    expect(screen.getByText("https://example.com/page-99")).toBeInTheDocument();
  });
});
