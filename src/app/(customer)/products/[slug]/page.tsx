import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { notFound } from "next/navigation"
import { getProductBySlug, computeRatingSummary } from "@/lib/products"
import { getSelectedBranchFromCookies } from "@/lib/branch-cookie"
import { formatPrice } from "@/lib/utils"
import { Badge } from "@/components/ui/Badge"
import { siteConfig } from "@/config/site"
import { getProductImageUrl } from "@/lib/image"
import { ProductGallery } from "@/app/(customer)/products/_components/ProductGallery"
import { AddToCartSection } from "./_components/AddToCartSection"
import { ProductHighlights } from "./_components/ProductHighlights"
import type { SerialVariant } from "./_components/AddToCartSection"

type PageProps = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  if (!product) return { title: "Product Not Found" }
  return {
    title: product.name,
    description:
      product.description ??
      `${product.name} — ${product.category.name} at ${siteConfig.name}`,
  }
}

export const dynamic = "force-dynamic"

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params

  const [product, selectedBranch] = await Promise.all([
    getProductBySlug(slug),
    getSelectedBranchFromCookies(),
  ])

  if (!product) notFound()

  const hasDiscount =
    product.comparePrice !== null && product.comparePrice > product.basePrice
  const discountPct = hasDiscount
    ? Math.round(
        ((product.comparePrice! - product.basePrice) / product.comparePrice!) * 100
      )
    : 0

  const serialVariants: SerialVariant[] = product.variants.map((v) => ({
    id:            v.id,
    sku:           v.sku,
    color:         v.color,
    size:          v.size,
    length:        v.length,
    priceOverride: v.priceOverride,
    isActive:      v.isActive,
  }))

  // Compute price range for display (min–max across active variants)
  const activePrices = product.variants
    .filter((v) => v.isActive)
    .map((v) => v.priceOverride ?? product.basePrice)
  const minPrice = activePrices.length > 0 ? Math.min(...activePrices) : product.basePrice
  const maxPrice = activePrices.length > 0 ? Math.max(...activePrices) : product.basePrice
  const hasRange = minPrice !== maxPrice

  // Ratings
  const ratingSummary = computeRatingSummary(product.reviews ?? [])

  // Similar products
  const similarProducts = product.similarFrom ?? []

  // Highlights — cast to extended type since Product type doesn't know about new fields yet
  const p = product as typeof product & { color?: string | null; fit?: string | null; additionalDetails?: string | null }
  const highlights: Array<{ label: string; value: string }> = [
    p.color   ? { label: "Color",       value: p.color }          : null,
    p.fabric  ? { label: "Fabric",      value: p.fabric }         : null,
    p.fit     ? { label: "Fit / Shape", value: p.fit }            : null,
  ].filter((x): x is { label: string; value: string } => x !== null)

  return (
    <div className="bg-white min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex items-center gap-2 text-sm text-gray-400 flex-wrap">
            <li><Link href="/products" className="hover:text-gray-600 transition-colors">Products</Link></li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href={`/products?category=${product.category.slug}`} className="hover:text-gray-600 transition-colors">
                {product.category.name}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-gray-700 font-medium truncate max-w-[200px] sm:max-w-xs">{product.name}</li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">

          {/* Gallery */}
          <ProductGallery
            images={product.images}
            productName={product.name}
            hasDiscount={hasDiscount}
            discountPct={discountPct}
          />

          {/* Product info */}
          <div className="flex flex-col gap-5">

            {/* Category + featured */}
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/products?category=${product.category.slug}`}
                className="text-sm font-medium text-[var(--color-brand-600)] uppercase tracking-wide hover:text-[var(--color-brand-700)] transition-colors"
              >
                {product.category.name}
              </Link>
              {product.isFeatured && <Badge variant="info">Featured</Badge>}
            </div>

            {/* Name */}
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
              {product.name}
            </h1>

            {/* Ratings row */}
            {ratingSummary.totalRatings > 0 ? (
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 bg-green-600 text-white rounded-full px-2.5 py-1 text-xs font-semibold">
                  <span>{ratingSummary.averageRating}</span>
                  <svg className="h-3 w-3 fill-current" viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
                <span className="text-sm text-gray-500">
                  {ratingSummary.totalRatings.toLocaleString("en-IN")} Rating{ratingSummary.totalRatings !== 1 ? "s" : ""}
                </span>
                <span className="text-gray-300 text-sm" aria-hidden="true">|</span>
                <span className="text-sm text-gray-500">
                  {ratingSummary.totalReviews.toLocaleString("en-IN")} Review{ratingSummary.totalReviews !== 1 ? "s" : ""}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(i => (
                    <svg key={i} className="h-4 w-4 text-gray-200" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="text-xs text-gray-400">No reviews yet</span>
              </div>
            )}

            {/* Price */}
            <div className="flex items-baseline gap-3 flex-wrap">
              {hasRange ? (
                <span className="text-2xl font-bold text-gray-900">
                  {formatPrice(minPrice)} – {formatPrice(maxPrice)}
                </span>
              ) : (
                <span className="text-2xl font-bold text-gray-900">
                  {formatPrice(product.basePrice)}
                </span>
              )}
              {hasDiscount && (
                <span className="text-lg text-gray-400 line-through">
                  {formatPrice(product.comparePrice!)}
                </span>
              )}
              {hasDiscount && (
                <span className="text-sm font-semibold text-red-600">{discountPct}% off</span>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <p className="text-gray-600 leading-relaxed text-sm">{product.description}</p>
            )}

            {/* Add to Cart — client component */}
            <AddToCartSection
              variants={serialVariants}
              basePrice={product.basePrice}
              selectedBranchName={selectedBranch?.name ?? null}
            />

            {/* Branch selector prompt */}
            {!selectedBranch && (
              <div className="rounded-xl border border-[var(--color-brand-100)] bg-[var(--color-brand-50)] p-4 flex items-start gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[var(--color-brand-600)] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                <p className="text-sm text-[var(--color-brand-700)]">
                  <strong>Tip:</strong> Select a branch from the header to see pickup details.
                </p>
              </div>
            )}

            {/* Product Highlights */}
            {(highlights.length > 0 || p.additionalDetails) && (
              <ProductHighlights
                highlights={highlights}
                additionalDetails={p.additionalDetails ?? null}
                careInstructions={product.careInstructions ?? null}
              />
            )}
          </div>
        </div>

        {/* Similar Products */}
        {similarProducts.length > 0 && (
          <section className="mt-16" aria-labelledby="similar-heading">
            <h2 id="similar-heading" className="text-xl font-bold text-gray-900 mb-6">
              Similar Products
              <span className="ml-2 text-sm font-normal text-gray-400">
                ({similarProducts.length})
              </span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {similarProducts.map(({ similarProduct: sp }) => {
                const img = sp.images[0]
                const spHasDiscount = sp.comparePrice !== null && sp.comparePrice > sp.basePrice
                const spDiscount = spHasDiscount
                  ? Math.round(((sp.comparePrice! - sp.basePrice) / sp.comparePrice!) * 100)
                  : 0
                return (
                  <Link
                    key={sp.id}
                    href={`/products/${sp.slug}`}
                    className="group flex flex-col rounded-xl border border-gray-100 bg-white overflow-hidden hover:shadow-md transition-shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-500)]"
                  >
                    <div className="relative aspect-square bg-gray-50 overflow-hidden">
                      <Image
                        src={getProductImageUrl(img?.imageUrl)}
                        alt={img?.altText ?? sp.name}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                      />
                      {spHasDiscount && (
                        <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5">
                          {spDiscount}% off
                        </div>
                      )}
                    </div>
                    <div className="p-2.5 flex flex-col gap-1">
                      <p className="text-xs font-semibold text-gray-800 leading-tight line-clamp-2">{sp.name}</p>
                      <div className="flex items-baseline gap-1.5 flex-wrap mt-0.5">
                        <span className="text-sm font-bold text-gray-900">{formatPrice(sp.basePrice)}</span>
                        {spHasDiscount && (
                          <span className="text-xs text-gray-400 line-through">{formatPrice(sp.comparePrice!)}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

      </div>
    </div>
  )
}
