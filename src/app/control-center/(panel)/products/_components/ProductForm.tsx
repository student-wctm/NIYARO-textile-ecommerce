"use client"

import { useActionState, useEffect, useRef, useState, useTransition } from "react"
import Link from "next/link"
import Image from "next/image"
import { formatPrice } from "@/lib/utils"
import { getProductImageUrl } from "@/lib/image"
import type { Product } from "@/lib/products"
import type { CategoryOption } from "@/lib/products"
import type { ActionResult } from "@/app/control-center/(panel)/products/actions"
import {
  updateSimilarProducts,
  searchProducts,
} from "@/app/control-center/(panel)/products/actions"

interface SimilarItem {
  id: string
  sortOrder: number
  similarProduct: {
    id: string
    name: string
    slug: string
    basePrice: number
    comparePrice: number | null
    images: { id: string; imageUrl: string; altText: string | null; isPrimary: boolean }[]
  }
}

interface ProductFormProps {
  product?: Product & { similarFrom?: SimilarItem[] }
  categories: CategoryOption[]
  action: (prev: ActionResult, data: FormData) => Promise<ActionResult>
  showSuccessBanner?: boolean
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

function Field({ label, name, children, error, required = false, hint }: {
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

// ─── Similar Products Picker ──────────────────────────────────────────────────

function SimilarProductsPicker({
  productId,
  initialSimilar,
}: {
  productId: string
  initialSimilar: SimilarItem[]
}) {
  const [selected, setSelected] = useState<
    Array<{ id: string; name: string; basePrice: number }>
  >(
    initialSimilar.map((s) => ({
      id: s.similarProduct.id,
      name: s.similarProduct.name,
      basePrice: s.similarProduct.basePrice,
    }))
  )
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Array<{ id: string; name: string; basePrice: number }>>([])
  const [searching, startSearch] = useTransition()
  const [saving, startSave] = useTransition()
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  function handleSearch(q: string) {
    setQuery(q)
    if (!q.trim()) { setResults([]); return }
    startSearch(async () => {
      const r = await searchProducts(q, productId)
      setResults(r)
    })
  }

  function addItem(item: { id: string; name: string; basePrice: number }) {
    if (selected.find((s) => s.id === item.id)) return
    setSelected((prev) => [...prev, item])
    setQuery(""); setResults([])
  }

  function removeItem(id: string) {
    setSelected((prev) => prev.filter((s) => s.id !== id))
  }

  function handleSave() {
    setSaveMsg(null)
    startSave(async () => {
      const result = await updateSimilarProducts(productId, selected.map((s) => s.id))
      setSaveMsg(result.success ? "Saved!" : (result.error ?? "Failed"))
      setTimeout(() => setSaveMsg(null), 3000)
    })
  }

  return (
    <div className="space-y-4">
      {/* Search input */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search products to add as similar…"
          className={inputCls}
        />
        {searching && (
          <span className="absolute right-3 top-2.5 text-xs text-slate-400">Searching…</span>
        )}
        {results.length > 0 && (
          <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {results.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => addItem(r)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
              >
                <span className="truncate">{r.name}</span>
                <span className="ml-3 text-xs text-slate-400 shrink-0">{formatPrice(r.basePrice)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected list */}
      {selected.length > 0 ? (
        <ul className="space-y-2">
          {selected.map((s) => (
            <li key={s.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <div>
                <p className="text-sm font-medium text-slate-800">{s.name}</p>
                <p className="text-xs text-slate-400">{formatPrice(s.basePrice)}</p>
              </div>
              <button
                type="button"
                onClick={() => removeItem(s.id)}
                className="text-xs text-red-500 hover:text-red-700 transition-colors ml-4 shrink-0"
                aria-label={`Remove ${s.name}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-slate-400">No similar products selected.</p>
      )}

      {/* Save button */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-brand-600)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-700)] transition-colors disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Similar Products"}
        </button>
        {saveMsg && (
          <span className={`text-xs font-medium ${saveMsg === "Saved!" ? "text-green-600" : "text-red-600"}`}>
            {saveMsg}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Main form ────────────────────────────────────────────────────────────────

export function ProductForm({ product, categories, action, showSuccessBanner, onSuccess }: ProductFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState)
  const formRef = useRef<HTMLFormElement>(null)
  const fe = state.fieldErrors ?? {}
  const isEdit = !!product

  useEffect(() => {
    if (state.fieldErrors || state.error) {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }
    if (state.success && onSuccess) onSuccess(state)
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

      {/* ── 1. Basic Product Information ── */}
      <fieldset className="space-y-5">
        <legend className="text-sm font-semibold text-slate-500 uppercase tracking-wide pb-2 border-b border-slate-100 w-full">
          1. Basic Information
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

      {/* ── 2. Pricing ── */}
      <fieldset className="space-y-5">
        <legend className="text-sm font-semibold text-slate-500 uppercase tracking-wide pb-2 border-b border-slate-100 w-full">
          2. Pricing
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
          <Field label="MRP / Compare Price (₹)" name="comparePrice" error={fe.comparePrice}
            hint="Optional — shown as strikethrough.">
            <input id="comparePrice" name="comparePrice" type="number"
              min={0} step="0.01"
              defaultValue={product?.comparePrice ?? ""}
              placeholder="1799"
              className={fe.comparePrice ? errorInputCls : inputCls} />
          </Field>
        </div>
      </fieldset>

      {/* ── 3. Product Highlights ── */}
      <fieldset className="space-y-5">
        <legend className="text-sm font-semibold text-slate-500 uppercase tracking-wide pb-2 border-b border-slate-100 w-full">
          3. Product Highlights{" "}
          <span className="normal-case font-normal text-slate-400">(optional)</span>
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Fabric / Material" name="fabric" hint="e.g. Pure Silk, Cotton Blend">
            <input id="fabric" name="fabric" type="text"
              defaultValue={product?.fabric ?? ""}
              placeholder="e.g. Cotton Blend"
              className={inputCls} />
          </Field>
          <Field label="Color" name="color" hint="Primary colour of the product">
            <input id="color" name="color" type="text"
              defaultValue={(product as Record<string, unknown>)?.color as string ?? ""}
              placeholder="e.g. Pink, Navy Blue"
              className={inputCls} />
          </Field>
          <Field label="Fit / Shape" name="fit" hint="e.g. Regular Fit, Loose, Slim Fit">
            <input id="fit" name="fit" type="text"
              defaultValue={(product as Record<string, unknown>)?.fit as string ?? ""}
              placeholder="e.g. Loose Fit"
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

        <Field label="Additional Details" name="additionalDetails"
          hint="Shown in expandable 'Additional Details' section on product page.">
          <textarea id="additionalDetails" name="additionalDetails" rows={3}
            defaultValue={(product as Record<string, unknown>)?.additionalDetails as string ?? ""}
            placeholder="Extra product details, care notes, material specifics…"
            className={`${inputCls} resize-y`} />
        </Field>
      </fieldset>

      {/* ── 4. Visibility ── */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-slate-500 uppercase tracking-wide pb-2 border-b border-slate-100 w-full">
          4. Visibility
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
          </div>
        </div>
      </fieldset>

      {/* ── 5. Save button ── */}
      <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2 border-t border-slate-100">
        <Link href="/control-center/products"
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

      {/* ── 6. Similar Products (edit mode only — requires productId) ── */}
      {isEdit && product?.id && (
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">5. Similar Products</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Search and select products to show in the &ldquo;Similar Products&rdquo; section on the customer page.
            </p>
          </div>
          <SimilarProductsPicker
            productId={product.id}
            initialSimilar={product.similarFrom ?? []}
          />
        </div>
      )}
    </form>
  )
}
