'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';

function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function HomePage() {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isValidUrl(url)) {
      setError('Please enter a valid URL (e.g., https://example.com)');
      return;
    }

    setLoading(true);
    try {
      const result = await api.createAudit(url);
      router.push(`/audit/${result.jobId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start audit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-60px)] flex-col items-center justify-center px-4">
      <div className="max-w-2xl text-center">
        <h1 className="mb-4 text-5xl font-bold tracking-tight text-[var(--foreground)]">
          Analyze Your Website&apos;s SEO
        </h1>
        <p className="mb-8 text-lg text-[var(--muted-foreground)]">
          Get a comprehensive SEO audit with 20+ rules, performance analysis,
          and actionable recommendations to improve your search rankings.
        </p>

        <form onSubmit={handleSubmit} className="mx-auto max-w-xl">
          <div className="flex gap-2">
            <input
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError('');
              }}
              placeholder="https://example.com"
              className="flex-1 rounded-lg border border-[var(--border)] px-4 py-3 text-base outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)] focus:ring-opacity-20"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-[var(--primary)] px-6 py-3 font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Starting...' : 'Analyze'}
            </button>
          </div>
          {error && (
            <p className="mt-2 text-sm text-[var(--destructive)]">{error}</p>
          )}
        </form>

        <div className="mt-12 grid grid-cols-1 gap-6 text-left sm:grid-cols-3">
          <div className="rounded-lg border border-[var(--border)] p-4">
            <h3 className="mb-2 font-semibold">20+ SEO Rules</h3>
            <p className="text-sm text-[var(--muted-foreground)]">
              Technical SEO, on-page optimization, and performance checks.
            </p>
          </div>
          <div className="rounded-lg border border-[var(--border)] p-4">
            <h3 className="mb-2 font-semibold">Core Web Vitals</h3>
            <p className="text-sm text-[var(--muted-foreground)]">
              Lighthouse integration for LCP, CLS, INP, and TTFB metrics.
            </p>
          </div>
          <div className="rounded-lg border border-[var(--border)] p-4">
            <h3 className="mb-2 font-semibold">Fix Recommendations</h3>
            <p className="text-sm text-[var(--muted-foreground)]">
              Prioritized, actionable steps to improve your SEO score.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
