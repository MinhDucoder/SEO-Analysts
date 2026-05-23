import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { AiSuggestionCard } from "@/components/audit-detail/ai-suggestion-card";

describe("<AiSuggestionCard>", () => {
  it("renders explanation and fix when a suggestion is provided", () => {
    render(
      <AiSuggestionCard
        suggestion={{
          ruleId: "title-tag",
          explanation: "Title too long.",
          actionableFix: "Shorten to under 60 chars.",
        }}
      />,
    );
    expect(screen.getByText(/Title too long\./)).toBeInTheDocument();
    expect(screen.getByText(/Shorten to under 60 chars\./)).toBeInTheDocument();
  });

  it("renders nothing when suggestion is undefined and not loading", () => {
    const { container } = render(<AiSuggestionCard suggestion={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a loading state when status="loading"', () => {
    render(<AiSuggestionCard suggestion={undefined} status="loading" />);
    expect(screen.getByText(/AI đang phân tích/i)).toBeInTheDocument();
  });
});
