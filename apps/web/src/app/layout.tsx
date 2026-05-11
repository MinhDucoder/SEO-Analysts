import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Providers } from "./providers";
import { APP_NAME, APP_TAGLINE, APP_URL } from "@/lib/constants";
import "@/styles/globals.css";

// Pencil $font-ui = Inter, $font-mono = JetBrains Mono. CSS vars
// --font-ui / --font-mono are mapped through tokens.css → tailwind.config.
const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-ui",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

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
    <html lang="vi" className={`${inter.variable} ${jetbrains.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
