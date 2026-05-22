import { describe, it, expect, afterEach, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "../helpers/render";
import { useQuotaDialog } from "@/lib/billing/quota-dialog.store";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, onClick }: { href: string; children: React.ReactNode; onClick?: () => void }) => (
    <a href={href} onClick={onClick}>{children}</a>
  ),
}));

import { QuotaExceededDialog } from "@/components/billing/QuotaExceededDialog";

afterEach(() => useQuotaDialog.getState().close());

describe("QuotaExceededDialog", () => {
  it("upgrade button links to /pricing", () => {
    useQuotaDialog.getState().show({ message: "hết quota" });
    renderWithIntl(<QuotaExceededDialog />);
    const link = screen.getByRole("link", { name: /nâng cấp/i });
    expect(link).toHaveAttribute("href", "/pricing");
  });
});
