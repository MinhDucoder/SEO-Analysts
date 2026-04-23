/**
 * @file Mirrored auth types — source of truth is `apps/gateway/src/auth/`.
 * Keep these shapes in sync when the backend changes.
 */

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'user' | 'admin';
  emailVerified: boolean;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
}

export interface LoginInput {
  email: string;
  password: string;
}
