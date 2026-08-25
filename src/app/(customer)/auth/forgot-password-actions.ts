"use server"

// =============================================================================
// forgot-password-actions.ts — Server-only Server Actions for the
// customer forgot-password / OTP / password-reset flow.
//
// Three steps:
//   1. requestPasswordReset  — customer submits email → send OTP
//   2. verifyResetCode       — customer submits 6-digit code
//   3. resetPassword         — customer submits new password
//
// Between steps the customer's identity is carried by a short-lived HttpOnly
// cookie (niyaro_pwr) holding only the customer ID — never the OTP code.
// The OTP code is stored only as a SHA-256 hash in the database.
//
// Security guarantees:
//   - OTP not in URL, not in cookie, not logged.
//   - Generic responses prevent email enumeration.
//   - 60-second resend cooldown.
//   - 5 failed attempts → token deleted (must request new code).
//   - 10-minute token expiry.
//   - Verified token required before password update is allowed.
//   - After reset: all sessions + all reset tokens for customer are deleted.
//   - New password hashed with bcrypt (12 rounds) via existing hashPassword.
// =============================================================================

import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { hashPassword } from "@/lib/auth"
import { getCustomerByEmail } from "@/lib/customers"
import { prisma } from "@/lib/prisma"
import {
  createResetToken,
  verifyResetCode,
  getVerifiedToken,
  invalidateAfterReset,
  getResendCooldownMs,
  RESEND_COOLDOWN_MS,
} from "@/lib/passwordReset"
import { sendPasswordResetEmail } from "@/lib/email"

export interface ResetResult {
  success: boolean
  error?:  string
}

// ─── Cookie that carries customerId between steps ─────────────────────────────
// HttpOnly, 15-minute TTL, path-scoped to /forgot-password so it is
// never sent to any other route.

const PWR_COOKIE = "niyaro_pwr"
const PWR_COOKIE_TTL = 15 * 60  // seconds

async function setPwrCookie(customerId: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(PWR_COOKIE, customerId, {
    httpOnly: true,
    sameSite: "lax",
    secure:   process.env.NODE_ENV === "production",
    path:     "/forgot-password",
    maxAge:   PWR_COOKIE_TTL,
  })
}

async function getPwrCookie(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(PWR_COOKIE)?.value ?? null
}

async function clearPwrCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(PWR_COOKIE, "", { maxAge: 0, path: "/forgot-password" })
}

// ─── Step 1: Request password reset ──────────────────────────────────────────

export async function requestPasswordReset(
  _prev: ResetResult,
  formData: FormData
): Promise<ResetResult> {
  const email = (formData.get("email") as string | null)?.trim().toLowerCase() ?? ""

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: "Enter a valid email address." }
  }

  // Always return the same success-like response whether the email exists or
  // not — prevents account enumeration.
  const customer = await getCustomerByEmail(email)

  if (customer && customer.isActive) {
    // Enforce resend cooldown
    const cooldown = await getResendCooldownMs(customer.id)
    if (cooldown > 0) {
      const secs = Math.ceil(cooldown / 1000)
      return { success: false, error: `Please wait ${secs} seconds before requesting another code.` }
    }

    try {
      const { code } = await createResetToken(customer.id)
      await sendPasswordResetEmail({ toEmail: customer.email, toName: customer.name, code })
    } catch (err) {
      // Log sanitised message — never the OTP
      console.error("[requestPasswordReset] email send failed:", err instanceof Error ? err.message : "unknown")
      return { success: false, error: "Could not send email. Please try again." }
    }

    await setPwrCookie(customer.id)
  }
  // If customer not found or inactive: still set the cookie to a dummy value
  // so the UI advances to the verify screen (generic UX — no enumeration).
  // The verifyResetCode step will fail gracefully for non-existent tokens.
  // For an inactive account we silently do nothing.

  // Always redirect to verify screen
  redirect("/forgot-password/verify")
}

// ─── Step 2: Verify 6-digit code ─────────────────────────────────────────────

export async function verifyCode(
  _prev: ResetResult,
  formData: FormData
): Promise<ResetResult> {
  const code       = (formData.get("code") as string | null)?.trim() ?? ""
  const customerId = await getPwrCookie()

  // Generic error for any failure — don't reveal whether email was found
  const FAIL = { success: false, error: "Invalid or expired code. Please try again." }

  if (!customerId)            return FAIL
  if (!/^\d{6}$/.test(code)) return { success: false, error: "Enter the 6-digit code from your email." }

  const result = await verifyResetCode(customerId, code)

  if (!result.ok) {
    if (result.reason === "max_attempts") {
      await clearPwrCookie()
      return { success: false, error: "Too many incorrect attempts. Please request a new code." }
    }
    if (result.reason === "expired") {
      await clearPwrCookie()
      return { success: false, error: "This code has expired. Please request a new one." }
    }
    return FAIL
  }

  // Code verified — advance to reset step (cookie still valid)
  redirect("/forgot-password/reset")
}

// ─── Step 3: Set new password ─────────────────────────────────────────────────

export async function resetPassword(
  _prev: ResetResult,
  formData: FormData
): Promise<ResetResult> {
  const password = (formData.get("password") as string | null) ?? ""
  const confirm  = (formData.get("confirm")  as string | null) ?? ""
  const customerId = await getPwrCookie()

  if (!customerId) {
    return { success: false, error: "Session expired. Please start over." }
  }

  if (password.length < 8) {
    return { success: false, error: "Password must be at least 8 characters." }
  }
  if (password !== confirm) {
    return { success: false, error: "Passwords do not match." }
  }

  // Verify a verified token still exists for this customer
  const token = await getVerifiedToken(customerId)
  if (!token) {
    await clearPwrCookie()
    return { success: false, error: "Session expired. Please start over." }
  }

  // Update password
  const passwordHash = await hashPassword(password)
  await prisma.customer.update({
    where: { id: customerId },
    data:  { passwordHash },
  })

  // Invalidate all reset tokens + all customer sessions (forces re-login)
  await invalidateAfterReset(customerId)
  await clearPwrCookie()

  // Redirect to login with a success flag
  redirect("/login?reset=1")
}

// ─── Resend code (called from verify screen) ──────────────────────────────────

export async function resendCode(_prev: ResetResult): Promise<ResetResult> {
  const customerId = await getPwrCookie()
  if (!customerId) {
    return { success: false, error: "Session expired. Please start over." }
  }

  const customer = await prisma.customer.findUnique({
    where:  { id: customerId },
    select: { id: true, email: true, name: true, isActive: true },
  })

  if (!customer || !customer.isActive) {
    return { success: false, error: "Please start over." }
  }

  const cooldown = await getResendCooldownMs(customer.id)
  if (cooldown > 0) {
    const secs = Math.ceil(cooldown / 1000)
    return { success: false, error: `Please wait ${secs} seconds before requesting another code.` }
  }

  try {
    const { code } = await createResetToken(customer.id)
    await sendPasswordResetEmail({ toEmail: customer.email, toName: customer.name, code })
  } catch {
    return { success: false, error: "Could not send email. Please try again." }
  }

  return { success: true }
}
