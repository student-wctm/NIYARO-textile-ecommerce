// =============================================================================
// Admin — Category Management
// SECURITY TODO: No authentication yet. Protect before production.
// =============================================================================
import type { Metadata } from "next"
import Link from "next/link"
import { getAllCategories } from "@/lib/products"
import { CategoryTable } from "./_components/CategoryTable"

export const metadata: Metadata = { title: "Categories" }
export const dynamic = "force-dynamic"

export default async function AdminCategoriesPage() {
  const categories = await getAllCategories()
  const active = categories.filter(c => c.isActive).length

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Categories</h1>
          {categories.length > 0 && (
            <p className="text-sm text-slate-500 mt-1">
              {categories.length} total &middot;{" "}
              <span className="text-green-700">{active} active</span>
            </p>
          )}
        </div>
        <Link href="/admin/categories/new"
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-brand-600)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-700)] transition-colors self-start sm:self-auto">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Category
        </Link>
      </div>
      <CategoryTable categories={categories} />
    </div>
  )
}
