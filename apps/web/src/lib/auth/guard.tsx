"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth/hooks";
import { ROUTES } from "@/lib/constants";

/**
 * Redirects to /login if the user is not authenticated. Renders a
 * full-height skeleton while the store is hydrating or the redirect is in
 * flight, so no guarded content flashes.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!isAuthenticated) {
      router.replace(ROUTES.login);
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return <FullPageSkeleton />;
  }

  return <>{children}</>;
}

/**
 * Renders a Not-Authorized card when the authenticated user is not an
 * admin. Does NOT redirect — admin areas may be reachable from a normal
 * user session, and bouncing them confuses the nav.
 */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAdmin } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!isAuthenticated) {
      router.replace(ROUTES.login);
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return <FullPageSkeleton />;
  }

  if (!isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <Card variant="outline" padding="lg" className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Không có quyền truy cập</CardTitle>
            <CardDescription>
              Khu vực này dành riêng cho quản trị viên.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="primary" onClick={() => router.push(ROUTES.dashboard)}>
              Về Dashboard
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return <>{children}</>;
}

function FullPageSkeleton() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-80" />
      <Skeleton className="h-4 w-72" />
    </main>
  );
}
