import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScoreBadge } from "@/components/common/score-badge";

describe("<ScoreBadge />", () => {
  it("renders numeric score", () => {
    render(<ScoreBadge score={85} />);
    expect(screen.getByText("85")).toBeInTheDocument();
  });

  it("applies excellent classification class for >= 80", () => {
    const { container } = render(<ScoreBadge score={82} />);
    expect(container.firstChild).toHaveClass("text-score-excellent");
  });

  it("applies poor classification class for < 40", () => {
    const { container } = render(<ScoreBadge score={25} />);
    expect(container.firstChild).toHaveClass("text-score-poor");
  });

  it("renders dash for null and uses muted class", () => {
    const { container } = render(<ScoreBadge score={null} />);
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(container.firstChild).toHaveClass("text-on-surface-variant");
  });
});
