"use client"

// =============================================================================
// ProductGallery — Flipkart/Amazon/Meesho-style product image gallery
//
// Features:
//   - Large main image with crossfade transition
//   - Vertical thumbnail strip (desktop) / horizontal strip (mobile)
//   - Prev / Next arrow navigation
//   - Click thumbnail → change main image
//   - Keyboard ← → arrow navigation (focuses on mount)
//   - Touch/pointer swipe support (no external library)
//   - CSS zoom on hover (transform + overflow)
//   - Lazy loading on thumbnails
//   - Counter badge (n / total)
//   - Discount badge overlay
//   - Graceful no-image placeholder
//   - aria-live region announces image changes to screen readers
// =============================================================================

import { useState, useEffect, useRef, useCallback } from "react"
import Image from "next/image"
import { getProductImageUrl } from "@/lib/image"
import type { ProductImage } from "@/lib/products"

interface ProductGalleryProps {
  images: ProductImage[]
  productName: string
  hasDiscount?: boolean
  discountPct?: number
}

const PLACEHOLDER = "/images/placeholders/product.svg"

// ─── No-image placeholder ─────────────────────────────────────────────────────

function EmptyGallery({ productName }: { productName: string }) {
  return (
    <div className="space-y-3">
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 border border-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-300 select-none">
          <svg
            className="h-20 w-20"
            fill="none" stroke="currentColor" strokeWidth={0.8} viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a.75.75 0 00.75-.75V6a.75.75 0 00-.75-.75H3.75a.75.75 0 00-.75.75v14.25c0 .414.336.75.75.75zm13.5-12.75h.008v.008h-.008V8.25z" />
          </svg>
          <p className="text-sm text-gray-400">No images for {productName}</p>
        </div>
      </div>
    </div>
  )
}

// ─── Main gallery ─────────────────────────────────────────────────────────────

export function ProductGallery({
  images,
  productName,
  hasDiscount = false,
  discountPct = 0,
}: ProductGalleryProps) {
  const primary = images.find((i) => i.isPrimary) ?? images[0] ?? null
  const [activeIndex, setActiveIndex] = useState<number>(
    primary ? images.indexOf(primary) : 0
  )
  const [isZoomed, setIsZoomed] = useState(false)
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 })
  const [imgLoaded, setImgLoaded] = useState(false)

  // Touch swipe state
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  // For aria-live
  const [announcement, setAnnouncement] = useState("")

  const activeImage = images[activeIndex] ?? null

  const goTo = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(index, images.length - 1))
    setActiveIndex(clamped)
    setImgLoaded(false)
    setIsZoomed(false)
    const img = images[clamped]
    setAnnouncement(
      `Image ${clamped + 1} of ${images.length}: ${img?.altText ?? productName}`
    )
  }, [images, productName])

  const prev = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo])
  const next = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft")  { e.preventDefault(); prev() }
      if (e.key === "ArrowRight") { e.preventDefault(); next() }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [prev, next])

  // Touch / pointer swipe
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    touchStartX.current = null
    touchStartY.current = null
    // Only trigger horizontal swipe if it's more horizontal than vertical
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return
    if (dx < 0) next()
    else         prev()
  }

  // Zoom: track mouse position inside main image
  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isZoomed) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width)  * 100
    const y = ((e.clientY - rect.top)  / rect.height) * 100
    setZoomPos({ x, y })
  }

  if (images.length === 0) return <EmptyGallery productName={productName} />

  const hasPrev = activeIndex > 0
  const hasNext = activeIndex < images.length - 1

  return (
    <div className="flex flex-col lg:flex-row gap-3 lg:gap-4">
      {/* ── Thumbnail strip (left on desktop, bottom on mobile) ── */}
      <div className="order-2 lg:order-1 lg:w-[76px]">
        <div
          className={[
            "flex gap-2 overflow-x-auto lg:overflow-x-hidden",
            "lg:flex-col lg:overflow-y-auto lg:max-h-[540px]",
            "scrollbar-thin scrollbar-thumb-gray-200",
          ].join(" ")}
          role="listbox"
          aria-label="Product image thumbnails"
        >
          {images.map((img, i) => {
            const isActive = i === activeIndex
            return (
              <button
                key={img.id}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => goTo(i)}
                className={[
                  "relative shrink-0 w-[64px] h-[64px] lg:w-full lg:h-[70px]",
                  "rounded-lg overflow-hidden border-2 transition-all duration-150",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-brand-500)]",
                  isActive
                    ? "border-[var(--color-brand-500)] ring-1 ring-[var(--color-brand-400)] shadow-sm"
                    : "border-gray-200 hover:border-gray-400 opacity-70 hover:opacity-100",
                ].join(" ")}
              >
                <Image
                  src={getProductImageUrl(img.imageUrl)}
                  alt={img.altText ?? `${productName} — image ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="70px"
                  loading="lazy"
                  onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER }}
                />
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Main image ── */}
      <div className="order-1 lg:order-2 flex-1">
        <div className="relative">
          {/* Main image container with zoom */}
          <div
            className={[
              "relative aspect-square rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 select-none",
              images.length > 1 ? "cursor-zoom-in" : "",
              isZoomed ? "cursor-zoom-out" : "",
            ].join(" ")}
            onClick={() => images.length > 0 && setIsZoomed((z) => !z)}
            onMouseMove={onMouseMove}
            onMouseLeave={() => setIsZoomed(false)}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {/* Loading skeleton */}
            {!imgLoaded && (
              <div className="absolute inset-0 bg-gray-100 animate-pulse rounded-2xl z-10" />
            )}

            {/* Main image — key forces remount on change for crossfade */}
            <Image
              key={activeImage?.id ?? "placeholder"}
              src={getProductImageUrl(activeImage?.imageUrl)}
              alt={activeImage?.altText ?? productName}
              fill
              priority={activeIndex === 0}
              className={[
                "object-cover transition-opacity duration-300",
                imgLoaded ? "opacity-100" : "opacity-0",
                isZoomed ? "scale-[2.2]" : "scale-100",
                "transition-transform duration-100 ease-out",
              ].join(" ")}
              style={isZoomed ? {
                transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
              } : {}}
              sizes="(max-width: 1024px) 100vw, 50vw"
              onLoad={() => setImgLoaded(true)}
              onError={(e) => {
                ;(e.target as HTMLImageElement).src = PLACEHOLDER
                setImgLoaded(true)
              }}
            />

            {/* Discount badge */}
            {hasDiscount && discountPct > 0 && (
              <div className="absolute top-3 left-3 z-20 pointer-events-none">
                <span className="inline-flex items-center rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white shadow-md">
                  {discountPct}% OFF
                </span>
              </div>
            )}

            {/* Counter badge */}
            {images.length > 1 && (
              <div className="absolute bottom-3 right-3 z-20 pointer-events-none">
                <span className="inline-flex items-center rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                  {activeIndex + 1} / {images.length}
                </span>
              </div>
            )}

            {/* Zoom hint */}
            {!isZoomed && images.length > 0 && (
              <div className="absolute bottom-3 left-3 z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white">
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
                  </svg>
                  Click to zoom
                </span>
              </div>
            )}
          </div>

          {/* Prev / Next arrows */}
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); prev() }}
                disabled={!hasPrev}
                aria-label="Previous image"
                className={[
                  "absolute left-2 top-1/2 -translate-y-1/2 z-30",
                  "w-9 h-9 rounded-full bg-white/90 shadow-md border border-gray-200",
                  "flex items-center justify-center transition-all duration-150",
                  hasPrev
                    ? "hover:bg-white hover:shadow-lg cursor-pointer"
                    : "opacity-30 cursor-not-allowed",
                ].join(" ")}
              >
                <svg className="h-4 w-4 text-gray-700" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>

              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); next() }}
                disabled={!hasNext}
                aria-label="Next image"
                className={[
                  "absolute right-2 top-1/2 -translate-y-1/2 z-30",
                  "w-9 h-9 rounded-full bg-white/90 shadow-md border border-gray-200",
                  "flex items-center justify-center transition-all duration-150",
                  hasNext
                    ? "hover:bg-white hover:shadow-lg cursor-pointer"
                    : "opacity-30 cursor-not-allowed",
                ].join(" ")}
              >
                <svg className="h-4 w-4 text-gray-700" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Dot indicators — mobile only */}
        {images.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-3 lg:hidden" aria-hidden="true">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Go to image ${i + 1}`}
                className={[
                  "rounded-full transition-all duration-150",
                  i === activeIndex
                    ? "w-4 h-1.5 bg-[var(--color-brand-600)]"
                    : "w-1.5 h-1.5 bg-gray-300 hover:bg-gray-400",
                ].join(" ")}
              />
            ))}
          </div>
        )}

        {/* Keyboard hint — desktop only */}
        {images.length > 1 && (
          <p className="hidden lg:block text-center text-xs text-gray-400 mt-2" aria-hidden="true">
            Use ← → keys to navigate · click image to zoom
          </p>
        )}
      </div>

      {/* Screen reader live region */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
    </div>
  )
}
