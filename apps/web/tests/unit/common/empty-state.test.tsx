import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Search } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";

describe("<EmptyState />", () => {
  it("renders title only when body + action + icon absent", () => {
    render(<EmptyState title="Chưa có gì" />);
    expect(screen.getByText(/Chưa có gì/)).toBeInTheDocument();
  });

  it("renders icon when provided", () => {
    const { container } = render(
      <EmptyState icon={Search} title="Empty" />,
    );
    // lucide icons render as svg
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders body + action slot", () => {
    render(
      <EmptyState
        title="No items"
        body="Create your first one."
        action={<button>Create</button>}
      />,
    );
    expect(screen.getByText(/Create your first one\./)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Create/ })).toBeInTheDocument();
  });
});
