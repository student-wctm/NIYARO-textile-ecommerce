"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useTransition } from "react"

export function Pagination({ page, totalPages, total, pageSize }: {
  page: number; totalPages: number; total: number; pageSize: number
}) {
  const router   = useRouter()
  const pathname = usePathname()
  const params   = useSearchParams()
  const [isPending, start] = useTransition()

  if (totalPages <= 1) return null

  function goTo(p: number) {
    const next = new URLSearchParams(params.toString())
    next.set("page", String(p))
    start(() => router.push(`${pathname}?${next.toString()}`))
  }

  const from = (page - 1) * pageSize + 1
  const to   = Math.min(page * pageSize, total)

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 transition-opacity ${isPending ? "opacity-60" : ""}`}>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Showing <span className="font-medium text-slate-700 dark:text-slate-200">{from}–{to}</span> of{" "}
        <span className="font-medium text-slate-700 dark:text-slate-200">{total}</span> orders
      </p>
      <div className="flex items-center gap-1.5">
        <button onClick={() => goTo(1)} disabled={page === 1}
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">«</button>
        <button onClick={() => goTo(page - 1)} disabled={page === 1}
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">← Prev</button>
        <span className="px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400">{page} / {totalPages}</span>
        <button onClick={() => goTo(page + 1)} disabled={page === totalPages}
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Next →</button>
        <button onClick={() => goTo(totalPages)} disabled={page === totalPages}
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">»</button>
      </div>
    </div>
  )
}
