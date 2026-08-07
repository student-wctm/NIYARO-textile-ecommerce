"use client"

import { useActionState, useEffect, useRef } from "react"
import Link from "next/link"
import type { Product } from "@/lib/products"
import type { CategoryOption } from "@/lib/products"
import type { ActionResult } from "@/app/admin/products/actions"

interface ProductFormProps {
  product?: Product
  categories: CategoryOption[]
  action: (prev: ActionResult, data: FormData) => Promise<ActionResult>
  showSuccessBanner?: boolean
  // Called with the full state after a successful submission.
  // Used by NewProductClient to detect creation and render ImageManager.
  onSuccess?: (state: ActionResult) => void
}

const initialState: ActionResult = { success: false }

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 " +
  "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] " +
  "focus:border-transparent disabled:opacity-50"
const errorInputCls =
  "w-full rounded-lg border border-red-400 bg-white px-3 py-2 text-sm text-slate-900 " +
  "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"
const selectCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 " +
  "focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:border-transparent disabled:opacity-50"

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

export function ProductForm({ product, categories, action, showSuccessBanner, onSuccess }: ProductFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState)
  const formRef = useRef<HTMLFormElement>(null)
  const fe = state.fieldErrors ?? {}
  const isEdit = !!product

  useEffect(() => {
    if (state.fieldErrors || state.error) {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }
    if (state.success && onSuccess) {
      onSuccess(state)
    }
  }, [state]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <form ref={formRef} action={formAction} noValidate
      className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-6">

      {state.error && (
        <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}
      {showSuccessBanner && state.success && (
        <div role="status" className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          Changes saved successfully.
        </div>
      )}

      {/* ── Core details ── */}
      <fieldset className="space-y-5">
        <legend className="text-sm font-semibold text-slate-500 uppercase tracking-wide pb-2 border-b border-slate-100 w-full">
          Product Details
        </legend>

        <Field label="Product Name" name="name" required error={fe.name}>
          <input id="name" name="name" type="text"
            defaultValue={product?.name ?? ""}
            placeholder="e.g. Banarasi Silk Saree"
            required maxLength={200}
            className={fe.name ? errorInputCls : inputCls} />
        </Field>

        <Field label="Description" name="description"
          hint="Describe the product — fabric, occasion, design details, etc.">
          <textarea id="description" name="description" rows={4}
            defaultValue={product?.description ?? ""}
            placeholder="Product description…"
            className={`${inputCls} resize-y`} />
        </Field>

        <Field label="Category" name="categoryId" required error={fe.categoryId}>
          <select id="categoryId" name="categoryId"
            defaultValue={product?.categoryId ?? ""}
            className={fe.categoryId ? errorInputCls : selectCls}>
            <option value="">— Select a category —</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
      </fieldset>

      {/* ── Pricing ── */}
      <fieldset className="space-y-5">
        <legend className="text-sm font-semibold text-slate-500 uppercase tracking-wide pb-2 border-b border-slate-100 w-full">
          Pricing
        </legend>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Selling Price (₹)" name="basePrice" required error={fe.basePrice}
            hint="Default price across all branches.">
            <input id="basePrice" name="basePrice" type="number"
              min={0} step="0.01"
              defaultValue={product?.basePrice ?? ""}
              placeholder="1299"
              className={fe.basePrice ? errorInputCls : inputCls} />
          </Field>

          <Field label="MRP / Compare Price (₹)" name="comparePrice"
            error={fe.comparePrice}
            hint="Optional — shown as strikethrough to indicate discount.">
            <input id="comparePrice" name="comparePrice" type="number"
              min={0} step="0.01"
              defaultValue={product?.comparePrice ?? ""}
              placeholder="1799"
              className={fe.comparePrice ? errorInputCls : inputCls} />
          </Field>
        </div>
      </fieldset>

      {/* ── Textile attributes ── */}
      <fieldset className="space-y-5">
        <legend className="text-sm font-semibold text-slate-500 uppercase tracking-wide pb-2 border-b border-slate-100 w-full">
          Textile Attributes{" "}
          <span className="normal-case font-normal text-slate-400">(optional)</span>
        </legend>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Fabric / Material" name="fabric"
            hint="e.g. Silk, Cotton, Polyester Blend">
            <input id="fabric" name="fabric" type="text"
              defaultValue={product?.fabric ?? ""}
              placeholder="e.g. Pure Silk"
              className={inputCls} />
          </Field>
        </div>

        <Field label="Care Instructions" name="careInstructions"
          hint="e.g. Dry clean only. Avoid direct sunlight.">
          <textarea id="careInstructions" name="careInstructions" rows={2}
            defaultValue={product?.careInstructions ?? ""}
            placeholder="Care instructions…"
            className={`${inputCls} resize-none`} />
        </Field>
      </fieldset>

      {/* ── Visibility ── */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-slate-500 uppercase tracking-wide pb-2 border-b border-slate-100 w-full">
          Visibility
        </legend>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">Status</span>
            <div className="flex gap-4">
              {[{ val: "true", label: "Active" }, { val: "false", label: "Inactive" }].map(opt => (
                <label key={opt.val} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="isActive" value={opt.val}
                    defaultChecked={product ? String(product.isActive) === opt.val : opt.val === "true"}
                    className="accent-[var(--color-brand-600)]" />
                  <span className="text-sm text-slate-700">{opt.label}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-slate-400">Inactive products are hidden from customers.</p>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">Featured</span>
            <div className="flex gap-4">
              {[{ val: "true", label: "Yes" }, { val: "false", label: "No" }].map(opt => (
                <label key={opt.val} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="isFeatured" value={opt.val}
                    defaultChecked={product ? String(product.isFeatured) === opt.val : opt.val === "false"}
                    className="accent-[var(--color-brand-600)]" />
                  <span className="text-sm text-slate-700">{opt.label}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-slate-400">Featured products appear first in the catalogue.</p>
          </div>
        </div>
      </fieldset>

      {/* ── Actions ── */}
      <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2 border-t border-slate-100">
        <Link href="/admin/products"
          className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
          {isEdit ? "← Back to Products" : "Cancel"}
        </Link>
        <button type="submit" disabled={isPending}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-brand-600)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-700)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          {isPending && (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {isPending ? "Saving…" : isEdit ? "Save Changes" : "Create Product & Add Variants →"}
        </button>
      </div>
    </form>
  )
}
