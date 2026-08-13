"use client"

// AddToCartSection — client component for variant selection + quantity + add to cart.
// Receives serialised variant data from the server (no Date objects).
// Never sends price to the server — addToCart() resolves price server-side.

import { useState, useTransition, useCallback } from "react"
import { addToCart } from "@/app/(customer)/cart/actions"
import { formatPrice } from "@/lib/utils"

export interface SerialVariant {
  id:            string
  sku:           string
  color:         string | null
  size:          string | null
  length:        string | null
  priceOverride: number | null
  isActive:      boolean
}

interface AddToCartSectionProps {
  variants:      SerialVariant[]
  basePrice:     number
  selectedBranchName: string | null
}

export function AddToCartSection({
  variants,
  basePrice,
  selectedBranchName,
}: AddToCartSectionProps) {
  const activeVariants = variants.filter((v) => v.isActive)
  const singleVariant  = activeVariants.length === 1 ? activeVariants[0] : null

  const [selectedId, setSelectedId] = useState<string | null>(
    singleVariant?.id ?? null
  )
  const [quantity,   setQuantity]   = useState(1)
  const [isPending,  startTransition] = useTransition()
  const [feedback,   setFeedback]   = useState<{ ok: boolean; msg: string } | null>(null)

  const selected = activeVariants.find((v) => v.id === selectedId) ?? null
  const price    = selected?.priceOverride ?? basePrice

  const showFeedback = useCallback((ok: boolean, msg: string) => {
    setFeedback({ ok, msg })
    const t = setTimeout(() => setFeedback(null), 3500)
    return () => clearTimeout(t)
  }, [])

  function handleAdd() {
    if (!selectedId) {
      showFeedback(false, "Please select a variant before adding to cart.")
      return
    }
    startTransition(async () => {
      const result = await addToCart(selectedId, quantity)
      if (result.success) {
        showFeedback(true, `Added to cart! (${result.itemCount ?? ""} items)`)
      } else {
        showFeedback(false, result.error ?? "Could not add to cart.")
      }
    })
  }

  // ── No active variants ────────────────────────────────────────────────────
  if (activeVariants.length === 0) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
          <p className="text-sm font-medium text-red-700">Currently unavailable</p>
          <p className="text-xs text-red-500 mt-0.5">
            This product has no available variants at the moment.
          </p>
        </div>
        <button type="button" disabled
          className="w-full rounded-xl bg-gray-200 text-gray-400 py-3.5 text-base font-semibold cursor-not-allowed">
          Add to Cart
        </button>
      </div>
    )
  }

  // ── Attribute sets (colour × size × length) ───────────────────────────────
  const colours = [...new Set(activeVariants.map((v) => v.color).filter((c): c is string => !!c))]
  const sizes   = [...new Set(activeVariants.map((v) => v.size).filter((s): s is string => !!s))]
  const lengths = [...new Set(activeVariants.map((v) => v.length).filter((l): l is string => !!l))]

  // When a colour/size/length chip is clicked, select the first variant
  // that has that attribute. If the product uses all three, progressive
  // filtering would be ideal — for now: select first matching variant.
  function selectByAttr(attr: "color" | "size" | "length", value: string) {
    const match = activeVariants.find((v) => v[attr] === value)
    if (match) setSelectedId(match.id)
  }

  const isAttrSelected = (attr: "color" | "size" | "length", value: string) =>
    selected?.[attr] === value

  // Chip style helper
  const chipCls = (active: boolean) =>
    [
      "rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all duration-100 cursor-pointer",
      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1",
      active
        ? "border-[var(--color-brand-600)] bg-[var(--color-brand-600)] text-white shadow-sm"
        : "border-gray-300 bg-white text-gray-700 hover:border-[var(--color-brand-400)]",
    ].join(" ")

  // If no attribute chips exist (e.g. single-attribute product), show variant list
  const hasChips = colours.length > 0 || sizes.length > 0 || lengths.length > 0

  return (
    <div className="space-y-4">

      {/* ── Colour chips ── */}
      {colours.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">
            Colour
            {selected?.color && (
              <span className="ml-2 font-normal text-gray-500">{selected.color}</span>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            {colours.map((c) => (
              <button key={c} type="button"
                onClick={() => selectByAttr("color", c)}
                className={chipCls(isAttrSelected("color", c))}>
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Size chips ── */}
      {sizes.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">
            Size
            {selected?.size && (
              <span className="ml-2 font-normal text-gray-500">{selected.size}</span>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => (
              <button key={s} type="button"
                onClick={() => selectByAttr("size", s)}
                className={chipCls(isAttrSelected("size", s))}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Length chips ── */}
      {lengths.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">
            Length
            {selected?.length && (
              <span className="ml-2 font-normal text-gray-500">{selected.length}</span>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            {lengths.map((l) => (
              <button key={l} type="button"
                onClick={() => selectByAttr("length", l)}
                className={chipCls(isAttrSelected("length", l))}>
                {l}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Variant list (when no chips — e.g. SKU-only variants) ── */}
      {!hasChips && activeVariants.length > 1 && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Select Variant</p>
          <div className="space-y-2">
            {activeVariants.map((v) => {
              const vPrice = v.priceOverride ?? basePrice
              const attrs  = [v.color, v.size, v.length].filter(Boolean).join(" · ")
              return (
                <button key={v.id} type="button"
                  onClick={() => setSelectedId(v.id)}
                  className={[
                    "w-full rounded-lg border px-4 py-3 text-left text-sm flex items-center justify-between gap-3 transition-all",
                    selectedId === v.id
                      ? "border-[var(--color-brand-600)] bg-[var(--color-brand-50)]"
                      : "border-gray-200 bg-white hover:border-gray-300",
                  ].join(" ")}>
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-gray-400">{v.sku}</p>
                    {attrs && <p className="text-gray-700 mt-0.5">{attrs}</p>}
                  </div>
                  <p className="font-semibold text-gray-900 shrink-0">{formatPrice(vPrice)}</p>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Selected variant info ── */}
      {selected && (
        <div className="flex items-center justify-between py-2 border-t border-b border-gray-100">
          <div>
            <p className="text-xs text-gray-400 font-mono">{selected.sku}</p>
            {selected.priceOverride !== null && (
              <p className="text-xs text-[var(--color-brand-600)] mt-0.5">
                Variant price applies
              </p>
            )}
          </div>
          <p className="text-xl font-bold text-gray-900">{formatPrice(price)}</p>
        </div>
      )}

      {/* ── Quantity selector ── */}
      <div className="flex items-center gap-4">
        <p className="text-sm font-medium text-gray-700">Quantity</p>
        <div className="flex items-center rounded-lg border border-gray-300 overflow-hidden">
          <button type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1 || isPending}
            aria-label="Decrease quantity"
            className="px-3 py-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors select-none text-lg leading-none">
            −
          </button>
          <span
            className="px-4 py-2 text-sm font-semibold text-gray-900 min-w-[2.5rem] text-center select-none"
            aria-live="polite" aria-label={`Quantity: ${quantity}`}>
            {quantity}
          </span>
          <button type="button"
            onClick={() => setQuantity((q) => q + 1)}
            disabled={isPending}
            aria-label="Increase quantity"
            className="px-3 py-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors select-none text-lg leading-none">
            +
          </button>
        </div>
      </div>

      {/* ── Feedback banner ── */}
      {feedback && (
        <div
          role={feedback.ok ? "status" : "alert"}
          aria-live="polite"
          className={[
            "rounded-lg px-4 py-3 text-sm font-medium flex items-center gap-2 transition-all",
            feedback.ok
              ? "bg-green-50 border border-green-200 text-green-800"
              : "bg-red-50 border border-red-200 text-red-700",
          ].join(" ")}>
          {feedback.ok ? (
            <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          )}
          {feedback.msg}
        </div>
      )}

      {/* ── Add to Cart button ── */}
      <button
        type="button"
        onClick={handleAdd}
        disabled={isPending || activeVariants.length === 0}
        className={[
          "w-full inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-base font-semibold transition-colors",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-600)]",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          isPending
            ? "bg-[var(--color-brand-500)] text-white"
            : "bg-[var(--color-brand-600)] text-white hover:bg-[var(--color-brand-700)]",
        ].join(" ")}>
        {isPending ? (
          <>
            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Adding…
          </>
        ) : (
          <>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
            Add to Cart
          </>
        )}
      </button>

      {/* ── Branch notice ── */}
      {selectedBranchName && (
        <p className="text-xs text-gray-400 text-center">
          Pickup from <strong className="text-gray-600">{selectedBranchName}</strong>
        </p>
      )}
    </div>
  )
}
