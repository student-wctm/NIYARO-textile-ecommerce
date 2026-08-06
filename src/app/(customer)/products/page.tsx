import type { Metadata } from "next"
import { Suspense } from "react"
import { getActiveProducts, getActiveCategories } from "@/lib/products"
import { siteConfig } from "@/config/site"
import { ProductCard } from "./_components/ProductCard"
import { ProductFilters } from "./_components/ProductFilters"

// searchParams is a Promise in Next.js 16 — must be awaited
type PageProps = {
  searchParams: Promise<{ category?: string; search?: string; page?: string }>
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { category } = await searchParams
  return {
    title: category ? `${category} — Products` : "Products",
    description: `Browse ${siteConfig.name}'s complete textile catalogue. Reserve online, pick up in store.`,
  }
}

// Dynamic because it reads searchParams (filters) and live DB data
export const dynamic = "force-dynamic"

const PAGE_SIZE = 24

export default async function CustomerProductsPage({ searchParams }: PageProps) {
  const { category, search, page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? "1", 10))
  const skip = (page - 1) * PAGE_SIZE

  // Run category list and product list in parallel
  const [{ products, total }, categories] = await Promise.all([
    getActiveProducts({
      categorySlug: category || undefined,
      search: search || undefined,
      take: PAGE_SIZE,
      skip,
    }),
    getActiveCategories(),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const hasFilters = !!(category || search)

  return (
    <div className="bg-white min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">

        {/* ── Page header ── */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Products</h1>
          <p className="mt-1 text-gray-500 text-sm">
            {total > 0
              ? `${total} product${total === 1 ? "" : "s"} found`
              : hasFilters
              ? "No products match your filters"
              : "No products yet"}
          </p>
        </div>

        {/* ── Filters — wrapped in Suspense because useSearchParams is used inside ── */}
        <div className="mb-8">
          <Suspense fallback={<div className="h-10 bg-gray-100 rounded-lg animate-pulse" />}>
            <ProductFilters
              categories={categories}
              activeCategory={category ?? null}
              activeSearch={search ?? null}
            />
          </Suspense>
        </div>

        {/* ── Product grid ── */}
        {products.length === 0 ? (
          <div className="rounded-xl border border-gray-200 py-20 text-center">
            <p className="text-4xl mb-4" aria-hidden="true">🧵</p>
            {hasFilters ? (
              <>
                <p className="text-lg font-medium text-gray-700 mb-2">
                  No products match your filters
                </p>
                <p className="text-sm text-gray-400">
                  Try a different category or clear your search.
                </p>
              </>
            ) : (
              <>
                <p className="text-lg font-medium text-gray-700 mb-2">
                  No products yet
                </p>
                <p className="text-sm text-gray-400">
                  Check back soon — our catalogue is being built.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <nav
            aria-label="Product pagination"
            className="mt-12 flex items-center justify-center gap-2"
          >
            {page > 1 && (
              <PaginationLink
                href={buildPageHref(page - 1, category, search)}
                label="← Previous"
              />
            )}
            <span className="text-sm text-gray-500 px-2">
              Page {page} of {totalPages}
            </span>
            {page < totalPages && (
              <PaginationLink
                href={buildPageHref(page + 1, category, search)}
                label="Next →"
              />
            )}
          </nav>
        )}
      </div>
    </div>
  )
}

function buildPageHref(
  page: number,
  category?: string,
  search?: string
): string {
  const params = new URLSearchParams()
  if (category) params.set("category", category)
  if (search) params.set("search", search)
  if (page > 1) params.set("page", String(page))
  const qs = params.toString()
  return `/products${qs ? `?${qs}` : ""}`
}

function PaginationLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-500)]"
    >
      {label}
    </a>
  )
}
