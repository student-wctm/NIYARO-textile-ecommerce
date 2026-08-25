"use client"

import { useActionState } from "react"
import { verifyCode, resendCode } from "@/app/(customer)/auth/forgot-password-actions"
import type { ResetResult } from "@/app/(customer)/auth/forgot-password-actions"

const initial: ResetResult = { success: false }

export function VerifyCodeForm() {
  const [verifyState, verifyAction, verifyPending] = useActionState(verifyCode, initial)
  const [resendState, resendAction, resendPending] = useActionState(resendCode, initial)

  return (
    <div className="space-y-5">
      {/* Verify code form */}
      <form action={verifyAction} className="space-y-5">
        <div>
          <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
            Verification code
          </label>
          <input
            id="code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            pattern="\d{6}"
            required
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-center text-2xl font-mono tracking-[.5em] text-gray-900 placeholder-gray-300 focus:border-[var(--color-brand-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/20"
            placeholder="000000"
          />
          <p className="mt-1.5 text-xs text-gray-400 text-center">
            Enter the 6-digit code from your email
          </p>
        </div>

        {verifyState.error && (
          <p role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {verifyState.error}
          </p>
        )}

        <button
          type="submit"
          disabled={verifyPending}
          className="w-full rounded-lg bg-[var(--color-brand-600)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-700)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-600)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {verifyPending ? "Verifying…" : "Verify code"}
        </button>
      </form>

      {/* Resend button — separate form */}
      <div className="border-t border-gray-100 pt-4">
        <form action={resendAction}>
          {resendState.error && (
            <p className="mb-2 text-xs text-center text-red-600">{resendState.error}</p>
          )}
          {resendState.success && (
            <p className="mb-2 text-xs text-center text-green-600">A new code has been sent to your email.</p>
          )}
          <button
            type="submit"
            disabled={resendPending}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {resendPending ? "Sending…" : "Resend code"}
          </button>
        </form>
      </div>
    </div>
  )
}
