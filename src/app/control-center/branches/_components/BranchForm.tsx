"use client"

import { useActionState } from "react"
import { useEffect, useRef } from "react"
import Link from "next/link"
import type { Branch } from "@/lib/branches"
import type { ActionResult } from "@/app/control-center/branches/actions"

interface BranchFormProps {
  // When provided the form operates in edit mode; omit for create mode
  branch?: Branch
  action: (prevState: ActionResult, formData: FormData) => Promise<ActionResult>
}

const initialState: ActionResult = { success: false }

// Reusable field wrapper — renders label, input, and optional error message
function Field({
  label,
  name,
  children,
  error,
  required = false,
  hint,
}: {
  label: string
  name: string
  children: React.ReactNode
  error?: string
  required?: boolean
  hint?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
      {error && (
        <p id={`${name}-error`} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}

// Common input classes — explicit bg-white so dark OS mode doesn't invert them
const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 " +
  "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] " +
  "focus:border-transparent disabled:opacity-50"

const errorInputCls =
  "w-full rounded-lg border border-red-400 bg-white px-3 py-2 text-sm text-slate-900 " +
  "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-400 " +
  "focus:border-transparent"

export function BranchForm({ branch, action }: BranchFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState)
  const formRef = useRef<HTMLFormElement>(null)

  // Scroll to the top of the form when field errors appear
  useEffect(() => {
    if (state.fieldErrors || state.error) {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [state])

  const fe = state.fieldErrors ?? {}
  const isEdit = !!branch

  return (
    <form
      ref={formRef}
      action={formAction}
      noValidate
      className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-6"
    >
      {/* Top-level error banner */}
      {state.error && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
        >
          {state.error}
        </div>
      )}

      {/* ── Required fields ─────────────────────────────────────── */}
      <fieldset className="space-y-5">
        <legend className="text-sm font-semibold text-slate-500 uppercase tracking-wide pb-2 border-b border-slate-100 w-full">
          Branch Details
        </legend>

        <Field label="Branch Name" name="name" required error={fe.name}>
          <input
            id="name"
            name="name"
            type="text"
            defaultValue={branch?.name ?? ""}
            placeholder="e.g. Delhi – Connaught Place"
            required
            maxLength={100}
            aria-describedby={fe.name ? "name-error" : undefined}
            className={fe.name ? errorInputCls : inputCls}
          />
        </Field>

        <Field label="Address" name="address" required error={fe.address}>
          <textarea
            id="address"
            name="address"
            defaultValue={branch?.address ?? ""}
            placeholder="Full street address"
            required
            rows={2}
            aria-describedby={fe.address ? "address-error" : undefined}
            className={`${fe.address ? errorInputCls : inputCls} resize-none`}
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="City" name="city" required error={fe.city}>
            <input
              id="city"
              name="city"
              type="text"
              defaultValue={branch?.city ?? ""}
              placeholder="e.g. New Delhi"
              required
              aria-describedby={fe.city ? "city-error" : undefined}
              className={fe.city ? errorInputCls : inputCls}
            />
          </Field>

          <Field label="State" name="state" required error={fe.state}>
            <input
              id="state"
              name="state"
              type="text"
              defaultValue={branch?.state ?? ""}
              placeholder="e.g. Delhi"
              required
              aria-describedby={fe.state ? "state-error" : undefined}
              className={fe.state ? errorInputCls : inputCls}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="PIN Code" name="pincode" required error={fe.pincode}>
            <input
              id="pincode"
              name="pincode"
              type="text"
              inputMode="numeric"
              defaultValue={branch?.pincode ?? ""}
              placeholder="6-digit PIN"
              required
              maxLength={6}
              aria-describedby={fe.pincode ? "pincode-error" : undefined}
              className={fe.pincode ? errorInputCls : inputCls}
            />
          </Field>

          <Field label="Phone" name="phone" required error={fe.phone}>
            <input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={branch?.phone ?? ""}
              placeholder="+91 99999 00000"
              required
              aria-describedby={fe.phone ? "phone-error" : undefined}
              className={fe.phone ? errorInputCls : inputCls}
            />
          </Field>
        </div>

        <Field
          label="Email"
          name="email"
          error={fe.email}
          hint="Optional — used for branch-level correspondence."
        >
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={branch?.email ?? ""}
            placeholder="branch@niyaro.com"
            aria-describedby={fe.email ? "email-error" : undefined}
            className={fe.email ? errorInputCls : inputCls}
          />
        </Field>
      </fieldset>

      {/* ── Optional coordinates ────────────────────────────────── */}
      <fieldset className="space-y-5">
        <legend className="text-sm font-semibold text-slate-500 uppercase tracking-wide pb-2 border-b border-slate-100 w-full">
          Coordinates{" "}
          <span className="normal-case font-normal text-slate-400">
            (optional — for future branch-finder feature)
          </span>
        </legend>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field
            label="Latitude"
            name="latitude"
            error={fe.latitude}
            hint="Decimal degrees, e.g. 28.6139"
          >
            <input
              id="latitude"
              name="latitude"
              type="number"
              step="any"
              min={-90}
              max={90}
              defaultValue={branch?.latitude ?? ""}
              placeholder="28.6139"
              aria-describedby={fe.latitude ? "latitude-error" : undefined}
              className={fe.latitude ? errorInputCls : inputCls}
            />
          </Field>

          <Field
            label="Longitude"
            name="longitude"
            error={fe.longitude}
            hint="Decimal degrees, e.g. 77.2090"
          >
            <input
              id="longitude"
              name="longitude"
              type="number"
              step="any"
              min={-180}
              max={180}
              defaultValue={branch?.longitude ?? ""}
              placeholder="77.2090"
              aria-describedby={fe.longitude ? "longitude-error" : undefined}
              className={fe.longitude ? errorInputCls : inputCls}
            />
          </Field>
        </div>
      </fieldset>

      {/* ── Status ──────────────────────────────────────────────── */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-slate-500 uppercase tracking-wide pb-2 border-b border-slate-100 w-full">
          Status
        </legend>

        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="isActive"
              value="true"
              defaultChecked={branch ? branch.isActive : true}
              className="accent-[var(--color-brand-600)]"
            />
            <span className="text-sm text-slate-700">Active</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="isActive"
              value="false"
              defaultChecked={branch ? !branch.isActive : false}
              className="accent-[var(--color-brand-600)]"
            />
            <span className="text-sm text-slate-700">Inactive</span>
          </label>
        </div>
        <p className="text-xs text-slate-400">
          Inactive branches are hidden from customers but not deleted.
        </p>
      </fieldset>

      {/* ── Actions ─────────────────────────────────────────────── */}
      <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2 border-t border-slate-100">
        <Link
          href="/control-center/branches"
          className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
        >
          Cancel
        </Link>

        <button
          type="submit"
          disabled={isPending}
          aria-disabled={isPending}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-brand-600)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-700)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-600)]"
        >
          {isPending && (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {isPending ? "Saving…" : isEdit ? "Save Changes" : "Add Branch"}
        </button>
      </div>
    </form>
  )
}
