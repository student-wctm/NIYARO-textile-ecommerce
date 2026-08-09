import Link from "next/link"
import type { LatestOrder } from "@/lib/dashboard"

const statusStyles: Record<string, string> = {
  PENDING:          "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  CONFIRMED:        "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  PACKING:          "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  READY_FOR_PICKUP: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  COLLECTED:        "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400",
  CANCELLED:        "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400",
}

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  }).format(d)
}

function formatPrice(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", minimumFractionDigits: 0,
  }).format(n)
}

export function LatestOrdersTable({ orders }: { orders: LatestOrder[] }) {
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500">
        <span className="text-3xl mb-2" aria-hidden="true">📋</span>
        <p className="text-sm font-medium mb-1">No orders yet</p>
        <p className="text-xs">Orders will appear here once customers place reservations.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto -mx-1">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 dark:border-slate-700">
            {["Order", "Customer", "Branch", "Amount", "Status", "Date", ""].map((h) => (
              <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
          {orders.map((o) => (
            <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
              {/* Order number — links to detail page */}
              <td className="px-3 py-2.5 whitespace-nowrap">
                <Link
                  href={`/admin/orders/${o.id}`}
                  className="font-mono text-xs font-semibold text-[var(--color-brand-600)] dark:text-[var(--color-brand-400)] hover:underline"
                >
                  {o.orderNumber}
                </Link>
              </td>
              <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                {o.customerName}
              </td>
              <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400 truncate max-w-[100px]">
                {o.branchName}
              </td>
              <td className="px-3 py-2.5 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                {formatPrice(o.total)}
              </td>
              <td className="px-3 py-2.5 whitespace-nowrap">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[o.status] ?? statusStyles.PENDING}`}>
                  {o.status.replace(/_/g, " ")}
                </span>
              </td>
              <td className="px-3 py-2.5 text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
                {formatDate(o.createdAt)}
              </td>
              {/* View link */}
              <td className="px-3 py-2.5 whitespace-nowrap">
                <Link
                  href={`/admin/orders/${o.id}`}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  View
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
