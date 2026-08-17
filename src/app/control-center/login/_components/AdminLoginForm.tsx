"use client"

import { useActionState, useState } from "react"
import { adminLogin } from "@/app/control-center/login/actions"
import type { AdminAuthResult } from "@/app/control-center/login/actions"

const init: AdminAuthResult = { success: false }

const inputCls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:border-transparent"

export function AdminLoginForm({ next }: { next?: string }) {
  const [state, action, isPending] = useActionState(adminLogin, init)
  const [showPw, setShowPw] = useState(false)

  return (
    <form action={action} noValidate className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}

      {state.error && (
        <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div>
        <label htmlFor="adm-email" className="block text-sm font-medium text-slate-700 mb-1">
          Email
        </label>
        <input id="adm-email" name="email" type="email" autoComplete="email" required
          placeholder="admin@example.com" className={inputCls} />
      </div>

      <div>
        <label htmlFor="adm-pw" className="block text-sm font-medium text-slate-700 mb-1">
          Password
        </label>
        <div className="relative">
          <input id="adm-pw" name="password" type={showPw ? "text" : "password"}
            autoComplete="current-password" required placeholder="••••••••"
            className={`${inputCls} pr-10`} />
          <button type="button" onClick={() => setShowPw(p => !p)}
            aria-label={showPw ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
            {showPw ? (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <button type="submit" disabled={isPending}
        className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-brand-600)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-700)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
        {isPending && (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {isPending ? "Signing in…" : "Sign In"}
      </button>
    </form>
  )
}
