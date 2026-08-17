"use server"

import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { verifyPassword } from "@/lib/auth"
import { createAdminSession, invalidateAdminSession } from "@/lib/adminAuth"
import { prisma } from "@/lib/prisma"

export interface AdminAuthResult {
  success: boolean
  error?:  string
}

// ─── Kill switch ──────────────────────────────────────────────────────────────

function isControlCenterDisabled(): boolean {
  return process.env.CONTROL_CENTER_DISABLED === "true"
}

// ─── Rate limiting constants ──────────────────────────────────────────────────

const MAX_ATTEMPTS    = 5   // failed attempts before lockout
const LOCKOUT_MS      = 15 * 60_000  // 15-minute lockout

// ─── next= sanitisation ───────────────────────────────────────────────────────

function sanitiseNext(next: string | null | undefined): string | null {
  if (!next) return null
  if (!next.startsWith("/") || next.startsWith("//")) return null
  if (!next.startsWith("/control-center")) return null
  if (next.startsWith("/control-center/login")) return null
  return next
}

// Generic message — never reveals whether email exists or account is locked
const GENERIC_ERROR = "Invalid email or password."

// ─── Rate limiting helpers ────────────────────────────────────────────────────

/**
 * Checks whether this email is currently under an active lockout.
 * Also checks the IP-based record if an IP is available.
 * Called BEFORE password comparison (saves compute on hammered accounts).
 */
async function isLockedOut(email: string, ip: string | null): Promise<boolean> {
  const now = new Date()

  // Per-email lockout check
  const emailRecord = await prisma.adminLoginAttempt.findFirst({
    where: { email, ip: null, lockedUntil: { gt: now } },
    select: { id: true },
  })
  if (emailRecord) return true

  // Per-IP lockout check (only if IP is known)
  if (ip) {
    const ipRecord = await prisma.adminLoginAttempt.findFirst({
      where: { ip, lockedUntil: { gt: now } },
      select: { id: true },
    })
    if (ipRecord) return true
  }

  return false
}

/**
 * Records one failed attempt for this email (and optionally IP).
 * If the failure count reaches MAX_ATTEMPTS, sets lockedUntil.
 * Always uses find-then-update (no unique constraint required on email+ip).
 */
async function recordFailedAttempt(email: string, ip: string | null): Promise<void> {
  const now      = new Date()
  const lockUntil = new Date(now.getTime() + LOCKOUT_MS)

  // ── Per-email record (ip = null) ─────────────────────────────────────────
  const emailRec = await prisma.adminLoginAttempt.findFirst({
    where: { email, ip: null },
  })

  if (emailRec) {
    const newCount = emailRec.failCount + 1
    await prisma.adminLoginAttempt.update({
      where: { id: emailRec.id },
      data: {
        failCount:   newCount,
        lockedUntil: newCount >= MAX_ATTEMPTS ? lockUntil : emailRec.lockedUntil,
      },
    })
  } else {
    await prisma.adminLoginAttempt.create({
      data: { email, ip: null, failCount: 1, lockedUntil: null },
    })
  }

  // ── Per-IP record (only if IP is known) ──────────────────────────────────
  if (ip) {
    const ipRec = await prisma.adminLoginAttempt.findFirst({
      where: { email, ip },
    })
    if (ipRec) {
      const newCount = ipRec.failCount + 1
      await prisma.adminLoginAttempt.update({
        where: { id: ipRec.id },
        data: {
          failCount:   newCount,
          lockedUntil: newCount >= MAX_ATTEMPTS ? lockUntil : ipRec.lockedUntil,
        },
      })
    } else {
      await prisma.adminLoginAttempt.create({
        data: { email, ip, failCount: 1, lockedUntil: null },
      })
    }
  }
}

/**
 * Clears ALL attempt records for an email after a successful login.
 * This resets the counter so a legitimate admin isn't permanently penalised.
 */
async function clearAttempts(email: string): Promise<void> {
  await prisma.adminLoginAttempt.deleteMany({ where: { email } }).catch(() => null)
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function adminLogin(
  _prev: AdminAuthResult,
  formData: FormData
): Promise<AdminAuthResult> {
  // 1. Emergency kill switch
  if (isControlCenterDisabled()) {
    return { success: false, error: GENERIC_ERROR }
  }

  const email    = (formData.get("email")    as string | null)?.trim().toLowerCase() ?? ""
  const password = (formData.get("password") as string | null) ?? ""
  const next     = sanitiseNext(formData.get("next") as string | null)

  if (!email || !password) {
    return { success: false, error: "Email and password are required." }
  }

  // 2. Extract best-effort IP (Vercel sets x-forwarded-for)
  const reqHeaders = await headers()
  const ip = (
    reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    reqHeaders.get("x-real-ip") ??
    null
  )

  // 3. Pre-check lockout before touching credentials
  if (await isLockedOut(email, ip)) {
    return { success: false, error: GENERIC_ERROR }
  }

  // 4. Constant-time password comparison — always run even when account not found
  const admin  = await prisma.adminMember.findUnique({ where: { email } })
  const dummy  = "$2a$12$invalidhashinvalidhashinvalidhashXXXXXXXXXXXXXXXX"
  const hash   = admin?.passwordHash ?? dummy
  const valid  = await verifyPassword(password, hash)

  // 5. Unified failure path — record attempt, return generic message
  //    isActive check uses same path so inactive admins can't enumerate via timing
  if (!admin || !valid || !admin.isActive) {
    await recordFailedAttempt(email, ip)
    return { success: false, error: GENERIC_ERROR }
  }

  // 6. Success — clear rate-limit records and issue session
  await clearAttempts(email)
  await createAdminSession(admin.id)
  redirect(next ?? "/control-center")
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function adminLogout(): Promise<void> {
  await invalidateAdminSession()
  redirect("/control-center/login")
}
