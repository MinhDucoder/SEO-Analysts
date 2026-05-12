import { redirect } from "@/i18n/navigation";
import { ROUTES } from "@/lib/constants";

export default function AdminIndexPage({
  params,
}: {
  params: { locale: string };
}) {
  redirect({ href: ROUTES.adminStats, locale: params.locale });
}
