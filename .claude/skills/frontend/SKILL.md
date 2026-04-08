---
name: frontend-development
description: Use this skill when the user asks about "Next.js", "React components", "TanStack Query", "shadcn/ui", "Tailwind CSS", "Socket.IO client", "App Router", "server component", "client component", or any frontend development work. Provides Next.js 14 patterns, component design, and data fetching strategies.
allowed-tools: Read, Grep, Glob, Bash(npm run *), Bash(npx *)
---

# Next.js 14 + React Frontend Patterns

## App Router Structure

```
app/
  ├── layout.tsx              # Root layout (providers, metadata)
  ├── page.tsx                # Landing page (Server Component)
  ├── loading.tsx             # Global loading UI
  ├── error.tsx               # Global error boundary
  ├── not-found.tsx           # 404 page
  ├── (auth)/                 # Route group (no URL segment)
  │   ├── login/page.tsx      # Client Component
  │   └── register/page.tsx   # Client Component
  ├── audit/[id]/
  │   ├── page.tsx            # Audit progress (Client - Socket.IO)
  │   └── results/page.tsx    # Results dashboard (Client)
  └── (dashboard)/            # Protected route group
      ├── layout.tsx          # Auth check layout
      └── history/page.tsx    # Audit history
```

---

## Server vs Client Components

### Server Component (default) - Data fetching, static content

```tsx
// app/page.tsx (Landing Page - Server Component)
import { URLInput } from '@/components/audit/url-input'; // Client Component

export const metadata = {
  title: 'SEO Analysis Tool - Free Website Audit',
  description: 'Analyze your website SEO with 20+ checks and get actionable recommendations.',
};

export default async function LandingPage() {
  // Co the fetch data truc tiep (no useEffect, no useState)
  const stats = await getPublicStats(); // server-side fetch

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold mb-8">SEO Analysis Tool</h1>
      <p className="text-muted-foreground mb-8">
        {stats.totalAudits}+ websites analyzed
      </p>
      <URLInput /> {/* Client Component for interactivity */}
    </main>
  );
}
```

### Client Component - Interactivity, hooks, browser APIs

```tsx
// components/audit/url-input.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSubmitAudit } from '@/hooks/use-audit';

export function URLInput() {
  const [url, setUrl] = useState('');
  const router = useRouter();
  const { mutate, isPending } = useSubmitAudit();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate(url, {
      onSuccess: (data) => router.push(`/audit/${data.jobId}`),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-lg gap-2">
      <Input
        type="url"
        placeholder="https://example.com"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        required
      />
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Analyzing...' : 'Analyze'}
      </Button>
    </form>
  );
}
```

### Key Rule

```
- Server Component: data fetching, SEO metadata, static UI
- Client Component ('use client'): useState, useEffect, event handlers, browser APIs
- KHONG dung 'use client' tren layout.tsx hoac page.tsx khi khong can thiet
- Async Server Components: fetch data truc tiep (no useEffect)
```

---

## Data Fetching (Server Components)

```tsx
// Server Component - fetch truc tiep, co cache
async function getAuditResult(id: string) {
  const res = await fetch(`${process.env.API_URL}/audits/${id}`, {
    cache: 'no-store',  // Luon fetch moi (giong getServerSideProps)
  });
  if (!res.ok) throw new Error('Failed to fetch audit');
  return res.json();
}

// Hoac voi revalidation
async function getPublicStats() {
  const res = await fetch(`${process.env.API_URL}/stats`, {
    next: { revalidate: 300 }, // Revalidate moi 5 phut
  });
  return res.json();
}
```

---

## TanStack Query (Client Components)

```typescript
// hooks/use-audit.ts
'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// Fetch audit result
export function useAuditResult(jobId: string) {
  return useQuery({
    queryKey: ['audit', jobId],
    queryFn: () => api.get(`/audits/${jobId}`).then(r => r.data),
    enabled: !!jobId,
    refetchInterval: (query) => {
      // Auto-refetch khi audit chua xong
      const status = query.state.data?.status;
      return status === 'COMPLETED' || status === 'FAILED' ? false : 3000;
    },
  });
}

// Submit audit
export function useSubmitAudit() {
  return useMutation({
    mutationFn: (url: string) => api.post('/audits', { url }).then(r => r.data),
  });
}

// Audit history
export function useAuditHistory() {
  return useQuery({
    queryKey: ['audit-history'],
    queryFn: () => api.get('/audits/history').then(r => r.data),
  });
}
```

### Query Provider Setup

```tsx
// providers/query-provider.tsx
'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        retry: 1,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

// app/layout.tsx
import { QueryProvider } from '@/providers/query-provider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
```

---

## Socket.IO Hook (Real-Time Progress)

```typescript
// hooks/use-audit-progress.ts
'use client';
import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface AuditProgress {
  stage: 'queued' | 'crawling' | 'analyzing' | 'scoring' | 'generating_report' | 'completed' | 'failed';
  progress: number;
  error?: string;
}

export function useAuditProgress(jobId: string | null) {
  const [progress, setProgress] = useState<AuditProgress>({ stage: 'queued', progress: 0 });
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!jobId) return;

    const socket: Socket = io(process.env.NEXT_PUBLIC_WS_URL!, {
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('join-audit', { jobId });
    });

    socket.on('progress', (data: AuditProgress) => {
      setProgress(data);
    });

    socket.on('disconnect', () => setIsConnected(false));

    return () => {
      socket.off('progress');
      socket.off('connect');
      socket.off('disconnect');
      socket.disconnect(); // CLEANUP - tranh memory leak
    };
  }, [jobId]);

  return { ...progress, isConnected };
}
```

---

## API Client

```typescript
// lib/api.ts
import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 30000,
});

// Attach JWT
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 -> refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const { data } = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
          refreshToken: localStorage.getItem('refresh_token'),
        });
        localStorage.setItem('access_token', data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
```

---

## shadcn/ui Component Usage

```bash
# Install components
npx shadcn@latest add button card badge progress input tabs
```

```tsx
// Score color coding
import { Badge } from '@/components/ui/badge';

function ScoreBadge({ score }: { score: number }) {
  const variant = score >= 80 ? 'default' : score >= 50 ? 'secondary' : 'destructive';
  const label = score >= 80 ? 'Good' : score >= 50 ? 'Needs Work' : 'Poor';

  return <Badge variant={variant}>{score} - {label}</Badge>;
}
```

---

## Tailwind CSS Conventions

```
- Mobile-first: default -> sm: -> md: -> lg: -> xl:
- shadcn/ui tokens: bg-background, text-foreground, text-muted-foreground
- Dark mode: class strategy (dark:bg-slate-900)
- Avoid arbitrary values [#xxx] khi co utility class tuong duong
- cn() helper (clsx + tailwind-merge) cho conditional classes
```

---

## Checklist

```
Components:
- Server Components by default, 'use client' only when needed
- Async Server Components for direct data fetching
- Route groups (...) for shared layouts without URL segments

Data:
- TanStack Query for ALL client-side API calls
- Server-side fetch() in Server Components (with cache options)
- Socket.IO cleanup in useEffect return (CRITICAL)
- refetchInterval for polling active audit status

UI:
- shadcn/ui components (Button, Card, Badge, Input, Progress...)
- Tailwind responsive: mobile-first breakpoints
- Loading/error states for all async operations
- Metadata export on Server Component pages for SEO

Auth:
- JWT in localStorage (access + refresh tokens)
- Axios interceptor for auto-refresh on 401
- Protected routes via layout.tsx auth check
```
