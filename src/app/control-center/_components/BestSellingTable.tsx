import type { BestSellingProduct } from "@/lib/dashboard"

function formatPrice(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", minimumFractionDigits: 0,
  }).format(n)
}

export function BestSellingTable({ products }: { products: BestSellingProduct[] }) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500">
        <span className="text-3xl mb-2" aria-hidden="true">🧵</span>
        <p className="text-sm">No sales data yet</p>
      </div>
    )
  }

  const maxQty = Math.max(...products.map((p) => p.totalQty), 1)

  return (
    <div className="space-y-3">
      {products.map((p, i) => {
        const pct = Math.round((p.totalQty / maxQty) * 100)
        return (
          <div key={p.productId} className="flex items-center gap-3">
            {/* Rank */}
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 w-5 shrink-0 text-right">
              {i + 1}
            </span>
            {/* Name + bar */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1 gap-2">
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate" title={p.productName}>
                  {p.productName}
                </p>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-slate-400 dark:text-slate-500">{p.totalQty} sold</span>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{formatPrice(p.totalRevenue)}</span>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-1.5 rounded-full bg-[var(--color-brand-500)] dark:bg-[var(--color-brand-400)]"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
