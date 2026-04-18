import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LayoutDashboard } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";

describe("<StatCard />", () => {
  it("renders label + value + up delta", () => {
    render(
      <StatCard
        label="Audit tháng này"
        value={12}
        delta="+3"
        deltaDirection="up"
        icon={LayoutDashboard}
      />,
    );
    expect(screen.getByText(/Audit tháng này/)).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("+3")).toBeInTheDocument();
  });

  it("renders — when value is null and suppresses delta", () => {
    render(
      <StatCard
        label="Empty"
        value={null}
        delta="+3"
        icon={LayoutDashboard}
        placeholder="Chưa đủ dữ liệu"
      />,
    );
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.queryByText("+3")).not.toBeInTheDocument();
    expect(screen.getByText(/Chưa đủ dữ liệu/)).toBeInTheDocument();
  });

  it("applies tertiary accent chip color class", () => {
    const { container } = render(
      <StatCard
        label="Good"
        value={5}
        icon={LayoutDashboard}
        accent="tertiary"
      />,
    );
    const chip = container.querySelector(".bg-tertiary\\/10");
    expect(chip).toBeInTheDocument();
  });
});
