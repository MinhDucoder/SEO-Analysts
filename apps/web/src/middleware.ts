import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Match all pathnames except API routes, internal Next.js paths, static files.
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
