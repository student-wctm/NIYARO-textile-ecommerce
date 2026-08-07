// SECURITY TODO: No authentication yet. Protect before production.
import type { Metadata } from "next"
import Link from "next/link"
import { getActiveCategories } from "@/lib/products"
import { NewProductClient } from "@/app/admin/products/_components/NewProductClient"

export const metadata: Metadata = { title: "Add Product" }

export default async function NewProductPage() {
  const categories = await getActiveCategories()

  return (
    <div className="max-w-2xl">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex items-center gap-2 text-sm text-slate-400">
          <li>
            <Link href="/admin/products" className="hover:text-slate-600 transition-colors">
              Products
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-slate-700 font-medium">Add Product</li>
        </ol>
      </nav>

      <h1 className="text-2xl font-bold text-slate-900 mb-2">Add Product</h1>
      <p className="text-sm text-slate-500 mb-6">
        Fill in the product details, then add images and variants on the same page.
      </p>

      {categories.length === 0 && (
        <div className="mb-6 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          No active categories found.{" "}
          <Link href="/admin/categories/new" className="font-medium underline">
            Create a category first
          </Link>{" "}
          before adding products.
        </div>
      )}

      <NewProductClient categories={categories} />
    </div>
  )
}
