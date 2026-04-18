import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ROUTES } from "@/lib/constants";

/**
 * Shared shell for every (auth) page. RSC-safe (no 'use client' hook), so
 * it renders statically with a small interactive island underneath.
 */
export interface AuthFormShellProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthFormShell({ title, description, children, footer }: AuthFormShellProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-6">
      <Card variant="outline" padding="lg" className="w-full max-w-md">
        <CardHeader className="items-center space-y-3 pb-2 text-center">
          <Link href={ROUTES.home} aria-label="SEO Analyst" className="inline-block">
            <Image src="/logo.svg" alt="SEO Analyst" width={180} height={36} priority />
          </Link>
          <CardTitle className="text-h2">{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardHeader>
        <CardContent className="space-y-4">{children}</CardContent>
        {footer ? <div className="pt-4 text-center text-body-sm text-on-surface-variant">{footer}</div> : null}
      </Card>
    </div>
  );
}
