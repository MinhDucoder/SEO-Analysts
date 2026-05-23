import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";

/**
 * Public marketing shell (pricing, policy). PUBLIC — no AuthGuard. html/body +
 * intl provider live in the parent [locale]/layout.tsx; this only adds the
 * shared header/footer chrome. Route group → no URL segment.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <div className="flex-1">{children}</div>
      <PublicFooter />
    </div>
  );
}
