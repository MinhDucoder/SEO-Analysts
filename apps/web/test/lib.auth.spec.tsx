import * as React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '../src/lib/auth';
import type { ApiClient } from '../src/lib/api';

function Consumer() {
  const { user, status, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="user">{user ? user.email : 'none'}</span>
      <button onClick={() => login({ email: 'a@b.c', password: 'p' })}>login</button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
}

function wrap(client: ApiClient) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>
      <AuthProvider client={client}>{children}</AuthProvider>
    </QueryClientProvider>
  );
}

describe('AuthProvider', () => {
  let client: {
    post: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    client = { post: vi.fn(), get: vi.fn() };
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('initial status=unauthenticated when no stored token', async () => {
    render(<Consumer />, { wrapper: wrap(client as never) });
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('unauthenticated'));
    expect(screen.getByTestId('user').textContent).toBe('none');
  });

  it('login: calls POST /auth/login, stores token, sets user, status=authenticated', async () => {
    client.post.mockResolvedValue({
      user: { id: 'u1', email: 'a@b.c', fullName: 'A', role: 'user', emailVerified: true },
      accessToken: 'jwt-1',
    });
    render(<Consumer />, { wrapper: wrap(client as never) });
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('unauthenticated'));
    await act(async () => {
      screen.getByText('login').click();
    });
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('authenticated'));
    expect(screen.getByTestId('user').textContent).toBe('a@b.c');
    expect(client.post).toHaveBeenCalledWith('/auth/login', { email: 'a@b.c', password: 'p' });
  });

  it('logout: calls POST /auth/logout, clears state', async () => {
    client.post.mockResolvedValue({
      user: { id: 'u1', email: 'a@b.c', fullName: 'A', role: 'user', emailVerified: true },
      accessToken: 'jwt-1',
    });
    render(<Consumer />, { wrapper: wrap(client as never) });
    await act(async () => {
      screen.getByText('login').click();
    });
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('authenticated'));
    client.post.mockResolvedValueOnce({ message: 'ok' });
    await act(async () => {
      screen.getByText('logout').click();
    });
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('unauthenticated'));
    expect(screen.getByTestId('user').textContent).toBe('none');
  });
});
