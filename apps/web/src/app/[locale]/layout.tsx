import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Providers } from "@/app/providers";
import { APP_URL } from "@/lib/constants";
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

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "app" });
  const name = t("name");
  const tagline = t("tagline");

  return {
    title: { default: `${name} — ${tagline}`, template: `%s · ${name}` },
    description: tagline,
    metadataBase: new URL(APP_URL),
    applicationName: name,
    icons: { icon: [{ url: "/favicon.svg", type: "image/svg+xml" }] },
    openGraph: {
      type: "website",
      locale: locale === "vi" ? "vi_VN" : "en_US",
      url: APP_URL,
      siteName: name,
      title: name,
      description: tagline,
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#0A0A0B",
  width: "device-width",
  initialScale: 1,
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${inter.variable} ${jetbrains.variable}`}>
      <body>
        <NextIntlClientProvider messages={messages} locale={locale}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
