import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { getSessionCustomer } from "@/lib/auth"
import { getCustomerOrders } from "@/lib/customers"
import { formatPrice } from "@/lib/utils"

export const metadata: Metadata = { title: "My Orders" }
export const dynamic = "force-dynamic"

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending", CONFIRMED: "Confirmed", PACKING: "Packing",
  READY_FOR_PICKUP: "Ready for Pickup", COLLECTED: "Collected", CANCELLED: "Cancelled",
}
const STATUS_CLS: Record<string, string> = {
  PENDING: "bg-yellow-50 text-yellow-700", CONFIRMED: "bg-blue-50 text-blue-700",
  PACKING: "bg-indigo-50 text-indigo-700", READY_FOR_PICKUP: "bg-green-50 text-green-700",
  COLLECTED: "bg-slate-100 text-slate-600", CANCELLED: "bg-red-50 text-red-600",
}

function fmt(d: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  }).format(d)
}

export default async function AccountOrdersPage() {
  const customer = await getSessionCustomer()
  if (!customer) redirect("/login")

  const orders = await getCustomerOrders(customer.id)

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">
        My Orders
        {orders.length > 0 && (
          <span className="ml-2 text-sm font-normal text-gray-400">({orders.length})</span>
        )}
      </h1>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 py-20 text-center">
          <p className="text-4xl mb-3" aria-hidden="true">📦</p>
          <p className="text-base font-semibold text-gray-700 mb-1">No orders yet</p>
          <p className="text-sm text-gray-400 mb-5">When you place an order it will appear here.</p>
          <Link href="/products"
            className="inline-flex items-center rounded-lg bg-[var(--color-brand-600)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-700)] transition-colors">
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id}
              className="rounded-2xl border border-gray-200 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:border-gray-300 transition-colors">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm font-semibold text-[var(--color-brand-600)]">
                    {o.orderNumber}
                  </span>
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLS[o.status] ?? ""}`}>
                    {STATUS_LABEL[o.status] ?? o.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {o.branchName} · {fmt(o.createdAt)} · {o.itemCount} item{o.itemCount !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <p className="text-base font-bold text-gray-900">{formatPrice(o.total)}</p>
                <Link href={`/account/orders/${o.id}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  View Details
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
