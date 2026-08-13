"use client"

// ProductCardAddButton — shown at the bottom of each ProductCard.
//
// Approach:
//   - If the product has exactly 1 variant, we COULD do a quick-add, but we
//     don't have the variantId on the listing page (only _count.variants).
//     Fetching it would add N DB calls. Instead, we always link to the product
//     detail page where AddToCartSection auto-selects the single variant.
//   - If the product has multiple variants, we never add blindly — we link to
//     the product page so the customer can choose.
//   - This keeps the list page fast and free of per-product DB fetches.

import Link from "next/link"

interface ProductCardAddButtonProps {
  productSlug:  string
  variantCount: number
}

export function ProductCardAddButton({
  productSlug,
  variantCount,
}: ProductCardAddButtonProps) {
  if (variantCount === 0) {
    return (
      <p className="text-xs text-gray-400 italic">Currently unavailable</p>
    )
  }

  return (
    <Link
      href={`/products/${productSlug}`}
      className={[
        "mt-1 w-full inline-flex items-center justify-center gap-1.5",
        "rounded-lg border border-[var(--color-brand-200)] text-[var(--color-brand-700)]",
        "bg-[var(--color-brand-50)] hover:bg-[var(--color-brand-100)]",
        "px-3 py-2 text-xs font-semibold transition-colors",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1",
      ].join(" ")}
    >
      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272" />
      </svg>
      {variantCount === 1 ? "Add to Cart" : "Select Options"}
    </Link>
  )
}
