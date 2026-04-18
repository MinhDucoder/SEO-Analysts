import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScoreGaugeHero } from "@/components/dashboard/score-gauge-hero";

describe("<ScoreGaugeHero />", () => {
  it("renders score + '/ 100' when score provided", () => {
    render(<ScoreGaugeHero score={82} />);
    expect(screen.getByText("82")).toBeInTheDocument();
    expect(screen.getByText("/ 100")).toBeInTheDocument();
  });

  it("renders '—' when score is null", () => {
    render(<ScoreGaugeHero score={null} />);
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByText(/Chưa có audit hoàn tất/)).toBeInTheDocument();
  });

  it("renders delta badge when previousScore provided", () => {
    render(<ScoreGaugeHero score={85} previousScore={80} />);
    expect(screen.getByText(/\+6% so với audit trước/)).toBeInTheDocument();
  });

  it("renders 'Chưa đủ dữ liệu' when only current score exists", () => {
    render(<ScoreGaugeHero score={85} previousScore={null} />);
    expect(screen.getByText(/Chưa đủ dữ liệu so sánh/)).toBeInTheDocument();
  });

  it("shows negative delta for regressed scores", () => {
    render(<ScoreGaugeHero score={60} previousScore={80} />);
    expect(screen.getByText(/-25% so với audit trước/)).toBeInTheDocument();
  });
});
