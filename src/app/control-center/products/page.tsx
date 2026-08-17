// Control Center — Product Catalogue
import type { Metadata } from "next"
import Link from "next/link"
import { getAllProducts } from "@/lib/products"
import { ProductTable } from "./_components/ProductTable"

export const metadata: Metadata = { title: "Products" }
export const dynamic = "force-dynamic"

export default async function AdminProductsPage() {
  const products = await getAllProducts()
  const active = products.filter(p => p.isActive).length
  const featured = products.filter(p => p.isFeatured).length

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Product Catalogue</h1>
          {products.length > 0 && (
            <p className="text-sm text-slate-500 mt-1">
              {products.length} total &middot;{" "}
              <span className="text-green-700">{active} active</span>
              {featured > 0 && (
                <> &middot; <span className="text-blue-600">{featured} featured</span></>
              )}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <Link href="/control-center/categories"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
            Manage Categories
          </Link>
          <Link href="/control-center/products/new"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-brand-600)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-700)] transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Product
          </Link>
        </div>
      </div>

      <ProductTable products={products} />

      {products.length > 0 && (
        <p className="mt-4 text-xs text-slate-400">
          Products cannot be permanently deleted once they have orders. Use Deactivate to hide from customers.
        </p>
      )}
    </div>
  )
}

