import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { GoogleSerpCard } from "@/components/tools/google-serp-card";

describe("GoogleSerpCard", () => {
  it("renders title, displayUrl and description", () => {
    render(
      <GoogleSerpCard
        title="Hello World"
        description="Test description goes here"
        displayUrl="example.com › blog"
        faviconUrl="https://example.com/favicon.ico"
        device="desktop"
      />,
    );
    expect(screen.getByText("Hello World")).toBeInTheDocument();
    expect(screen.getByText("Test description goes here")).toBeInTheDocument();
    expect(screen.getByText("example.com › blog")).toBeInTheDocument();
  });

  it("falls back to 'Untitled' when title is empty", () => {
    render(
      <GoogleSerpCard title="" description="d" displayUrl="example.com" faviconUrl="" device="mobile" />,
    );
    expect(screen.getByText("Untitled")).toBeInTheDocument();
  });
});
