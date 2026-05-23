import { describe, it, expect, vi } from "vitest";
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "@/messages/en.json";

// next-intl's createNavigation pulls in next/navigation, which jsdom can't
// resolve under vitest — stub the locale-aware Link with a plain anchor.
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={typeof href === "string" ? href : "#"} {...rest}>
      {children}
    </a>
  ),
}));

import { ToolShell } from "@/components/tools/tool-shell";
import { QuotaBanner } from "@/components/tools/quota-banner";

// QuotaBanner uses next-intl + the locale-aware <Link>, so provide real messages.
function withIntl(ui: ReactNode) {
  return (
    <NextIntlClientProvider locale="en" messages={enMessages}>
      {ui}
    </NextIntlClientProvider>
  );
}

describe("ToolShell", () => {
  it("renders title, description, and input/result slots", () => {
    render(
      <ToolShell title="Google Preview" description="Render SERP snippet">
        <ToolShell.Input>INPUT</ToolShell.Input>
        <ToolShell.Result>RESULT</ToolShell.Result>
      </ToolShell>,
    );
    expect(screen.getByText("Google Preview")).toBeInTheDocument();
    expect(screen.getByText("Render SERP snippet")).toBeInTheDocument();
    expect(screen.getByText("INPUT")).toBeInTheDocument();
    expect(screen.getByText("RESULT")).toBeInTheDocument();
  });
});

describe("QuotaBanner", () => {
  it("renders nothing without meta", () => {
    const { container } = render(withIntl(<QuotaBanner meta={null} authenticated={false} />));
    expect(container).toBeEmptyDOMElement();
  });

  it("hides for unlimited quota (quotaLeft < 0)", () => {
    const { container } = render(
      withIntl(<QuotaBanner meta={{ quotaUsed: 0, quotaLeft: -1, cached: false }} authenticated />),
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows remaining count and a login CTA when anonymous", () => {
    render(
      withIntl(
        <QuotaBanner meta={{ quotaUsed: 1, quotaLeft: 2, cached: false }} authenticated={false} />,
      ),
    );
    expect(screen.getByText(/2\/3 left today/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Sign in for more/ })).toBeInTheDocument();
  });

  it("shows an upgrade CTA when authenticated", () => {
    render(
      withIntl(
        <QuotaBanner meta={{ quotaUsed: 9, quotaLeft: 1, cached: true }} authenticated />,
      ),
    );
    expect(screen.getByText(/cached/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Upgrade/ })).toBeInTheDocument();
  });
});
