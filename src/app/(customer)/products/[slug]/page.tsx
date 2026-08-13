import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getProductBySlug } from "@/lib/products"
import { getSelectedBranchFromCookies } from "@/lib/branch-cookie"
import { formatPrice } from "@/lib/utils"
import { Badge } from "@/components/ui/Badge"
import { siteConfig } from "@/config/site"
import { ProductGallery } from "@/app/(customer)/products/_components/ProductGallery"
import { AddToCartSection } from "./_components/AddToCartSection"
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

  // Serialise variants for the Client Component — strip Date fields
  const serialVariants: SerialVariant[] = product.variants.map((v) => ({
    id:            v.id,
    sku:           v.sku,
    color:         v.color,
    size:          v.size,
    length:        v.length,
    priceOverride: v.priceOverride,
    isActive:      v.isActive,
  }))

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
              {hasDiscount && (
                <span className="text-sm font-semibold text-red-600">{discountPct}% off</span>
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

            {/* ── Add to Cart — client component ── */}
            <AddToCartSection
              variants={serialVariants}
              basePrice={product.basePrice}
              selectedBranchName={selectedBranch?.name ?? null}
            />

            {/* Branch selector prompt if no branch selected */}
            {!selectedBranch && (
              <div className="rounded-xl border border-[var(--color-brand-100)] bg-[var(--color-brand-50)] p-4 flex items-start gap-2">
                <svg xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-[var(--color-brand-600)] shrink-0 mt-0.5"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                <p className="text-sm text-[var(--color-brand-700)]">
                  <strong>Tip:</strong> Select a branch from the header to see pickup details.
                </p>
              </div>
            )}

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
