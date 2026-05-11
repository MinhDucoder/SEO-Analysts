import type { Metadata, Viewport } from "next";
import { Providers } from "./providers";
import { APP_NAME, APP_TAGLINE, APP_URL } from "@/lib/constants";

// Phase 5 will re-add: globals.css (Tailwind + tokens), fonts (per Pencil
// $font-ui / $font-mono spec), and rebuild metadata once branding is wired.

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — ${APP_TAGLINE}`,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_TAGLINE,
  metadataBase: new URL(APP_URL),
  applicationName: APP_NAME,
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: APP_URL,
    siteName: APP_NAME,
    title: APP_NAME,
    description: APP_TAGLINE,
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0B",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
