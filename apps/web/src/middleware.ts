import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = ["/login", "/register", "/forgot-password"];
const protectedPrefixes = ["/dashboard", "/settings", "/campaigns", "/contacts", "/automations"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isStaticFile =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/static") ||
    /\.(ico|png|jpg|jpeg|svg|css|js|woff2?)$/.test(pathname);

  if (isStaticFile) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get("session")?.value;
  const isAuthenticated = !!sessionCookie;

  if (isAuthenticated && publicPaths.includes(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (!isAuthenticated && isProtected) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
