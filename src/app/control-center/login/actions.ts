"use server"

import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { timingSafeEqual } from "crypto"
import { hashPassword } from "@/lib/auth"
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

const MAX_ATTEMPTS = 5             // failed attempts before lockout
const LOCKOUT_MS   = 15 * 60_000  // 15-minute lockout

// ─── next= sanitisation ───────────────────────────────────────────────────────

function sanitiseNext(next: string | null | undefined): string | null {
  if (!next) return null
  if (!next.startsWith("/") || next.startsWith("//")) return null
  if (!next.startsWith("/control-center")) return null
  if (next.startsWith("/control-center/login")) return null
  return next
}

// Generic message — never reveals which field was wrong
const GENERIC_ERROR = "Invalid email or password."

// ─── Credential validation against env vars ───────────────────────────────────
//
// ADMIN_EMAIL and ADMIN_PASSWORD are the sole source of truth.
// Both comparisons use timingSafeEqual so timing attacks cannot reveal
// whether the email or the password was wrong.
// ADMIN_PASSWORD is never logged, returned, or sent to the browser.

function validateEnvCredentials(email: string, password: string): boolean {
  const configEmail    = process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? ""
  const configPassword = process.env.ADMIN_PASSWORD ?? ""

  if (!configEmail || !configPassword) return false  // not configured

  try {
    // Encode to equal-length buffers — timingSafeEqual requires same length
    const enc = (s: string) => Buffer.from(s, "utf8")

    const emailMatch =
      enc(email).length === enc(configEmail).length &&
      timingSafeEqual(enc(email), enc(configEmail))

    const passMatch =
      enc(password).length === enc(configPassword).length &&
      timingSafeEqual(enc(password), enc(configPassword))

    return emailMatch && passMatch
  } catch {
    return false
  }
}

// ─── Admin session identity ───────────────────────────────────────────────────
//
// createAdminSession() requires an AdminMember.id from the database.
// This helper returns the existing row for ADMIN_EMAIL, creating it if absent.
// The AdminMember row is purely an identity record — credentials are NOT
// validated from it. If ADMIN_EMAIL changes, the old row is abandoned and a
// new one is created automatically.

async function getOrCreateAdminMember(): Promise<{ id: string }> {
  const configEmail = (process.env.ADMIN_EMAIL?.trim().toLowerCase()) ?? ""
  const configName  = process.env.ADMIN_NAME?.trim() || "Admin"

  const existing = await prisma.adminMember.findUnique({
    where:  { email: configEmail },
    select: { id: true },
  })
  if (existing) return existing

  // Row doesn't exist yet — create it. passwordHash is set to a locked sentinel
  // value because credentials are validated against env vars, not this hash.
  const lockedHash = await hashPassword(`__env_auth_${configEmail}_${Date.now()}`)
  return prisma.adminMember.create({
    data: { email: configEmail, passwordHash: lockedHash, name: configName, isActive: true },
    select: { id: true },
  })
}

// ─── Rate limiting helpers ────────────────────────────────────────────────────

async function isLockedOut(email: string, ip: string | null): Promise<boolean> {
  const now = new Date()

  const emailRecord = await prisma.adminLoginAttempt.findFirst({
    where: { email, ip: null, lockedUntil: { gt: now } },
    select: { id: true },
  })
  if (emailRecord) return true

  if (ip) {
    const ipRecord = await prisma.adminLoginAttempt.findFirst({
      where: { ip, lockedUntil: { gt: now } },
      select: { id: true },
    })
    if (ipRecord) return true
  }

  return false
}

async function recordFailedAttempt(email: string, ip: string | null): Promise<void> {
  const now       = new Date()
  const lockUntil = new Date(now.getTime() + LOCKOUT_MS)

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

  if (ip) {
    const ipRec = await prisma.adminLoginAttempt.findFirst({ where: { email, ip } })
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

  // 3. Pre-check lockout before doing any credential work
  if (await isLockedOut(email, ip)) {
    return { success: false, error: GENERIC_ERROR }
  }

  // 4. Validate against ADMIN_EMAIL + ADMIN_PASSWORD env vars (timing-safe)
  //    This is the sole source of truth — no database password involved.
  const valid = validateEnvCredentials(email, password)

  if (!valid) {
    await recordFailedAttempt(email, ip)
    return { success: false, error: GENERIC_ERROR }
  }

  // 5. Credentials matched — get/create the AdminMember identity row and issue session
  const admin = await getOrCreateAdminMember()
  await clearAttempts(email)
  await createAdminSession(admin.id)
  redirect(next ?? "/control-center")
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function adminLogout(): Promise<void> {
  await invalidateAdminSession()
  redirect("/control-center/login")
}
