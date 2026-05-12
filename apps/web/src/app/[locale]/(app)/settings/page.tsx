import { redirect } from "@/i18n/navigation";
import { ROUTES } from "@/lib/constants";

/**
 * Bare `/settings` lands on the Profile tab. Server-side redirect so the
 * URL canonicalizes without a client-side flash.
 */
export default function SettingsIndexPage({
  params,
}: {
  params: { locale: string };
}) {
  redirect({ href: ROUTES.settingsProfile, locale: params.locale });
}
