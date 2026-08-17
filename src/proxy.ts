// =============================================================================
// NIYARO Proxy — route protection for customer, admin, and staff routes.
//
// Runs on the Edge runtime (no Node.js APIs, no Prisma).
// Cookie presence is a fast pre-flight check ONLY.
// Full DB session validation happens inside Server Components and Actions.
//
// Cookie names:
//   niyaro_session — customer auth   (path: /)
//   niyaro_admin   — admin auth      (path: /control-center, scoped by browser)
//   niyaro_staff   — staff auth      (path: /staff, scoped by browser)
//
// These cookies are path-scoped by the Set-Cookie response header, so:
//   - niyaro_admin is never sent to /staff or /account routes
//   - niyaro_staff is never sent to /control-center or /account routes
//   - niyaro_session is never a substitute for admin or staff access
//
// IMPORTANT: Proxy cookie checks are NOT the real authorization mechanism.
// They are a performance optimisation to avoid hitting Next.js for clearly
// unauthenticated requests. All privileged Server Actions and Server
// Components perform full DB-backed session validation independently.
// =============================================================================

import { type NextRequest, NextResponse } from "next/server"

const SESSION_COOKIE = "niyaro_session"    // customer
const ADMIN_COOKIE   = "niyaro_admin"      // admin (internal name — NOT the route)
const STAFF_COOKIE   = "niyaro_staff"      // staff

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl

  // ── Customer routes ──────────────────────────────────────────────────────

  const customerProtected = ["/account", "/checkout", "/order-success"]
  const customerAuthOnly  = ["/login", "/register"]

  const isCustomerProtected = customerProtected.some((p) => pathname.startsWith(p))
  const isCustomerAuthOnly  = customerAuthOnly.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  )

  if (isCustomerProtected && !request.cookies.has(SESSION_COOKIE)) {
    const url = new URL("/login", request.url)
    url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }

  if (isCustomerAuthOnly && request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.redirect(new URL("/account", request.url))
  }

  // ── Control Center routes ─────────────────────────────────────────────────

  // /control-center/login is always public.
  // The login page itself calls getSessionAdmin() and redirects to /control-center
  // if the session is genuinely valid. We must NOT redirect here based on cookie
  // presence alone — a stale/invalid cookie would cause an infinite loop:
  //   proxy redirects login → /control-center → layout rejects stale session
  //   → redirects back to /control-center/login → proxy redirects again → loop.
  if (pathname === "/control-center/login" || pathname.startsWith("/control-center/login/")) {
    return NextResponse.next()
  }

  // All other /control-center/* routes require niyaro_admin cookie (pre-flight only).
  // Full DB validation still happens in the layout and every Server Action.
  if (pathname === "/control-center" || pathname.startsWith("/control-center/")) {
    if (!request.cookies.has(ADMIN_COOKIE)) {
      const url = new URL("/control-center/login", request.url)
      url.searchParams.set("next", pathname)
      return NextResponse.redirect(url)
    }
  }

  // ── Staff routes ──────────────────────────────────────────────────────────

  // /staff/login is public (but redirects to /staff if already authed)
  if (pathname === "/staff/login" || pathname.startsWith("/staff/login/")) {
    if (request.cookies.has(STAFF_COOKIE)) {
      return NextResponse.redirect(new URL("/staff", request.url))
    }
    return NextResponse.next()
  }

  // All other /staff/* routes require niyaro_staff cookie (pre-flight only)
  if (pathname === "/staff" || pathname.startsWith("/staff/")) {
    if (!request.cookies.has(STAFF_COOKIE)) {
      const url = new URL("/staff/login", request.url)
      url.searchParams.set("next", pathname)
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Customer routes
    "/account/:path*",
    "/checkout/:path*",
    "/checkout",
    "/order-success/:path*",
    "/login",
    "/register",
    // Control Center routes
    "/control-center",
    "/control-center/:path*",
    // Staff routes
    "/staff",
    "/staff/:path*",
  ],
}
