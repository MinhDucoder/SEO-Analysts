import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  FacebookOgCard,
  TwitterCard,
  LinkedinOgCard,
} from "@/components/tools/social-cards";

describe("social cards", () => {
  it("FacebookOgCard renders title + description + site name", () => {
    render(
      <FacebookOgCard
        title="My OG Title"
        description="My OG description"
        image="https://cdn.example.com/og.png"
        siteName="Example"
      />,
    );
    expect(screen.getByText("My OG Title")).toBeInTheDocument();
    expect(screen.getByText("My OG description")).toBeInTheDocument();
    expect(screen.getByText("Example")).toBeInTheDocument();
  });

  it("TwitterCard renders title", () => {
    render(<TwitterCard title="Tweet Title" description="d" image="" siteName="x.com" />);
    expect(screen.getByText("Tweet Title")).toBeInTheDocument();
  });

  it("LinkedinOgCard falls back to Untitled when no title", () => {
    render(<LinkedinOgCard image="" siteName="example.com" />);
    expect(screen.getByText("Untitled")).toBeInTheDocument();
  });
});
