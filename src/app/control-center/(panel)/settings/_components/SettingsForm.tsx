"use client"

// Generic settings form component.
// Wraps a form section with useActionState, field error display, and
// a success/error toast — all scoped to one section at a time.

import { useActionState, useEffect, useRef } from "react"

export interface SettingsActionResult {
  success: boolean
  error?:  string
  fieldErrors?: Record<string, string>
}

const initialState: SettingsActionResult = { success: false }

interface SettingsFormProps {
  action: (prev: SettingsActionResult, data: FormData) => Promise<SettingsActionResult>
  children: React.ReactNode
  submitLabel?: string
}

// Common input/select/textarea class — explicit bg so dark-mode doesn't invert
export const inputCls =
  "w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 " +
  "px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 " +
  "focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:border-transparent " +
  "disabled:opacity-50"

export const errorInputCls =
  "w-full rounded-lg border border-red-400 bg-white dark:bg-slate-700 " +
  "px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 " +
  "focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"

export const selectCls =
  "w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 " +
  "px-3 py-2 text-sm text-slate-900 dark:text-slate-100 " +
  "focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:border-transparent"

export function SettingsForm({ action, children, submitLabel = "Save Changes" }: SettingsFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.fieldErrors || state.error) {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }
  }, [state])

  return (
    <form ref={formRef} action={formAction} noValidate className="space-y-5">
      {/* Top-level error */}
      {state.error && (
        <div role="alert"
          className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {state.error}
        </div>
      )}

      {/* Success banner */}
      {state.success && (
        <div role="status" aria-live="polite"
          className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3 text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
          <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Settings saved successfully.
        </div>
      )}

      {/* Field errors context passed via children */}
      {/* Children receive fieldErrors via a data attribute trick — see below */}
      <div data-field-errors={state.fieldErrors ? JSON.stringify(state.fieldErrors) : undefined}>
        {children}
      </div>

      {/* Submit */}
      <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-700">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-brand-600)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-700)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-600)]"
        >
          {isPending && (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {isPending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  )
}
