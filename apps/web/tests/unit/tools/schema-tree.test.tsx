import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SchemaTree } from "@/components/tools/schema-tree";

describe("SchemaTree", () => {
  it("shows a Valid badge for blocks with no errors", () => {
    render(
      <SchemaTree
        blocks={[{ type: "Organization", raw: { name: "Org" }, validation: { errors: [], warnings: [] } }]}
      />,
    );
    expect(screen.getByText("Organization")).toBeInTheDocument();
    expect(screen.getByText("Valid")).toBeInTheDocument();
  });

  it("shows an error count badge and lists errors", () => {
    render(
      <SchemaTree
        blocks={[
          {
            type: "Product",
            raw: {},
            validation: { errors: ['Missing required "name".'], warnings: [] },
          },
        ]}
      />,
    );
    expect(screen.getByText("1 error(s)")).toBeInTheDocument();
    expect(screen.getByText(/Missing required/)).toBeInTheDocument();
  });

  it("renders an empty-state message when there are no blocks", () => {
    render(<SchemaTree blocks={[]} />);
    expect(screen.getByText(/No JSON-LD blocks/)).toBeInTheDocument();
  });
});
