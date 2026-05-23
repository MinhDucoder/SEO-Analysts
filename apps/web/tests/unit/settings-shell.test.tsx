import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "../helpers/render";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

import { SettingsShell } from "@/components/settings/settings-shell";

describe("SettingsShell", () => {
  it("renders all four settings tabs", () => {
    renderWithIntl(
      <SettingsShell active="billing">
        <div>content</div>
      </SettingsShell>,
    );
    for (const label of ["Hồ sơ", "Mật khẩu", "API keys", "Gói & Thanh toán"]) {
      expect(screen.getByRole("tab", { name: label })).toBeInTheDocument();
    }
  });

  it("marks the active tab", () => {
    renderWithIntl(
      <SettingsShell active="billing">
        <div>content</div>
      </SettingsShell>,
    );
    expect(screen.getByRole("tab", { name: "Gói & Thanh toán" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});
