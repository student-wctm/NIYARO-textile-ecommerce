"use client"

import { useActionState } from "react"
import { resetPassword } from "@/app/(customer)/auth/forgot-password-actions"
import type { ResetResult } from "@/app/(customer)/auth/forgot-password-actions"

const initial: ResetResult = { success: false }

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(resetPassword, initial)

  return (
    <form action={action} className="space-y-5">
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-[var(--color-brand-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/20"
          placeholder="Minimum 8 characters"
        />
      </div>

      <div>
        <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1">
          Confirm new password
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-[var(--color-brand-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/20"
          placeholder="Re-enter your password"
        />
      </div>

      {state.error && (
        <p role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-[var(--color-brand-600)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-700)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-600)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {pending ? "Updating…" : "Update password"}
      </button>
    </form>
  )
}
