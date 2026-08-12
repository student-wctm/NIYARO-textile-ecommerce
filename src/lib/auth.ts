// =============================================================================
// auth.ts — Server-only. Never import from Client Components.
//
// Authentication architecture:
//   - Passwords: bcryptjs (ROUNDS=12) — no plain-text ever stored or logged
//   - Sessions:  random 32-byte token → SHA-256 hash stored in DB
//               raw token set in HttpOnly SameSite=Lax cookie
//   - Expiry:    30 days rolling
//   - Logout:    deletes session row + clears cookie
// =============================================================================

import { cookies } from "next/headers"
import { createHash, randomBytes } from "crypto"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import type { Customer } from "@/generated/prisma/client"

// ─── Constants ────────────────────────────────────────────────────────────────

const SESSION_COOKIE  = "niyaro_session"
const BCRYPT_ROUNDS   = 12
const SESSION_DAYS    = 30
const SESSION_MS      = SESSION_DAYS * 24 * 60 * 60 * 1000

// ─── Password helpers ─────────────────────────────────────────────────────────

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

// ─── Token helpers ────────────────────────────────────────────────────────────

function generateToken(): string {
  return randomBytes(32).toString("hex") // 64 hex chars, 256 bits of entropy
}

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex")
}

// ─── Session creation (call after successful login) ───────────────────────────

export async function createSession(
  customerId: string,
  meta?: { userAgent?: string; ipAddress?: string }
): Promise<void> {
  const raw      = generateToken()
  const tokenHash = hashToken(raw)
  const expiresAt = new Date(Date.now() + SESSION_MS)

  await prisma.customerSession.create({
    data: {
      tokenHash,
      customerId,
      expiresAt,
      userAgent:  meta?.userAgent  ?? null,
      ipAddress:  meta?.ipAddress  ?? null,
    },
  })

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, raw, {
    httpOnly:  true,
    sameSite:  "lax",
    secure:    process.env.NODE_ENV === "production",
    path:      "/",
    maxAge:    SESSION_DAYS * 24 * 60 * 60,
  })
}

// ─── Session validation (call on protected routes) ───────────────────────────

export type SessionCustomer = Pick<
  Customer,
  "id" | "name" | "email" | "phone" | "isActive" | "selectedBranchId"
>

export async function getSessionCustomer(): Promise<SessionCustomer | null> {
  const cookieStore = await cookies()
  const raw = cookieStore.get(SESSION_COOKIE)?.value
  if (!raw) return null

  const tokenHash = hashToken(raw)
  const session   = await prisma.customerSession.findUnique({
    where:   { tokenHash },
    include: {
      customer: {
        select: {
          id: true, name: true, email: true, phone: true,
          isActive: true, selectedBranchId: true,
        },
      },
    },
  })

  if (!session)                              return null
  if (session.expiresAt < new Date())        { await invalidateSession(raw); return null }
  if (!session.customer.isActive)            return null

  return session.customer
}

// ─── Session invalidation (logout) ───────────────────────────────────────────

export async function invalidateSession(raw?: string): Promise<void> {
  try {
    const cookieStore = await cookies()
    const token = raw ?? cookieStore.get(SESSION_COOKIE)?.value
    if (token) {
      await prisma.customerSession.deleteMany({
        where: { tokenHash: hashToken(token) },
      })
    }
    cookieStore.set(SESSION_COOKIE, "", { maxAge: 0, path: "/" })
  } catch {
    // Swallow errors on logout — best effort
  }
}

// ─── Session cookie name (for middleware) ─────────────────────────────────────

export { SESSION_COOKIE }
