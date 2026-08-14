// =============================================================================
// Order Success / Confirmation Page
//
// Security:
//   - Requires authentication
//   - Verifies order.customerId === authenticatedCustomer.id
//   - Uses notFound() if ownership check fails (never reveals another customer's order)
// =============================================================================

import type { Metadata } from "next"
import Link from "next/link"
import { redirect, notFound } from "next/navigation"
import { getSessionCustomer } from "@/lib/auth"
import { getOrderById } from "@/lib/orders"
import { formatPrice } from "@/lib/utils"

type PageProps = { params: Promise<{ id: string }> }

export const metadata: Metadata = { title: "Order Confirmed" }
export const dynamic = "force-dynamic"

const STATUS_LABEL: Record<string, string> = {
  PENDING:          "Pending",
  CONFIRMED:        "Confirmed",
  PACKING:          "Packing",
  READY_FOR_PICKUP: "Ready for Pickup",
  COLLECTED:        "Collected",
  CANCELLED:        "Cancelled",
}

function fmt(d: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(d)
}

export default async function OrderSuccessPage({ params }: PageProps) {
  const { id } = await params

  const customer = await getSessionCustomer()
  if (!customer) redirect(`/login?next=/order-success/${id}`)

  const order = await getOrderById(id)

  // Ownership check — never reveal another customer's order
  if (!order || order.customerId !== customer.id) notFound()

  const attrs = (v: typeof order.items[0]["variant"]) =>
    [v.color, v.size, v.length].filter(Boolean).join(" · ") || null

  return (
    <div className="bg-white min-h-screen">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10">

        {/* Success header */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg className="h-10 w-10 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Order Confirmed!</h1>
          <p className="text-gray-500 text-sm">
            Thank you for your order. We&apos;ll notify you when it&apos;s ready for pickup.
          </p>
        </div>

        {/* Order summary card */}
        <div className="rounded-2xl border border-gray-200 overflow-hidden mb-6">

          {/* Order meta */}
          <div className="bg-gray-50 px-5 py-4 grid grid-cols-2 sm:grid-cols-3 gap-4 border-b border-gray-200">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Order</p>
              <p className="text-sm font-semibold font-mono text-[var(--color-brand-600)]">{order.orderNumber}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Placed</p>
              <p className="text-sm font-medium text-gray-900">{fmt(order.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Status</p>
              <span className="inline-flex items-center rounded-full bg-yellow-50 border border-yellow-200 px-2.5 py-0.5 text-xs font-semibold text-yellow-700">
                {STATUS_LABEL[order.status] ?? order.status}
              </span>
            </div>
          </div>

          {/* Pickup branch */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-start gap-3">
            <svg className="h-5 w-5 text-[var(--color-brand-600)] shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-2.079 3.218-4.402 3.218-6.853C19.5 6.161 15.976 2.25 12 2.25S4.5 6.161 4.5 11.474c0 2.451 1.274 4.774 3.218 6.853a19.58 19.58 0 002.683 2.282 16.975 16.975 0 001.144.742zM12 13.5a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Pickup Branch</p>
              <p className="text-sm font-semibold text-gray-900">{order.branch.name}</p>
              <p className="text-xs text-gray-500">{order.branch.city}</p>
            </div>
          </div>

          {/* Contact */}
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Contact</p>
            <p className="text-sm text-gray-900">{order.customerName}</p>
            <p className="text-xs text-gray-500 mt-0.5">{order.customerPhone}</p>
            {order.customerEmail && <p className="text-xs text-gray-500">{order.customerEmail}</p>}
          </div>

          {/* Items */}
          <div className="divide-y divide-gray-50">
            {order.items.map((item) => {
              const a = attrs(item.variant)
              return (
                <div key={item.id} className="px-5 py-3.5 flex items-start justify-between gap-4">
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

          {/* Total */}
          <div className="px-5 py-4 bg-gray-50 border-t border-gray-200 space-y-2">
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

        {/* Payment notice */}
        <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 mb-6 text-sm text-blue-700 flex items-start gap-2">
          <svg className="h-4 w-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
          <span>
            Payment will be collected at the branch when you pick up your order.
            No online payment was charged.
          </span>
        </div>

        {/* Customer notes */}
        {order.notes && (
          <div className="rounded-xl border border-gray-200 px-4 py-3 mb-6">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Your Notes</p>
            <p className="text-sm text-gray-700">{order.notes}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/account/orders"
            className="flex-1 inline-flex items-center justify-center rounded-xl bg-[var(--color-brand-600)] px-5 py-3 text-sm font-semibold text-white hover:bg-[var(--color-brand-700)] transition-colors">
            View My Orders
          </Link>
          <Link href="/products"
            className="flex-1 inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  )
}
