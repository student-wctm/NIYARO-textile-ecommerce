// Horizontal bar chart showing per-branch revenue.

import type { BranchPerformance } from "@/lib/dashboard"

function formatK(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000)   return `₹${(n / 1000).toFixed(1)}k`
  return `₹${n}`
}

export function BranchPerformanceChart({ data }: { data: BranchPerformance[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-slate-400 dark:text-slate-500">
        No branch data yet
      </div>
    )
  }

  const maxRev = Math.max(...data.map((d) => d.revenue), 1)

  return (
    <div className="space-y-3">
      {data.map((b, i) => {
        const pct = Math.round((b.revenue / maxRev) * 100)
        return (
          <div key={b.branchName}>
            <div className="flex items-center justify-between mb-1 gap-2">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[140px]" title={b.branchName}>
                {b.branchName}
              </span>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-slate-400 dark:text-slate-500">{b.orders} orders</span>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {formatK(b.revenue)}
                </span>
              </div>
            </div>
            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
              <div
                className="h-2 rounded-full bg-[var(--color-brand-500)] dark:bg-[var(--color-brand-400)] transition-all duration-700"
                style={{ width: `${pct}%` }}
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${b.branchName}: ${formatK(b.revenue)}`}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
