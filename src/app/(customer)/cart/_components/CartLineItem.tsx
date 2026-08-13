"use client"

import { useTransition, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { updateCartQuantity, removeFromCart } from "@/app/(customer)/cart/actions"
import { getProductImageUrl } from "@/lib/image"
import { formatPrice } from "@/lib/utils"
import type { CartItemFull } from "@/lib/cart"

interface CartLineItemProps {
  item: CartItemFull
}

// Serialise-safe shape — CartItemFull crosses the server→client boundary
// via the cart page which serialises Dates. We receive it pre-serialised.
export type SerialCartItem = {
  id:        string
  variantId: string
  quantity:  number
  unitPrice: number
  variant: {
    sku:          string
    color:        string | null
    size:         string | null
    length:       string | null
    priceOverride: number | null
    product: {
      id:        string
      name:      string
      slug:      string
      basePrice: number
      images: { id: string; imageUrl: string; altText: string | null; isPrimary: boolean }[]
    }
  }
}

interface SerialCartLineItemProps {
  item: SerialCartItem
}

export function CartLineItem({ item }: SerialCartLineItemProps) {
  const [isPending, startTransition] = useTransition()
  const [localQty, setLocalQty]      = useState(item.quantity)
  const [error, setError]            = useState<string | null>(null)

  const image   = item.variant.product.images[0]
  const imgUrl  = getProductImageUrl(image?.imageUrl)
  const attrs   = [item.variant.color, item.variant.size, item.variant.length].filter(Boolean).join(" · ")
  const total   = item.unitPrice * localQty

  function updateQty(newQty: number) {
    if (newQty < 1) return
    setLocalQty(newQty)
    setError(null)
    startTransition(async () => {
      const result = await updateCartQuantity(item.variantId, newQty)
      if (!result.success) {
        setLocalQty(item.quantity) // revert on error
        setError(result.error ?? "Could not update quantity.")
      }
    })
  }

  function handleRemove() {
    setError(null)
    startTransition(async () => {
      const result = await removeFromCart(item.variantId)
      if (!result.success) {
        setError(result.error ?? "Could not remove item.")
      }
    })
  }

  return (
    <li className={`flex gap-4 py-5 border-b border-gray-100 last:border-0 transition-opacity ${isPending ? "opacity-60" : ""}`}>
      {/* Product image */}
      <Link href={`/products/${item.variant.product.slug}`}
        className="relative h-20 w-20 sm:h-24 sm:w-24 shrink-0 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 hover:opacity-90 transition-opacity">
        <Image
          src={imgUrl}
          alt={image?.altText ?? item.variant.product.name}
          fill
          className="object-cover"
          sizes="96px"
          onError={(e) => { (e.target as HTMLImageElement).src = "/images/placeholders/product.svg" }}
        />
      </Link>

      {/* Details */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link href={`/products/${item.variant.product.slug}`}
              className="text-sm font-semibold text-gray-900 hover:text-[var(--color-brand-700)] transition-colors line-clamp-2">
              {item.variant.product.name}
            </Link>
            <p className="text-xs font-mono text-gray-400 mt-0.5">{item.variant.sku}</p>
            {attrs && <p className="text-xs text-gray-500 mt-0.5">{attrs}</p>}
          </div>
          {/* Remove button */}
          <button
            type="button"
            onClick={handleRemove}
            disabled={isPending}
            aria-label={`Remove ${item.variant.product.name} from cart`}
            className="p-1 text-gray-300 hover:text-red-500 transition-colors disabled:opacity-40 shrink-0 mt-0.5">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Quantity + price row */}
        <div className="flex items-center justify-between gap-3 mt-auto pt-1 flex-wrap">
          {/* Quantity stepper */}
          <div className="flex items-center rounded-lg border border-gray-300 overflow-hidden">
            <button type="button"
              onClick={() => updateQty(localQty - 1)}
              disabled={localQty <= 1 || isPending}
              aria-label="Decrease quantity"
              className="px-2.5 py-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-base leading-none select-none">
              −
            </button>
            <span className="px-3 py-1.5 text-sm font-semibold text-gray-900 min-w-[2rem] text-center select-none"
              aria-live="polite" aria-label={`Quantity: ${localQty}`}>
              {localQty}
            </span>
            <button type="button"
              onClick={() => updateQty(localQty + 1)}
              disabled={isPending}
              aria-label="Increase quantity"
              className="px-2.5 py-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-base leading-none select-none">
              +
            </button>
          </div>

          {/* Item subtotal */}
          <div className="text-right">
            <p className="text-sm font-bold text-gray-900">{formatPrice(total)}</p>
            {localQty > 1 && (
              <p className="text-xs text-gray-400">{formatPrice(item.unitPrice)} each</p>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <p role="alert" className="text-xs text-red-600 mt-1">{error}</p>
        )}
      </div>
    </li>
  )
}
