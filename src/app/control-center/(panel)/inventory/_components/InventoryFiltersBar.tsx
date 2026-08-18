"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useTransition, useCallback } from "react"

interface InventoryFiltersBarProps {
  branches:   { id: string; name: string; city: string }[]
  categories: { id: string; name: string }[]
  currentBranchId?:   string
  currentCategoryId?: string
  currentStatus?:     string
  currentSearch?:     string
}

const STATUS_OPTIONS = [
  { value: "",              label: "All Statuses"  },
  { value: "IN_STOCK",      label: "In Stock"      },
  { value: "LOW_STOCK",     label: "Low Stock"     },
  { value: "OUT_OF_STOCK",  label: "Out of Stock"  },
]

const selectCls =
  "rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 " +
  "text-slate-700 dark:text-slate-300 text-sm px-3 py-2 " +
  "focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:border-transparent"

export function InventoryFiltersBar({
  branches, categories,
  currentBranchId, currentCategoryId, currentStatus, currentSearch,
}: InventoryFiltersBarProps) {
  const router     = useRouter()
  const pathname   = usePathname()
  const params     = useSearchParams()
  const [, startT] = useTransition()

  const push = useCallback((key: string, value: string) => {
    const p = new URLSearchParams(params.toString())
    if (value) p.set(key, value); else p.delete(key)
    p.delete("page")
    startT(() => router.push(`${pathname}?${p.toString()}`))
  }, [router, pathname, params])

  const clearAll = () => startT(() => router.push(pathname))
  const hasFilters = !!(currentBranchId || currentCategoryId || currentStatus || currentSearch)

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search */}
      <form
        onSubmit={(e) => { e.preventDefault(); push("search", (e.currentTarget.elements.namedItem("q") as HTMLInputElement).value.trim()) }}
        className="flex items-center gap-1.5 flex-1 min-w-[200px]"
      >
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            name="q"
            type="search"
            defaultValue={currentSearch ?? ""}
            placeholder="Search SKU, product, colour…"
            className={`${selectCls} pl-9 w-full`}
          />
        </div>
        <button type="submit" className="rounded-lg bg-[var(--color-brand-600)] text-white px-3 py-2 text-sm font-medium hover:bg-[var(--color-brand-700)] transition-colors">
          Search
        </button>
      </form>

      {/* Branch */}
      <select
        value={currentBranchId ?? ""}
        onChange={(e) => push("branchId", e.target.value)}
        aria-label="Filter by branch"
        className={selectCls}
      >
        <option value="">All Branches</option>
        {branches.map((b) => (
          <option key={b.id} value={b.id}>{b.name} ({b.city})</option>
        ))}
      </select>

      {/* Category */}
      <select
        value={currentCategoryId ?? ""}
        onChange={(e) => push("categoryId", e.target.value)}
        aria-label="Filter by category"
        className={selectCls}
      >
        <option value="">All Categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      {/* Status */}
      <select
        value={currentStatus ?? ""}
        onChange={(e) => push("status", e.target.value)}
        aria-label="Filter by status"
        className={selectCls}
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {/* Clear */}
      {hasFilters && (
        <button
          type="button"
          onClick={clearAll}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Clear
        </button>
      )}
    </div>
  )
}
