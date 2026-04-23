import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="container mx-auto flex min-h-screen max-w-xl flex-col items-start justify-center gap-4 py-16">
      <h1 className="text-2xl font-semibold">404 — Page not found</h1>
      <Button asChild variant="outline">
        <Link href="/">Back home</Link>
      </Button>
    </main>
  );
}
