import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { useTranslations } from "next-intl";
import { renderWithIntl } from "../helpers/render";

function Probe() {
  const t = useTranslations("nav");
  return <span>{t("pricing")}</span>;
}

describe("renderWithIntl", () => {
  it("provides NextIntlClientProvider so useTranslations resolves", () => {
    renderWithIntl(<Probe />);
    expect(screen.getByText("Bảng giá")).toBeInTheDocument();
  });
});
