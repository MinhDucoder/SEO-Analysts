'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  React.useEffect(() => {
    if (status === 'authenticated') router.replace('/dashboard');
  }, [status, router]);
  return (
    <div className="container mx-auto flex min-h-screen max-w-md items-center justify-center py-10">
      {children}
    </div>
  );
}
