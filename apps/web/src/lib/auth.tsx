'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiClient, browserTokenStore } from './api';
import { env } from './env';
import type { LoginInput, LoginResponse, RegisterInput, User } from '@/types/auth';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  client: ApiClient;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  client,
}: {
  children: React.ReactNode;
  client?: ApiClient;
}) {
  const [tokens] = React.useState(() => browserTokenStore());
  const api = React.useMemo(
    () => client ?? new ApiClient(env.apiBase, tokens),
    [client, tokens],
  );
  const qc = useQueryClient();

  const meQuery = useQuery<User | null>({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      if (!tokens.get()) return null;
      try {
        const u = await api.get<User>('/auth/me');
        return u;
      } catch {
        tokens.set(null);
        return null;
      }
    },
    staleTime: Infinity,
  });

  const loginMut = useMutation({
    mutationFn: (input: LoginInput) => api.post<LoginResponse>('/auth/login', input),
    onSuccess: (res) => {
      tokens.set(res.accessToken);
      qc.setQueryData(['auth', 'me'], res.user);
    },
  });

  const registerMut = useMutation({
    mutationFn: (input: RegisterInput) =>
      api.post<{ user: User; accessToken: string }>('/auth/register', input),
    onSuccess: (res) => {
      tokens.set(res.accessToken);
      qc.setQueryData(['auth', 'me'], res.user);
    },
  });

  const logoutMut = useMutation({
    mutationFn: () => api.post<{ message: string }>('/auth/logout', {}),
    onSettled: () => {
      tokens.set(null);
      qc.setQueryData(['auth', 'me'], null);
      qc.clear();
    },
  });

  const status: AuthStatus = meQuery.isFetching
    ? 'loading'
    : meQuery.data
      ? 'authenticated'
      : 'unauthenticated';

  const value: AuthContextValue = {
    user: meQuery.data ?? null,
    status,
    login: async (input) => {
      await loginMut.mutateAsync(input);
    },
    register: async (input) => {
      await registerMut.mutateAsync(input);
    },
    logout: async () => {
      await logoutMut.mutateAsync();
    },
    client: api,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
