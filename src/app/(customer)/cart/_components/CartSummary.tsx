"use client"

import { useTransition, useState } from "react"
import Link from "next/link"
import { clearCart } from "@/app/(customer)/cart/actions"
import { formatPrice } from "@/lib/utils"

interface CartSummaryProps {
  subtotal:   number
  itemCount:  number
  branchName: string | null
}

export function CartSummary({ subtotal, itemCount, branchName }: CartSummaryProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError]            = useState<string | null>(null)

  function handleClear() {
    if (!window.confirm("Clear all items from your cart?")) return
    setError(null)
    startTransition(async () => {
      const result = await clearCart()
      if (!result.success) setError(result.error ?? "Failed to clear cart.")
    })
  }

  return (
    <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6 space-y-5">
      <h2 className="text-base font-semibold text-gray-900">Order Summary</h2>

      {/* Branch notice */}
      {branchName ? (
        <div className="flex items-center gap-2 rounded-lg bg-[var(--color-brand-50)] border border-[var(--color-brand-100)] px-3 py-2">
          <svg className="h-4 w-4 text-[var(--color-brand-600)] shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-2.079 3.218-4.402 3.218-6.853C19.5 6.161 15.976 2.25 12 2.25S4.5 6.161 4.5 11.474c0 2.451 1.274 4.774 3.218 6.853a19.58 19.58 0 002.683 2.282 16.975 16.975 0 001.144.742zM12 13.5a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clipRule="evenodd" />
          </svg>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[var(--color-brand-700)] truncate">{branchName}</p>
            <p className="text-xs text-[var(--color-brand-600)]">Pickup branch</p>
          </div>
        </div>
      ) : (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
          <strong>No branch selected.</strong> Use the branch selector in the header
          to choose your pickup location.
        </div>
      )}

      {/* Line items */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>Items ({itemCount})</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between text-gray-400 text-xs">
          <span>Delivery</span>
          <span>Pickup (free)</span>
        </div>
      </div>

      {/* Subtotal */}
      <div className="flex justify-between text-base font-bold text-gray-900 border-t border-gray-200 pt-4">
        <span>Subtotal</span>
        <span>{formatPrice(subtotal)}</span>
      </div>

      <p className="text-xs text-gray-400">
        Prices shown include tax. Final total confirmed at checkout.
      </p>

      {/* Error */}
      {error && (
        <p role="alert" className="text-xs text-red-600">{error}</p>
      )}

      {/* Actions */}
      <div className="space-y-3">
        {/* Checkout CTA */}
        <Link
          href="/checkout"
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-600)] px-6 py-3.5 text-base font-semibold text-white hover:bg-[var(--color-brand-700)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-600)]">
          Proceed to Checkout →
        </Link>

        <Link href="/products"
          className="w-full inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
          ← Continue Shopping
        </Link>

        {/* Clear cart */}
        <button type="button"
          onClick={handleClear}
          disabled={isPending}
          className="w-full text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40 py-1">
          {isPending ? "Clearing…" : "Clear Cart"}
        </button>
      </div>
    </div>
  )
}
