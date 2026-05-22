import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FaviconGrid } from "@/components/tools/favicon-grid";

describe("FaviconGrid", () => {
  it("renders icon entries and the coverage checklist", () => {
    render(
      <FaviconGrid
        data={{
          icons: [
            {
              source: "link",
              rel: "icon",
              href: "https://example.com/favicon.ico",
              exists: true,
              status: 200,
              format: "ico",
              size: { width: 32, height: 32 },
            },
          ],
          coverage: {
            hasBasic: true,
            hasAppleTouch: false,
            hasManifest: true,
            hasPwaSizes: false,
            hasMaskIcon: false,
          },
        }}
      />,
    );
    expect(screen.getByText("icon")).toBeInTheDocument();
    expect(screen.getByText("32×32")).toBeInTheDocument();
    expect(screen.getByText("Basic favicon")).toBeInTheDocument();
    expect(screen.getByText("Apple touch icon")).toBeInTheDocument();
  });
});
