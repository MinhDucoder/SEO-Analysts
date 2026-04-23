import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  return (
    <main className="container mx-auto flex min-h-screen max-w-3xl flex-col items-start justify-center gap-8 py-16">
      <div className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight">SEO Analyst — Public API</h1>
        <p className="text-lg text-muted-foreground">
          Phân tích SEO cho URL, markdown, hoặc HTML qua một HTTP endpoint duy nhất. Dùng thử
          playground hoặc lấy API key để tự động hoá.
        </p>
      </div>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/playground">Open Playground →</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/register">Get an API key →</Link>
        </Button>
      </div>
    </main>
  );
}
