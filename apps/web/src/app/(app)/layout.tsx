'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, status, logout } = useAuth();
  const router = useRouter();
  React.useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
  }, [status, router]);

  if (status !== 'authenticated') {
    return (
      <main className="container mx-auto py-12 text-sm text-muted-foreground">Loading…</main>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between py-4">
          <Link href="/dashboard" className="text-lg font-semibold">
            SEO Analyst
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/playground" className="text-muted-foreground hover:text-foreground">
              Playground
            </Link>
            <Link href="/settings/api-keys" className="text-muted-foreground hover:text-foreground">
              API keys
            </Link>
            <span className="text-muted-foreground">{user?.email}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await logout();
                router.replace('/login');
              }}
            >
              Log out
            </Button>
          </nav>
        </div>
      </header>
      <main className="container mx-auto py-8">{children}</main>
    </div>
  );
}
