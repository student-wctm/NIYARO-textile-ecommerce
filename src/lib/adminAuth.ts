// =============================================================================
// adminAuth.ts — Server-only. Never import from Client Components.
//
// Mirrors the customer session architecture from auth.ts exactly:
//   - randomBytes(32) → 64-hex raw token
//   - SHA-256(raw) stored in AdminSession.tokenHash — raw never touches DB
//   - Raw token set in HttpOnly, Secure (prod), SameSite=Lax cookie
//   - Cookie path="/control-center" — never sent to /staff or /account routes
//   - 30-day rolling expiry
//   - Every request: read cookie → hash → DB lookup → expiry check → active check
//   - Logout: delete AdminSession row + clear cookie
//
// Emergency kill switch:
//   Set CONTROL_CENTER_DISABLED=true to block all Control Center access.
//   getSessionAdmin() returns null immediately. adminLogin() refuses all logins.
//   Customer and staff authentication are NOT affected.
// =============================================================================

import { cookies } from "next/headers"
import { createHash, randomBytes } from "crypto"
import { prisma } from "@/lib/prisma"
import type { AdminMember } from "@/generated/prisma/client"

// ─── Constants ────────────────────────────────────────────────────────────────

export const ADMIN_COOKIE = "niyaro_admin"   // internal identifier — NOT the route
const SESSION_DAYS = 30
const SESSION_MS   = SESSION_DAYS * 24 * 60 * 60 * 1000

// ─── Emergency kill switch ────────────────────────────────────────────────────

function isControlCenterDisabled(): boolean {
  return process.env.CONTROL_CENTER_DISABLED === "true"
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function generateToken(): string {
  return randomBytes(32).toString("hex")
}

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex")
}

// ─── Session creation ─────────────────────────────────────────────────────────

export async function createAdminSession(adminId: string): Promise<void> {
  const raw       = generateToken()
  const tokenHash = hashToken(raw)
  const expiresAt = new Date(Date.now() + SESSION_MS)

  await prisma.adminSession.create({
    data: { tokenHash, adminId, expiresAt },
  })

  const cookieStore = await cookies()
  cookieStore.set(ADMIN_COOKIE, raw, {
    httpOnly: true,
    sameSite: "lax",
    secure:   process.env.NODE_ENV === "production",
    path:     "/control-center",   // scoped — never sent outside /control-center
    maxAge:   SESSION_DAYS * 24 * 60 * 60,
  })
}

// ─── Session identity type ────────────────────────────────────────────────────

export type SessionAdmin = Pick<AdminMember, "id" | "name" | "email" | "isActive">

// ─── Session validation ───────────────────────────────────────────────────────

export async function getSessionAdmin(): Promise<SessionAdmin | null> {
  // Emergency kill switch — entire Control Center disabled
  if (isControlCenterDisabled()) return null

  const cookieStore = await cookies()
  const raw = cookieStore.get(ADMIN_COOKIE)?.value
  if (!raw) return null

  const tokenHash = hashToken(raw)
  const session   = await prisma.adminSession.findUnique({
    where:   { tokenHash },
    include: {
      admin: {
        select: { id: true, name: true, email: true, isActive: true },
      },
    },
  })

  if (!session)                        return null
  if (session.expiresAt < new Date())  { await _deleteSession(tokenHash); return null }
  if (!session.admin.isActive)         return null

  return session.admin
}

// ─── Logout / invalidation ────────────────────────────────────────────────────

async function _deleteSession(tokenHash: string): Promise<void> {
  await prisma.adminSession.deleteMany({ where: { tokenHash } }).catch(() => null)
}

export async function invalidateAdminSession(): Promise<void> {
  try {
    const cookieStore = await cookies()
    const raw = cookieStore.get(ADMIN_COOKIE)?.value
    if (raw) {
      await _deleteSession(hashToken(raw))
    }
    // Clear cookie regardless of DB outcome — path must match Set-Cookie path
    cookieStore.set(ADMIN_COOKIE, "", { maxAge: 0, path: "/control-center" })
  } catch {
    // Best-effort logout — swallow errors
  }
}

// ─── Session revocation ───────────────────────────────────────────────────────

/**
 * Revokes ALL active sessions for a given admin.
 * Use when: password change, account compromise, forced sign-out.
 * Server-only — never call from a Client Component.
 */
export async function revokeAllAdminSessions(adminId: string): Promise<void> {
  await prisma.adminSession.deleteMany({ where: { adminId } })
}
