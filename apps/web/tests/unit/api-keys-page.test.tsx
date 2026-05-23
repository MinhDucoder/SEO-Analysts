import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { renderWithIntl } from "../helpers/render";

// SettingsShell renders locale-aware <Link>; stub it so no app-router context
// is needed. Pass props through so role/aria attributes survive.
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

import ApiKeysPage from "@/app/[locale]/(app)/settings/api-keys/page";

const API = "http://localhost:3000/api/v1";

describe("ApiKeysPage", () => {
  it("renders inside the settings shell WITHOUT a legacy AuthProvider", async () => {
    server.use(http.get(`${API}/users/me/api-keys`, () => HttpResponse.json([])));

    // Regression: the page used the orphaned `useAuth` context (lib/auth.tsx)
    // which threw "useAuth must be used within <AuthProvider>". It must now
    // render using the current `api` ky client (no provider needed).
    renderWithIntl(<ApiKeysPage />);

    expect(screen.getByRole("heading", { name: "API keys" })).toBeInTheDocument();
    expect(await screen.findByText(/No keys yet/i)).toBeInTheDocument();
  });
});
