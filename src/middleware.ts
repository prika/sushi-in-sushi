import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: [
    // Match all pathnames except for:
    // - api routes
    // - _next (Next.js internals)
    // - static files (favicon, images, etc.)
    // - admin, cozinha, mesa, demo routes (non-i18n routes)
    "/((?!api|_next|_vercel|admin|cozinha|mesa|demo|.*\\..*).*)",
  ],
};
