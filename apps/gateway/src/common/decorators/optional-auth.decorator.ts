import { SetMetadata } from '@nestjs/common';

export const OPTIONAL_AUTH_KEY = 'optional_auth';

/**
 * Marks a route as optionally authenticated: the JWT is verified and `req.user`
 * populated when an Authorization header is present, but requests without one are
 * still allowed through (with `req.user` undefined). A malformed/expired token on
 * an optional route does NOT reject — it simply leaves the request anonymous.
 */
export const OptionalAuth = () => SetMetadata(OPTIONAL_AUTH_KEY, true);
