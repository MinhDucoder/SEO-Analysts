/**
 * Client-side API type surface. Re-exports enums/interfaces from @repo/shared
 * and declares client-only shapes (AuthenticatedUser, AuditListItem) that the
 * gateway returns but are not yet in the shared package. Slug 2 (auth-flow)
 * and slug 4 (audits-list) may move these into @repo/shared once stable.
 */

export {
  AuditStatus,
  CheckStatus,
  IssueCategory,
  UserRole,
  Classification,
  FormFactor,
  AuditMode,
  AlertType,
  JWT_CONFIG,
  RATE_LIMIT,
  classify,
} from "@repo/shared";

export type {
  AuditProgressEvent,
  CoreWebVitals,
  ImageInfo,
  LinkInfo,
} from "@repo/shared";

/**
 * Authenticated user shape returned by gateway `POST /auth/login`,
 * `POST /auth/register`, `GET /auth/me`. Mirrors
 * apps/gateway/src/auth/interfaces/authenticated-user.interface.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: "user" | "admin";
  emailVerified: boolean;
  createdAt: string;
}

/**
 * Session envelope used on login/register/refresh responses.
 */
export interface AuthSession {
  user: AuthenticatedUser;
  accessToken: string;
}

/**
 * Generic paginated response shape.
 */
export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Minimal error envelope used when `ky` interceptor parses non-2xx responses.
 */
export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
}
