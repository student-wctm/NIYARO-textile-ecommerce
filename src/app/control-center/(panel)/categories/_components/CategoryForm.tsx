"use client"

import { useActionState, useEffect, useRef } from "react"
import Link from "next/link"
import type { Category } from "@/lib/products"
import type { ActionResult } from "@/app/control-center/(panel)/categories/actions"

interface CategoryFormProps {
  category?: Category
  action: (prev: ActionResult, data: FormData) => Promise<ActionResult>
}

const initialState: ActionResult = { success: false }

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 " +
  "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] " +
  "focus:border-transparent disabled:opacity-50"

const errorInputCls =
  "w-full rounded-lg border border-red-400 bg-white px-3 py-2 text-sm text-slate-900 " +
  "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-400 " +
  "focus:border-transparent"

function Field({
  label, name, children, error, required = false, hint,
}: {
  label: string; name: string; children: React.ReactNode
  error?: string; required?: boolean; hint?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
      {error && <p id={`${name}-error`} role="alert" className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

export function CategoryForm({ category, action }: CategoryFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState)
  const formRef = useRef<HTMLFormElement>(null)
  const fe = state.fieldErrors ?? {}
  const isEdit = !!category

  useEffect(() => {
    if (state.fieldErrors || state.error) {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [state])

  return (
    <form ref={formRef} action={formAction} noValidate
      className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-6">

      {state.error && (
        <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <fieldset className="space-y-5">
        <legend className="text-sm font-semibold text-slate-500 uppercase tracking-wide pb-2 border-b border-slate-100 w-full">
          Category Details
        </legend>

        <Field label="Category Name" name="name" required error={fe.name}>
          <input id="name" name="name" type="text"
            defaultValue={category?.name ?? ""}
            placeholder="e.g. Sarees"
            required maxLength={80}
            className={fe.name ? errorInputCls : inputCls} />
        </Field>

        <Field label="Description" name="description" hint="Optional — shown on the category page.">
          <textarea id="description" name="description" rows={3}
            defaultValue={category?.description ?? ""}
            placeholder="Brief description of this category…"
            className={`${inputCls} resize-none`} />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Sort Order" name="sortOrder" error={fe.sortOrder}
            hint="Lower number = appears first. Default 0.">
            <input id="sortOrder" name="sortOrder" type="number" min={0}
              defaultValue={category?.sortOrder ?? 0}
              className={fe.sortOrder ? errorInputCls : inputCls} />
          </Field>

          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-700">Status</span>
            <div className="flex gap-4 mt-1">
              {[{ val: "true", label: "Active" }, { val: "false", label: "Inactive" }].map(opt => (
                <label key={opt.val} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="isActive" value={opt.val}
                    defaultChecked={category ? String(category.isActive) === opt.val : opt.val === "true"}
                    className="accent-[var(--color-brand-600)]" />
                  <span className="text-sm text-slate-700">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </fieldset>

      <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2 border-t border-slate-100">
        <Link href="/control-center/categories"
          className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
          Cancel
        </Link>
        <button type="submit" disabled={isPending}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-brand-600)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-700)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          {isPending && (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {isPending ? "Saving…" : isEdit ? "Save Changes" : "Add Category"}
        </button>
      </div>
    </form>
  )
}
