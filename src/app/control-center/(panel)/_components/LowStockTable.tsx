import type { LowStockItem } from "@/lib/dashboard"

export function LowStockTable({ items }: { items: LowStockItem[] }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500">
        <span className="text-3xl mb-2" aria-hidden="true">✅</span>
        <p className="text-sm">All stock levels are healthy</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto -mx-1">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 dark:border-slate-700">
            {["Product", "SKU", "Branch", "Stock", "Threshold"].map((h) => (
              <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
          {items.map((item) => {
            const critical = item.availableStock === 0
            const low      = item.availableStock <= Math.ceil(item.lowStockThreshold / 2)
            return (
              <tr key={`${item.variantId}-${item.branchName}`}
                className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300 truncate max-w-[140px]" title={item.productName}>
                  {item.productName}
                </td>
                <td className="px-3 py-2.5 font-mono text-xs text-slate-500 dark:text-slate-400">
                  {item.sku}
                </td>
                <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400 truncate max-w-[100px]">
                  {item.branchName}
                </td>
                <td className="px-3 py-2.5">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${
                    critical
                      ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                      : low
                      ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      : "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                  }`}>
                    {critical ? "OUT" : item.availableStock}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-xs text-slate-400 dark:text-slate-500">
                  {item.lowStockThreshold}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
