"use client"

import { useActionState, useEffect, useRef } from "react"
import { saveStoreInfo } from "@/app/control-center/(panel)/settings/actions"
import type { SettingsActionResult } from "./SettingsForm"
import { inputCls, errorInputCls } from "./SettingsForm"

interface Props {
  defaults: {
    "store.name":        string
    "store.tagline":     string
    "store.description": string
    "store.phone":       string
    "store.email":       string
    "store.address":     string
  }
}

const init: SettingsActionResult = { success: false }

export function StoreInfoForm({ defaults }: Props) {
  const [state, action, isPending] = useActionState(saveStoreInfo, init)
  const ref = useRef<HTMLFormElement>(null)
  const fe  = state.fieldErrors ?? {}

  useEffect(() => {
    if (state.fieldErrors) ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [state])

  return (
    <form ref={ref} action={action} noValidate className="space-y-4">
      <Feedback state={state} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Store Name" name="store.name" required error={fe["store.name"]}>
          <input name="store.name" type="text" defaultValue={defaults["store.name"]}
            required maxLength={100} placeholder="NIYARO"
            className={fe["store.name"] ? errorInputCls : inputCls} />
        </Field>
        <Field label="Tagline" name="store.tagline">
          <input name="store.tagline" type="text" defaultValue={defaults["store.tagline"]}
            maxLength={200} placeholder="Quality Textiles & Fabrics"
            className={inputCls} />
        </Field>
      </div>

      <Field label="Description" name="store.description">
        <textarea name="store.description" rows={3} defaultValue={defaults["store.description"]}
          placeholder="Brief description shown to customers."
          className={`${inputCls} resize-none`} />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Phone" name="store.phone" error={fe["store.phone"]}>
          <input name="store.phone" type="tel" defaultValue={defaults["store.phone"]}
            placeholder="+91 99999 00000"
            className={fe["store.phone"] ? errorInputCls : inputCls} />
        </Field>
        <Field label="Email" name="store.email" error={fe["store.email"]}>
          <input name="store.email" type="email" defaultValue={defaults["store.email"]}
            placeholder="hello@niyaro.com"
            className={fe["store.email"] ? errorInputCls : inputCls} />
        </Field>
      </div>

      <Field label="Address" name="store.address">
        <textarea name="store.address" rows={2} defaultValue={defaults["store.address"]}
          placeholder="Business address"
          className={`${inputCls} resize-none`} />
      </Field>

      <SaveButton isPending={isPending} />
    </form>
  )
}

// ─── Shared sub-components ────────────────────────────────────────────────────

export function Feedback({ state }: { state: SettingsActionResult }) {
  return (
    <>
      {state.error && (
        <div role="alert" className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {state.error}
        </div>
      )}
      {state.success && (
        <div role="status" aria-live="polite" className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3 text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
          <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Settings saved.
        </div>
      )}
    </>
  )
}

export function Field({ label, name, children, error, required = false, hint }: {
  label: string; name: string; children: React.ReactNode
  error?: string; required?: boolean; hint?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}{required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
      </label>
      {children}
      {hint && !error  && <p className="text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
      {error           && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}

export function SaveButton({ isPending, label = "Save Changes" }: { isPending: boolean; label?: string }) {
  return (
    <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-700">
      <button type="submit" disabled={isPending}
        className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-brand-600)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-700)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
        {isPending && (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {isPending ? "Saving…" : label}
      </button>
    </div>
  )
}
