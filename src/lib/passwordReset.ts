// =============================================================================
// passwordReset.ts — Server-only. Never import from Client Components.
//
// All database operations for the forgot-password / OTP flow.
//
// Security model:
//   - 6-digit code is generated with randomInt (CSPRNG).
//   - Only SHA-256(code) is stored — never the plaintext code.
//   - One active token per customer: requesting a new code deletes all previous
//     tokens for that customer.
//   - Token expires in TOKEN_TTL_MS (10 minutes).
//   - After MAX_ATTEMPTS failed verifications the token is deleted.
//   - RESEND_COOLDOWN_MS (60 s) enforced at the action layer using createdAt.
//   - verified flag is set to true after the correct code is submitted;
//     only a verified token authorises a password reset.
//   - After a successful password reset ALL tokens + ALL CustomerSession rows
//     for that customer are deleted (forces re-login on every device).
// =============================================================================

import { createHash, randomInt } from "crypto"
import { prisma } from "@/lib/prisma"

// ─── Constants ────────────────────────────────────────────────────────────────

export const TOKEN_TTL_MS        = 10 * 60 * 1_000   // 10 minutes
export const MAX_ATTEMPTS        = 5
export const RESEND_COOLDOWN_MS  = 60 * 1_000         // 60 seconds
const CODE_DIGITS = 6

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Generates a cryptographically secure 6-digit string like "048203". */
export function generateCode(): string {
  // randomInt(min, max) is inclusive-min, exclusive-max → 0–999999
  const n = randomInt(0, 1_000_000)
  return n.toString().padStart(CODE_DIGITS, "0")
}

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex")
}

// ─── Token creation ───────────────────────────────────────────────────────────

/**
 * Deletes all existing tokens for the customer and creates a fresh one.
 * Returns the plaintext code so the caller can email it.
 * The code is NOT stored here — only its hash is.
 */
export async function createResetToken(customerId: string): Promise<{
  code:      string
  expiresAt: Date
  createdAt: Date
}> {
  const code      = generateCode()
  const codeHash  = hashCode(code)
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS)

  // Invalidate all previous tokens for this customer atomically
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { customerId } }),
    prisma.passwordResetToken.create({
      data: { customerId, codeHash, expiresAt },
    }),
  ])

  const token = await prisma.passwordResetToken.findFirst({
    where: { customerId, codeHash },
    select: { createdAt: true },
  })

  return { code, expiresAt, createdAt: token!.createdAt }
}

// ─── Resend cooldown check ────────────────────────────────────────────────────

/**
 * Returns the remaining cooldown milliseconds (0 if none).
 * Checks the most recent token for this customer.
 */
export async function getResendCooldownMs(customerId: string): Promise<number> {
  const latest = await prisma.passwordResetToken.findFirst({
    where:   { customerId },
    orderBy: { createdAt: "desc" },
    select:  { createdAt: true },
  })
  if (!latest) return 0
  const elapsed = Date.now() - latest.createdAt.getTime()
  return Math.max(0, RESEND_COOLDOWN_MS - elapsed)
}

// ─── Code verification ────────────────────────────────────────────────────────

export type VerifyCodeResult =
  | { ok: true;  tokenId: string }
  | { ok: false; reason: "not_found" | "expired" | "max_attempts" | "wrong_code" }

/**
 * Verifies the submitted 6-digit code for a customer.
 * - Increments attempt counter on every wrong code.
 * - Deletes the token once MAX_ATTEMPTS is reached.
 * - Marks token as verified on success (does NOT log the customer in).
 */
export async function verifyResetCode(
  customerId: string,
  submittedCode: string
): Promise<VerifyCodeResult> {
  const token = await prisma.passwordResetToken.findFirst({
    where: { customerId, verified: false },
    orderBy: { createdAt: "desc" },
  })

  if (!token)                           return { ok: false, reason: "not_found"    }
  if (token.expiresAt < new Date())  {
    await prisma.passwordResetToken.delete({ where: { id: token.id } })
    return { ok: false, reason: "expired" }
  }
  if (token.attempts >= MAX_ATTEMPTS) {
    await prisma.passwordResetToken.delete({ where: { id: token.id } })
    return { ok: false, reason: "max_attempts" }
  }

  const submitted = hashCode(submittedCode.trim())
  if (submitted !== token.codeHash) {
    await prisma.passwordResetToken.update({
      where: { id: token.id },
      data:  { attempts: { increment: 1 } },
    })
    return { ok: false, reason: "wrong_code" }
  }

  // Correct — mark as verified
  await prisma.passwordResetToken.update({
    where: { id: token.id },
    data:  { verified: true },
  })
  return { ok: true, tokenId: token.id }
}

// ─── Verified token check (for reset step) ───────────────────────────────────

/**
 * Returns the token only if it is verified, not expired, and belongs to
 * the customer encoded in the session cookie produced after verification.
 */
export async function getVerifiedToken(
  customerId: string
): Promise<{ id: string } | null> {
  const token = await prisma.passwordResetToken.findFirst({
    where: {
      customerId,
      verified:  true,
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  })
  return token ?? null
}

// ─── Post-reset cleanup ───────────────────────────────────────────────────────

/**
 * Deletes ALL reset tokens and ALL customer sessions for this customer.
 * Call immediately after a successful password change.
 */
export async function invalidateAfterReset(customerId: string): Promise<void> {
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { customerId } }),
    prisma.customerSession.deleteMany(   { where: { customerId } }),
  ])
}
