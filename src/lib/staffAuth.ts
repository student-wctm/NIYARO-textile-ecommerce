// =============================================================================
// staffAuth.ts — Server-only. Never import from Client Components.
//
// Same secure session pattern as adminAuth.ts.
//   - Cookie path="/staff" — never sent to /control-center or /account routes
//   - getSessionStaff() includes the Branch so branchId is always from DB
//   - branchId must NEVER be accepted from browser input for staff actions
// =============================================================================

import { cookies } from "next/headers"
import { createHash, randomBytes } from "crypto"
import { prisma } from "@/lib/prisma"
import type { StaffMember, Branch } from "@/generated/prisma/client"

// ─── Constants ────────────────────────────────────────────────────────────────

export const STAFF_COOKIE = "niyaro_staff"
const SESSION_DAYS = 30
const SESSION_MS   = SESSION_DAYS * 24 * 60 * 60 * 1000

// ─── Internal helpers ─────────────────────────────────────────────────────────

function generateToken(): string {
  return randomBytes(32).toString("hex")
}

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex")
}

// ─── Session creation ─────────────────────────────────────────────────────────

export async function createStaffSession(staffId: string): Promise<void> {
  const raw       = generateToken()
  const tokenHash = hashToken(raw)
  const expiresAt = new Date(Date.now() + SESSION_MS)

  await prisma.staffSession.create({
    data: { tokenHash, staffId, expiresAt },
  })

  const cookieStore = await cookies()
  cookieStore.set(STAFF_COOKIE, raw, {
    httpOnly: true,
    sameSite: "lax",
    secure:   process.env.NODE_ENV === "production",
    path:     "/staff",   // scoped — never sent outside /staff
    maxAge:   SESSION_DAYS * 24 * 60 * 60,
  })
}

// ─── Session identity type ────────────────────────────────────────────────────

// Branch is always loaded from the DB — never from browser input.
export type SessionStaff = Pick<StaffMember, "id" | "name" | "email" | "branchId" | "isActive"> & {
  branch: Pick<Branch, "id" | "name" | "city">
}

// ─── Session validation ───────────────────────────────────────────────────────

export async function getSessionStaff(): Promise<SessionStaff | null> {
  const cookieStore = await cookies()
  const raw = cookieStore.get(STAFF_COOKIE)?.value
  if (!raw) return null

  const tokenHash = hashToken(raw)
  const session   = await prisma.staffSession.findUnique({
    where:   { tokenHash },
    include: {
      staff: {
        select: {
          id:       true,
          name:     true,
          email:    true,
          branchId: true,
          isActive: true,
          branch: { select: { id: true, name: true, city: true } },
        },
      },
    },
  })

  if (!session)                        return null
  if (session.expiresAt < new Date())  { await _deleteSession(tokenHash); return null }
  if (!session.staff.isActive)         return null

  return session.staff as SessionStaff
}

// ─── Logout / invalidation ────────────────────────────────────────────────────

async function _deleteSession(tokenHash: string): Promise<void> {
  await prisma.staffSession.deleteMany({ where: { tokenHash } }).catch(() => null)
}

export async function invalidateStaffSession(): Promise<void> {
  try {
    const cookieStore = await cookies()
    const raw = cookieStore.get(STAFF_COOKIE)?.value
    if (raw) {
      await _deleteSession(hashToken(raw))
    }
    cookieStore.set(STAFF_COOKIE, "", { maxAge: 0, path: "/staff" })
  } catch {
    // Best-effort logout
  }
}

// ─── Session revocation ───────────────────────────────────────────────────────

/**
 * Revokes ALL active sessions for a given staff member.
 * Use when: password change, account compromise, branch reassignment.
 * Server-only — never call from a Client Component.
 */
export async function revokeAllStaffSessions(staffId: string): Promise<void> {
  await prisma.staffSession.deleteMany({ where: { staffId } })
}
