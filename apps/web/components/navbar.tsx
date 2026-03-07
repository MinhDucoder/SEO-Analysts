'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem('accessToken'));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setIsLoggedIn(false);
    window.location.href = '/';
  };

  return (
    <nav className="border-b border-[var(--border)] bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-xl font-bold text-[var(--primary)]">
          SEO Analyzer
        </Link>
        <div className="flex items-center gap-4">
          {isLoggedIn ? (
            <button
              onClick={handleLogout}
              className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              Logout
            </button>
          ) : (
            <>
              <Link
                href="/auth?mode=login"
                className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                Login
              </Link>
              <Link
                href="/auth?mode=register"
                className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm text-white hover:opacity-90"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
