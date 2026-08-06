"use client"

// Interactive product image gallery.
// The parent Server Component passes the full images array.
// This component owns the selected-image state and handles thumbnail clicks.

import { useState } from "react"
import Image from "next/image"
import { getProductImageUrl } from "@/lib/image"
import type { ProductImage } from "@/lib/products"

interface ProductGalleryProps {
  images: ProductImage[]
  productName: string
  hasDiscount?: boolean
  discountPct?: number
}

export function ProductGallery({
  images,
  productName,
  hasDiscount = false,
  discountPct = 0,
}: ProductGalleryProps) {
  // Start with the primary image, or the first image, or null
  const primary = images.find((i) => i.isPrimary) ?? images[0] ?? null
  const [activeId, setActiveId] = useState<string | null>(primary?.id ?? null)

  const active = images.find((i) => i.id === activeId) ?? primary

  // Fallback when there are no images at all
  if (images.length === 0) {
    return (
      <div className="space-y-3">
        <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-100 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-gray-300">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a.75.75 0 00.75-.75V6a.75.75 0 00-.75-.75H3.75a.75.75 0 00-.75.75v14.25c0 .414.336.75.75.75zm13.5-12.75h.008v.008h-.008V8.25z"
              />
            </svg>
            <p className="text-sm">No images yet</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-50 border border-gray-100">
        <Image
          key={active?.id} // key forces re-render on swap for smooth transition
          src={getProductImageUrl(active?.imageUrl)}
          alt={active?.altText ?? productName}
          fill
          priority
          className="object-cover transition-opacity duration-200"
          sizes="(max-width: 1024px) 100vw, 50vw"
          onError={(e) => {
            ;(e.target as HTMLImageElement).src = "/images/placeholders/product.svg"
          }}
        />

        {/* Discount badge */}
        {hasDiscount && discountPct > 0 && (
          <div className="absolute top-3 left-3 pointer-events-none">
            <span className="inline-flex items-center rounded-full bg-red-500 px-2.5 py-1 text-xs font-semibold text-white shadow">
              {discountPct}% off
            </span>
          </div>
        )}

        {/* Image counter badge — only when multiple images exist */}
        {images.length > 1 && (
          <div className="absolute bottom-3 right-3 pointer-events-none">
            <span className="inline-flex items-center rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white">
              {(images.findIndex((i) => i.id === active?.id) ?? 0) + 1} / {images.length}
            </span>
          </div>
        )}
      </div>

      {/* Thumbnail strip — only render when there are multiple images */}
      {images.length > 1 && (
        <div
          role="list"
          aria-label="Product image thumbnails"
          className="grid gap-2"
          style={{
            gridTemplateColumns: `repeat(${Math.min(images.length, 6)}, minmax(0, 1fr))`,
          }}
        >
          {images.map((img) => {
            const isActive = img.id === active?.id
            return (
              <button
                key={img.id}
                type="button"
                role="listitem"
                onClick={() => setActiveId(img.id)}
                aria-label={`View image: ${img.altText ?? productName}`}
                aria-current={isActive ? "true" : undefined}
                className={[
                  "relative aspect-square rounded-lg overflow-hidden border-2 transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-500)]",
                  isActive
                    ? "border-[var(--color-brand-500)] shadow-sm ring-1 ring-[var(--color-brand-500)]"
                    : "border-transparent hover:border-gray-300",
                ].join(" ")}
              >
                <Image
                  src={getProductImageUrl(img.imageUrl)}
                  alt={img.altText ?? productName}
                  fill
                  className="object-cover"
                  sizes="80px"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).src =
                      "/images/placeholders/product.svg"
                  }}
                />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
