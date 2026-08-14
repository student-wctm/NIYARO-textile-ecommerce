// =============================================================================
// NIYARO Middleware — customer route protection
//
// Runs on the Edge runtime (no Node.js APIs, no Prisma).
// Purpose: redirect unauthenticated requests to /login for protected routes.
//
// Cookie presence is a fast pre-check. Full session validation (DB lookup,
// expiry check) happens inside the Server Component / Server Action on every
// protected page, so there is no security gap.
//
// Protected:  /account and all sub-paths
// Public:     everything else (/, /login, /register, /products, /branches,
//             /admin, /staff, /api, etc.)
//
// Admin and staff routes are NOT handled here — they have their own separate
// access control (future: admin session middleware).
// =============================================================================

import { type NextRequest, NextResponse } from "next/server"

const SESSION_COOKIE = "niyaro_session"

// Routes that require an authenticated customer session
const PROTECTED_PREFIXES = ["/account", "/checkout", "/order-success"]

// Routes that should redirect an already-logged-in customer away
const AUTH_ONLY_ROUTES = ["/login", "/register"]

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl
  const hasSession   = request.cookies.has(SESSION_COOKIE)

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
  const isAuthOnly  = AUTH_ONLY_ROUTES.some((p) => pathname === p || pathname.startsWith(p + "/"))

  // Unauthenticated user hitting a protected page → /login
  if (isProtected && !hasSession) {
    const loginUrl = new URL("/login", request.url)
    // Preserve the original destination so we can redirect back after login
    loginUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Already logged in and hitting /login or /register → /account
  if (isAuthOnly && hasSession) {
    return NextResponse.redirect(new URL("/account", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/account/:path*",
    "/checkout/:path*",
    "/checkout",
    "/order-success/:path*",
    "/login",
    "/register",
  ],
}
