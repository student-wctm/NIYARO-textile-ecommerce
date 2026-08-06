import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getProductBySlug } from "@/lib/products"
import { getSelectedBranchFromCookies } from "@/lib/branch-cookie"
import { formatPrice } from "@/lib/utils"
import { Badge } from "@/components/ui/Badge"
import { siteConfig } from "@/config/site"
import { ProductGallery } from "@/app/(customer)/products/_components/ProductGallery"

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

  const activeVariants = product.variants.filter((v) => v.isActive)
  const colours = [...new Set(activeVariants.map((v) => v.color).filter(Boolean))]
  const sizes = [...new Set(activeVariants.map((v) => v.size).filter(Boolean))]

  return (
    <div className="bg-white min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex items-center gap-2 text-sm text-gray-400 flex-wrap">
            <li>
              <Link href="/products" className="hover:text-gray-600 transition-colors">
                Products
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link
                href={`/products?category=${product.category.slug}`}
                className="hover:text-gray-600 transition-colors"
              >
                {product.category.name}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-gray-700 font-medium truncate max-w-[200px] sm:max-w-xs">
              {product.name}
            </li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">

          {/* Gallery — client component for interactivity */}
          <ProductGallery
            images={product.images}
            productName={product.name}
            hasDiscount={hasDiscount}
            discountPct={discountPct}
          />

          {/* Product info — server rendered */}
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

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-bold text-gray-900">
                {formatPrice(product.basePrice)}
              </span>
              {hasDiscount && (
                <span className="text-lg text-gray-400 line-through">
                  {formatPrice(product.comparePrice!)}
                </span>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <p className="text-gray-600 leading-relaxed text-sm">
                {product.description}
              </p>
            )}

            {/* Fabric */}
            {product.fabric && (
              <p className="text-sm">
                <span className="font-medium text-gray-700">Fabric: </span>
                <span className="text-gray-600">{product.fabric}</span>
              </p>
            )}

            {/* Colours */}
            {colours.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Available Colours</p>
                <div className="flex flex-wrap gap-2">
                  {colours.map((colour) => (
                    <span key={colour}
                      className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700">
                      {colour}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Sizes */}
            {sizes.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Available Sizes</p>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((size) => (
                    <span key={size}
                      className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700">
                      {size}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Variants summary */}
            {activeVariants.length > 0 && (
              <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  {activeVariants.length}{" "}
                  {activeVariants.length === 1 ? "variant" : "variants"} available
                </p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {activeVariants.map((v) => {
                    const attrs = [v.color, v.size, v.length].filter(Boolean).join(" · ")
                    const price = v.priceOverride ?? product.basePrice
                    return (
                      <div key={v.id}
                        className="flex items-center justify-between text-xs text-gray-600 gap-2">
                        <span className="font-mono text-gray-400 shrink-0">{v.sku}</span>
                        <span className="flex-1 truncate">{attrs}</span>
                        <span className="font-medium text-gray-900 shrink-0">
                          {formatPrice(price)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Branch + stock notice */}
            <div className="rounded-xl border border-[var(--color-brand-100)] bg-[var(--color-brand-50)] p-4">
              {selectedBranch ? (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <svg xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-[var(--color-brand-600)] shrink-0"
                      fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-2.079 3.218-4.402 3.218-6.853C19.5 6.161 15.976 2.25 12 2.25S4.5 6.161 4.5 11.474c0 2.451 1.274 4.774 3.218 6.853a19.58 19.58 0 002.683 2.282 16.975 16.975 0 001.144.742zM12 13.5a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm font-semibold text-[var(--color-brand-700)]">
                      {selectedBranch.name}
                    </p>
                  </div>
                  <p className="text-xs text-[var(--color-brand-600)] ml-6">
                    Branch-wise stock availability will show here once inventory is configured.
                  </p>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-[var(--color-brand-600)] shrink-0 mt-0.5"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-[var(--color-brand-700)]">
                      Select a branch to check availability
                    </p>
                    <p className="text-xs text-[var(--color-brand-600)] mt-0.5">
                      Use the branch selector in the header to choose your nearest store.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Reserve CTA — disabled until inventory is set up */}
            <button type="button" disabled
              title="Reservation available once branch inventory is configured."
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-600)] px-6 py-3.5 text-base font-semibold text-white opacity-50 cursor-not-allowed">
              Reserve for Pickup
            </button>
            <p className="text-xs text-gray-400 text-center -mt-2">
              Reservation available once branch inventory is set up.
            </p>

            {/* Care instructions */}
            {product.careInstructions && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-sm font-medium text-gray-700 mb-1">Care Instructions</p>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {product.careInstructions}
                </p>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
