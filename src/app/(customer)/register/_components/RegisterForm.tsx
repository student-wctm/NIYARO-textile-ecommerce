"use client"

import { useActionState, useState } from "react"
import { register } from "@/app/(customer)/auth/actions"
import type { AuthResult } from "@/app/(customer)/auth/actions"

const init: AuthResult = { success: false }

const inputCls = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:border-transparent"
const errInputCls = "w-full rounded-lg border border-red-400 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"

function Field({ label, name, children, error }: { label: string; name: string; children: React.ReactNode; error?: string }) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {error && <p role="alert" className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

function PasswordStrength({ password }: { password: string }) {
  const len     = password.length
  const hasUpper = /[A-Z]/.test(password)
  const hasLower = /[a-z]/.test(password)
  const hasNum   = /\d/.test(password)
  const hasSpec  = /[^A-Za-z0-9]/.test(password)
  const score    = [len >= 8, hasUpper, hasLower, hasNum, hasSpec].filter(Boolean).length

  if (!password) return null
  const [label, color] = score <= 2 ? ["Weak", "bg-red-400"] : score <= 3 ? ["Fair", "bg-amber-400"] : score <= 4 ? ["Good", "bg-blue-400"] : ["Strong", "bg-green-400"]
  const width = `${(score / 5) * 100}%`

  return (
    <div className="mt-1.5 space-y-1" aria-live="polite">
      <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
        <div className={`h-1.5 rounded-full transition-all ${color}`} style={{ width }} />
      </div>
      <p className="text-xs text-gray-500">Password strength: <span className="font-medium">{label}</span></p>
    </div>
  )
}

export function RegisterForm({ next }: { next?: string }) {
  const [state, action, isPending] = useActionState(register, init)
  const [showPw, setShowPw]         = useState(false)
  const [showCf, setShowCf]         = useState(false)
  const [pwValue, setPwValue]       = useState("")
  const fe = state.fieldErrors ?? {}

  return (
    <form action={action} noValidate className="space-y-4">
      {/* Preserve next redirect destination */}
      {next && <input type="hidden" name="next" value={next} />}
      {state.error && (
        <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{state.error}</div>
      )}

      <Field label="Full name" name="name" error={fe.name}>
        <input id="name" name="name" type="text" autoComplete="name" required placeholder="Akhil Sharma"
          className={fe.name ? errInputCls : inputCls} />
      </Field>

      <Field label="Email address" name="email" error={fe.email}>
        <input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com"
          className={fe.email ? errInputCls : inputCls} />
      </Field>

      <Field label="Phone number" name="phone" error={fe.phone}>
        <input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="+91 99999 00000"
          className={fe.phone ? errInputCls : inputCls} />
      </Field>

      <Field label="Password" name="password" error={fe.password}>
        <div className="relative">
          <input id="password" name="password"
            type={showPw ? "text" : "password"}
            autoComplete="new-password"
            required placeholder="Min. 8 characters"
            onChange={(e) => setPwValue(e.target.value)}
            className={`${fe.password ? errInputCls : inputCls} pr-10`} />
          <button type="button" onClick={() => setShowPw(p => !p)} aria-label={showPw ? "Hide" : "Show"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {showPw ? "🙈" : "👁️"}
          </button>
        </div>
        <PasswordStrength password={pwValue} />
      </Field>

      <Field label="Confirm password" name="confirm" error={fe.confirm}>
        <div className="relative">
          <input id="confirm" name="confirm"
            type={showCf ? "text" : "password"}
            autoComplete="new-password" required placeholder="Repeat password"
            className={`${fe.confirm ? errInputCls : inputCls} pr-10`} />
          <button type="button" onClick={() => setShowCf(p => !p)} aria-label={showCf ? "Hide" : "Show"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {showCf ? "🙈" : "👁️"}
          </button>
        </div>
      </Field>

      <div>
        <label className="flex items-start gap-2 cursor-pointer">
          <input type="checkbox" name="terms" className="mt-0.5 accent-[var(--color-brand-600)]" />
          <span className="text-xs text-gray-600">
            I agree to the{" "}
            <a href="/terms" className="text-[var(--color-brand-600)] hover:underline">Terms of Service</a>
            {" "}and{" "}
            <a href="/privacy" className="text-[var(--color-brand-600)] hover:underline">Privacy Policy</a>
          </span>
        </label>
        {fe.terms && <p role="alert" className="mt-1 text-xs text-red-600">{fe.terms}</p>}
      </div>

      <button type="submit" disabled={isPending}
        className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-brand-600)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-700)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
        {isPending && <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
        {isPending ? "Creating account…" : "Create Account"}
      </button>
    </form>
  )
}
