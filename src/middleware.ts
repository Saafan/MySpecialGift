import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "mlg_session";

/**
 * Fast cookie-presence gate for protected areas. This is UX routing, not the
 * security boundary: every server action and page in these areas re-validates
 * the session against the database via requireUser() (defence in depth).
 * V1's only "guard" was a client-side localStorage truthiness check.
 */
const PROTECTED_PREFIXES = ["/designs", "/orders", "/cart", "/checkout", "/account"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (!isProtected) return NextResponse.next();

  const hasSession = request.cookies.has(SESSION_COOKIE);
  if (hasSession) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("returnTo", pathname + request.nextUrl.search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/designs/:path*",
    "/orders/:path*",
    "/cart/:path*",
    "/checkout/:path*",
    "/account/:path*",
  ],
};
