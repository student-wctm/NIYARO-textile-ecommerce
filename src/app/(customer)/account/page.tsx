import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { getSessionCustomer } from "@/lib/auth"
import { getCustomerOrders } from "@/lib/customers"
import { formatPrice } from "@/lib/utils"

export const metadata: Metadata = { title: "My Account" }
export const dynamic = "force-dynamic"

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending", CONFIRMED: "Confirmed", PACKING: "Packing",
  READY_FOR_PICKUP: "Ready", COLLECTED: "Collected", CANCELLED: "Cancelled",
}
const STATUS_CLS: Record<string, string> = {
  PENDING: "bg-yellow-50 text-yellow-700", CONFIRMED: "bg-blue-50 text-blue-700",
  PACKING: "bg-indigo-50 text-indigo-700", READY_FOR_PICKUP: "bg-green-50 text-green-700",
  COLLECTED: "bg-slate-100 text-slate-600", CANCELLED: "bg-red-50 text-red-600",
}

function formatDT(d: Date) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(d)
}

export default async function AccountPage() {
  const customer = await getSessionCustomer()
  if (!customer) redirect("/login")

  const orders = await getCustomerOrders(customer.id)
  const recent  = orders.slice(0, 5)
  const total   = orders.length
  const collected = orders.filter((o) => o.status === "COLLECTED").length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {customer.name.split(" ")[0]}!</h1>
        <p className="text-gray-500 text-sm mt-1">{customer.email}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Orders",      value: total,     icon: "📋" },
          { label: "Completed",         value: collected, icon: "✅" },
          { label: "Pending",           value: orders.filter(o => o.status === "PENDING").length, icon: "⏳" },
        ].map((s) => (
          <div key={s.label} className="bg-gray-50 rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <span className="text-2xl" aria-hidden="true">{s.icon}</span>
            <div>
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: "/account/orders",    icon: "📋", label: "My Orders" },
          { href: "/account/profile",   icon: "👤", label: "Profile" },
          { href: "/account/addresses", icon: "📍", label: "Addresses" },
          { href: "/branches",          icon: "🏪", label: "Find Branch" },
        ].map((l) => (
          <Link key={l.href} href={l.href}
            className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-4 text-center hover:bg-[var(--color-brand-50)] hover:border-[var(--color-brand-200)] transition-colors">
            <span className="text-2xl" aria-hidden="true">{l.icon}</span>
            <span className="text-xs font-medium text-gray-700">{l.label}</span>
          </Link>
        ))}
      </div>

      {/* Recent orders */}
      <div className="rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Recent Orders</h2>
          {total > 5 && (
            <Link href="/account/orders" className="text-xs text-[var(--color-brand-600)] hover:underline">
              View all {total} orders →
            </Link>
          )}
        </div>
        {recent.length === 0 ? (
          <div className="px-5 py-12 text-center text-gray-400">
            <p className="text-3xl mb-2" aria-hidden="true">📦</p>
            <p className="text-sm">No orders yet. Start shopping!</p>
            <Link href="/products" className="mt-3 inline-block text-sm text-[var(--color-brand-600)] hover:underline">
              Browse products →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recent.map((o) => (
              <div key={o.id} className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-mono font-semibold text-[var(--color-brand-600)]">{o.orderNumber}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{o.branchName} · {formatDT(o.createdAt)}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLS[o.status] ?? ""}`}>
                    {STATUS_LABEL[o.status] ?? o.status}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">{formatPrice(o.total)}</span>
                  <Link href={`/account/orders/${o.id}`}
                    className="text-xs text-gray-400 hover:text-[var(--color-brand-600)] transition-colors">
                    View →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
