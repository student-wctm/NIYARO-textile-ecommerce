"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useTransition, useCallback } from "react"
import type { Category } from "@/lib/products"

interface ProductFiltersProps {
  categories: Category[]
  activeCategory: string | null
  activeSearch: string | null
}

export function ProductFilters({
  categories,
  activeCategory,
  activeSearch,
}: ProductFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      // Always reset to page 1 when filters change
      params.delete("page")
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`)
      })
    },
    [router, pathname, searchParams]
  )

  return (
    <div
      className={`flex flex-col sm:flex-row gap-3 transition-opacity ${isPending ? "opacity-60 pointer-events-none" : ""}`}
      aria-busy={isPending}
    >
      {/* Search */}
      <div className="relative flex-1 max-w-sm">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const q = (e.currentTarget.elements.namedItem("q") as HTMLInputElement).value.trim()
            updateParam("search", q || null)
          }}
        >
          <input
            name="q"
            type="search"
            defaultValue={activeSearch ?? ""}
            placeholder="Search products…"
            className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-4 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:border-transparent"
          />
        </form>
      </div>

      {/* Category filter */}
      <select
        value={activeCategory ?? ""}
        onChange={(e) => updateParam("category", e.target.value || null)}
        aria-label="Filter by category"
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:border-transparent"
      >
        <option value="">All Categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.slug}>{c.name}</option>
        ))}
      </select>

      {/* Clear filters */}
      {(activeCategory || activeSearch) && (
        <button
          type="button"
          onClick={() => {
            startTransition(() => { router.push(pathname) })
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Clear
        </button>
      )}
    </div>
  )
}
