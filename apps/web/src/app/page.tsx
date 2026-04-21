import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";

/**
 * Placeholder landing page for the web-bootstrap slug. The real landing
 * ships in slug 9 (public-pages). For now this serves three purposes:
 *   1. Give tsc/Next something to build so `npm run dev` boots cleanly.
 *   2. Smoke-test the design token + font wiring visually (verify Manrope
 *      wordmark, Inter body, primary-container button shadow).
 *   3. Confirm `<html lang="vi">` + metadata flow by carrying Vietnamese copy.
 */
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <Badge variant="primary" size="md">
        web-bootstrap
      </Badge>
      <h1 className="font-headline text-display-lg text-primary">{APP_NAME}</h1>
      <p className="max-w-md text-body-lg text-on-surface-variant">{APP_TAGLINE}</p>
      <p className="max-w-md text-body-sm text-on-surface-variant">
        Đang xây dựng giao diện người dùng. Hạ tầng scaffold + thiết kế tokens đã sẵn sàng; các
        slug tiếp theo (auth, dashboard, audit, admin) sẽ đắp dần UI thực tế.
      </p>
      <Button variant="primary" size="lg">
        Hệ thống đang chuẩn bị
      </Button>
    </main>
  );
}
