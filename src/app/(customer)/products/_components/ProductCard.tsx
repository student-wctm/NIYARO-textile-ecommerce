import Link from "next/link"
import Image from "next/image"
import { Badge } from "@/components/ui/Badge"
import { getProductImageUrl } from "@/lib/image"
import { formatPrice } from "@/lib/utils"
import type { ProductSummary } from "@/lib/products"

interface ProductCardProps {
  product: ProductSummary
}

export function ProductCard({ product }: ProductCardProps) {
  const primaryImage = product.images[0]
  const imageUrl = getProductImageUrl(primaryImage?.imageUrl)
  const hasDiscount =
    product.comparePrice !== null &&
    product.comparePrice > product.basePrice

  const discountPct = hasDiscount
    ? Math.round(
        ((product.comparePrice! - product.basePrice) / product.comparePrice!) * 100
      )
    : 0

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md hover:border-gray-300 transition-all duration-200"
    >
      {/* Image */}
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        <Image
          src={imageUrl}
          alt={primaryImage?.altText ?? product.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
        {/* Badges overlay */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.isFeatured && (
            <span className="inline-flex items-center rounded-full bg-[var(--color-brand-600)] px-2 py-0.5 text-xs font-medium text-white shadow-sm">
              Featured
            </span>
          )}
          {hasDiscount && (
            <span className="inline-flex items-center rounded-full bg-red-500 px-2 py-0.5 text-xs font-medium text-white shadow-sm">
              {discountPct}% off
            </span>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="flex flex-col gap-2 p-4 flex-1">
        {/* Category */}
        <p className="text-xs font-medium text-[var(--color-brand-600)] uppercase tracking-wide">
          {product.category.name}
        </p>

        {/* Name */}
        <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 group-hover:text-[var(--color-brand-700)] transition-colors">
          {product.name}
        </h3>

        {/* Fabric tag */}
        {product.fabric && (
          <p className="text-xs text-gray-400">{product.fabric}</p>
        )}

        {/* Variants count */}
        {product._count.variants > 0 && (
          <p className="text-xs text-gray-400">
            {product._count.variants}{" "}
            {product._count.variants === 1 ? "variant" : "variants"} available
          </p>
        )}

        {/* Pricing — pushed to bottom */}
        <div className="mt-auto pt-2 flex items-baseline gap-2">
          <span className="text-base font-bold text-gray-900">
            {formatPrice(product.basePrice)}
          </span>
          {hasDiscount && (
            <span className="text-sm text-gray-400 line-through">
              {formatPrice(product.comparePrice!)}
            </span>
          )}
        </div>

        {/* Stock note — honest: no inventory implemented yet */}
        <p className="text-xs text-gray-400 italic">
          Select a branch to check availability
        </p>
      </div>
    </Link>
  )
}
