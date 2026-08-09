import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, JWT_COOKIE_NAME } from "@/lib/auth";

// Routes that must stay reachable without a session cookie:
// - /login itself (or you'd never be able to log in)
// - the EA webhook (authenticated separately via EA_SECRET_KEY, not cookies)
const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/webhooks/trade"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(JWT_COOKIE_NAME)?.value;
  const valid = token ? await verifySessionToken(token) : false;

  if (!valid) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except static assets / Next internals.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
