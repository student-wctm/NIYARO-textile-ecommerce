// Utilities for reading and writing the selected-branch cookie.
//
// Architecture notes:
//   - Guests: branch selection stored only in this cookie.
//   - Authenticated customers: cookie is the primary source; on login,
//     the cookie value is synced to Customer.selectedBranchId in the DB.
//   - Cookie value is a JSON-encoded SelectedBranch object (kept small).
//   - Reading (server-side): use getSelectedBranchFromCookies() in
//     Server Components and Route Handlers.
//   - Writing: must happen inside a Server Action or Route Handler
//     (Next.js 16 does not allow cookie.set during SSR rendering).

import { cookies } from "next/headers"
import type { SelectedBranch } from "@/types/branch"
import { SELECTED_BRANCH_COOKIE } from "@/types/branch"

// 30-day expiry in seconds
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30

/**
 * Read the selected branch from the request cookies.
 * Returns null if no branch has been selected yet.
 * Safe to call from any Server Component.
 */
export async function getSelectedBranchFromCookies(): Promise<SelectedBranch | null> {
  const cookieStore = await cookies()
  const raw = cookieStore.get(SELECTED_BRANCH_COOKIE)?.value
  if (!raw) return null
  try {
    return JSON.parse(raw) as SelectedBranch
  } catch {
    return null
  }
}

/**
 * Persist a selected branch to the response cookies.
 * Must be called from a Server Action or Route Handler.
 */
export async function setSelectedBranchCookie(
  branch: SelectedBranch
): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(SELECTED_BRANCH_COOKIE, JSON.stringify(branch), {
    maxAge: COOKIE_MAX_AGE,
    httpOnly: false, // needs to be readable by client JS for UI display
    sameSite: "lax",
    path: "/",
    // secure: true — enable in production via environment flag
    secure: process.env.NODE_ENV === "production",
  })
}

/**
 * Clear the selected branch cookie.
 * Must be called from a Server Action or Route Handler.
 */
export async function clearSelectedBranchCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(SELECTED_BRANCH_COOKIE, "", { maxAge: 0, path: "/" })
}
