"use client"

import { useActionState, useTransition, useState } from "react"
import { Badge } from "@/components/ui/Badge"
import { formatPrice } from "@/lib/utils"
import {
  addVariant,
  updateVariant,
  toggleVariantStatus,
} from "@/app/admin/products/actions"
import type { ActionResult } from "@/app/admin/products/actions"
import type { ProductVariant } from "@/lib/products"

interface VariantManagerProps {
  productId: string
  variants: ProductVariant[]
  basePrice: number
}

const initialState: ActionResult = { success: false }

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 " +
  "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] " +
  "focus:border-transparent"
const errorInputCls =
  "w-full rounded-lg border border-red-400 bg-white px-3 py-2 text-sm text-slate-900 " +
  "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"

function VField({ label, name, children, error, hint }: {
  label: string; name: string; children: React.ReactNode
  error?: string; hint?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-xs font-medium text-slate-600">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

// ─── Add-variant form ─────────────────────────────────────────────────────────

function AddVariantForm({ productId }: { productId: string }) {
  const boundAdd = addVariant.bind(null, productId)
  const [state, formAction, isPending] = useActionState(boundAdd, initialState)
  const fe = state.fieldErrors ?? {}

  return (
    <form action={formAction} noValidate
      className="border border-dashed border-slate-300 rounded-xl p-5 bg-slate-50 space-y-4">
      <p className="text-sm font-semibold text-slate-700">Add New Variant</p>

      {state.error && (
        <p role="alert" className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {state.error}
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <VField label="SKU *" name="variant_0_sku" error={fe.variant_0_sku}>
          <input id="variant_0_sku" name="variant_0_sku" type="text"
            placeholder="NYR-SAR-RED-M" required
            className={fe.variant_0_sku ? errorInputCls : inputCls} />
        </VField>
        <VField label="Colour" name="variant_0_color" error={fe.variant_0_attributes}>
          <input id="variant_0_color" name="variant_0_color" type="text"
            placeholder="Red" className={inputCls} />
        </VField>
        <VField label="Size" name="variant_0_size">
          <input id="variant_0_size" name="variant_0_size" type="text"
            placeholder="M / Free Size" className={inputCls} />
        </VField>
        <VField label="Length" name="variant_0_length" hint="For fabric by metre.">
          <input id="variant_0_length" name="variant_0_length" type="text"
            placeholder="2.5m" className={inputCls} />
        </VField>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 items-end">
        <VField label="Price Override (₹)" name="variant_0_priceOverride"
          hint="Leave blank to use product base price.">
          <input id="variant_0_priceOverride" name="variant_0_priceOverride" type="number"
            min={0} step="0.01" placeholder="Optional"
            className={inputCls} />
        </VField>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">Status</span>
          <div className="flex gap-3">
            {[{ val: "true", label: "Active" }, { val: "false", label: "Inactive" }].map(o => (
              <label key={o.val} className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" name="variant_0_isActive" value={o.val}
                  defaultChecked={o.val === "true"} className="accent-[var(--color-brand-600)]" />
                <span className="text-sm text-slate-700">{o.label}</span>
              </label>
            ))}
          </div>
        </div>
        <button type="submit" disabled={isPending}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-brand-600)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-700)] transition-colors disabled:opacity-50">
          {isPending ? "Adding…" : "+ Add Variant"}
        </button>
      </div>
    </form>
  )
}

// ─── Inline edit form for existing variant ────────────────────────────────────

function EditVariantForm({
  variant, productId, onCancel,
}: { variant: ProductVariant; productId: string; onCancel: () => void }) {
  const boundUpdate = updateVariant.bind(null, variant.id, productId)
  const [state, formAction, isPending] = useActionState(boundUpdate, initialState)
  const fe = state.fieldErrors ?? {}

  return (
    <form action={formAction} noValidate className="mt-3 space-y-3 bg-slate-50 rounded-lg p-4">
      {state.error && (
        <p role="alert" className="text-xs text-red-600">{state.error}</p>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <VField label="SKU *" name="variant_0_sku" error={fe.variant_0_sku}>
          <input name="variant_0_sku" type="text"
            defaultValue={variant.sku}
            className={fe.variant_0_sku ? errorInputCls : inputCls} />
        </VField>
        <VField label="Colour" name="variant_0_color" error={fe.variant_0_attributes}>
          <input name="variant_0_color" type="text"
            defaultValue={variant.color ?? ""} placeholder="Red" className={inputCls} />
        </VField>
        <VField label="Size" name="variant_0_size">
          <input name="variant_0_size" type="text"
            defaultValue={variant.size ?? ""} placeholder="M" className={inputCls} />
        </VField>
        <VField label="Length" name="variant_0_length">
          <input name="variant_0_length" type="text"
            defaultValue={variant.length ?? ""} placeholder="2.5m" className={inputCls} />
        </VField>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 items-end">
        <VField label="Price Override (₹)" name="variant_0_priceOverride">
          <input name="variant_0_priceOverride" type="number" min={0} step="0.01"
            defaultValue={variant.priceOverride ?? ""} placeholder="Optional" className={inputCls} />
        </VField>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">Status</span>
          <div className="flex gap-3">
            {[{ val: "true", label: "Active" }, { val: "false", label: "Inactive" }].map(o => (
              <label key={o.val} className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" name="variant_0_isActive" value={o.val}
                  defaultChecked={String(variant.isActive) === o.val}
                  className="accent-[var(--color-brand-600)]" />
                <span className="text-sm text-slate-700">{o.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={isPending}
            className="flex-1 inline-flex items-center justify-center rounded-lg bg-[var(--color-brand-600)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-700)] transition-colors disabled:opacity-50">
            {isPending ? "Saving…" : "Save"}
          </button>
          <button type="button" onClick={onCancel}
            className="flex-1 inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </form>
  )
}

// ─── Single variant row ───────────────────────────────────────────────────────

function VariantRow({
  variant, productId, basePrice,
}: { variant: ProductVariant; productId: string; basePrice: number }) {
  const [editing, setEditing] = useState(false)
  const [isPending, startTransition] = useTransition()

  const displayPrice = variant.priceOverride ?? basePrice
  const attributes = [
    variant.color && `Color: ${variant.color}`,
    variant.size && `Size: ${variant.size}`,
    variant.length && `Length: ${variant.length}`,
  ].filter(Boolean).join(" · ")

  return (
    <li className={`border border-slate-200 rounded-lg p-4 transition-opacity ${isPending ? "opacity-50" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-slate-900 font-mono">{variant.sku}</p>
            <Badge variant={variant.isActive ? "success" : "default"}>
              {variant.isActive ? "Active" : "Inactive"}
            </Badge>
            {variant.priceOverride !== null && (
              <Badge variant="info">Custom price</Badge>
            )}
          </div>
          {attributes && (
            <p className="text-xs text-slate-500 mt-1">{attributes}</p>
          )}
          <p className="text-sm font-medium text-slate-900 mt-1">{formatPrice(displayPrice)}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            Inventory set per branch in the Inventory module.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" onClick={() => setEditing(!editing)}
            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
            {editing ? "Cancel" : "Edit"}
          </button>
          <button type="button" disabled={isPending}
            onClick={() => startTransition(async () => { await toggleVariantStatus(variant.id, productId, variant.isActive) })}
            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium border transition-colors disabled:opacity-50 ${
              variant.isActive
                ? "text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100"
                : "text-green-700 border-green-200 bg-green-50 hover:bg-green-100"
            }`}>
            {variant.isActive ? "Deactivate" : "Activate"}
          </button>
        </div>
      </div>
      {editing && (
        <EditVariantForm variant={variant} productId={productId} onCancel={() => setEditing(false)} />
      )}
    </li>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function VariantManager({ productId, variants, basePrice }: VariantManagerProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Product Variants</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Each variant has its own SKU. Stock is managed per variant per branch in the Inventory module.
        </p>
      </div>

      {variants.length > 0 && (
        <ul className="space-y-3">
          {variants.map(v => (
            <VariantRow key={v.id} variant={v} productId={productId} basePrice={basePrice} />
          ))}
        </ul>
      )}

      <AddVariantForm productId={productId} />
    </div>
  )
}
