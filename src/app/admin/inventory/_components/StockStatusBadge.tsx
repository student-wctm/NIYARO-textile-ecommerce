import type { StockStatus } from "@/lib/inventory"

const cfg: Record<StockStatus, { label: string; cls: string; dot: string }> = {
  IN_STOCK:     { label: "In Stock",     cls: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400",  dot: "bg-green-500"  },
  LOW_STOCK:    { label: "Low Stock",    cls: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",  dot: "bg-amber-500"  },
  OUT_OF_STOCK: { label: "Out of Stock", cls: "bg-red-50   text-red-700   dark:bg-red-900/30   dark:text-red-400",    dot: "bg-red-500"    },
}

export function StockStatusBadge({ status }: { status: StockStatus }) {
  const { label, cls, dot } = cfg[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} aria-hidden="true" />
      {label}
    </span>
  )
}
