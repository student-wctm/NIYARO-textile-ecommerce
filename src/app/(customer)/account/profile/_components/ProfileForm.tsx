"use client"

import { useActionState } from "react"
import { updateProfile } from "@/app/(customer)/auth/actions"
import type { AuthResult } from "@/app/(customer)/auth/actions"

const init: AuthResult = { success: false }

const inputCls = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:border-transparent disabled:opacity-50"
const errInputCls = "w-full rounded-lg border border-red-400 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"

interface Props {
  name:  string
  email: string
  phone: string | null
}

export function ProfileForm({ name, email, phone }: Props) {
  const [state, action, isPending] = useActionState(updateProfile, init)
  const fe = state.fieldErrors ?? {}

  return (
    <form action={action} noValidate className="space-y-5">
      {state.error && (
        <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}
      {state.success && (
        <div role="status" aria-live="polite" className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 flex items-center gap-2">
          <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Profile updated successfully.
        </div>
      )}

      <div>
        <label htmlFor="pf-name" className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
        <input id="pf-name" name="name" type="text" defaultValue={name} required
          className={fe.name ? errInputCls : inputCls} />
        {fe.name && <p role="alert" className="mt-1 text-xs text-red-600">{fe.name}</p>}
      </div>

      <div>
        <label htmlFor="pf-email" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
        <input id="pf-email" type="email" value={email} disabled
          className={inputCls} />
        <p className="mt-1 text-xs text-gray-400">Email cannot be changed. Contact support if needed.</p>
      </div>

      <div>
        <label htmlFor="pf-phone" className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
        <input id="pf-phone" name="phone" type="tel" defaultValue={phone ?? ""}
          placeholder="+91 99999 00000"
          className={fe.phone ? errInputCls : inputCls} />
        {fe.phone && <p role="alert" className="mt-1 text-xs text-red-600">{fe.phone}</p>}
      </div>

      <div className="pt-2">
        <button type="submit" disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-brand-600)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-700)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          {isPending && (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          )}
          {isPending ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </form>
  )
}
