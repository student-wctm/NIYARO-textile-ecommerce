"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useTransition, useCallback } from "react"
import { STATUS_LABEL, ALL_ORDER_STATUSES } from "@/lib/ordersMeta"
import type { OrderStatus } from "@/lib/ordersMeta"

interface OrdersFiltersBarProps {
  branches:          { id: string; name: string; city: string }[]
  currentStatus?:    string
  currentBranchId?:  string
  currentDateFrom?:  string
  currentDateTo?:    string
  currentSearch?:    string
}

const inputCls =
  "rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 " +
  "text-slate-700 dark:text-slate-300 text-sm px-3 py-2 " +
  "focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:border-transparent"

export function OrdersFiltersBar({
  branches, currentStatus, currentBranchId, currentDateFrom, currentDateTo, currentSearch,
}: OrdersFiltersBarProps) {
  const router   = useRouter()
  const pathname = usePathname()
  const params   = useSearchParams()
  const [, startT] = useTransition()

  const push = useCallback((key: string, value: string) => {
    const p = new URLSearchParams(params.toString())
    if (value) p.set(key, value); else p.delete(key)
    p.delete("page")
    startT(() => router.push(`${pathname}?${p.toString()}`))
  }, [router, pathname, params])

  const clearAll = () => startT(() => router.push(pathname))
  const hasFilters = !!(currentStatus || currentBranchId || currentDateFrom || currentDateTo || currentSearch)

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          push("search", (e.currentTarget.elements.namedItem("q") as HTMLInputElement).value.trim())
        }}
        className="flex items-center gap-1.5 flex-1 min-w-[200px]"
      >
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none"
            fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            name="q"
            type="search"
            defaultValue={currentSearch ?? ""}
            placeholder="Order #, customer name, phone…"
            className={`${inputCls} pl-9 w-full`}
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-[var(--color-brand-600)] text-white px-3 py-2 text-sm font-medium hover:bg-[var(--color-brand-700)] transition-colors"
        >
          Search
        </button>
      </form>

      {/* Status */}
      <select
        value={currentStatus ?? ""}
        onChange={(e) => push("status", e.target.value)}
        aria-label="Filter by status"
        className={inputCls}
      >
        <option value="">All Statuses</option>
        {ALL_ORDER_STATUSES.map((s: OrderStatus) => (
          <option key={s} value={s}>{STATUS_LABEL[s]}</option>
        ))}
      </select>

      {/* Branch */}
      <select
        value={currentBranchId ?? ""}
        onChange={(e) => push("branchId", e.target.value)}
        aria-label="Filter by branch"
        className={inputCls}
      >
        <option value="">All Branches</option>
        {branches.map((b) => (
          <option key={b.id} value={b.id}>{b.name} ({b.city})</option>
        ))}
      </select>

      {/* Date from */}
      <div className="flex items-center gap-1.5">
        <label htmlFor="dateFrom" className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
          From
        </label>
        <input
          id="dateFrom"
          type="date"
          value={currentDateFrom ?? ""}
          onChange={(e) => push("dateFrom", e.target.value)}
          className={inputCls}
        />
      </div>

      {/* Date to */}
      <div className="flex items-center gap-1.5">
        <label htmlFor="dateTo" className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
          To
        </label>
        <input
          id="dateTo"
          type="date"
          value={currentDateTo ?? ""}
          onChange={(e) => push("dateTo", e.target.value)}
          className={inputCls}
        />
      </div>

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
