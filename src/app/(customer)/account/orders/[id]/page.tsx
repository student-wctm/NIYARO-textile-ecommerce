import type { Metadata } from "next"
import Link from "next/link"
import { redirect, notFound } from "next/navigation"
import { getSessionCustomer } from "@/lib/auth"
import { getOrderById } from "@/lib/orders"
import { formatPrice } from "@/lib/utils"

type PageProps = { params: Promise<{ id: string }> }

export const metadata: Metadata = { title: "Order Details" }
export const dynamic = "force-dynamic"

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending", CONFIRMED: "Confirmed", PACKING: "Packing",
  READY_FOR_PICKUP: "Ready for Pickup", COLLECTED: "Collected", CANCELLED: "Cancelled",
}
const STATUS_CLS: Record<string, string> = {
  PENDING: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  CONFIRMED: "bg-blue-50 text-blue-700 border border-blue-200",
  PACKING: "bg-indigo-50 text-indigo-700 border border-indigo-200",
  READY_FOR_PICKUP: "bg-green-50 text-green-700 border border-green-200",
  COLLECTED: "bg-slate-100 text-slate-600 border border-slate-200",
  CANCELLED: "bg-red-50 text-red-600 border border-red-200",
}

function fmt(d: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(d)
}

export default async function CustomerOrderDetailPage({ params }: PageProps) {
  const { id } = await params

  const customer = await getSessionCustomer()
  if (!customer) redirect("/login")

  const order = await getOrderById(id)
  // Ownership check — customer can only view their own orders
  if (!order || order.customerId !== customer.id) notFound()

  const attrs = (v: typeof order.items[0]["variant"]) =>
    [v.color, v.size, v.length].filter(Boolean).join(" · ") || null

  return (
    <div>
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Link href="/account/orders" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
          ← My Orders
        </Link>
        <span aria-hidden="true" className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900 font-mono">{order.orderNumber}</h1>
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLS[order.status] ?? ""}`}>
          {STATUS_LABEL[order.status] ?? order.status}
        </span>
      </div>

      <div className="space-y-5">
        {/* Branch & dates */}
        <div className="rounded-2xl border border-gray-200 p-5 grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Pickup Branch</p>
            <p className="text-sm font-medium text-gray-900">{order.branch.name}</p>
            <p className="text-xs text-gray-500">{order.branch.city}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Placed</p>
            <p className="text-sm font-medium text-gray-900">{fmt(order.createdAt)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Last Updated</p>
            <p className="text-sm font-medium text-gray-900">{fmt(order.updatedAt)}</p>
          </div>
        </div>

        {/* Items */}
        <div className="rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900">
              Order Items ({order.items.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-50">
            {order.items.map((item) => {
              const a = attrs(item.variant)
              return (
                <div key={item.id} className="px-5 py-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                      {item.variant.product.name}
                    </p>
                    <p className="text-xs font-mono text-gray-400 mt-0.5">{item.variant.sku}</p>
                    {a && <p className="text-xs text-gray-500 mt-0.5">{a}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm text-gray-500">{item.quantity} × {formatPrice(item.unitPrice)}</p>
                    <p className="text-sm font-semibold text-gray-900">{formatPrice(item.totalPrice)}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Totals */}
          <div className="px-5 py-4 bg-gray-50 border-t border-gray-200 space-y-1.5">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span><span>{formatPrice(order.subtotal)}</span>
            </div>
            {order.transferCharge > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Transfer Charge</span><span>{formatPrice(order.transferCharge)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-gray-900 border-t border-gray-200 pt-2 mt-2">
              <span>Total</span><span>{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Customer notes */}
        {order.notes && (
          <div className="rounded-2xl border border-gray-200 p-5">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Your Notes</p>
            <p className="text-sm text-gray-700">{order.notes}</p>
          </div>
        )}

        {/* Status history */}
        {order.statusHistory.length > 0 && (
          <div className="rounded-2xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Order Progress</h2>
            <ol className="relative space-y-0">
              {order.statusHistory.map((h, i) => (
                <li key={h.id} className="flex gap-3 pb-4 last:pb-0">
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-brand-500)] mt-0.5 shrink-0" />
                    {i < order.statusHistory.length - 1 && (
                      <div className="w-px flex-1 bg-gray-200 mt-1" />
                    )}
                  </div>
                  <div className="flex-1 pb-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-gray-800">
                        {STATUS_LABEL[h.status] ?? h.status}
                      </span>
                      <span className="text-xs text-gray-400 shrink-0">{fmt(h.createdAt)}</span>
                    </div>
                    {h.note && <p className="text-xs text-gray-500 mt-0.5">{h.note}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  )
}
